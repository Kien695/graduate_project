const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const notification = require('./notification.service');
const list = async (user) => {
  const own = user.role === "customer";
  const { rows } = await database.query(
    `SELECT o.*,v.brand,v.model,c.full_name customer_name FROM orders o JOIN vehicles v ON v.id=o.vehicle_id JOIN customers c ON c.id=o.customer_id ${own ? "JOIN users u ON u.id=c.user_id WHERE u.id=$1" : ""} ORDER BY o.created_at DESC`,
    own ? [user.id] : [],
  );
  return rows;
};
const get = async (id, user) => {
  const ownClause = user?.role === "customer" ? "AND EXISTS(SELECT 1 FROM customers c WHERE c.id=orders.customer_id AND c.user_id=$2)" : "";
  const { rows } = await database.query(`SELECT * FROM orders WHERE id=$1 ${ownClause}`, user?.role === "customer" ? [id, user.id] : [id]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy đơn hàng", 404);
  return rows[0];
};
const create = (input, user) =>
  withTransaction(async (c) => {
    const v = await c.query(
      "SELECT price,status FROM vehicles WHERE id=$1 FOR UPDATE",
      [input.vehicle_id],
    );
    if (!v.rows[0] || v.rows[0].status !== "available")
      throw new ErrorHandler("Xe không còn khả dụng", 409);
    const customer = await c.query(
      "SELECT id FROM customers WHERE id=$1 OR user_id=$2 LIMIT 1",
      [input.customer_id || null, user.id],
    );
    if (!customer.rows[0])
      throw new ErrorHandler("Không tìm thấy khách hàng", 404);
    const { rows } = await c.query(
      "INSERT INTO orders(customer_id,vehicle_id,total_amount,note,created_by,status) VALUES($1,$2,$3,$4,$5,'pending') RETURNING *",
      [
        customer.rows[0].id,
        input.vehicle_id,
        v.rows[0].price,
        input.note || null,
        user.id,
      ],
    );
    await c.query(
      "UPDATE vehicles SET status='reserved',updated_at=NOW() WHERE id=$1",
      [input.vehicle_id],
    );
    return rows[0];
  });
const transition = (id, status, user) =>
  withTransaction(async (c) => {
    const o = await c.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      id,
    ]);
    if (!o.rows[0]) throw new ErrorHandler("Không tìm thấy đơn hàng", 404);
    const allowed = {
      confirmed: ["pending"],
      cancelled: ["pending", "confirmed"],
      completed: ["confirmed"],
    };
    if (user.role === "customer") {
      const owner = await c.query("SELECT 1 FROM customers WHERE id=$1 AND user_id=$2", [o.rows[0].customer_id, user.id]);
      if (!owner.rows[0] || status !== "cancelled") throw new ErrorHandler("Bạn không có quyền cập nhật đơn hàng này", 403);
    }
    if (!allowed[status].includes(o.rows[0].status))
      throw new ErrorHandler("Chuyển trạng thái đơn hàng không hợp lệ", 409);
    const { rows } = await c.query(
      "UPDATE orders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *",
      [id, status],
    );
    await c.query(
      "UPDATE vehicles SET status=$2,updated_at=NOW() WHERE id=$1",
      [
        o.rows[0].vehicle_id,
        status === "cancelled"
          ? "available"
          : status === "completed"
            ? "sold"
            : "reserved",
      ],
    );
    await c.query(
      "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,new_values) VALUES($1,$2,'order',$3,$4)",
      [user.id, status, id, JSON.stringify({ status })],
    );
    if (user.role !== 'customer') await notification.createForCustomer(c, o.rows[0].customer_id, {
      title: 'Đơn hàng đã được cập nhật',
      message: `Đơn hàng #${id} đã chuyển sang trạng thái ${status}.`,
      type: 'ORDER', referenceId: Number(id),
    });
    return rows[0];
  });
const update = async (id, input) => {
  const { rows } = await database.query("UPDATE orders SET note=COALESCE($2,note),updated_at=NOW() WHERE id=$1 AND status IN ('pending','confirmed') RETURNING *", [id, input.note || null]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy đơn hoặc không thể cập nhật", 409);
  return rows[0];
};
module.exports = { list, get, create, update, transition };
