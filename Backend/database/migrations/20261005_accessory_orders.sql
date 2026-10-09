CREATE TABLE IF NOT EXISTS accessory_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  accessory_id INTEGER NOT NULL REFERENCES accessories(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(15,2) DEFAULT 0,
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE accessory_orders DROP CONSTRAINT IF EXISTS accessory_orders_status_check;
ALTER TABLE accessory_orders ADD CONSTRAINT accessory_orders_status_check CHECK (
  UPPER(status) IN ('PENDING','CONFIRMED','SHIPPING','CANCELLED','COMPLETED')
);
CREATE INDEX IF NOT EXISTS accessory_orders_customer_idx ON accessory_orders(customer_id);
