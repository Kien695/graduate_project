CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  employee_code VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_user_unique ON employees(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS employees_code_unique_ci ON employees(LOWER(employee_code));
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique_ci ON employees(LOWER(email));
