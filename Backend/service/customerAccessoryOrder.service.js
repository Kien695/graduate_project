const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const create = (accessoryId, quantity, userId) =>
  withTransaction(async (client) => {
    const customerResult = await client.query(
      "SELECT id FROM customers WHERE user_id=$1 AND is_active IS DISTINCT FROM FALSE",
      [userId],
    );
    if (!customerResult.rows[0])
      throw new ErrorHandler("Không tìm thấy hồ sơ khách hàng", 404);

    const accessoryResult = await client.query(
      `SELECT id,name,price,stock,COALESCE(images,'[]'::jsonb) images
       FROM accessories WHERE id=$1 FOR UPDATE`,
      [accessoryId],
    );
    const accessory = accessoryResult.rows[0];
    if (!accessory) throw new ErrorHandler("Không tìm thấy phụ kiện", 404);
    if (Number(accessory.stock) < quantity)
      throw new ErrorHandler("Số lượng tồn kho không đủ", 409);

    const orderResult = await client.query(
      `INSERT INTO accessory_orders(customer_id,accessory_id,quantity,total_amount,created_by,status)
       VALUES($1,$2,$3,$4,$5,'pending')
       RETURNING id,accessory_id,quantity,total_amount,created_at,UPPER(status) status`,
      [
        customerResult.rows[0].id,
        accessory.id,
        quantity,
        accessory.price * quantity,
        userId,
      ],
    );
    await client.query(
      "UPDATE accessories SET stock=stock-$2,updated_at=NOW() WHERE id=$1",
      [accessory.id, quantity],
    );

    return {
      ...orderResult.rows[0],
      accessory_name: accessory.name,
      images: accessory.images,
    };
  });

const list = async (userId) => {
  const { rows } = await database.query(
    `SELECT
       ao.id,
       ao.accessory_id,
       a.name accessory_name,
       a.price,
       ao.quantity,
       ao.total_amount,
       ao.created_at,
       UPPER(ao.status) status,
       COALESCE(a.images,'[]'::jsonb) images
     FROM accessory_orders ao
     JOIN customers c ON c.id=ao.customer_id
     JOIN accessories a ON a.id=ao.accessory_id
     WHERE c.user_id=$1
     ORDER BY ao.created_at DESC`,
    [userId],
  );
  return rows;
};

const get = async (id, userId) => {
  const { rows } = await database.query(
    `SELECT
       ao.id,
       ao.accessory_id,
       a.name accessory_name,
       a.price,
       a.sku,
       ao.quantity,
       ao.total_amount,
       ao.note,
       ao.created_at,
       UPPER(ao.status) status,
       COALESCE(a.images,'[]'::jsonb) images
     FROM accessory_orders ao
     JOIN customers c ON c.id=ao.customer_id
     JOIN accessories a ON a.id=ao.accessory_id
     WHERE ao.id=$1 AND c.user_id=$2`,
    [id, userId],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy đơn hàng phụ kiện", 404);
  return rows[0];
};

const cancel = (id, userId) =>
  withTransaction(async (client) => {
    const owned = await client.query(
      `SELECT ao.id,ao.accessory_id,ao.quantity FROM accessory_orders ao
       JOIN customers c ON c.id=ao.customer_id
       WHERE ao.id=$1 AND c.user_id=$2 AND ao.status='pending' FOR UPDATE`,
      [id, userId],
    );
    if (!owned.rows[0])
      throw new ErrorHandler(
        "Đơn hàng không tồn tại hoặc không thể hủy ở trạng thái hiện tại",
        409,
      );
    const { rows } = await client.query(
      `UPDATE accessory_orders SET status='cancelled',updated_at=NOW()
       WHERE id=$1 RETURNING id,UPPER(status) status`,
      [id],
    );
    await client.query(
      "UPDATE accessories SET stock=stock+$2,updated_at=NOW() WHERE id=$1",
      [owned.rows[0].accessory_id, owned.rows[0].quantity],
    );
    return rows[0];
  });

module.exports = { create, list, get, cancel };
