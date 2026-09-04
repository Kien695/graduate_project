const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { hashPassword } = require("../utils/password");
const audit = require("./auditLog.service");

const employeeSelect = `SELECT e.*,u.role,u.security_level_id,u.is_active,u.is_locked,u.last_login_at,
  sl.name security_level_name,sl.rank security_level_rank
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
  withTransaction(async (client) => {
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
    const securityLevelId = await ensureSecurityLevel(
      client,
      input.security_level_id ?? input.securityLevelId,
    );
    const user = await client.query(
      `INSERT INTO users(username,password_hash,role,email,phone,full_name,security_level_id,status,is_active,is_locked,updated_at)
     VALUES($1,$2,'STAFF',$3,$4,$5,$6,'ACTIVE',TRUE,FALSE,NOW()) RETURNING id`,
      [
        email,
        await hashPassword(password),
        email,
        input.phone || null,
        fullName,
        securityLevelId,
      ],
    );
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
  withTransaction(async (client) => {
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
  withTransaction(async (client) => {
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

const setSecurityLevel = (id, value, actor) =>
  withTransaction(async (client) => {
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

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
  setSecurityLevel,
};
