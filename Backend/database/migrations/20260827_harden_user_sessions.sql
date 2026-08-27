ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

UPDATE user_sessions
SET device_type = CASE
    WHEN UPPER(device_type) = 'MOBILE' THEN 'MOBILE'
    ELSE 'PC'
  END,
  last_activity_at = COALESCE(last_activity_at, created_at, NOW());

CREATE INDEX IF NOT EXISTS user_sessions_user_device_active_idx
  ON user_sessions(user_id, device_type, revoked_at);
