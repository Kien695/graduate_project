const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

const databasePasswordErrors = (password) => {
  const value = String(password || "");
  const errors = [];
  if (value.length < 12) errors.push("ít nhất 12 ký tự");
  if (!/[a-z]/.test(value)) errors.push("ít nhất một chữ thường");
  if (!/[A-Z]/.test(value)) errors.push("ít nhất một chữ hoa");
  if (!/\d/.test(value)) errors.push("ít nhất một chữ số");
  if (!/[^A-Za-z0-9]/.test(value)) errors.push("ít nhất một ký tự đặc biệt");
  return errors;
};

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
};
const verifyPassword = async (password, storedHash) => {
  if (!storedHash || !storedHash.startsWith("scrypt:")) return false;
  const [, salt, hexKey] = storedHash.split(":");
  const key = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hexKey, "hex"), key);
};
module.exports = { hashPassword, verifyPassword, databasePasswordErrors };
