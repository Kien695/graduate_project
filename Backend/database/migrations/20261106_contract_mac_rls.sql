BEGIN;

-- The application owner is the security administrator. Business sessions use
-- per-subject LOGIN roles and are never table owners/BYPASSRLS roles.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'contract_security_admin') THEN
    CREATE ROLE contract_security_admin NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  EXECUTE format('GRANT contract_security_admin TO %I', current_user);
END
$do$;

CREATE OR REPLACE FUNCTION public.mac_subject_rank()
RETURNS SMALLINT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT sl.rank
  FROM public.users u
  JOIN public.security_levels sl ON sl.id = u.security_level_id
  WHERE LOWER(u.db_user) = LOWER(session_user)
    AND u.is_active IS DISTINCT FROM FALSE
    AND u.is_locked IS DISTINCT FROM TRUE
  LIMIT 1
$fn$;

CREATE OR REPLACE FUNCTION public.mac_contract_owned_by_subject(p_order_id INTEGER, p_customer_id INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT CASE
    WHEN UPPER(COALESCE(u.role, '')) <> 'CUSTOMER' THEN TRUE
    ELSE EXISTS (
      SELECT 1
      FROM public.customers cu
      LEFT JOIN public.orders o ON o.id = p_order_id
      WHERE cu.user_id = u.id
        AND (cu.id = p_customer_id OR cu.id = o.customer_id)
    )
  END
  FROM public.users u
  WHERE LOWER(u.db_user) = LOWER(session_user)
    AND u.is_active IS DISTINCT FROM FALSE
    AND u.is_locked IS DISTINCT FROM TRUE
  LIMIT 1
$fn$;

REVOKE ALL ON FUNCTION public.mac_subject_rank() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mac_contract_owned_by_subject(INTEGER, INTEGER) FROM PUBLIC;

DO $do$
DECLARE account RECORD;
BEGIN
  FOR account IN
    SELECT DISTINCT u.db_user
    FROM public.users u JOIN pg_roles r ON r.rolname = u.db_user
    WHERE u.db_user IS NOT NULL
  LOOP
    EXECUTE format('ALTER ROLE %I NOSUPERUSER NOBYPASSRLS', account.db_user);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.mac_subject_rank() TO %I', account.db_user);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.mac_contract_owned_by_subject(INTEGER, INTEGER) TO %I', account.db_user);
    -- Labels are managed only through the security-administration path.
    -- A column-level REVOKE cannot narrow an existing table-level UPDATE grant.
    EXECUTE format('REVOKE UPDATE ON public.users FROM %I', account.db_user);
    EXECUTE format('REVOKE UPDATE ON public.contracts FROM %I', account.db_user);
    EXECUTE format(
      'GRANT UPDATE (order_id,customer_id,contract_number,total_amount,status,terms,approved_by,approved_at,signed_at,updated_at) ON public.contracts TO %I',
      account.db_user
    );
  END LOOP;
END
$do$;

DROP POLICY IF EXISTS customer_contracts_isolation ON public.contracts;
DROP POLICY IF EXISTS contract_mac_select ON public.contracts;
DROP POLICY IF EXISTS contract_mac_insert ON public.contracts;
DROP POLICY IF EXISTS contract_mac_update ON public.contracts;
DROP POLICY IF EXISTS contract_mac_delete ON public.contracts;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts FORCE ROW LEVEL SECURITY;

-- Bell-LaPadula read rule: no read up.
CREATE POLICY contract_mac_select ON public.contracts FOR SELECT
USING (
  pg_has_role(session_user, 'contract_security_admin', 'MEMBER')
  OR (
    public.mac_contract_owned_by_subject(order_id, customer_id)
    AND public.mac_subject_rank() >= (
      SELECT sl.rank FROM public.security_levels sl WHERE sl.id = security_level_id
    )
  )
);

-- Bell-LaPadula write rule: no write down. INSERT/UPDATE checks the new label;
-- UPDATE/DELETE also checks the label of the existing row.
CREATE POLICY contract_mac_insert ON public.contracts FOR INSERT
WITH CHECK (
  pg_has_role(session_user, 'contract_security_admin', 'MEMBER')
  OR (
    public.mac_contract_owned_by_subject(order_id, customer_id)
    AND public.mac_subject_rank() <= (
      SELECT sl.rank FROM public.security_levels sl WHERE sl.id = security_level_id
    )
  )
);

CREATE POLICY contract_mac_update ON public.contracts FOR UPDATE
USING (
  pg_has_role(session_user, 'contract_security_admin', 'MEMBER')
  OR (
    public.mac_contract_owned_by_subject(order_id, customer_id)
    AND public.mac_subject_rank() <= (
      SELECT sl.rank FROM public.security_levels sl WHERE sl.id = security_level_id
    )
  )
)
WITH CHECK (
  pg_has_role(session_user, 'contract_security_admin', 'MEMBER')
  OR (
    public.mac_contract_owned_by_subject(order_id, customer_id)
    AND public.mac_subject_rank() <= (
      SELECT sl.rank FROM public.security_levels sl WHERE sl.id = security_level_id
    )
  )
);

CREATE POLICY contract_mac_delete ON public.contracts FOR DELETE
USING (
  pg_has_role(session_user, 'contract_security_admin', 'MEMBER')
  OR (
    public.mac_contract_owned_by_subject(order_id, customer_id)
    AND public.mac_subject_rank() <= (
      SELECT sl.rank FROM public.security_levels sl WHERE sl.id = security_level_id
    )
  )
);

COMMIT;
