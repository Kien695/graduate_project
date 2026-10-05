const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const notification = require("./notification.service");

const list = async (user) => {
  const own = user.role === "customer";
  const { rows } = await database.query(
    `SELECT ao.*,a.name accessory_name,COALESCE(a.images,'[]'::jsonb) images,c.full_name customer_name
     FROM accessory_orders ao
     JOIN accessories a ON a.id=ao.accessory_id
     JOIN customers c ON c.id=ao.customer_id
     ${own ? "JOIN users u ON u.id=c.user_id WHERE u.id=$1" : ""}
     ORDER BY ao.created_at DESC`,
    own ? [user.id] : [],
  );
  return rows;
};

const get = async (id, user) => {
  const ownClause =
    user?.role === "customer"
      ? "AND EXISTS(SELECT 1 FROM customers c WHERE c.id=accessory_orders.customer_id AND c.user_id=$2)"
      : "";
  const { rows } = await database.query(
    `SELECT accessory_orders.*,a.name accessory_name,COALESCE(a.images,'[]'::jsonb) images
     FROM accessory_orders JOIN accessories a ON a.id=accessory_orders.accessory_id
     WHERE accessory_orders.id=$1 ${ownClause}`,
    user?.role === "customer" ? [id, user.id] : [id],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy đơn hàng phụ kiện", 404);
  return rows[0];
};

const allowed = {
  confirmed: ["pending"],
  shipping: ["confirmed"],
  cancelled: ["pending", "confirmed", "shipping"],
  completed: ["shipping"],
};

const transition = (id, status, user) =>
  withTransaction(async (c) => {
    const o = await c.query(
      "SELECT * FROM accessory_orders WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!o.rows[0])
      throw new ErrorHandler("Không tìm thấy đơn hàng phụ kiện", 404);
    if (user.role === "customer") {
      const owner = await c.query(
        "SELECT 1 FROM customers WHERE id=$1 AND user_id=$2",
        [o.rows[0].customer_id, user.id],
      );
      if (!owner.rows[0] || status !== "cancelled" || o.rows[0].status !== "pending")
        throw new ErrorHandler(
          "Bạn không có quyền cập nhật đơn hàng này",
          403,
        );
    }
    if (!allowed[status].includes(o.rows[0].status))
      throw new ErrorHandler("Chuyển trạng thái đơn hàng không hợp lệ", 409);
    const { rows } = await c.query(
      "UPDATE accessory_orders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *",
      [id, status],
    );
    if (status === "cancelled")
      await c.query(
        "UPDATE accessories SET stock=stock+$2,updated_at=NOW() WHERE id=$1",
        [o.rows[0].accessory_id, o.rows[0].quantity],
      );
    await c.query(
      "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,new_values) VALUES($1,$2,'accessory_order',$3,$4)",
      [user.id, status, id, JSON.stringify({ status })],
    );
    if (user.role !== "customer")
      await notification.createForCustomer(c, o.rows[0].customer_id, {
        title: "Đơn hàng phụ kiện đã được cập nhật",
        message: `Đơn hàng phụ kiện #${id} đã chuyển sang trạng thái ${status}.`,
        type: "ORDER",
        referenceId: Number(id),
      });
    return rows[0];
  });

module.exports = { list, get, transition };
