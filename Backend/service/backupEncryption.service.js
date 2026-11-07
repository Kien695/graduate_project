const crypto = require("crypto");
const fs = require("fs");
const { pipeline } = require("stream/promises");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const MAGIC = Buffer.from("ADBKPENC", "ascii");
const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + 1 + IV_BYTES;

const encryptionKey = () => {
  const configured = String(process.env.BACKUP_ENCRYPTION_KEY || "").trim();
  if (!configured)
    throw new ErrorHandler("Thiếu BACKUP_ENCRYPTION_KEY; đã hủy thao tác để tránh tạo backup không mã hóa", 503);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(configured))
    throw new ErrorHandler("BACKUP_ENCRYPTION_KEY phải là Base64 của đúng 32 byte", 503);
  const key = Buffer.from(configured, "base64");
  if (key.length !== 32)
    throw new ErrorHandler("BACKUP_ENCRYPTION_KEY phải là Base64 của đúng 32 byte", 503);
  return key;
};

const inspectFile = async (filePath) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const prefix = Buffer.alloc(MAGIC.length + 1);
    const { bytesRead } = await handle.read(prefix, 0, prefix.length, 0);
    if (bytesRead < MAGIC.length || !prefix.subarray(0, MAGIC.length).equals(MAGIC))
      return { encrypted: false, legacy: true, version: null };
    const version = prefix[MAGIC.length];
    if (version !== VERSION)
      throw new ErrorHandler(`Phiên bản định dạng backup mã hóa không được hỗ trợ: ${version}`, 400);
    return { encrypted: true, legacy: false, version };
  } finally {
    await handle.close();
  }
};

const encryptFile = async (sourcePath, destinationPath) => {
  const key = encryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  const output = fs.createWriteStream(destinationPath, { flags: "wx", mode: 0o600 });
  output.write(Buffer.concat([MAGIC, Buffer.from([VERSION]), iv]));
  try {
    await pipeline(fs.createReadStream(sourcePath), cipher, output, { end: false });
    await new Promise((resolve, reject) => {
      output.once("error", reject);
      output.once("finish", resolve);
      output.end(cipher.getAuthTag());
    });
  } catch (error) {
    output.destroy();
    await fs.promises.unlink(destinationPath).catch(() => {});
    throw error;
  } finally {
    key.fill(0);
  }
};

const decryptFile = async (sourcePath, destinationPath) => {
  const key = encryptionKey();
  const stat = await fs.promises.stat(sourcePath);
  if (stat.size < HEADER_BYTES + TAG_BYTES)
    throw new ErrorHandler("File backup mã hóa bị thiếu dữ liệu hoặc hỏng", 400);
  const handle = await fs.promises.open(sourcePath, "r");
  try {
    const header = Buffer.alloc(HEADER_BYTES);
    const tag = Buffer.alloc(TAG_BYTES);
    await handle.read(header, 0, header.length, 0);
    await handle.read(tag, 0, tag.length, stat.size - TAG_BYTES);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC) || header[MAGIC.length] !== VERSION)
      throw new ErrorHandler("File không phải backup mã hóa hợp lệ", 400);
    const iv = header.subarray(MAGIC.length + 1);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
    decipher.setAuthTag(tag);
    await pipeline(
      fs.createReadStream(sourcePath, { start: HEADER_BYTES, end: stat.size - TAG_BYTES - 1 }),
      decipher,
      fs.createWriteStream(destinationPath, { flags: "wx", mode: 0o600 }),
    );
  } catch (error) {
    await fs.promises.unlink(destinationPath).catch(() => {});
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Không thể xác thực hoặc giải mã backup; file có thể hỏng hoặc khóa không khớp", 400);
  } finally {
    await handle.close();
    key.fill(0);
  }
};

module.exports = { encryptionKey, inspectFile, encryptFile, decryptFile };
