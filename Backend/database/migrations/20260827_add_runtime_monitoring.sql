BEGIN;

ALTER TABLE monitoring_alert_configs
  ADD COLUMN IF NOT EXISTS response_time_threshold_ms NUMERIC(10,2) DEFAULT 2000;

CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id BIGSERIAL PRIMARY KEY,
  metric VARCHAR(50) NOT NULL,
  measured_value NUMERIC(14,2) NOT NULL,
  threshold_value NUMERIC(14,2) NOT NULL,
  message TEXT NOT NULL,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'logged',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS monitoring_alerts_created_at_idx
  ON monitoring_alerts(created_at DESC);

COMMIT;
