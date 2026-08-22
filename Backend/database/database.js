const { Pool } = require("pg");

const database = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

database.on("error", (error) => console.error("Unexpected PostgreSQL pool error:", error.message));

const connectDB = async () => {
  try {
    await database.query("SELECT 1");
    console.log("Connected to PostgreSQL!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const withTransaction = async (callback) => {
  const client = await database.connect();
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

module.exports = {
  database,
  connectDB,
  withTransaction,
};
