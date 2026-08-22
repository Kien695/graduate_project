require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { database } = require("./database");

const migrate = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await database.query(sql);
    console.log("Database schema migrated successfully");
  } finally {
    await database.end();
  }
};
migrate().catch((error) => { console.error("Migration failed:", error.message); process.exitCode = 1; });
