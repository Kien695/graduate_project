const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const TYPES = new Set(["CUSTOMER", "ORDER", "CONTRACT", "INSPECTION"]);

const create = async (executor, input) => {
  const db = executor || database;
  const type = String(input.type || "").toUpperCase();
  if (!TYPES.has(type))
    throw new ErrorHandler("Loại thông báo không hợp lệ", 400);
  const { rows } = await db.query(
    `INSERT INTO notifications(user_id,title,message,type,reference_id)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [input.userId, input.title, input.message, type, input.referenceId || null],
  );
  return rows[0];
};

const createForCustomer = async (executor, customerId, input) => {
  const db = executor || database;
  const { rows } = await db.query("SELECT user_id FROM customers WHERE id=$1", [
    customerId,
  ]);
  if (!rows[0]?.user_id) return null;
  return create(db, { ...input, userId: rows[0].user_id });
};

const list = async (userId) => {
  const { rows } = await database.query(
    `SELECT * FROM notifications WHERE user_id=$1
     ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return rows;
};

const get = async (id, userId) => {
  const { rows } = await database.query(
    "SELECT * FROM notifications WHERE id=$1 AND user_id=$2",
    [id, userId],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy thông báo", 404);
  return rows[0];
};

const markRead = async (id, userId) => {
  const { rows } = await database.query(
    `UPDATE notifications SET is_read=TRUE,updated_at=NOW()
     WHERE id=$1 AND user_id=$2 RETURNING *`,
    [id, userId],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy thông báo", 404);
  return rows[0];
};

module.exports = { create, createForCustomer, list, get, markRead };
