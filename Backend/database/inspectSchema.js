require("dotenv").config({ quiet: true });
const { database } = require("./database");
database.query(`SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)
  .then(async({rows})=>{for(const row of rows) console.log(`${row.table_name}.${row.column_name}: ${row.data_type}; nullable=${row.is_nullable}; default=${row.column_default||"-"}`);const stats=await database.query("SELECT CASE WHEN password_hash LIKE '$2%' THEN 'bcrypt' WHEN password_hash LIKE 'scrypt:%' THEN 'scrypt' ELSE 'other' END kind,COUNT(*)::int count FROM users GROUP BY 1");console.log("password_hash_formats:",stats.rows);const constraints=await database.query("SELECT conrelid::regclass::text table_name,conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace ORDER BY 1,2");console.log("check_constraints:",constraints.rows);})
  .catch((error)=>{console.error(error.message);process.exitCode=1;})
  .finally(()=>database.end());
