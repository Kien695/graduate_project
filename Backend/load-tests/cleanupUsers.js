// Xóa các tài khoản khách thử (tai001, tai002, ...) và role PostgreSQL tương ứng.
// Chạy: node load-tests/cleanupUsers.js   (đọc thông tin kết nối từ Backend/.env)
require("dotenv").config({ quiet: true });
const { systemDatabase: db } = require("../database/database");
const { quoteIdentifier } = require("../service/databasePermission.service");

const PATTERN = `^${process.env.PREFIX || "tai"}[0-9]+$`;

(async () => {
  const client = await db.connect();
  const roles = [];
  try {
    await client.query("BEGIN");
    const users = await client.query(
      `SELECT id,db_user FROM users WHERE UPPER(role)='CUSTOMER' AND db_user ~ $1`,
      [PATTERN],
    );
    const userIds = users.rows.map((u) => u.id);
    roles.push(...users.rows.map((u) => u.db_user));
    if (!userIds.length) {
      console.log("Không có tài khoản thử nào để xóa.");
      await client.query("ROLLBACK");
      return;
    }
    const customers = await client.query("SELECT id FROM customers WHERE user_id=ANY($1)", [userIds]);
    const customerIds = customers.rows.map((c) => c.id);
    const orders = await client.query("SELECT id,vehicle_id,status FROM orders WHERE customer_id=ANY($1)", [customerIds]);
    const orderIds = orders.rows.map((o) => o.id);
    const blocking = await client.query(
      `SELECT (SELECT COUNT(*) FROM contracts WHERE order_id=ANY($1)) contracts,
              (SELECT COUNT(*) FROM inspections WHERE order_id=ANY($1)) inspections`,
      [orderIds],
    );
    if (Number(blocking.rows[0].contracts) || Number(blocking.rows[0].inspections))
      throw new Error("Tài khoản thử đã có hợp đồng/kiểm định, không xóa tự động để tránh mất dữ liệu.");

    // Trả lại tồn kho phụ kiện cho đơn còn hiệu lực
    await client.query(
      `UPDATE accessories a SET quantity=a.quantity+x.qty FROM (
         SELECT accessory_id,SUM(quantity) qty FROM accessory_orders
         WHERE customer_id=ANY($1) AND UPPER(status) IN ('PENDING','CONFIRMED','SHIPPING') GROUP BY accessory_id
       ) x WHERE a.id=x.accessory_id`,
      [customerIds],
    );
    await client.query("DELETE FROM accessory_orders WHERE customer_id=ANY($1)", [customerIds]);
    // Xe đang giữ chỗ vì đơn thử trở lại trạng thái còn hàng
    const reserved = orders.rows.filter((o) => ["pending", "confirmed"].includes(String(o.status).toLowerCase())).map((o) => o.vehicle_id);
    if (reserved.length)
      await client.query("UPDATE vehicles SET status='available',updated_at=NOW() WHERE id=ANY($1) AND LOWER(status)='reserved'", [reserved]);
    await client.query("DELETE FROM orders WHERE id=ANY($1)", [orderIds]);
    await client.query("DELETE FROM audit_logs WHERE user_id=ANY($1)", [userIds]);
    await client.query("DELETE FROM customers WHERE id=ANY($1)", [customerIds]);
    await client.query("DELETE FROM users WHERE id=ANY($1)", [userIds]);
    await client.query("COMMIT");
    console.log(`Đã xóa ${userIds.length} tài khoản và ${orderIds.length} đơn hàng thử.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Dọn dẹp thất bại:", error.message);
    process.exitCode = 1;
    return;
  } finally {
    client.release();
  }
  for (const role of roles) {
    try {
      await db.query(`DROP OWNED BY ${quoteIdentifier(role)}`);
      await db.query(`DROP ROLE IF EXISTS ${quoteIdentifier(role)}`);
    } catch (error) {
      console.error(`Không xóa được role ${role}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  console.log("Đã xóa role PostgreSQL tương ứng.");
})().finally(() => db.end());
