const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const getByOrder = async (orderId, userId) => {
  const { rows } = await database.query(
    `SELECT
       o.id order_id,
       o.vehicle_id,
       v.brand,
       v.model,
       i.id inspection_id,
       CASE
         WHEN LOWER(i.status) IN ('pass','passed') THEN 'PASS'
         WHEN LOWER(i.status) IN ('fail','failed') THEN 'FAIL'
         WHEN LOWER(i.status)='checking' THEN 'CHECKING'
         WHEN i.id IS NOT NULL THEN 'PENDING'
         ELSE 'NOT_STARTED'
       END status,
       COALESCE(i.inspected_at,i.inspection_date,i.created_at) inspection_date,
       COALESCE(i.notes,i.note) note
     FROM orders o
     JOIN customers c ON c.id=o.customer_id
     JOIN vehicles v ON v.id=o.vehicle_id
     LEFT JOIN LATERAL (
       SELECT inspection.*
       FROM inspections inspection
       WHERE inspection.vehicle_id=o.vehicle_id
         AND (inspection.order_id=o.id OR (inspection.order_id IS NULL AND (inspection.contract_id IS NULL OR EXISTS (
           SELECT 1 FROM contracts contract
           WHERE contract.id=inspection.contract_id AND contract.order_id=o.id
         ))))
       ORDER BY inspection.created_at DESC
       LIMIT 1
     ) i ON TRUE
     WHERE o.id=$1 AND c.user_id=$2`,
    [orderId, userId],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy đơn hàng", 404);
  return rows[0];
};

module.exports = { getByOrder };
