BEGIN;

CREATE TABLE IF NOT EXISTS backup_history (
  id BIGSERIAL PRIMARY KEY,
  backup_record_id INTEGER REFERENCES backup_records(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  size BIGINT,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS backup_history_created_at_idx
  ON backup_history(created_at DESC);

COMMIT;
