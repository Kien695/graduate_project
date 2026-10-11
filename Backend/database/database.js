const { Pool } = require("pg");
const { AsyncLocalStorage } = require("async_hooks");
const fs = require("fs");
const path = require("path");

const databaseContext = new AsyncLocalStorage();

const database = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

database.on("error", (error) => console.error("Unexpected PostgreSQL pool error:", error.message));

const connectDB = async () => {
  try {
    await database.query("SELECT 1");
    // Small, idempotent compatibility migration required by employee/login flows.
    // The shared pool remains the system/owner connection; staff pools are built
    // separately in databaseSession.service.js from db_user + the login password.
    await database.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS db_user VARCHAR(63)");
    await database.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_db_user_unique_ci ON users(LOWER(db_user)) WHERE db_user IS NOT NULL",
    );
    await database.query(
      fs.readFileSync(
        path.join(
          __dirname,
          "migrations",
          "20261011_dashboard_overview.sql",
        ),
        "utf8",
      ),
    );
    console.log("Connected to PostgreSQL!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const contextualDatabase = {
  query: (...args) => (databaseContext.getStore()?.pool || database).query(...args),
  connect: (...args) => (databaseContext.getStore()?.pool || database).connect(...args),
  end: (...args) => database.end(...args),
};

const transactionOn = async (pool, callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (error.commitTransaction) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
const withTransaction = (callback) =>
  transactionOn(databaseContext.getStore()?.pool || database, callback);
const withSystemTransaction = (callback) => transactionOn(database, callback);
const runWithDatabase = (pool, callback) => databaseContext.run({ pool }, callback);

module.exports = {
  database: contextualDatabase,
  systemDatabase: database,
  connectDB,
  withTransaction,
  withSystemTransaction,
  runWithDatabase,
};
