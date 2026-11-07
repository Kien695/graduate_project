require("dotenv").config();
const { systemDatabase } = require("../database/database");
const { decryptProfileValue } = require("../utils/profileEncryption");

const main = async () => {
  const { rows } = await systemDatabase.query(`
    SELECT 'users' source,id,email_encrypted value,email plaintext
    FROM users WHERE email_encrypted IS NOT NULL
    UNION ALL
    SELECT 'customers',id,email_encrypted,email
    FROM customers WHERE email_encrypted IS NOT NULL
  `);
  let decryptable = 0;
  let authenticationFailed = 0;
  let failedWithPlaintextFallback = 0;
  for (const row of rows) {
    try {
      decryptProfileValue(row.value);
      decryptable += 1;
    } catch (_) {
      authenticationFailed += 1;
      if (row.plaintext) failedWithPlaintextFallback += 1;
    }
  }
  const key = process.env.PROFILE_ENCRYPTION_KEY || "";
  console.log({
    keyConfigured: Boolean(key),
    keyLength: key.length,
    documentedPlaceholder: key === "change_me_to_a_long_random_secret",
    encryptedValuesChecked: rows.length,
    decryptable,
    authenticationFailed,
    failedWithPlaintextFallback,
  });
};

main()
  .catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => systemDatabase.end());
