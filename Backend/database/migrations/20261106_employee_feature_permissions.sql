CREATE TABLE IF NOT EXISTS employee_feature_permissions (
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  privilege VARCHAR(10) NOT NULL,
  PRIMARY KEY (employee_id, feature_key, privilege)
);
