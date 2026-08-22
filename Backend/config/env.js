const dotenv = require("dotenv");
const loadEnv = () => {
  dotenv.config({ quiet: true });
  const required = ["DB_USER","DB_HOST","DB_NAME","DB_PASSWORD","DB_PORT","SECRET_KEY_ACCESS_TOKEN","SECRET_KEY_REFRESH_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
};
module.exports = { loadEnv };
