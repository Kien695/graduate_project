require("dotenv").config();
const { systemDatabase } = require("../database/database");

const quoteIdentifier = (value) => {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value))
    throw new Error("Tài khoản chưa có PostgreSQL role hợp lệ");
  return `"${value}"`;
};

const run = async () => {
  const account = String(process.argv[2] || "").trim().toLowerCase();
  if (!account) throw new Error("Cần truyền email hoặc username của tài khoản");

  const client = await systemDatabase.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_contract_mac BOOLEAN NOT NULL DEFAULT FALSE",
    );
    const { rows } = await client.query(
      `SELECT id,email,username,db_user
       FROM users
       WHERE LOWER(email)=$1 OR LOWER(username)=$1
       FOR UPDATE`,
      [account],
    );
    if (!rows[0]) throw new Error("Không tìm thấy tài khoản");
    await client.query(
      "UPDATE users SET can_manage_contract_mac=TRUE,updated_at=NOW() WHERE id=$1",
      [rows[0].id],
    );
    if (rows[0].db_user) {
      const role = quoteIdentifier(rows[0].db_user);
      await client.query(`GRANT contract_security_admin TO ${role}`);
    }
    await client.query(
      `INSERT INTO audit_logs(user_id,action,entity_type,entity_id,new_values)
       VALUES($1,'GRANT_CONTRACT_SECURITY_ADMIN','user',$2,$3::jsonb)`,
      [rows[0].id, String(rows[0].id), JSON.stringify({ db_user: rows[0].db_user })],
    );
    const verification = await client.query(
      `SELECT can_manage_contract_mac AS app_granted,
        CASE WHEN db_user IS NULL THEN FALSE
             ELSE pg_has_role(db_user, 'contract_security_admin', 'MEMBER') END AS db_granted
       FROM users WHERE id=$1`,
      [rows[0].id],
    );
    await client.query("COMMIT");
    console.log(JSON.stringify({
      id: rows[0].id,
      email: rows[0].email,
      dbUser: rows[0].db_user,
      applicationPermission: verification.rows[0]?.app_granted === true,
      databaseRoleMembership: verification.rows[0]?.db_granted === true,
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await systemDatabase.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
