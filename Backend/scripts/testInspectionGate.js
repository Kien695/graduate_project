require("dotenv").config({ quiet: true });
const assert = require("assert");
const { database } = require("../database/database");
const orderService = require("../service/order.service");

const run = async () => {
  // Tạo dữ liệu thử thật rồi dọn lại ở cuối (transition dùng transaction riêng nên không rollback chung được)
  const admin = (await database.query(
    "SELECT id,LOWER(role) role FROM users WHERE LOWER(role)='admin' LIMIT 1")).rows[0];
  const customer = (await database.query(
    "SELECT id FROM customers WHERE is_active=TRUE LIMIT 1")).rows[0];
  const level = (await database.query(
    "SELECT id FROM security_levels WHERE name='PUBLIC'")).rows[0];
  assert(admin && customer && level, "Cần có admin, customer và security level PUBLIC");

  const vehicle = (await database.query(
    `INSERT INTO vehicles(brand,model,price,status) VALUES('TEST','GATE',1,'reserved') RETURNING id`)).rows[0];
  const order = (await database.query(
    `INSERT INTO orders(customer_id,vehicle_id,total_amount,status)
     VALUES($1,$2,1,'confirmed') RETURNING id`, [customer.id, vehicle.id])).rows[0];
  const contract = (await database.query(
    `INSERT INTO contracts(order_id,customer_id,total_amount,status,security_level_id)
     VALUES($1,$2,1,'signed',$3) RETURNING id`, [order.id, customer.id, level.id])).rows[0];

  const complete = () => orderService.transition(order.id, "completed", admin);
  const setInspection = async (status) => {
    await database.query("DELETE FROM inspections WHERE order_id=$1", [order.id]);
    await database.query(
      `INSERT INTO inspections(vehicle_id,order_id,contract_id,inspector_id,status)
       VALUES($1,$2,$3,$4,$5)`, [vehicle.id, order.id, contract.id, admin.id, status]);
  };
  const expect409 = async (label) => {
    await assert.rejects(complete, (e) => e.statusCode === 409 || e.status === 409, label);
  };

  try {
    // Tình huống 1: chưa có phiếu -> bị chặn
    await expect409("chưa có phiếu phải bị chặn");
    // Tình huống 2: phiếu failed -> bị chặn
    await setInspection("failed");
    await expect409("phiếu failed phải bị chặn");
    // Tình huống 3: phiếu passed -> cho phép, xe thành sold
    await setInspection("passed");
    await complete();
    const v = (await database.query("SELECT status FROM vehicles WHERE id=$1", [vehicle.id])).rows[0];
    assert.equal(String(v.status).toLowerCase(), "sold");
    console.log("Inspection gate test passed (3/3)");
  } finally {
    await database.query("DELETE FROM audit_logs WHERE entity_type='order' AND entity_id=$1", [String(order.id)]);
    await database.query("DELETE FROM notifications WHERE type='ORDER' AND reference_id=$1", [order.id]).catch(() => {});
    await database.query("DELETE FROM inspections WHERE order_id=$1", [order.id]);
    await database.query("DELETE FROM contracts WHERE id=$1", [contract.id]);
    await database.query("DELETE FROM orders WHERE id=$1", [order.id]);
    await database.query("DELETE FROM vehicles WHERE id=$1", [vehicle.id]);
    await database.end();
  }
};
run().catch((e) => { console.error(e); process.exitCode = 1; });