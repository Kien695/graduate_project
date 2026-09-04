const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const auditLog = require("./auditLog.service");
const { decryptProfileValue } = require("../utils/profileEncryption");
const notification = require("./notification.service");

const list = async (user) => {
  const values = [user.id];
  const access = `WHERE COALESCE(sl.rank,0) <= COALESCE(
      (SELECT us.rank FROM users ux LEFT JOIN security_levels us ON us.id = ux.security_level_id WHERE ux.id = $1), 0
    )
    AND mac_categories_dominate(
      (SELECT categories FROM users WHERE id = $1),
      c.categories
    )`;
  const { rows } = await database.query(
    `SELECT c.*,o.customer_id,o.vehicle_id,o.total_amount order_total_amount,
    cu.full_name customer_name,v.brand vehicle_brand,v.model vehicle_model,v.vin,
    sl.name security_level_name,COALESCE(SUM(p.amount),0) paid_amount
    FROM contracts c JOIN orders o ON o.id=c.order_id LEFT JOIN payments p ON p.contract_id=c.id
    LEFT JOIN customers cu ON cu.id=o.customer_id LEFT JOIN vehicles v ON v.id=o.vehicle_id
    LEFT JOIN security_levels sl ON sl.id=c.security_level_id ${access}
    GROUP BY c.id,o.customer_id,o.vehicle_id,o.total_amount,cu.full_name,v.brand,v.model,v.vin,sl.name ORDER BY c.created_at DESC`,
    values,
  );
  return rows;
};

const get = async (id) => {
  const { rows } = await database.query(
    `SELECT c.*,o.customer_id,o.vehicle_id,o.total_amount order_total_amount,
    cu.full_name customer_name,cu.email customer_email,cu.phone customer_phone,
    cu.email_encrypted customer_email_encrypted,cu.phone_encrypted customer_phone_encrypted,
    v.brand vehicle_brand,v.model vehicle_model,v.vin,sl.name security_level_name,sl.rank security_level_rank,
    COALESCE(SUM(p.amount),0) paid_amount
    FROM contracts c JOIN orders o ON o.id=c.order_id LEFT JOIN payments p ON p.contract_id=c.id
    LEFT JOIN customers cu ON cu.id=o.customer_id LEFT JOIN vehicles v ON v.id=o.vehicle_id
    LEFT JOIN security_levels sl ON sl.id=c.security_level_id
    WHERE c.id=$1 GROUP BY c.id,o.customer_id,o.vehicle_id,o.total_amount,cu.full_name,
    cu.email,cu.phone,cu.email_encrypted,cu.phone_encrypted,
    v.brand,v.model,v.vin,sl.name,sl.rank`,
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
  rows[0].customer_email =
    decryptProfileValue(rows[0].customer_email_encrypted) ||
    rows[0].customer_email;
  rows[0].customer_phone =
    decryptProfileValue(rows[0].customer_phone_encrypted) ||
    rows[0].customer_phone;
  delete rows[0].customer_email_encrypted;
  delete rows[0].customer_phone_encrypted;
  const payments = await database.query(
    `SELECT p.*,u.full_name created_by_name FROM payments p LEFT JOIN users u ON u.id=p.created_by WHERE p.contract_id=$1 ORDER BY p.paid_at DESC`,
    [id],
  );
  return { ...rows[0], payments: payments.rows };
};

// classification = { levelId, categoryIds } — đã được middleware
// enforceContractCreate xác thực xong (level do subject chi phối, categories
// tồn tại và được subject chi phối). Service KHÔNG tự tính hay validate lại
// nhãn nữa, chỉ dùng đúng giá trị này để tránh lệch với cái middleware đã
// kiểm tra.
const create = (input, classification, user, ipAddress) =>
  withTransaction(async (client) => {
    if (!classification)
      throw new ErrorHandler("Thieu ngu canh phan loai MAC", 500);

    const order = await client.query(
      "SELECT * FROM orders WHERE id=$1 FOR UPDATE",
      [input.order_id],
    );
    if (!order.rows[0] || order.rows[0].status?.toLowerCase() !== "confirmed")
      throw new ErrorHandler(
        "Đơn hàng phải được xác nhận trước khi lập hợp đồng",
        409,
      );

    const number = input.contract_number || `HD-${Date.now()}`;
    const { rows } = await client.query(
      `INSERT INTO contracts(order_id, customer_id, contract_number, total_amount, terms,
     security_level_id, categories, status)
   VALUES($1,$2,$3,$4,$5,$6,$7,'draft') RETURNING *`,
      [
        input.order_id,
        order.rows[0].customer_id,
        number,
        order.rows[0].total_amount,
        input.terms || null,
        classification.levelId,
        classification.categoryIds,
      ],
    );
    await auditLog.record(client, {
      userId: user.id,
      action: "CREATE",
      entityType: "contract",
      entityId: rows[0].id,
      newValues: rows[0],
      ipAddress,
    });
    return rows[0];
  });

const update = (id, input, user, ipAddress) =>
  withTransaction(async (client) => {
    const old = await client.query(
      "SELECT * FROM contracts WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!old.rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
    if (!["draft", "approved"].includes(old.rows[0].status))
      throw new ErrorHandler(
        "Không thể sửa hợp đồng ở trạng thái hiện tại",
        409,
      );
    const { rows } = await client.query(
      "UPDATE contracts SET terms=COALESCE($2,terms),contract_number=COALESCE($3,contract_number),updated_at=NOW() WHERE id=$1 RETURNING *",
      [id, input.terms || null, input.contract_number || null],
    );
    await auditLog.record(client, {
      userId: user.id,
      action: "UPDATE",
      entityType: "contract",
      entityId: id,
      oldValues: old.rows[0],
      newValues: rows[0],
      ipAddress,
    });
    await notification.createForCustomer(client, old.rows[0].customer_id, {
      title: "Hợp đồng đã được cập nhật",
      message: `Hợp đồng ${rows[0].contract_number} vừa được cập nhật.`,
      type: "CONTRACT",
      referenceId: Number(id),
    });
    return rows[0];
  });

const setStatus = (id, status, user, ipAddress) =>
  withTransaction(async (client) => {
    const old = await client.query(
      "SELECT * FROM contracts WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!old.rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
    const allowed = {
      approved: ["draft"],
      signed: ["approved"],
      cancelled: ["draft", "approved"],
    };
    if (!allowed[status]?.includes(old.rows[0].status))
      throw new ErrorHandler("Chuyển trạng thái hợp đồng không hợp lệ", 409);
    // Status comes exclusively from the allow-list above. Using a fixed literal also
    // avoids ambiguous text/varchar parameter inference on legacy PostgreSQL schemas.
    const safeStatus = Object.prototype.hasOwnProperty.call(allowed, status)
      ? status
      : null;
    if (!safeStatus)
      throw new ErrorHandler(
        "Tráº¡ng thÃ¡i há»£p Ä‘á»“ng khÃ´ng há»£p lá»‡",
        400,
      );
    const { rows } = await client.query(
      `UPDATE contracts SET status='${safeStatus}',approved_by=CASE WHEN $3 THEN $2 ELSE approved_by END,
    approved_at=CASE WHEN $3 THEN NOW() ELSE approved_at END,signed_at=CASE WHEN $4 THEN NOW() ELSE signed_at END,updated_at=NOW()
    WHERE id=$1 RETURNING *`,
      [id, user.id, status === "approved", status === "signed"],
    );
    await auditLog.record(client, {
      userId: user.id,
      action: status.toUpperCase(),
      entityType: "contract",
      entityId: id,
      oldValues: old.rows[0],
      newValues: rows[0],
      ipAddress,
    });
    await notification.createForCustomer(client, old.rows[0].customer_id, {
      title: "Trạng thái hợp đồng đã thay đổi",
      message: `Hợp đồng ${rows[0].contract_number} đã chuyển sang trạng thái ${status}.`,
      type: "CONTRACT",
      referenceId: Number(id),
    });
    return rows[0];
  });

const addPayment = (id, input, user, ipAddress) =>
  withTransaction(async (client) => {
    const contract = await client.query(
      `SELECT c.*,o.total_amount FROM contracts c JOIN orders o ON o.id=c.order_id WHERE c.id=$1 FOR UPDATE`,
      [id],
    );
    if (
      !contract.rows[0] ||
      !["approved", "signed", "completed"].includes(contract.rows[0].status)
    )
      throw new ErrorHandler("Hợp đồng chưa đủ điều kiện thanh toán", 409);
    const paid = await client.query(
      "SELECT COALESCE(SUM(amount),0) total FROM payments WHERE contract_id=$1",
      [id],
    );
    if (
      Number(input.amount) <= 0 ||
      Number(paid.rows[0].total) + Number(input.amount) >
        Number(contract.rows[0].total_amount)
    )
      throw new ErrorHandler("Số tiền thanh toán không hợp lệ", 400);
    const { rows } = await client.query(
      "INSERT INTO payments(contract_id,amount,method,reference,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [
        id,
        input.amount,
        input.method || null,
        input.reference || null,
        user.id,
      ],
    );
    if (
      Number(paid.rows[0].total) + Number(input.amount) ===
      Number(contract.rows[0].total_amount)
    )
      await client.query(
        "UPDATE contracts SET status='completed',updated_at=NOW() WHERE id=$1",
        [id],
      );
    await auditLog.record(client, {
      userId: user.id,
      action: "PAYMENT",
      entityType: "contract",
      entityId: id,
      newValues: rows[0],
      ipAddress,
    });
    return rows[0];
  });

// classification = { levelId, categoryIds } — đã được middleware
// enforceContractSecurityChange xác thực xong (subject chi phối cả nhãn cũ
// lẫn nhãn mới của hợp đồng này). Không còn tự query lại security_levels để
// validate — đó là việc của middleware, làm lại ở đây là trùng lặp và có
// nguy cơ hai nơi lệch thông báo lỗi với nhau theo thời gian.
const setSecurityLevel = (id, classification, user, ipAddress) =>
  withTransaction(async (client) => {
    if (!classification)
      throw new ErrorHandler("Thieu ngu canh phan loai MAC", 500);

    const old = await client.query(
      "SELECT * FROM contracts WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!old.rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);

    const { rows } = await client.query(
      `UPDATE contracts SET security_level_id=$2, categories=$3, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id, classification.levelId, classification.categoryIds],
    );
    await auditLog.record(client, {
      userId: user.id,
      action: "SECURITY_LEVEL",
      entityType: "contract",
      entityId: id,
      oldValues: {
        security_level_id: old.rows[0].security_level_id,
        categories: old.rows[0].categories,
      },
      newValues: {
        security_level_id: classification.levelId,
        categories: classification.categoryIds,
      },
      ipAddress,
    });
    return rows[0];
  });

module.exports = {
  list,
  get,
  create,
  update,
  setStatus,
  addPayment,
  setSecurityLevel,
};
