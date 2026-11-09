BEGIN;

-- Resolve INTERNAL at execution time so this works across databases whose
-- security_levels IDs differ. Existing contract labels are not updated.
CREATE OR REPLACE FUNCTION public.contract_default_security_level_id()
RETURNS INTEGER
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT id
  FROM public.security_levels
  WHERE UPPER(COALESCE(name, level_name)) = 'INTERNAL'
  ORDER BY id
  LIMIT 1
$fn$;

REVOKE ALL ON FUNCTION public.contract_default_security_level_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contract_default_security_level_id() TO PUBLIC;
ALTER TABLE public.contracts
  ALTER COLUMN security_level_id SET DEFAULT public.contract_default_security_level_id();

CREATE TABLE IF NOT EXISTS public.contract_security_level_history (
  id BIGSERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  old_security_level_id INTEGER REFERENCES public.security_levels(id),
  new_security_level_id INTEGER NOT NULL REFERENCES public.security_levels(id),
  changed_by INTEGER NOT NULL REFERENCES public.users(id),
  reason TEXT NOT NULL CHECK (BTRIM(reason) <> ''),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contract_security_level_history_contract_idx
  ON public.contract_security_level_history(contract_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.audit_contract_security_level_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  actor_id INTEGER;
  change_reason TEXT;
BEGIN
  IF NEW.security_level_id IS NOT DISTINCT FROM OLD.security_level_id THEN
    RETURN NEW;
  END IF;

  IF NOT pg_has_role(session_user, 'contract_security_admin', 'MEMBER') THEN
    RAISE EXCEPTION 'contract MAC classification requires contract_security_admin'
      USING ERRCODE = '42501';
  END IF;

  change_reason := BTRIM(COALESCE(current_setting('app.mac_change_reason', true), ''));
  BEGIN
    actor_id := NULLIF(current_setting('app.mac_actor_id', true), '')::INTEGER;
  EXCEPTION WHEN invalid_text_representation THEN
    actor_id := NULL;
  END;
  IF actor_id IS NULL OR change_reason = '' THEN
    RAISE EXCEPTION 'contract MAC classification change requires actor and reason'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.contract_security_level_history(
    contract_id, old_security_level_id, new_security_level_id, changed_by, reason
  ) VALUES (NEW.id, OLD.security_level_id, NEW.security_level_id, actor_id, change_reason);
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS contracts_security_level_audit ON public.contracts;
CREATE TRIGGER contracts_security_level_audit
BEFORE UPDATE OF security_level_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.audit_contract_security_level_change();

-- Preserve each account's existing INSERT permission while replacing broad
-- table INSERT with a safe column list that excludes security_level_id.
DO $do$
DECLARE
  account RECORD;
  could_insert BOOLEAN;
BEGIN
  FOR account IN
    SELECT DISTINCT u.db_user
    FROM public.users u
    JOIN pg_roles r ON r.rolname = u.db_user
    WHERE u.db_user IS NOT NULL
  LOOP
    SELECT has_table_privilege(account.db_user, 'public.contracts', 'INSERT')
      INTO could_insert;
    EXECUTE format('REVOKE INSERT ON public.contracts FROM %I', account.db_user);
    IF could_insert THEN
      EXECUTE format(
        'GRANT INSERT (order_id,customer_id,contract_number,total_amount,status,terms,created_by) ON public.contracts TO %I',
        account.db_user
      );
    END IF;
  END LOOP;
END
$do$;

COMMIT;
