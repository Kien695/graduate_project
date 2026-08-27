const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const {
  encryptCustomerProfile,
  decryptCustomerProfile,
  emailLookupHash,
} = require("../utils/profileEncryption");

const configs = {
  customers: {
    fields: [
      "user_id",
      "full_name",
      "email",
      "phone",
      "address",
      "encrypted_profile",
      "cccd_encrypted",
      "email_encrypted",
      "phone_encrypted",
      "address_encrypted",
      "is_active",
    ],
  },
  vehicles: {
    fields: [
      "vin",
      "brand",
      "model",
      "manufacture_year",
      "color",
      "price",
      "status",
      "description",
      "images",
    ],
  },
  accessories: { fields: ["name", "sku", "price", "stock", "is_active", "images"] },
};
const config = (table) =>
  configs[table] ||
  (() => {
    throw new ErrorHandler("Resource không hợp lệ", 500);
  })();
const validateInput = (table, input) => {
  if (table !== "accessories") return;
  if (input.name !== undefined && !String(input.name).trim())
    throw new ErrorHandler("Tên phụ kiện không được để trống", 400);
  if (input.sku !== undefined && !String(input.sku).trim())
    throw new ErrorHandler("Mã SKU không được để trống", 400);
  if (input.price !== undefined && (!Number.isFinite(Number(input.price)) || Number(input.price) < 0))
    throw new ErrorHandler("Giá phụ kiện không hợp lệ", 400);
  if (input.stock !== undefined && (!Number.isInteger(Number(input.stock)) || Number(input.stock) < 0))
    throw new ErrorHandler("Số lượng tồn kho phải là số nguyên không âm", 400);
};
const prepareInput = (table, input) => {
  if (table !== "customers") return input;
  const encrypted = encryptCustomerProfile(input);
  return {
    ...input,
    ...encrypted,
    ...(input.email !== undefined ? { email: null } : {}),
    ...(input.phone !== undefined ? { phone: null } : {}),
    ...(input.address !== undefined ? { address: null } : {}),
  };
};
const present = (table, row) =>
  table === "customers" ? decryptCustomerProfile(row) : row;
const syncCustomerUser = async (client, customer, source) => {
  if (!customer.user_id || (source.email === undefined && source.phone === undefined)) return;
  await client.query(
    `UPDATE users SET
       email=CASE WHEN $2::boolean THEN NULL ELSE email END,
       email_encrypted=CASE WHEN $2::boolean THEN $3 ELSE email_encrypted END,
       email_lookup_hash=CASE WHEN $2::boolean THEN $4 ELSE email_lookup_hash END,
       phone=CASE WHEN $5::boolean THEN NULL ELSE phone END,
       phone_encrypted=CASE WHEN $5::boolean THEN $6 ELSE phone_encrypted END,
       updated_at=NOW() WHERE id=$1`,
    [customer.user_id,source.email !== undefined,customer.email_encrypted,
      source.email !== undefined ? emailLookupHash(source.email) : null,
      source.phone !== undefined,customer.phone_encrypted],
  );
};
const list = async (table, query = {}) => {
  config(table);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const values = [];
  const where = [];
  if (query.status && table === "vehicles") {
    values.push(query.status);
    where.push(`status=$${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    const p = `$${values.length}`;
    where.push(
      table === "vehicles"
        ? `(brand ILIKE ${p} OR model ILIKE ${p} OR vin ILIKE ${p})`
        : table === "customers"
          ? `(full_name ILIKE ${p})`
          : `(name ILIKE ${p})`,
    );
  }
  values.push(limit, (page - 1) * limit);
  const { rows } = await database.query(
    `SELECT * FROM ${table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { items: rows.map((row) => present(table, row)), page, limit };
};
const get = async (table, id) => {
  config(table);
  const { rows } = await database.query(`SELECT * FROM ${table} WHERE id=$1`, [
    id,
  ]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy dữ liệu", 404);
  return present(table, rows[0]);
};
const create = async (table, input) => {
  const source = input;
  input = prepareInput(table, input);
  validateInput(table, input);
  const fields = config(table).fields.filter((f) => input[f] !== undefined);
  if (!fields.length) throw new ErrorHandler("Không có dữ liệu hợp lệ", 400);
  const values = fields.map((f) => input[f]);
  const params = values.map((_, i) => `$${i + 1}`);
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO ${table}(${fields.join(",")}) VALUES(${params.join(",")}) RETURNING *`,
      values,
    );
    if (table === "customers") await syncCustomerUser(client, rows[0], source);
    return present(table, rows[0]);
  });
};
const update = async (table, id, input) => {
  const source = input;
  input = prepareInput(table, input);
  validateInput(table, input);
  const fields = config(table).fields.filter((f) => input[f] !== undefined);
  if (!fields.length) throw new ErrorHandler("Không có dữ liệu hợp lệ", 400);
  const values = fields.map((f) => input[f]);
  const sets = fields.map((f, i) => `${f}=$${i + 2}`);
  return withTransaction(async (client) => {
    const { rows } = await client.query(
    `UPDATE ${table} SET ${sets.join(",")},updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, ...values],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy dữ liệu", 404);
    if (table === "customers") await syncCustomerUser(client, rows[0], source);
    return present(table, rows[0]);
  });
};
const remove = async (table, id) => {
  config(table);
  const soft = ["customers"].includes(table);
  const sql = soft
    ? `UPDATE ${table} SET is_active=FALSE,updated_at=NOW() WHERE id=$1 RETURNING id`
    : `DELETE FROM ${table} WHERE id=$1 RETURNING id`;
  const { rows } = await database.query(sql, [id]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy dữ liệu", 404);
  return rows[0];
};
module.exports = { list, get, create, update, remove };
