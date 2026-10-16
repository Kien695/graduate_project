// Khách hàng được tạo TRƯỚC khi có cột phone_lookup_hash vẫn còn hash=NULL,
// nên check trùng số điện thoại khi đăng ký không thấy họ là đối thủ trùng.
// Script này giải mã phone_encrypted hiện có rồi tính lại hash cho các bản ghi cũ.
const { loadEnv } = require("../config/env");
loadEnv();
const { database } = require("./database");
const {
  decryptProfileValue,
  phoneLookupHash,
} = require("../utils/profileEncryption");

const run = async () => {
  const { rows } = await database.query(
    `SELECT id, phone_encrypted FROM users
     WHERE UPPER(role)='CUSTOMER' AND phone_encrypted IS NOT NULL AND phone_lookup_hash IS NULL`,
  );
  let updated = 0;
  const conflicts = [];
  for (const row of rows) {
    let phone;
    try {
      phone = decryptProfileValue(row.phone_encrypted);
    } catch {
      continue;
    }
    if (!phone) continue;
    try {
      await database.query(
        "UPDATE users SET phone_lookup_hash=$2,updated_at=NOW() WHERE id=$1",
        [row.id, phoneLookupHash(phone)],
      );
      updated += 1;
    } catch (error) {
      if (error.code === "23505") conflicts.push({ id: row.id, phone });
      else throw error;
    }
  }
  console.log(`Đã cập nhật phone_lookup_hash cho ${updated} khách hàng.`);
  if (conflicts.length) {
    console.log(
      `\nPhát hiện ${conflicts.length} khách hàng đang trùng số điện thoại với khách hàng khác đã được cập nhật trước đó — cần xử lý thủ công (đổi số hoặc gộp tài khoản):`,
    );
    conflicts.forEach((c) => console.log(`  - user id ${c.id}: ${c.phone}`));
  }
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
