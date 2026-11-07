require("dotenv").config();
const { systemDatabase } = require("../database/database");

const main = async () => {
  const users = await systemDatabase.query(`
    SELECT u.id,u.username,u.db_user,u.role,sl.name clearance,sl.rank clearance_rank
    FROM users u LEFT JOIN security_levels sl ON sl.id=u.security_level_id
    WHERE LOWER(COALESCE(u.username,''))='giamdoc'
       OR LOWER(COALESCE(u.db_user,''))='giamdoc'
  `);
  const roles = await systemDatabase.query(`
    SELECT r.rolname,r.rolsuper,r.rolbypassrls,r.rolinherit,
      pg_has_role(r.rolname,'contract_security_admin','MEMBER') security_admin_member
    FROM pg_roles r
    WHERE LOWER(r.rolname)='giamdoc'
       OR r.rolname IN (SELECT db_user FROM users WHERE LOWER(COALESCE(username,''))='giamdoc')
  `);
  const table = await systemDatabase.query(`
    SELECT c.relrowsecurity,c.relforcerowsecurity,
           pg_get_userbyid(c.relowner) table_owner
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='contracts'
  `);
  const policies = await systemDatabase.query(`
    SELECT policyname,cmd,permissive,roles,qual,with_check
    FROM pg_policies WHERE schemaname='public' AND tablename='contracts'
    ORDER BY policyname
  `);
  console.dir({ users: users.rows, roles: roles.rows, table: table.rows[0], policies: policies.rows }, { depth: null });
};

main().catch((error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exitCode = 1;
}).finally(() => systemDatabase.end());
