require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { database } = require("./database");

const migrate = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await database.query(sql);
    await database.query(fs.readFileSync(
      path.join(__dirname, "migrations", "20260909_mac_four_levels.sql"), "utf8",
    ));
    console.log("Database schema migrated successfully");
    await database.query(fs.readFileSync(
      path.join(__dirname, "migrations", "20260910_backup_settings.sql"), "utf8",
    ));
  } finally {
    await database.end();
  }
};
migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
