BEGIN;

-- 20261109_contract_mac_assignment originally detected only table-level
-- INSERT. Contract creation is deliberately granted per column, so rerunning
-- that migration could revoke a valid grant and fail to restore it. Rebuild
-- the safe grants from the application's declared employee permissions.
DO $do$
DECLARE
  account RECORD;
  contract_sequence TEXT;
  audit_sequence TEXT;
BEGIN
  contract_sequence := pg_get_serial_sequence('public.contracts', 'id');
  audit_sequence := pg_get_serial_sequence('public.audit_logs', 'id');

  FOR account IN
    SELECT DISTINCT u.db_user
      FROM public.employee_feature_permissions efp
      JOIN public.employees e ON e.id = efp.employee_id
      JOIN public.users u ON u.id = e.user_id
      JOIN pg_roles r ON r.rolname = u.db_user
     WHERE efp.feature_key = 'contracts'
       AND efp.privilege = 'INSERT'
       AND u.db_user IS NOT NULL
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', account.db_user);
    EXECUTE format('REVOKE INSERT ON TABLE public.contracts FROM %I', account.db_user);
    EXECUTE format(
      'GRANT INSERT (order_id,customer_id,contract_number,total_amount,status,terms,created_by) ON TABLE public.contracts TO %I',
      account.db_user
    );
    EXECUTE format('GRANT INSERT ON TABLE public.audit_logs TO %I', account.db_user);

    IF contract_sequence IS NOT NULL THEN
      EXECUTE format(
        'GRANT USAGE,SELECT ON SEQUENCE %s TO %I',
        contract_sequence,
        account.db_user
      );
    END IF;
    IF audit_sequence IS NOT NULL THEN
      EXECUTE format(
        'GRANT USAGE,SELECT ON SEQUENCE %s TO %I',
        audit_sequence,
        account.db_user
      );
    END IF;
  END LOOP;
END
$do$;

COMMIT;
