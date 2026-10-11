const { database, withSystemTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { hashPassword } = require("../utils/password");
const audit = require("./auditLog.service");
const { quoteIdentifier } = require("./databasePermission.service");
const databaseSessions = require("./databaseSession.service");

const nullableUserReferences = Object.freeze([
  ["orders", "created_by"],
  ["contracts", "approved_by"],
  ["payments", "created_by"],
  ["inspections", "inspector_id"],
  ["audit_logs", "user_id"],
  ["backup_records", "created_by"],
  ["monitoring_alert_configs", "updated_by"],
  ["accessory_orders", "created_by"],
]);

const employeeSelect = `SELECT e.*,u.role,u.security_level_id,u.is_active,u.is_locked,u.last_login_at,
  sl.name security_level_name,sl.rank security_level_rank,u.db_user
  FROM employees e JOIN users u ON u.id=e.user_id
  LEFT JOIN security_levels sl ON sl.id=u.security_level_id`;

const requiredText = (value, field) => {
  if (!String(value || "").trim())
    throw new ErrorHandler(`${field} là bắt buộc`, 400);
  return String(value).trim();
};
const validId = (value, field = "id") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1)
    throw new ErrorHandler(`${field} không hợp lệ`, 400);
  return id;
};
const ensureSecurityLevel = async (client, value) => {
  const id = validId(value, "securityLevelId");
  const result = await client.query(
    "SELECT id FROM security_levels WHERE id=$1",
    [id],
  );
  if (!result.rows[0])
    throw new ErrorHandler("Không tìm thấy nhãn bảo mật", 400);
  return id;
};

const list = async (query = {}) => {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const values = [];
  let where = "";
  if (query.search) {
    values.push(`%${query.search}%`);
    where = ` WHERE (e.employee_code ILIKE $1 OR e.full_name ILIKE $1 OR e.email ILIKE $1 OR e.department ILIKE $1)`;
  }
  const count = await database.query(
    `SELECT COUNT(*)::int total FROM employees e${where}`,
    values,
  );
  values.push(limit, (page - 1) * limit);
  const { rows } = await database.query(
    `${employeeSelect}${where} ORDER BY e.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { items: rows, page, limit, total: count.rows[0].total };
};

const getById = async (id, client = database) => {
  const { rows } = await client.query(`${employeeSelect} WHERE e.id=$1`, [
    validId(id),
  ]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy nhân viên", 404);
  return rows[0];
};

const create = (input, actor) =>
  withSystemTransaction(async (client) => {
    const employeeCode = requiredText(
      input.employee_code ?? input.employeeCode,
      "employeeCode",
    );
    const fullName = requiredText(
      input.full_name ?? input.fullName,
      "fullName",
    );
    const email = requiredText(input.email, "email").toLowerCase();
    const password = requiredText(input.password, "password");
    if (!/^\S+@\S+\.\S+$/.test(email))
      throw new ErrorHandler("Email không hợp lệ", 400);
    if (password.length < 8)
      throw new ErrorHandler("Mật khẩu phải có ít nhất 8 ký tự", 400);
    const dbUsername = email.slice(0, email.indexOf("@")).toLowerCase();
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(dbUsername))
      throw new ErrorHandler("Phần trước @ phải là tên PostgreSQL hợp lệ (chữ thường, số và dấu gạch dưới)", 400);
    const roleExists = await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [dbUsername]);
    if (roleExists.rows[0])
      throw new ErrorHandler("Tên role PostgreSQL đã tồn tại", 409);
    const securityLevelId = await ensureSecurityLevel(
      client,
      input.security_level_id ?? input.securityLevelId,
    );
    const user = await client.query(
      `INSERT INTO users(username,password_hash,role,email,phone,full_name,security_level_id,status,is_active,is_locked,db_user,updated_at)
     VALUES($1,$2,'STAFF',$3,$4,$5,$6,'ACTIVE',TRUE,FALSE,$7,NOW()) RETURNING id`,
      [
        email,
        await hashPassword(password),
        email,
        input.phone || null,
        fullName,
        securityLevelId,
        dbUsername,
      ],
    );
    await client.query(`CREATE ROLE ${quoteIdentifier(dbUsername)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD ${client.escapeLiteral(password)}`);
    const result = await client.query(
      `INSERT INTO employees(user_id,employee_code,full_name,phone,email,position,department)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        user.rows[0].id,
        employeeCode,
        fullName,
        input.phone || null,
        email,
        input.position || null,
        input.department || null,
      ],
    );
    const employee = await getById(result.rows[0].id, client);
    await audit.record(client, {
      userId: actor.userId,
      action: "CREATE",
      entityType: "employees",
      entityId: employee.id,
      newValues: employee,
      ipAddress: actor.ipAddress,
    });
    return employee;
  });

const update = (id, input, actor) =>
  withSystemTransaction(async (client) => {
    const old = await getById(id, client);
    const employeeCode = requiredText(
      input.employee_code ?? input.employeeCode ?? old.employee_code,
      "employeeCode",
    );
    const fullName = requiredText(
      input.full_name ?? input.fullName ?? old.full_name,
      "fullName",
    );
    const email = requiredText(input.email ?? old.email, "email").toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      throw new ErrorHandler("Email không hợp lệ", 400);
    const phone = input.phone !== undefined ? input.phone || null : old.phone;
    if (input.password) {
      if (String(input.password).length < 8)
        throw new ErrorHandler("Mật khẩu phải có ít nhất 8 ký tự", 400);
      let dbUsername = old.db_user;
      if (!dbUsername) {
        dbUsername = email.slice(0, email.indexOf("@")).toLowerCase();
        if (!/^[a-z_][a-z0-9_]{0,62}$/.test(dbUsername))
          throw new ErrorHandler("Không thể tạo tên role PostgreSQL từ email này", 400);
        const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [dbUsername]);
        if (exists.rows[0])
          throw new ErrorHandler("Tên role PostgreSQL đã tồn tại; không tự động liên kết role có sẵn", 409);
        await client.query(`CREATE ROLE ${quoteIdentifier(dbUsername)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD ${client.escapeLiteral(input.password)}`);
      } else {
        await client.query(`ALTER ROLE ${quoteIdentifier(dbUsername)} PASSWORD ${client.escapeLiteral(input.password)}`);
      }
      await client.query(
        "UPDATE users SET password_hash=$2,password_changed_at=NOW(),db_user=$3 WHERE id=$1",
        [old.user_id, await hashPassword(input.password), dbUsername],
      );
      const revoked = await client.query(
        "UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL RETURNING id",
        [old.user_id],
      );
      await databaseSessions.closeUserSessions(revoked.rows.map((x) => x.id));
    }
    await client.query(
      `UPDATE employees SET employee_code=$2,full_name=$3,phone=$4,email=$5,position=$6,department=$7,updated_at=NOW() WHERE id=$1`,
      [
        old.id,
        employeeCode,
        fullName,
        phone,
        email,
        input.position !== undefined ? input.position || null : old.position,
        input.department !== undefined
          ? input.department || null
          : old.department,
      ],
    );
    await client.query(
      "UPDATE users SET email=$2,username=$2,full_name=$3,phone=$4,updated_at=NOW() WHERE id=$1",
      [old.user_id, email, fullName, phone],
    );
    const employee = await getById(old.id, client);
    await audit.record(client, {
      userId: actor.userId,
      action: "UPDATE",
      entityType: "employees",
      entityId: old.id,
      oldValues: old,
      newValues: employee,
      ipAddress: actor.ipAddress,
    });
    return employee;
  });

const deactivate = (id, actor) =>
  withSystemTransaction(async (client) => {
    const old = await getById(id, client);
    await client.query(
      "UPDATE users SET is_active=FALSE,status='INACTIVE',updated_at=NOW() WHERE id=$1",
      [old.user_id],
    );
    await client.query(
      "UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",
      [old.user_id],
    );
    const employee = await getById(old.id, client);
    await audit.record(client, {
      userId: actor.userId,
      action: "DEACTIVATE",
      entityType: "employees",
      entityId: old.id,
      oldValues: old,
      newValues: employee,
      ipAddress: actor.ipAddress,
    });
    return employee;
  });

const activate = (id, actor) =>
  withSystemTransaction(async (client) => {
    const old = await getById(id, client);
    await client.query(
      "UPDATE users SET is_active=TRUE,status='ACTIVE',updated_at=NOW() WHERE id=$1",
      [old.user_id],
    );
    const employee = await getById(old.id, client);
    await audit.record(client, {
      userId: actor.userId,
      action: "ACTIVATE",
      entityType: "employees",
      entityId: old.id,
      oldValues: old,
      newValues: employee,
      ipAddress: actor.ipAddress,
    });
    return employee;
  });

const setSecurityLevel = (id, value, actor) =>
  withSystemTransaction(async (client) => {
    const old = await getById(id, client);
    const securityLevelId = await ensureSecurityLevel(client, value);
    await client.query(
      "UPDATE users SET security_level_id=$2,updated_at=NOW() WHERE id=$1",
      [old.user_id, securityLevelId],
    );
    const employee = await getById(old.id, client);
    await audit.record(client, {
      userId: actor.userId,
      action: "ASSIGN_SECURITY_LEVEL",
      entityType: "employees",
      entityId: old.id,
      oldValues: { security_level_id: old.security_level_id },
      newValues: { security_level_id: employee.security_level_id },
      ipAddress: actor.ipAddress,
    });
    return employee;
  });

const roleIdentifier = (value) =>
  `"${String(value).replace(/"/g, '""')}"`;

const clearHistoricalUserReferences = async (client, userId) => {
  const existing = await client.query(
    `SELECT table_name,column_name,is_nullable
     FROM information_schema.columns
     WHERE table_schema='public'
       AND (table_name,column_name) IN (
         SELECT * FROM unnest($1::text[],$2::text[])
       )`,
    [
      nullableUserReferences.map(([table]) => table),
      nullableUserReferences.map(([, column]) => column),
    ],
  );
  for (const { table_name: table, column_name: column, is_nullable: nullable } of existing.rows) {
    if (nullable !== "YES")
      throw new ErrorHandler(
        `Không thể xóa an toàn vì ${table}.${column} bắt buộc phải giữ liên kết nhân viên`,
        409,
      );
    await client.query(
      `UPDATE ${quoteIdentifier(table)} SET ${quoteIdentifier(column)}=NULL WHERE ${quoteIdentifier(column)}=$1`,
      [userId],
    );
  }
};

const findBlockingUserReferences = async (client, userId) => {
  const { rows } = await client.query(
    `SELECT ns.nspname schema_name,cl.relname table_name,a.attname column_name
     FROM pg_constraint c
     JOIN pg_class cl ON cl.oid=c.conrelid
     JOIN pg_namespace ns ON ns.oid=cl.relnamespace
     JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
     WHERE c.contype='f' AND c.confrelid='users'::regclass
       AND array_length(c.conkey,1)=1 AND ns.nspname='public'
       AND NOT (cl.relname='employees' AND a.attname='user_id')
       AND NOT (cl.relname IN ('user_sessions','notifications') AND a.attname='user_id')`,
  );
  const cleared = new Set(nullableUserReferences.map(([table, column]) => `${table}.${column}`));
  const blockers = [];
  for (const row of rows) {
    if (cleared.has(`${row.table_name}.${row.column_name}`)) continue;
    const count = await client.query(
      `SELECT COUNT(*)::int total FROM ${roleIdentifier(row.schema_name)}.${roleIdentifier(row.table_name)} WHERE ${roleIdentifier(row.column_name)}=$1`,
      [userId],
    );
    if (count.rows[0].total)
      blockers.push(`${row.table_name}.${row.column_name} (${count.rows[0].total} bản ghi)`);
  }
  return blockers;
};

const removeDatabaseRole = async (client, dbUser, userId) => {
  if (!dbUser) return { roleDeleted: false };
  const shared = await client.query(
    "SELECT id FROM users WHERE LOWER(db_user)=LOWER($1) AND id<>$2 LIMIT 1",
    [dbUser, userId],
  );
  if (shared.rows[0])
    throw new ErrorHandler("Không thể xóa: role PostgreSQL đang được tài khoản ứng dụng khác sử dụng", 409);

  const roleResult = await client.query(
    `SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls
     FROM pg_roles WHERE rolname=$1`,
    [dbUser],
  );
  const role = roleResult.rows[0];
  if (!role) return { roleDeleted: false };
  const current = (await client.query(
    `SELECT current_user,current_database(),pg_get_userbyid(datdba) database_owner
     FROM pg_database WHERE datname=current_database()`,
  )).rows[0];
  const configuredProtected = [
    process.env.DB_USER,
    process.env.PGUSER,
    process.env.DB_ADMIN_ROLE,
    ...(process.env.DB_PROTECTED_ROLES || "").split(","),
  ].filter(Boolean).map((name) => String(name).trim().toLowerCase());
  if (
    dbUser.startsWith("pg_") ||
    configuredProtected.includes(dbUser.toLowerCase()) ||
    dbUser.toLowerCase() === String(current.current_user).toLowerCase() ||
    dbUser.toLowerCase() === String(current.database_owner).toLowerCase() ||
    role.rolsuper || role.rolcreaterole || role.rolcreatedb ||
    role.rolreplication || role.rolbypassrls
  )
    throw new ErrorHandler("Không thể xóa role PostgreSQL hệ thống hoặc role quản trị được bảo vệ", 409);

  const sessions = await client.query(
    "SELECT pg_terminate_backend(pid) terminated FROM pg_stat_activity WHERE usename=$1 AND pid<>pg_backend_pid()",
    [dbUser],
  );
  if (sessions.rows.some((row) => row.terminated !== true))
    throw new ErrorHandler("Không thể đóng toàn bộ kết nối PostgreSQL của nhân viên", 409);

  const memberships = await client.query(
    `SELECT parent.rolname parent_role,member.rolname member_role
     FROM pg_auth_members m
     JOIN pg_roles parent ON parent.oid=m.roleid
     JOIN pg_roles member ON member.oid=m.member
     WHERE parent.rolname=$1 OR member.rolname=$1`,
    [dbUser],
  );
  const target = quoteIdentifier(dbUser);
  const newOwner = roleIdentifier(current.current_user);
  // PostgreSQL 16/Neon grants the creator ADMIN OPTION but can leave SET FALSE.
  // REASSIGN OWNED requires SET membership in the source role, so enable it
  // temporarily and revoke every membership again before dropping the role.
  await client.query(`GRANT ${target} TO ${newOwner} WITH SET TRUE`);
  await client.query(`REASSIGN OWNED BY ${target} TO ${newOwner}`);
  // Ownership has already been transferred. This non-CASCADE statement only
  // removes remaining grants belonging to the role; it never drops business objects.
  await client.query(`DROP OWNED BY ${target}`);
  for (const membership of memberships.rows) {
    await client.query(
      `REVOKE ${roleIdentifier(membership.parent_role)} FROM ${roleIdentifier(membership.member_role)}`,
    );
  }
  await client.query(`DROP ROLE ${target}`);
  return { roleDeleted: true };
};

const permanentlyDelete = async (id, actor) => {
  let sessionIds = [];
  try {
    return await withSystemTransaction(async (client) => {
      const employee = await getById(id, client);
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [employee.user_id]);
      if (Number(employee.user_id) === Number(actor.userId))
        throw new ErrorHandler("Quản trị viên không thể xóa chính tài khoản của mình", 409);
      if (String(employee.role).toLowerCase() === "admin")
        throw new ErrorHandler("Không thể xóa tài khoản admin bằng chức năng này", 409);
      if (String(employee.role).toLowerCase() !== "staff")
        throw new ErrorHandler("Chức năng này chỉ được dùng để xóa tài khoản nhân viên", 409);

      const blockers = await findBlockingUserReferences(client, employee.user_id);
      if (blockers.length)
        throw new ErrorHandler(
          "Không thể xóa nhân viên vì còn dữ liệu bắt buộc phải giữ liên kết",
          409,
          blockers.map((message) => ({ message })),
        );

      await client.query(
        "UPDATE users SET is_active=FALSE,is_locked=TRUE,status='INACTIVE',updated_at=NOW() WHERE id=$1",
        [employee.user_id],
      );
      const revoked = await client.query(
        "UPDATE user_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id=$1 RETURNING id",
        [employee.user_id],
      );
      sessionIds = revoked.rows.map(({ id: sessionId }) => sessionId);
      await databaseSessions.closeUserSessions(sessionIds);
      await clearHistoricalUserReferences(client, employee.user_id);
      await audit.record(client, {
        userId: actor.userId,
        action: "PERMANENT_DELETE",
        entityType: "employees",
        entityId: employee.id,
        oldValues: employee,
        newValues: { deleted: true, dbRole: employee.db_user || null },
        ipAddress: actor.ipAddress,
      });
      await client.query("DELETE FROM employees WHERE id=$1", [employee.id]);
      await client.query("DELETE FROM users WHERE id=$1", [employee.user_id]);
      const roleResult = await removeDatabaseRole(client, employee.db_user, employee.user_id);
      return { id: employee.id, ...roleResult };
    });
  } catch (error) {
    if (error.code === "42501")
      throw new ErrorHandler(
        "Tài khoản kết nối PostgreSQL không đủ quyền quản lý role nhân viên; dữ liệu nhân viên chưa bị xóa",
        409,
      );
    if (["2BP01", "55006"].includes(error.code))
      throw new ErrorHandler(
        "Không thể xóa role PostgreSQL vì còn đối tượng hoặc phụ thuộc ngoài phạm vi xử lý; dữ liệu nhân viên chưa bị xóa",
        409,
      );
    throw error;
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
  activate,
  setSecurityLevel,
  permanentlyDelete,
};
