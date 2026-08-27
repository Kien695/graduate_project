const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const BYTES_PER_MB = 1024 * 1024;
const DEFAULT_QUOTA_MB = Number(process.env.CUSTOMER_STORAGE_QUOTA_MB || 500);

const toMb = (bytes) => Number(bytes || 0) / BYTES_PER_MB;
const isCustomer = (user) => String(user?.role || "").toLowerCase() === "customer";

const ensureForCustomer = async (customerId, executor = database) => {
  const { rows } = await executor.query(
    `INSERT INTO customer_storage(customer_id,quota_mb,used_mb)
     VALUES($1,$2,0)
     ON CONFLICT(customer_id) DO UPDATE SET customer_id=EXCLUDED.customer_id
     RETURNING *`,
    [customerId, DEFAULT_QUOTA_MB],
  );
  return rows[0];
};

const reserveForUser = async (user, bytes, executor = database) => {
  const normalizedBytes = Number(bytes || 0);
  if (!isCustomer(user) || normalizedBytes <= 0) return null;
  const customer = await executor.query(
    "SELECT id FROM customers WHERE user_id=$1 AND is_active=TRUE LIMIT 1",
    [user.id],
  );
  if (!customer.rows[0]) throw new ErrorHandler("Khong tim thay ho so khach hang", 404);
  const customerId = customer.rows[0].id;
  await ensureForCustomer(customerId, executor);
  const { rows } = await executor.query(
    `UPDATE customer_storage
     SET used_mb=used_mb+$2,updated_at=NOW()
     WHERE customer_id=$1 AND used_mb+$2<=quota_mb
     RETURNING *`,
    [customerId, toMb(normalizedBytes)],
  );
  if (!rows[0]) throw new ErrorHandler("Dung luong luu tru cua khach hang da vuot quota", 413);
  return { customerId, bytes: normalizedBytes, storage: rows[0] };
};

const release = async (customerId, bytes, executor = database) => {
  if (!customerId || Number(bytes || 0) <= 0) return;
  await executor.query(
    `UPDATE customer_storage
     SET used_mb=GREATEST(0,used_mb-$2),updated_at=NOW()
     WHERE customer_id=$1`,
    [customerId, toMb(bytes)],
  );
};

const releaseReservation = (reservation, executor = database) =>
  reservation ? release(reservation.customerId, reservation.bytes, executor) : Promise.resolve();

const releaseImages = async (images = [], executor = database) => {
  const totals = new Map();
  for (const image of images) {
    if (!image?.customer_id || Number(image.bytes || image.size_bytes || 0) <= 0) continue;
    totals.set(
      image.customer_id,
      (totals.get(image.customer_id) || 0) + Number(image.bytes || image.size_bytes),
    );
  }
  for (const [customerId, bytes] of totals) await release(customerId, bytes, executor);
};

const tagImages = (images, reservation) =>
  images.map((image) => reservation
    ? { ...image, customer_id: reservation.customerId }
    : image);

module.exports = {
  DEFAULT_QUOTA_MB,
  ensureForCustomer,
  reserveForUser,
  release,
  releaseReservation,
  releaseImages,
  tagImages,
};
