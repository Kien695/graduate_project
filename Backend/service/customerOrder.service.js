const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const create = (vehicleId, userId) =>
  withTransaction(async (client) => {
    const customerResult = await client.query(
      "SELECT id FROM customers WHERE user_id=$1 AND is_active IS DISTINCT FROM FALSE",
      [userId],
    );
    if (!customerResult.rows[0])
      throw new ErrorHandler("Không tìm thấy hồ sơ khách hàng", 404);

    const vehicleResult = await client.query(
      `SELECT id,brand,model,price,status,COALESCE(images,'[]'::jsonb) images
       FROM vehicles WHERE id=$1 FOR UPDATE`,
      [vehicleId],
    );
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) throw new ErrorHandler("Không tìm thấy xe", 404);
    if (String(vehicle.status).toUpperCase() !== "AVAILABLE")
      throw new ErrorHandler("Xe đã được đặt hoặc không còn khả dụng", 409);

    const orderResult = await client.query(
      `INSERT INTO orders(customer_id,vehicle_id,total_amount,created_by,status)
       VALUES($1,$2,$3,$4,'pending')
       RETURNING id,vehicle_id,total_amount,created_at,COALESCE(order_date,created_at) order_date,UPPER(status) status`,
      [customerResult.rows[0].id, vehicle.id, vehicle.price, userId],
    );
    const reserved = await client.query(
      `UPDATE vehicles SET status='reserved',updated_at=NOW()
       WHERE id=$1 AND UPPER(status)='AVAILABLE' RETURNING id`,
      [vehicle.id],
    );
    if (!reserved.rows[0])
      throw new ErrorHandler("Xe vừa được khách hàng khác đặt", 409);

    return {
      ...orderResult.rows[0],
      brand: vehicle.brand,
      model: vehicle.model,
      images: vehicle.images,
    };
  });

const list = async (userId) => {
  const { rows } = await database.query(
    `SELECT
       o.id,
       o.vehicle_id,
       v.brand,
       v.model,
       v.price,
       o.total_amount,
       COALESCE(o.order_date,o.created_at) order_date,
       UPPER(o.status) status,
       COALESCE(v.images,'[]'::jsonb) images
     FROM orders o
     JOIN customers c ON c.id=o.customer_id
     JOIN vehicles v ON v.id=o.vehicle_id
     WHERE c.user_id=$1
     ORDER BY COALESCE(o.order_date,o.created_at) DESC`,
    [userId],
  );
  return rows;
};

module.exports = { create, list };
