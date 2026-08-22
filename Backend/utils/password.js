const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

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
module.exports = { hashPassword, verifyPassword };
