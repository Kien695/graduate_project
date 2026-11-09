BEGIN;

-- Explicit application permission for MAC administration. It is deliberately
-- independent of business role/title and defaults to disabled for every user.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_manage_contract_mac BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
