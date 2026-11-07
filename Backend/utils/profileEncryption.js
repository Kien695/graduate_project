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

// Presentation endpoints must not fail an entire customer list because one
// legacy value was encrypted with a lost key. Callers can ask the customer to
// enter that field again; authentication/migration code still uses the strict
// decryptProfileValue above.
const tryDecryptProfileValue = (value) => {
  try {
    return { value: decryptProfileValue(value), failed: false };
  } catch (_) {
    return { value: null, failed: Boolean(value) };
  }
};

const emailLookupHash = (email) =>
  crypto
    .createHmac("sha256", getKey())
    .update(String(email || "").trim().toLowerCase())
    .digest("hex");

const phoneLookupHash = (phone) =>
  crypto
    .createHmac("sha256", getKey())
    .update(String(phone || "").replace(/\D/g, ""))
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
  const cccd = tryDecryptProfileValue(result.cccd_encrypted);
  const email = tryDecryptProfileValue(result.email_encrypted);
  const phone = tryDecryptProfileValue(result.phone_encrypted);
  const address = tryDecryptProfileValue(result.address_encrypted);
  result.cccd = cccd.value;
  result.email = email.value || result.email || null;
  result.phone = phone.value || result.phone || null;
  result.address = address.value || result.address || null;
  result.profile_reentry_required = [cccd, email, phone, address].some(
    (field) => field.failed,
  );
  delete result.cccd_encrypted;
  delete result.email_encrypted;
  delete result.phone_encrypted;
  delete result.address_encrypted;
  return result;
};

module.exports = {
  encryptProfileValue,
  decryptProfileValue,
  tryDecryptProfileValue,
  emailLookupHash,
  phoneLookupHash,
  encryptCustomerProfile,
  decryptCustomerProfile,
};
