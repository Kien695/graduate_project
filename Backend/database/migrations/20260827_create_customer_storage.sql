BEGIN;

CREATE TABLE IF NOT EXISTS customer_storage (
  id BIGSERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  quota_mb NUMERIC(14,6) NOT NULL DEFAULT 500 CHECK (quota_mb > 0),
  used_mb NUMERIC(14,6) NOT NULL DEFAULT 0 CHECK (used_mb >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (used_mb <= quota_mb)
);

INSERT INTO customer_storage(customer_id, quota_mb, used_mb)
SELECT id, 500, 0 FROM customers
ON CONFLICT (customer_id) DO NOTHING;

ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE inspection_images
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

COMMIT;
