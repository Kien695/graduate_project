const { database, systemDatabase, withTransaction, withSystemTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const auditLog = require("./auditLog.service");
const { tryDecryptProfileValue } = require("../utils/profileEncryption");
const notification = require("./notification.service");
const { GROUPS } = require("../middleware/contractWorkflow.middleware");
const CONTRACT_GROUPS = new Set(Object.values(GROUPS));

const list = async (user) => {
  if (user.role !== "admin" && !CONTRACT_GROUPS.has(user.contractActor?.group))
    throw new ErrorHandler("Tài khoản chưa thuộc nhóm quyền hợp đồng hợp lệ", 403);
  const values = [user.id];
  const ownScope = user.contractActor?.group === GROUPS.EMPLOYEE ? " AND c.created_by=$1" : "";
  const access = `WHERE sl.rank <= (
    SELECT us.rank FROM users ux JOIN security_levels us ON us.id=ux.security_level_id WHERE ux.id=$1
  )${ownScope}`;
  const { rows } = await database.query(
    `SELECT c.*,o.customer_id,o.vehicle_id,o.total_amount order_total_amount,
    cu.full_name customer_name,v.brand vehicle_brand,v.model vehicle_model,v.vin,
    COALESCE(creator.full_name,creator.username,creator.email,'Tài khoản không còn tồn tại') created_by_name,
    sl.name security_level_name,COALESCE(SUM(p.amount),0) paid_amount,
    (SELECT LOWER(i.status) FROM inspections i WHERE i.contract_id=c.id
      ORDER BY i.created_at DESC LIMIT 1) inspection_status
    FROM contracts c JOIN orders o ON o.id=c.order_id LEFT JOIN payments p ON p.contract_id=c.id
    LEFT JOIN users creator ON creator.id=c.created_by
    LEFT JOIN customers cu ON cu.id=o.customer_id LEFT JOIN vehicles v ON v.id=o.vehicle_id
    LEFT JOIN security_levels sl ON sl.id=c.security_level_id ${access}
    GROUP BY c.id,o.customer_id,o.vehicle_id,o.total_amount,cu.full_name,v.brand,v.model,v.vin,
    creator.id,sl.name ORDER BY c.created_at DESC`,
    values,
  );
  return rows;
};

const capabilities = (actor, canManageMac = false) => ({
  group: actor?.group || null,
  canCreate: actor?.group === GROUPS.EMPLOYEE,
  canSubmit: actor?.group === GROUPS.EMPLOYEE,
  canApprove: actor?.group === GROUPS.LEADER,
  canReturn: actor?.group === GROUPS.LEADER,
  canReject: [GROUPS.LEADER, GROUPS.DIRECTOR].includes(actor?.group),
  canSign: actor?.group === GROUPS.DIRECTOR,
  canManageMac,
});

const get = async (id, user, actor) => {
  if (user.role !== "admin" && !CONTRACT_GROUPS.has(actor?.group))
    throw new ErrorHandler("Tài khoản chưa thuộc nhóm quyền hợp đồng hợp lệ", 403);
  const { rows } = await database.query(
    `SELECT c.*,o.customer_id,o.vehicle_id,o.total_amount order_total_amount,
    cu.full_name customer_name,cu.email customer_email,cu.phone customer_phone,
    cu.email_encrypted customer_email_encrypted,cu.phone_encrypted customer_phone_encrypted,
    COALESCE(creator.full_name,creator.username,creator.email,'Tài khoản không còn tồn tại') created_by_name,
    v.brand vehicle_brand,v.model vehicle_model,v.vin,sl.name security_level_name,sl.rank security_level_rank,
    COALESCE(SUM(p.amount),0) paid_amount,
    (SELECT LOWER(i.status) FROM inspections i WHERE i.contract_id=c.id
      ORDER BY i.created_at DESC LIMIT 1) inspection_status
    FROM contracts c JOIN orders o ON o.id=c.order_id LEFT JOIN payments p ON p.contract_id=c.id
    LEFT JOIN users creator ON creator.id=c.created_by
    LEFT JOIN customers cu ON cu.id=o.customer_id LEFT JOIN vehicles v ON v.id=o.vehicle_id
    LEFT JOIN security_levels sl ON sl.id=c.security_level_id
    WHERE c.id=$1 GROUP BY c.id,o.customer_id,o.vehicle_id,o.total_amount,cu.full_name,
    cu.email,cu.phone,cu.email_encrypted,cu.phone_encrypted,
    v.brand,v.model,v.vin,creator.id,sl.name,sl.rank`,
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
  if (actor?.group === GROUPS.EMPLOYEE && Number(rows[0].created_by) !== Number(user.id))
    throw new ErrorHandler("Bạn chỉ được xem hợp đồng do mình tạo", 403);
  const email = tryDecryptProfileValue(rows[0].customer_email_encrypted);
  const phone = tryDecryptProfileValue(rows[0].customer_phone_encrypted);
  rows[0].customer_email = email.value || rows[0].customer_email;
  rows[0].customer_phone = phone.value || rows[0].customer_phone;
  rows[0].profile_reentry_required = email.failed || phone.failed;
  delete rows[0].customer_email_encrypted;
  delete rows[0].customer_phone_encrypted;
  const payments = await database.query(
    `SELECT p.*,u.full_name created_by_name FROM payments p LEFT JOIN users u ON u.id=p.created_by WHERE p.contract_id=$1 ORDER BY p.paid_at DESC`,
    [id],
  );
  const history = await database.query(
    `SELECT h.*,u.full_name performed_by_name FROM contract_workflow_history h
     LEFT JOIN users u ON u.id=h.performed_by WHERE h.contract_id=$1 ORDER BY h.created_at DESC`, [id]);
  return { ...rows[0], payments: payments.rows, workflow_history: history.rows };
};

// PostgreSQL supplies the INTERNAL classification. Client input is rejected by middleware.
const create = async (input, user, ipAddress) => {
  // Check through the system connection because the subject's RLS view may
  // legitimately hide an existing INTERNAL (or higher) contract.
  const existing = await systemDatabase.query(
    "SELECT 1 FROM contracts WHERE order_id=$1 LIMIT 1",
    [input.order_id],
  );
  if (existing.rows[0])
    throw new ErrorHandler("Đơn hàng này đã có hợp đồng", 409);

  try {
    return await withTransaction(async (client) => {
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
     status, created_by)
   VALUES($1,$2,$3,$4,$5,'draft',$6) RETURNING *`,
      [
        input.order_id,
        order.rows[0].customer_id,
        number,
        order.rows[0].total_amount,
        input.terms || null,
        user.id,
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
  } catch (error) {
    if (error.code === "23505" && error.constraint === "contracts_order_unique")
      throw new ErrorHandler("Đơn hàng này đã có hợp đồng", 409);
    throw error;
  }
};

const update = (id, input, user, actor, ipAddress) =>
  withTransaction(async (client) => {
    const old = await client.query(
      "SELECT * FROM contracts WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!old.rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
    if (actor?.group !== GROUPS.EMPLOYEE || Number(old.rows[0].created_by) !== Number(user.id))
      throw new ErrorHandler("Bạn chỉ được sửa hợp đồng do mình tạo", 403);
    if (!["draft", "revision_requested"].includes(String(old.rows[0].status).toLowerCase()))
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

const legacySetStatus = (id, status, user, ipAddress) =>
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
      throw new ErrorHandler("Trạng thái hợp đồng không hợp lệ", 400);
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

const transition = (id, action, reason, user, actor, ipAddress) =>
  // Workflow decisions are mediated by the application after RBAC and MAC
  // checks. Running the status-only transition on the system connection avoids
  // PostgreSQL applying both the SELECT (no read up) and UPDATE (no write down)
  // RLS predicates to SELECT ... FOR UPDATE, which would otherwise hide every
  // contract whose label is lower than the approver's clearance.
  withSystemTransaction(async (client) => {
    const old = await client.query(
      `SELECT c.* FROM contracts c
       JOIN security_levels object_level ON object_level.id=c.security_level_id
       JOIN users subject ON subject.id=$2
       JOIN security_levels subject_level ON subject_level.id=subject.security_level_id
       WHERE c.id=$1
         AND subject.is_active IS DISTINCT FROM FALSE
         AND subject.is_locked IS DISTINCT FROM TRUE
         AND subject_level.rank >= object_level.rank
       FOR UPDATE OF c`,
      [id, user.id],
    );
    if (!old.rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);
    const rules = {
      submit: { groups: [GROUPS.EMPLOYEE], from: ["draft", "revision_requested"], to: "pending_manager" },
      approve: { groups: [GROUPS.LEADER], from: ["pending_manager"], to: "pending_director" },
      return: { groups: [GROUPS.LEADER], from: ["pending_manager"], to: "revision_requested", reason: true },
      reject: { groups: [GROUPS.LEADER, GROUPS.DIRECTOR], from: actor?.group === GROUPS.DIRECTOR ? ["pending_director"] : ["pending_manager"], to: "rejected", reason: true },
      sign: { groups: [GROUPS.DIRECTOR], from: ["pending_director"], to: "signed" },
    };
    const rule = rules[action];
    if (!rule || !rule.groups.includes(actor?.group))
      throw new ErrorHandler("Nhóm quyền không được thực hiện thao tác này", 403);
    if (action === "submit" && Number(old.rows[0].created_by) !== Number(user.id))
      throw new ErrorHandler("Bạn chỉ được gửi hợp đồng do mình tạo", 403);
    if (!rule.from.includes(String(old.rows[0].status).toLowerCase()))
      throw new ErrorHandler("Trạng thái hợp đồng không phù hợp với thao tác", 409);
    const cleanReason = String(reason || "").trim();
    if (rule.reason && !cleanReason) throw new ErrorHandler("Lý do là bắt buộc", 400);
    const { rows } = await client.query(
      `UPDATE contracts SET status=$2,
       submitted_at=CASE WHEN $3='submit' THEN NOW() ELSE submitted_at END,
       approved_by=CASE WHEN $3='approve' THEN $4 ELSE approved_by END,
       approved_at=CASE WHEN $3='approve' THEN NOW() ELSE approved_at END,
       signed_by=CASE WHEN $3='sign' THEN $4 ELSE signed_by END,
       signed_at=CASE WHEN $3='sign' THEN NOW() ELSE signed_at END,
       decision_reason=CASE WHEN $3 IN ('return','reject') THEN $5 ELSE NULL END,
       decision_by=CASE WHEN $3 IN ('return','reject') THEN $4 ELSE decision_by END,
       decision_at=CASE WHEN $3 IN ('return','reject') THEN NOW() ELSE decision_at END,
       updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, rule.to, action, user.id, cleanReason || null]);
    await client.query(
      `INSERT INTO contract_workflow_history(contract_id,from_status,to_status,action,reason,performed_by)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [id, old.rows[0].status, rule.to, action, cleanReason || null, user.id]);
    await auditLog.record(client, { userId: user.id, action: `CONTRACT_${action.toUpperCase()}`,
      entityType: "contract", entityId: id, oldValues: old.rows[0], newValues: rows[0], ipAddress });
    await notification.createForCustomer(client, old.rows[0].customer_id, {
      title: "Trạng thái hợp đồng đã thay đổi",
      message: `Hợp đồng ${rows[0].contract_number} đã chuyển sang trạng thái ${rule.to}.`,
      type: "CONTRACT", referenceId: Number(id) });
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
      String(contract.rows[0].status).toLowerCase() !== "signed"
    )
      throw new ErrorHandler("Hợp đồng phải được ký trước khi thanh toán", 409);
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
    const insp = await client.query(
      `SELECT status FROM inspections
       WHERE contract_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [id],
    );
    const inspected = insp.rows[0]?.status?.toLowerCase() === "passed";
    if (!inspected)
      throw new ErrorHandler("Xe phải kiểm định đạt trước khi thanh toán", 409);

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

// Classification is validated by the MAC middleware.
const setSecurityLevel = (id, classification, reason, user, ipAddress) =>
  withSystemTransaction(async (client) => {
    if (!classification)
      throw new ErrorHandler("Thieu ngu canh phan loai MAC", 500);
    const cleanReason = String(reason || "").trim();
    if (!cleanReason) throw new ErrorHandler("Ly do thay doi nhan MAC la bat buoc", 400);

    const old = await client.query(
      "SELECT * FROM contracts WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!old.rows[0]) throw new ErrorHandler("Không tìm thấy hợp đồng", 404);

    await client.query("SELECT set_config('app.mac_actor_id', $1, true)", [String(user.id)]);
    await client.query("SELECT set_config('app.mac_change_reason', $1, true)", [cleanReason]);
    const { rows } = await client.query(
      `UPDATE contracts SET security_level_id=$2, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id, classification.levelId],
    );
    await auditLog.record(client, {
      userId: user.id,
      action: "SECURITY_LEVEL",
      entityType: "contract",
      entityId: id,
      oldValues: {
        security_level_id: old.rows[0].security_level_id,
      },
      newValues: {
        security_level_id: classification.levelId,
        reason: cleanReason,
      },
      ipAddress,
    });
    return rows[0];
  });

module.exports = {
  list,
  capabilities,
  get,
  create,
  update,
  transition,
  addPayment,
  setSecurityLevel,
};
