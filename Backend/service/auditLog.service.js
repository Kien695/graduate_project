const { database } = require("../database/database");

const record = async (client, { userId, action, entityType, entityId, oldValues, newValues, ipAddress }) => {
  const executor = client || database;
  await executor.query(
    `INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,new_values,ip_address)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [userId || null, action, entityType, entityId ? String(entityId) : null, oldValues || null, newValues || null, ipAddress || null],
  );
};

const list = async ({ entityType, entityId, userId, page = 1, limit = 20 }) => {
  limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  page = Math.max(Number(page) || 1, 1);
  const conditions = [];
  const values = [];
  if (entityType) { values.push(entityType); conditions.push(`entity_type=$${values.length}`); }
  if (entityId) { values.push(String(entityId)); conditions.push(`entity_id=$${values.length}`); }
  if (userId) { values.push(userId); conditions.push(`user_id=$${values.length}`); }
  values.push(limit, (page - 1) * limit);
  const { rows } = await database.query(
    `SELECT a.*,u.email user_email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
     ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY a.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { items: rows, page, limit };
};

module.exports = { record, list };
