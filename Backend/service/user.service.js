const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const {
  encryptProfileValue,
  decryptProfileValue,
  emailLookupHash,
} = require("../utils/profileEncryption");
const uploader = require("./upload.service");
const storageQuota = require("./storageQuota.service");

const getById = async (id, executor = database) => {
  const { rows } = await executor.query(
    `SELECT u.id,u.email,u.email_encrypted,u.full_name,u.phone,u.phone_encrypted,
       u.avatar_url,u.avatar_public_id,u.role,u.security_level_id,u.is_locked,u.is_active,u.last_login_at,
       u.created_at,u.updated_at,c.address,c.address_encrypted
     FROM users u LEFT JOIN customers c ON c.user_id=u.id WHERE u.id=$1`,
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay nguoi dung", 404);
  const user = rows[0];
  if (String(user.role).toLowerCase() === "customer") {
    user.email = decryptProfileValue(user.email_encrypted) || user.email;
    user.phone = decryptProfileValue(user.phone_encrypted) || user.phone;
    user.address = decryptProfileValue(user.address_encrypted) || user.address;
  }
  delete user.email_encrypted;
  delete user.phone_encrypted;
  delete user.address_encrypted;
  return user;
};

const updateMe = (id, input) =>
  withTransaction(async (client) => {
    const current = await client.query(
      "SELECT role FROM users WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!current.rows[0])
      throw new ErrorHandler("Khong tim thay nguoi dung", 404);
    const customer = String(current.rows[0].role).toLowerCase() === "customer";
    const fullName =
      input.fullName === undefined ? null : String(input.fullName).trim();
    const email =
      input.email === undefined
        ? null
        : String(input.email).trim().toLowerCase();
    const phone = input.phone === undefined ? null : String(input.phone).trim();
    const address =
      input.address === undefined ? null : String(input.address).trim();
    if (input.fullName !== undefined && !fullName)
      throw new ErrorHandler("Ho ten khong duoc de trong", 400);
    if (input.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ErrorHandler("Email khong hop le", 400);

    if (customer) {
      if (email) {
        const duplicate = await client.query(
          "SELECT id FROM users WHERE email_lookup_hash=$1 AND id<>$2",
          [emailLookupHash(email), id],
        );
        if (duplicate.rows[0])
          throw new ErrorHandler("Email da duoc su dung", 409);
      }
      const encryptedEmail =
        input.email === undefined ? null : encryptProfileValue(email);
      const encryptedPhone =
        input.phone === undefined ? null : encryptProfileValue(phone);
      const encryptedAddress =
        input.address === undefined ? null : encryptProfileValue(address);
      await client.query(
        `UPDATE users SET full_name=COALESCE($2,full_name),email=NULL,phone=NULL,
       email_encrypted=COALESCE($3,email_encrypted),
       email_lookup_hash=COALESCE($4,email_lookup_hash),
       phone_encrypted=CASE WHEN $5::boolean THEN $6 ELSE phone_encrypted END,
       updated_at=NOW() WHERE id=$1`,
        [
          id,
          fullName,
          encryptedEmail,
          email ? emailLookupHash(email) : null,
          input.phone !== undefined,
          encryptedPhone,
        ],
      );
      await client.query(
        `UPDATE customers SET full_name=COALESCE($2,full_name),email=NULL,phone=NULL,address=NULL,
       email_encrypted=COALESCE($3,email_encrypted),
       phone_encrypted=CASE WHEN $4::boolean THEN $5 ELSE phone_encrypted END,
       address_encrypted=CASE WHEN $6::boolean THEN $7 ELSE address_encrypted END,
       updated_at=NOW() WHERE user_id=$1`,
        [
          id,
          fullName,
          encryptedEmail,
          input.phone !== undefined,
          encryptedPhone,
          input.address !== undefined,
          encryptedAddress,
        ],
      );
    } else {
      await client.query(
        `UPDATE users SET full_name=COALESCE($2,full_name),email=COALESCE($3,email),
       phone=COALESCE($4,phone),avatar_url=COALESCE($5,avatar_url),updated_at=NOW()
       WHERE id=$1`,
        [id, fullName, email, phone, input.avatarUrl || null],
      );
      await client.query(
        `UPDATE employees SET full_name=COALESCE($2,full_name),email=COALESCE($3,email),
       phone=COALESCE($4,phone),updated_at=NOW() WHERE user_id=$1`,
        [id, fullName, email, phone],
      );
    }
    return getById(id, client);
  });

const setSecurityLevel = async (id, securityLevelId) => {
  const { rows } = await database.query(
    "UPDATE users SET security_level_id=$2,updated_at=NOW() WHERE id=$1 RETURNING id,email,security_level_id",
    [id, securityLevelId],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay nguoi dung", 404);
  return rows[0];
};

const updateAvatar = async (user, file) => {
  const reservation = await storageQuota.reserveForUser(user, file.size);
  let uploaded;
  try {
    uploaded = await uploader.uploadBuffer(file, "auto-dealer/avatars");
    const previous = await withTransaction(async (client) => {
      const current = await client.query(
        "SELECT avatar_url,avatar_public_id,avatar_size_bytes FROM users WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      if (!current.rows[0])
        throw new ErrorHandler("Không tìm thấy người dùng", 404);
      await client.query(
        `UPDATE users SET avatar_url=$2,avatar_public_id=$3,avatar_size_bytes=$4,updated_at=NOW()
         WHERE id=$1`,
        [user.id, uploaded.url, uploaded.public_id, uploaded.bytes],
      );
      return current.rows[0];
    });
    try {
      if (previous.avatar_public_id)
        await uploader.destroyImage(previous.avatar_public_id);
    } catch (cleanupError) {
      await database.query(
        `UPDATE users SET avatar_url=$2,avatar_public_id=$3,avatar_size_bytes=$4,updated_at=NOW()
         WHERE id=$1 AND avatar_public_id=$5`,
        [
          user.id,
          previous.avatar_url,
          previous.avatar_public_id,
          previous.avatar_size_bytes,
          uploaded.public_id,
        ],
      );
      await Promise.allSettled([
        uploader.destroyImage(uploaded.public_id),
        storageQuota.releaseReservation(reservation),
      ]);
      throw cleanupError;
    }
    if (reservation && previous.avatar_size_bytes)
      await storageQuota.release(
        reservation.customerId,
        previous.avatar_size_bytes,
      );
    return getById(user.id);
  } catch (error) {
    if (!uploaded) await storageQuota.releaseReservation(reservation);
    else {
      const saved = await database.query(
        "SELECT 1 FROM users WHERE id=$1 AND avatar_public_id=$2",
        [user.id, uploaded.public_id],
      );
      if (!saved.rows[0])
        await Promise.allSettled([
          uploader.destroyImage(uploaded.public_id),
          storageQuota.releaseReservation(reservation),
        ]);
    }
    throw error;
  }
};

module.exports = { getById, updateMe, setSecurityLevel, updateAvatar };
