ALTER TABLE inspections ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id);

ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_vehicle_required;
ALTER TABLE inspections ADD CONSTRAINT inspections_vehicle_required
  CHECK (vehicle_id IS NOT NULL) NOT VALID;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_order_required;
ALTER TABLE inspections ADD CONSTRAINT inspections_order_required
  CHECK (order_id IS NOT NULL) NOT VALID;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_contract_required;
ALTER TABLE inspections ADD CONSTRAINT inspections_contract_required
  CHECK (contract_id IS NOT NULL) NOT VALID;
