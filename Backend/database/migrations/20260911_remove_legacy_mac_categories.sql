-- The four-level MAC policy only uses security_levels.rank. The old category
-- dictionary and labels are no longer read by the application.
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_categories_valid;
ALTER TABLE IF EXISTS public.contracts DROP CONSTRAINT IF EXISTS contracts_categories_valid;
ALTER TABLE IF EXISTS public.contracts DROP CONSTRAINT IF EXISTS contracts_categories_not_empty;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS categories;
ALTER TABLE IF EXISTS public.contracts DROP COLUMN IF EXISTS categories;
DROP FUNCTION IF EXISTS public.mac_categories_are_valid(SMALLINT[]);
DROP FUNCTION IF EXISTS public.mac_categories_dominate(SMALLINT[], SMALLINT[]);
DROP TABLE IF EXISTS public.mac_categories;

-- These legacy tables are not queried by the current backend. Their active
-- replacements are backup_records/backup_history, user_sessions, the current
-- security-level policy, and monitoring_alert_configs/monitoring_alerts.
DROP TABLE IF EXISTS public.backups;
DROP TABLE IF EXISTS public.devices;
DROP TABLE IF EXISTS public.mac_policy;
DROP TABLE IF EXISTS public.server_monitoring;
