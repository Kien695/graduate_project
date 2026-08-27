const crypto = require("crypto");
const { loadEnv } = require("../config/env");

loadEnv();

const { database, withTransaction } = require("./database");
const {
  encryptProfileValue,
  decryptProfileValue,
  emailLookupHash,
} = require("../utils/profileEncryption");

const migrate = async () => {
  const { rows } = await database.query(
    `SELECT c.*,u.username,u.email user_email,u.phone user_phone,
       u.email_encrypted user_email_encrypted,u.phone_encrypted user_phone_encrypted
     FROM customers c JOIN users u ON u.id=c.user_id
     WHERE UPPER(u.role)='CUSTOMER'`,
  );
  for (const profile of rows) {
    await withTransaction(async (client) => {
      const email =
        profile.user_email ||
        profile.email ||
        decryptProfileValue(profile.user_email_encrypted || profile.email_encrypted);
      const phone = profile.user_phone || profile.phone;
      if (!email && !profile.user_email_encrypted)
        throw new Error(`Customer ${profile.id} does not have an email to migrate`);
      const encryptedEmail =
        profile.user_email_encrypted || profile.email_encrypted || encryptProfileValue(email);
      const encryptedPhone =
        profile.user_phone_encrypted || profile.phone_encrypted || encryptProfileValue(phone);
      await client.query(
        `UPDATE users SET username=$2,email=NULL,phone=NULL,email_encrypted=$3,
           phone_encrypted=$4,email_lookup_hash=$5,updated_at=NOW() WHERE id=$1`,
        [
          profile.user_id,
          String(profile.username || "").startsWith("customer-")
            ? profile.username
            : `customer-${crypto.randomUUID()}`,
          encryptedEmail,
          encryptedPhone,
          emailLookupHash(email),
        ],
      );
      await client.query(
        `UPDATE customers SET email=NULL,phone=NULL,address=NULL,
           email_encrypted=$2,phone_encrypted=$3,
           address_encrypted=COALESCE(address_encrypted,$4),
           cccd_encrypted=COALESCE(cccd_encrypted,$5)
           ${Object.prototype.hasOwnProperty.call(profile, "cccd_encrypt") ? ",cccd_encrypt=NULL" : ""},
           updated_at=NOW()
         WHERE id=$1`,
        [
          profile.id,
          profile.email_encrypted || encryptedEmail,
          profile.phone_encrypted || encryptedPhone,
          encryptProfileValue(profile.address),
          encryptProfileValue(profile.cccd_encrypt),
        ],
      );
    });
  }
  console.log(`Encrypted ${rows.length} customer profiles`);
};

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
