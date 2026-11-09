-- Inspection operations write supporting records in the same transaction.
-- Backfill grants for existing staff roles. Future permission changes are
-- handled by databasePermission.service.js.
DO $do$
DECLARE
  account RECORD;
  notification_sequence TEXT;
  audit_sequence TEXT;
BEGIN
  notification_sequence := pg_get_serial_sequence('public.notifications', 'id');
  audit_sequence := pg_get_serial_sequence('public.audit_logs', 'id');

  FOR account IN
    SELECT DISTINCT u.db_user
    FROM public.users u
    JOIN pg_roles r ON r.rolname = u.db_user
    WHERE u.db_user IS NOT NULL
  LOOP
    IF has_table_privilege(account.db_user, 'public.inspections', 'INSERT') THEN
      EXECUTE format('GRANT INSERT ON TABLE public.notifications TO %I', account.db_user);
      IF notification_sequence IS NOT NULL THEN
        EXECUTE format(
          'GRANT USAGE,SELECT ON SEQUENCE %s TO %I',
          notification_sequence,
          account.db_user
        );
      END IF;
    END IF;

    IF has_table_privilege(account.db_user, 'public.inspections', 'UPDATE') THEN
      EXECUTE format('GRANT UPDATE ON TABLE public.vehicles TO %I', account.db_user);
      EXECUTE format(
        'GRANT INSERT ON TABLE public.audit_logs,public.notifications TO %I',
        account.db_user
      );
      IF audit_sequence IS NOT NULL THEN
        EXECUTE format(
          'GRANT USAGE,SELECT ON SEQUENCE %s TO %I',
          audit_sequence,
          account.db_user
        );
      END IF;
      IF notification_sequence IS NOT NULL THEN
        EXECUTE format(
          'GRANT USAGE,SELECT ON SEQUENCE %s TO %I',
          notification_sequence,
          account.db_user
        );
      END IF;
    END IF;
  END LOOP;
END
$do$;
