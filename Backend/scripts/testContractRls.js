require("dotenv").config();
const assert = require("assert/strict");
const { Pool } = require("pg");
const { systemDatabase } = require("../database/database");

const main = async () => {
  const fixture = (await systemDatabase.query(`
    SELECT u.db_user, sl.rank subject_rank, c.id contract_id, osl.rank object_rank
    FROM users u
    JOIN security_levels sl ON sl.id=u.security_level_id
    CROSS JOIN LATERAL (
      SELECT c.id,c.security_level_id FROM contracts c
      JOIN security_levels x ON x.id=c.security_level_id
      WHERE x.rank > sl.rank ORDER BY x.rank,c.id LIMIT 1
    ) c
    JOIN security_levels osl ON osl.id=c.security_level_id
    WHERE u.db_user IS NOT NULL ORDER BY sl.rank LIMIT 1
  `)).rows[0];
  assert(fixture, "Can mot user co db_user va mot hop dong co classification cao hon clearance");
  assert(process.env.RLS_TEST_DB_PASSWORD, "Dat RLS_TEST_DB_PASSWORD cua user thu nghiem");
  const pool = new Pool({
    user: fixture.db_user,
    password: process.env.RLS_TEST_DB_PASSWORD,
    host: process.env.DB_SESSION_HOST || process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  try {
    const identity = (await pool.query("SELECT session_user, current_user")).rows[0];
    assert.equal(identity.session_user.toLowerCase(), fixture.db_user.toLowerCase());
    const result = await pool.query("SELECT id FROM public.contracts WHERE id=$1", [fixture.contract_id]);
    assert.equal(result.rowCount, 0, "RLS da de lo hop dong co classification cao hon clearance");
    console.log("PASS: PostgreSQL RLS hides the higher-classified contract from the subject role.");
  } finally {
    await pool.end();
    await systemDatabase.end();
  }
};
main().catch(async (error) => {
  console.error(error.message);
  await systemDatabase.end().catch(() => undefined);
  process.exitCode = 1;
});
