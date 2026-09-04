const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const audit = require("./auditLog.service");
const uploader = require("./upload.service");
const storageQuota = require("./storageQuota.service");
const notification = require("./notification.service");

const notifyInspection = (client, inspection, message) =>
  notification.createForCustomer(client, inspection.customer_id, {
    title: "Kiểm định xe đã được cập nhật",
    message,
    type: "INSPECTION",
    referenceId: Number(inspection.order_id),
  });

const lockInspection = (client, id) =>
  client.query(
    `SELECT i.*,o.customer_id FROM inspections i
   JOIN orders o ON o.id=i.order_id WHERE i.id=$1 FOR UPDATE OF i`,
    [id],
  );

const list = async () => {
  const { rows } = await database.query(
    `SELECT i.*,v.vin,v.brand,v.model,o.id order_number,u.full_name inspector_name
     FROM inspections i
     JOIN vehicles v ON v.id=i.vehicle_id
     LEFT JOIN orders o ON o.id=i.order_id
     LEFT JOIN users u ON u.id=i.inspector_id
     ORDER BY i.created_at DESC`,
  );
  return rows;
};

const get = async (id, executor = database) => {
  const { rows } = await executor.query(
    `SELECT
       i.*,
       v.vin,v.brand,v.model,v.manufacture_year,v.color,v.status vehicle_status,
       u.full_name inspector_name,u.email inspector_email,
       o.id order_number,o.status order_status,o.total_amount,o.created_at order_date,
       cu.full_name customer_name,
       COALESCE(
         jsonb_agg(jsonb_build_object(
           'id',ii.id,
           'url',COALESCE(ii.url,ii.image_url),
           'public_id',ii.public_id,
           'size_bytes',ii.size_bytes,
           'customer_id',ii.customer_id,
           'created_at',ii.created_at
         ) ORDER BY ii.created_at) FILTER (WHERE ii.id IS NOT NULL),
         '[]'::jsonb
       ) images
     FROM inspections i
     JOIN vehicles v ON v.id=i.vehicle_id
     LEFT JOIN users u ON u.id=i.inspector_id
     LEFT JOIN orders o ON o.id=i.order_id
     LEFT JOIN customers cu ON cu.id=o.customer_id
     LEFT JOIN inspection_images ii ON ii.inspection_id=i.id
     WHERE i.id=$1
     GROUP BY i.id,v.id,u.id,o.id,cu.id`,
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy phiếu kiểm định", 404);
  return rows[0];
};

const create = (input, user) =>
  withTransaction(async (client) => {
    const requiredIds = [input.vehicle_id, input.order_id, input.contract_id];
    if (
      requiredIds.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)
    )
      throw new ErrorHandler(
        "vehicle_id, order_id va contract_id la bat buoc",
        400,
      );
    const vehicle = await client.query("SELECT id FROM vehicles WHERE id=$1", [
      input.vehicle_id,
    ]);
    if (!vehicle.rows[0]) throw new ErrorHandler("Không tìm thấy xe", 404);
    const relation = await client.query(
      `SELECT c.id contract_id,o.id order_id,v.id vehicle_id,o.customer_id
     FROM contracts c
     JOIN orders o ON o.id=c.order_id
     JOIN vehicles v ON v.id=o.vehicle_id
     WHERE c.id=$1 AND o.id=$2 AND v.id=$3
       AND LOWER(o.status) IN ('confirmed','completed')
       AND LOWER(c.status)<>'cancelled'
     FOR SHARE OF c,o,v`,
      [input.contract_id, input.order_id, input.vehicle_id],
    );
    if (!relation.rows[0])
      throw new ErrorHandler(
        "Contract, order va vehicle khong cung mot giao dich hop le",
        409,
      );
    const { rows } = await client.query(
      `INSERT INTO inspections(vehicle_id,order_id,contract_id,inspector_id,status,checklist,notes,result,note)
     VALUES($1,$2,$3,$4,'pending','[]'::jsonb,$5,'WAITING',$5)
     RETURNING *`,
      [
        input.vehicle_id,
        input.order_id,
        input.contract_id,
        user.id,
        input.notes || null,
      ],
    );
    await notifyInspection(
      client,
      { ...rows[0], customer_id: relation.rows[0].customer_id },
      `Phiếu kiểm định cho đơn hàng #${input.order_id} đã được tạo.`,
    );
    return rows[0];
  });

const update = (id, input) =>
  withTransaction(async (client) => {
    const old = await lockInspection(client, id);
    if (!old.rows[0])
      throw new ErrorHandler("Không tìm thấy phiếu kiểm định", 404);
    const { rows } = await client.query(
      `UPDATE inspections
     SET notes=COALESCE($2,notes),note=COALESCE($2,note),updated_at=NOW()
     WHERE id=$1 AND LOWER(status) IN ('pending','checking') RETURNING *`,
      [id, input.notes || null],
    );
    if (!rows[0])
      throw new ErrorHandler("Phiếu không tồn tại hoặc đã hoàn thành", 409);
    await notifyInspection(
      client,
      old.rows[0],
      `Thông tin kiểm định cho đơn hàng #${old.rows[0].order_id} đã được cập nhật.`,
    );
    return rows[0];
  });

const start = (id, user, ipAddress) =>
  withTransaction(async (client) => {
    const old = await lockInspection(client, id);
    if (!old.rows[0])
      throw new ErrorHandler("Không tìm thấy phiếu kiểm định", 404);
    if (String(old.rows[0].status).toLowerCase() !== "pending")
      throw new ErrorHandler(
        "Chỉ có thể bắt đầu phiếu đang chờ kiểm định",
        409,
      );
    const { rows } = await client.query(
      "UPDATE inspections SET status='checking',updated_at=NOW() WHERE id=$1 RETURNING *",
      [id],
    );
    await audit.record(client, {
      userId: user.id,
      action: "CHECKING",
      entityType: "inspection",
      entityId: id,
      oldValues: old.rows[0],
      newValues: rows[0],
      ipAddress,
    });
    await notifyInspection(
      client,
      old.rows[0],
      `Kiểm định cho đơn hàng #${old.rows[0].order_id} đã bắt đầu.`,
    );
    return rows[0];
  });

const updateChecklist = (id, checklist, notes, user, ipAddress) =>
  withTransaction(async (client) => {
    const old = await lockInspection(client, id);
    if (!old.rows[0])
      throw new ErrorHandler("Không tìm thấy phiếu kiểm định", 404);
    if (String(old.rows[0].status).toLowerCase() !== "checking")
      throw new ErrorHandler(
        "Checklist chỉ được cập nhật khi đang kiểm định",
        409,
      );
    const { rows } = await client.query(
      `UPDATE inspections
     SET checklist=$2::jsonb,notes=COALESCE($3,notes),note=COALESCE($3,note),updated_at=NOW()
     WHERE id=$1 RETURNING *`,
      [id, JSON.stringify(checklist), notes || null],
    );
    await audit.record(client, {
      userId: user.id,
      action: "CHECKLIST",
      entityType: "inspection",
      entityId: id,
      oldValues: { checklist: old.rows[0].checklist, notes: old.rows[0].notes },
      newValues: { checklist: rows[0].checklist, notes: rows[0].notes },
      ipAddress,
    });
    await notifyInspection(
      client,
      old.rows[0],
      `Checklist kiểm định cho đơn hàng #${old.rows[0].order_id} đã được cập nhật.`,
    );
    return rows[0];
  });

const setStatus = (id, status, user, ipAddress) =>
  withTransaction(async (client) => {
    const old = await lockInspection(client, id);
    if (!old.rows[0])
      throw new ErrorHandler("Không tìm thấy phiếu kiểm định", 404);
    if (String(old.rows[0].status).toLowerCase() !== "checking")
      throw new ErrorHandler(
        "Phiếu phải ở trạng thái đang kiểm định trước khi hoàn thành",
        409,
      );
    if (
      status === "passed" &&
      (!old.rows[0].checklist?.length ||
        old.rows[0].checklist.some((item) => !item.checked))
    )
      throw new ErrorHandler(
        "Phải hoàn thành toàn bộ checklist trước khi đánh dấu PASS",
        409,
      );
    const result = status === "passed" ? "PASS" : "FAIL";
    const { rows } = await client.query(
      `UPDATE inspections
     SET status=$2,result=$3,inspected_at=NOW(),inspection_date=NOW(),updated_at=NOW()
     WHERE id=$1 RETURNING *`,
      [id, status, result],
    );
    await audit.record(client, {
      userId: user.id,
      action: result,
      entityType: "inspection",
      entityId: id,
      oldValues: old.rows[0],
      newValues: rows[0],
      ipAddress,
    });
    await notifyInspection(
      client,
      old.rows[0],
      `Kiểm định cho đơn hàng #${old.rows[0].order_id} có kết quả ${result}.`,
    );
    return rows[0];
  });

const addImages = async (id, files, user) => {
  if (!files?.length) throw new ErrorHandler("Chưa chọn ảnh", 400);
  await get(id);
  const reservation = await storageQuota.reserveForUser(
    user,
    files.reduce((total, file) => total + Number(file.size || 0), 0),
  );
  let uploaded = [];
  try {
    uploaded = storageQuota.tagImages(
      await uploader.uploadMany(files),
      reservation,
    );
    return await withTransaction(async (client) => {
      const saved = [];
      for (const image of uploaded) {
        const { rows } = await client.query(
          `INSERT INTO inspection_images(
             inspection_id,url,public_id,image_url,size_bytes,customer_id
           ) VALUES($1,$2,$3,$2,$4,$5) RETURNING *`,
          [
            id,
            image.url,
            image.public_id,
            image.bytes,
            image.customer_id || null,
          ],
        );
        saved.push(rows[0]);
      }
      return saved;
    });
  } catch (error) {
    await Promise.allSettled([
      uploader.destroyImages(uploaded),
      storageQuota.releaseReservation(reservation),
    ]);
    throw error;
  }
};

const removeImage = async (inspectionId, imageId) => {
  const { rows } = await database.query(
    "SELECT * FROM inspection_images WHERE id=$1 AND inspection_id=$2",
    [imageId, inspectionId],
  );
  const image = rows[0];
  if (!image) throw new ErrorHandler("Không tìm thấy ảnh kiểm định", 404);
  await uploader.destroyImage(image.public_id);
  await database.query("DELETE FROM inspection_images WHERE id=$1", [imageId]);
  await storageQuota.releaseImages([image]);
  return get(inspectionId);
};

module.exports = {
  list,
  get,
  create,
  update,
  start,
  updateChecklist,
  setStatus,
  addImages,
  removeImage,
};
