const crypto = require("crypto");

const getKey = () => {
  const secret = process.env.PROFILE_ENCRYPTION_KEY;
  if (!secret) throw new Error("Missing PROFILE_ENCRYPTION_KEY");
  return crypto.createHash("sha256").update(secret).digest();
};

const encryptProfileValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64")).join(".");
};

const decryptProfileValue = (value) => {
  if (!value) return null;
  const parts = String(value).split(".").map((part) => Buffer.from(part, "base64"));
  if (parts.length !== 3) throw new Error("Invalid encrypted profile value");
  const [iv, tag, encrypted] = parts;
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

const emailLookupHash = (email) =>
  crypto
    .createHmac("sha256", getKey())
    .update(String(email || "").trim().toLowerCase())
    .digest("hex");

const encryptCustomerProfile = (input = {}) => ({
  ...(input.cccd !== undefined
    ? { cccd_encrypted: encryptProfileValue(input.cccd) }
    : {}),
  ...(input.email !== undefined
    ? { email_encrypted: encryptProfileValue(input.email) }
    : {}),
  ...(input.phone !== undefined
    ? { phone_encrypted: encryptProfileValue(input.phone) }
    : {}),
  ...(input.address !== undefined
    ? { address_encrypted: encryptProfileValue(input.address) }
    : {}),
});

const decryptCustomerProfile = (row) => {
  if (!row) return row;
  const result = { ...row };
  result.cccd = decryptProfileValue(result.cccd_encrypted);
  result.email = decryptProfileValue(result.email_encrypted) || result.email || null;
  result.phone = decryptProfileValue(result.phone_encrypted) || result.phone || null;
  result.address = decryptProfileValue(result.address_encrypted) || result.address || null;
  delete result.cccd_encrypted;
  delete result.email_encrypted;
  delete result.phone_encrypted;
  delete result.address_encrypted;
  return result;
};

module.exports = {
  encryptProfileValue,
  decryptProfileValue,
  emailLookupHash,
  encryptCustomerProfile,
  decryptCustomerProfile,
};
