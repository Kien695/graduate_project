CREATE OR REPLACE VIEW dashboard_overview AS
WITH subject AS (
  SELECT sl.rank FROM users u
  JOIN security_levels sl ON sl.id=u.security_level_id
  WHERE u.db_user=current_user
), payment_totals AS (
  SELECT contract_id,COALESCE(SUM(amount),0) AS paid_amount
  FROM payments GROUP BY contract_id
), visible_contracts AS (
  SELECT c.* FROM contracts c
  LEFT JOIN security_levels object_level ON object_level.id=c.security_level_id
  WHERE NOT EXISTS (SELECT 1 FROM subject)
     OR COALESCE(object_level.rank,0) <= (SELECT rank FROM subject LIMIT 1)
)
SELECT
  (SELECT COUNT(*)::int FROM vehicles) AS vehicle_count,
  (SELECT COUNT(*)::int FROM orders) AS order_count,
  (SELECT COUNT(*)::int FROM visible_contracts) AS contract_count,
  (SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN visible_contracts c ON c.id=p.contract_id) AS revenue,
  COALESCE((SELECT jsonb_object_agg(status,total) FROM (
    SELECT LOWER(status) status,COUNT(*)::int total FROM orders GROUP BY LOWER(status)
  ) s),'{}'::jsonb) AS order_status,
  COALESCE((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
    SELECT o.id,o.customer_id,o.vehicle_id,o.status,o.created_at,
           c.full_name customer_name,v.brand,v.model
    FROM orders o LEFT JOIN customers c ON c.id=o.customer_id
    LEFT JOIN vehicles v ON v.id=o.vehicle_id
    ORDER BY o.created_at DESC LIMIT 5
  ) x),'[]'::jsonb) AS recent_orders,
  COALESCE((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
    SELECT c.id,c.contract_number,c.order_id,c.status,c.created_at,
           COALESCE(pt.paid_amount,0) AS paid_amount
    FROM visible_contracts c
    LEFT JOIN payment_totals pt ON pt.contract_id=c.id
    ORDER BY c.created_at DESC LIMIT 5
  ) x),'[]'::jsonb) AS recent_contracts,
  COALESCE((SELECT jsonb_agg(x ORDER BY x.period_start) FROM (
    SELECT date_trunc('month',c.created_at) AS period_start,COALESCE(SUM(p.amount),0) amount
    FROM visible_contracts c LEFT JOIN payments p ON p.contract_id=c.id
    GROUP BY date_trunc('month',c.created_at)
    ORDER BY period_start DESC LIMIT 6
  ) x),'[]'::jsonb) AS revenue_chart;
