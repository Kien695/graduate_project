const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const auditLog = require("./auditLog.service");
const { decryptProfileValue } = require("../utils/profileEncryption");

const presentContract = (contract) => {
  contract.customer_email =
    decryptProfileValue(contract.customer_email_encrypted) ||
    contract.customer_email;
  delete contract.customer_email_encrypted;
  return contract;
};

const contractSelect = `
  SELECT
    c.id,
    c.order_id,
    c.contract_number,
    c.total_amount,
    c.terms,
    UPPER(c.status) status,
    c.created_at,
    c.signed_at,
    o.vehicle_id,
    cu.full_name customer_name,
    u.email customer_email,
    u.email_encrypted customer_email_encrypted,
    v.brand,
    v.model,
    v.price vehicle_price,
    COALESCE(v.images, '[]'::jsonb) images
  FROM contracts c
  JOIN orders o ON o.id = c.order_id
  JOIN customers cu ON cu.id = o.customer_id
  JOIN users u ON u.id = cu.user_id
  LEFT JOIN security_levels subject_level ON subject_level.id=u.security_level_id
  LEFT JOIN security_levels object_level ON object_level.id=c.security_level_id
  JOIN vehicles v ON v.id = o.vehicle_id`;

const list = async (userId) => {
  const { rows } = await database.query(
    `${contractSelect}
     WHERE cu.user_id=$1
       AND COALESCE(subject_level.rank,0)>=COALESCE(object_level.rank,0)
     ORDER BY c.created_at DESC`,
    [userId],
  );
  return rows.map(presentContract);
};

const get = async (id, userId, executor = database) => {
  const { rows } = await executor.query(
    `${contractSelect}
     WHERE c.id=$1 AND cu.user_id=$2
       AND COALESCE(subject_level.rank,0)>=COALESCE(object_level.rank,0)`,
    [id, userId],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
  return presentContract(rows[0]);
};

const confirm = (id, userId, ipAddress) =>
  withTransaction(async (client) => {
    const current = await client.query(
      `SELECT c.*
       FROM contracts c
       JOIN orders o ON o.id=c.order_id
       JOIN customers cu ON cu.id=o.customer_id
       WHERE c.id=$1 AND cu.user_id=$2
       FOR UPDATE OF c`,
      [id, userId],
    );
    const contract = current.rows[0];
    if (!contract) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
    if (String(contract.status).toLowerCase() !== "approved")
      throw new ErrorHandler(
        "Hợp đồng chưa ở trạng thái cho phép xác nhận",
        409,
      );

    const updated = await client.query(
      `UPDATE contracts
       SET status='signed',signed_at=NOW(),updated_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [id],
    );
    await auditLog.record(client, {
      userId,
      action: "SIGNED",
      entityType: "contract",
      entityId: id,
      oldValues: contract,
      newValues: updated.rows[0],
      ipAddress,
    });
    return get(id, userId, client);
  });

module.exports = { list, get, confirm };
