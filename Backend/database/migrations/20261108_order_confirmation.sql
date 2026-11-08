-- Audit metadata for the existing pending -> confirmed order transition.
-- No MAC/RLS policy or security label is changed here.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
