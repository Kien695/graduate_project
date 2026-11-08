-- Existing rows are deliberately not promoted to an approved/signed state.
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_by INTEGER REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS decision_reason TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS decision_by INTEGER REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS contract_workflow_history (
  id BIGSERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  from_status VARCHAR(40), to_status VARCHAR(40) NOT NULL,
  action VARCHAR(40) NOT NULL, reason TEXT,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contract_workflow_history_contract_idx ON contract_workflow_history(contract_id, created_at DESC);

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (LOWER(status) IN (
  'created','draft','revision_requested','pending_manager','approved',
  'pending_director','signed','rejected','cancelled','completed'
));

DO $$
DECLARE account RECORD;
BEGIN
  FOR account IN SELECT db_user FROM users WHERE db_user IS NOT NULL LOOP
    EXECUTE format('GRANT SELECT,INSERT ON contract_workflow_history TO %I', account.db_user);
    EXECUTE format('GRANT USAGE,SELECT ON SEQUENCE contract_workflow_history_id_seq TO %I', account.db_user);
    EXECUTE format('REVOKE UPDATE ON contracts FROM %I', account.db_user);
    EXECUTE format('GRANT UPDATE (order_id,customer_id,contract_number,total_amount,status,terms,approved_by,approved_at,signed_at,updated_at,created_by,submitted_at,signed_by,decision_reason,decision_by,decision_at) ON contracts TO %I', account.db_user);
  END LOOP;
END $$;
