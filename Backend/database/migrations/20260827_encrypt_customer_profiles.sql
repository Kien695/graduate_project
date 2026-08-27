ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_lookup_hash CHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lookup_hash_unique
  ON users(email_lookup_hash) WHERE email_lookup_hash IS NOT NULL;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS cccd_encrypted TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_encrypted TEXT;
