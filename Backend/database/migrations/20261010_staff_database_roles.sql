ALTER TABLE users ADD COLUMN IF NOT EXISTS db_user VARCHAR(63);

-- Preserve data if an earlier development build used db_username.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='db_username'
  ) THEN
    EXECUTE 'UPDATE users SET db_user=COALESCE(db_user,db_username)';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_db_user_unique_ci
  ON users(LOWER(db_user)) WHERE db_user IS NOT NULL;

