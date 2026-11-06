CREATE TABLE IF NOT EXISTS permission_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS permission_groups_name_unique_ci ON permission_groups(LOWER(name));

CREATE TABLE IF NOT EXISTS permission_group_features (
  group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  privilege VARCHAR(10) NOT NULL,
  PRIMARY KEY (group_id, feature_key, privilege)
);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS permission_group_id INTEGER REFERENCES permission_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS employees_permission_group_idx ON employees(permission_group_id);
