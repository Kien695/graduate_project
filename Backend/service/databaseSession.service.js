const { Pool } = require("pg");

const pools = new Map();
const MAX_SESSIONS = Math.max(1, Number(process.env.DB_SESSION_MAX_POOLS || 100));
const SESSION_IDLE_MS = Math.max(60000, Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES || 30) * 60000);

// This is intentionally separate from the system pool in database/database.js.
// dbUser comes from users.db_user; rawPassword is the password just submitted
// by the login form. Neither value is written to process.env.
const poolConfig = (dbUser, rawPassword) => ({
  user: dbUser,
  password: rawPassword,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: Math.max(1, Number(process.env.DB_SESSION_POOL_SIZE || 3)),
  idleTimeoutMillis: Math.max(1000, Number(process.env.DB_SESSION_IDLE_MS || 300000)),
  connectionTimeoutMillis: Math.max(1000, Number(process.env.DB_SESSION_CONNECT_TIMEOUT_MS || 10000)),
});

const createVerifiedPool = async (dbUser, rawPassword) => {
  const pool = new Pool(poolConfig(dbUser, rawPassword));
  pool.on("error", () => undefined);
  try {
    const { rows } = await pool.query("SELECT current_user");
    if (rows[0]?.current_user !== dbUser)
      throw new Error("PostgreSQL authenticated with an unexpected role");
    return pool;
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
};

const register = async (sessionId, pool) => {
  if (pools.size >= MAX_SESSIONS && !pools.has(String(sessionId))) {
    await pool.end().catch(() => undefined);
    throw new Error("Database session limit reached");
  }
  await close(sessionId);
  const key = String(sessionId);
  const timer = setTimeout(() => close(key), SESSION_IDLE_MS);
  timer.unref?.();
  pools.set(key, { pool, timer });
};
const get = (sessionId) => pools.get(String(sessionId))?.pool;
const touch = (sessionId) => {
  const entry = pools.get(String(sessionId));
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => close(sessionId), SESSION_IDLE_MS);
  entry.timer.unref?.();
};
const close = async (sessionId) => {
  const key = String(sessionId);
  const entry = pools.get(key);
  pools.delete(key);
  if (entry) {
    clearTimeout(entry.timer);
    await entry.pool.end().catch(() => undefined);
  }
};
const closeUserSessions = async (sessionIds = []) =>
  Promise.all(sessionIds.map((id) => close(id)));

module.exports = { createVerifiedPool, register, get, touch, close, closeUserSessions };

