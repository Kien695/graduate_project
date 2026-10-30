const dotenv = require("dotenv");
const loadEnv = () => {
  dotenv.config({ quiet: true });
  if (process.env.DATABASE_URL) {
    let url;
    try { url = new URL(process.env.DATABASE_URL); } catch { throw new Error("Invalid DATABASE_URL"); }
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
    const defaults = {
      DB_USER: decodeURIComponent(url.username),
      DB_PASSWORD: decodeURIComponent(url.password),
      DB_HOST: url.hostname,
      DB_PORT: url.port || "5432",
      DB_NAME: decodeURIComponent(url.pathname.replace(/^\//, "")),
    };
    for (const [key, value] of Object.entries(defaults)) process.env[key] ||= value;
    if (!process.env.DB_SSL && url.searchParams.get("sslmode") && url.searchParams.get("sslmode") !== "disable")
      process.env.DB_SSL = "true";
  }
  const required = ["DB_USER","DB_HOST","DB_NAME","DB_PASSWORD","DB_PORT","SECRET_KEY_ACCESS_TOKEN","SECRET_KEY_REFRESH_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
};
module.exports = { loadEnv };
