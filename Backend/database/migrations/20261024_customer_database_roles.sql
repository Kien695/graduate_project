CREATE OR REPLACE FUNCTION public.current_customer_user_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE LOWER(u.db_user) = LOWER(current_user)
    AND UPPER(u.role) = 'CUSTOMER'
    AND u.is_active IS DISTINCT FROM FALSE
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT c.id
  FROM public.customers c
  JOIN public.users u ON u.id = c.user_id
  WHERE LOWER(u.db_user) = LOWER(current_user)
    AND UPPER(u.role) = 'CUSTOMER'
    AND u.is_active IS DISTINCT FROM FALSE
    AND c.is_active IS DISTINCT FROM FALSE
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_customer_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_customer_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_customer_id() TO PUBLIC;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_users_isolation ON public.users;
CREATE POLICY customer_users_isolation ON public.users
  USING (public.current_customer_user_id() IS NULL OR id = public.current_customer_user_id());

DROP POLICY IF EXISTS customer_profiles_isolation ON public.customers;
CREATE POLICY customer_profiles_isolation ON public.customers
  USING (public.current_customer_user_id() IS NULL OR user_id = public.current_customer_user_id());

DROP POLICY IF EXISTS customer_storage_isolation ON public.customer_storage;
CREATE POLICY customer_storage_isolation ON public.customer_storage
  USING (public.current_customer_user_id() IS NULL OR customer_id = public.current_customer_id());

DROP POLICY IF EXISTS customer_orders_isolation ON public.orders;
CREATE POLICY customer_orders_isolation ON public.orders
  USING (public.current_customer_user_id() IS NULL OR customer_id = public.current_customer_id());

DROP POLICY IF EXISTS customer_contracts_isolation ON public.contracts;
CREATE POLICY customer_contracts_isolation ON public.contracts
  USING (
    public.current_customer_user_id() IS NULL
    OR customer_id = public.current_customer_id()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = contracts.order_id
        AND o.customer_id = public.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_accessory_orders_isolation ON public.accessory_orders;
CREATE POLICY customer_accessory_orders_isolation ON public.accessory_orders
  USING (public.current_customer_user_id() IS NULL OR customer_id = public.current_customer_id());

DROP POLICY IF EXISTS customer_inspections_isolation ON public.inspections;
CREATE POLICY customer_inspections_isolation ON public.inspections
  USING (
    public.current_customer_user_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = inspections.order_id
        AND o.customer_id = public.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_notifications_isolation ON public.notifications;
CREATE POLICY customer_notifications_isolation ON public.notifications
  USING (public.current_customer_user_id() IS NULL OR user_id = public.current_customer_user_id());

DROP POLICY IF EXISTS customer_sessions_isolation ON public.user_sessions;
CREATE POLICY customer_sessions_isolation ON public.user_sessions
  USING (public.current_customer_user_id() IS NULL OR user_id = public.current_customer_user_id());

DO $$
DECLARE
  account RECORD;
BEGIN
  FOR account IN
    SELECT DISTINCT u.db_user
    FROM public.users u
    JOIN pg_roles r ON r.rolname = u.db_user
    WHERE UPPER(u.role) = 'CUSTOMER' AND u.db_user IS NOT NULL
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', account.db_user);
    EXECUTE format(
      'GRANT SELECT ON TABLE public.vehicles, public.accessories, public.users, public.customers, public.orders, public.contracts, public.accessory_orders, public.inspections, public.security_levels TO %I',
      account.db_user
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.current_customer_user_id(), public.current_customer_id() TO %I', account.db_user);
  END LOOP;
END $$;
