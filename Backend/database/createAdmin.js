require("dotenv").config({ quiet: true });
const { database } = require("./database");
const { hashPassword } = require("../utils/password");

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8)
    throw new Error(
      "ADMIN_EMAIL và ADMIN_PASSWORD (ít nhất 8 ký tự) là bắt buộc",
    );
  const level = await database.query(
    "SELECT id FROM security_levels ORDER BY rank DESC NULLS LAST,id DESC LIMIT 1",
  );
  const passwordHash = await hashPassword(password);
  const { rows } = await database.query(
    `INSERT INTO users(username,email,password_hash,full_name,role,security_level_id,status,is_active)
    VALUES($1,$1,$2,$3,'ADMIN',$4,'ACTIVE',TRUE)
    ON CONFLICT (LOWER(email)) WHERE email IS NOT NULL DO UPDATE SET password_hash=EXCLUDED.password_hash,role='ADMIN',is_active=TRUE,is_locked=FALSE
    RETURNING id,email,role`,
    [
      email,
      passwordHash,
      process.env.ADMIN_FULL_NAME || "System Administrator",
      level.rows[0]?.id || null,
    ],
  );
  console.log("Admin account is ready:", rows[0].email);
};
createAdmin()
  .catch((error) => {
    console.error("Create admin failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
