CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS security_levels (id SERIAL PRIMARY KEY,level_name VARCHAR(50) UNIQUE,description TEXT);
ALTER TABLE security_levels ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE security_levels ADD COLUMN IF NOT EXISTS rank SMALLINT;
ALTER TABLE security_levels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
UPDATE security_levels SET name=COALESCE(name,level_name),rank=COALESCE(rank,id-1);
INSERT INTO security_levels(level_name,name,rank,description) SELECT v.n,v.n,v.r,v.d FROM (VALUES ('PUBLIC',0,'Public'),('INTERNAL',1,'Internal'),('CONFIDENTIAL',2,'Confidential'),('RESTRICTED',3,'Restricted')) v(n,r,d) WHERE NOT EXISTS(SELECT 1 FROM security_levels s WHERE COALESCE(s.name,s.level_name)=v.n);
CREATE UNIQUE INDEX IF NOT EXISTS security_levels_name_unique ON security_levels(name);
CREATE INDEX IF NOT EXISTS security_levels_rank_idx ON security_levels(rank);

CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY,username VARCHAR(100),password_hash TEXT NOT NULL,role VARCHAR(30),email VARCHAR(255),phone VARCHAR(30),failed_login_count INTEGER DEFAULT 0,locked_until TIMESTAMP,security_level_id INTEGER REFERENCES security_levels(id),status VARCHAR(30),created_at TIMESTAMP DEFAULT NOW());
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE users SET full_name=COALESCE(full_name,username,email),failed_login_attempts=COALESCE(failed_login_count,failed_login_attempts,0),is_active=UPPER(COALESCE(status,'ACTIVE')) NOT IN ('INACTIVE','DISABLED'),is_locked=COALESCE(is_locked,FALSE) OR locked_until>NOW();
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_ci ON users(LOWER(email)) WHERE email IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS user_sessions (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,refresh_token_hash CHAR(64),device_id VARCHAR(255),device_type VARCHAR(30) DEFAULT 'unknown',user_agent TEXT,ip_address INET,expires_at TIMESTAMPTZ NOT NULL,revoked_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS user_sessions_user_active_idx ON user_sessions(user_id,revoked_at);

CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id),full_name VARCHAR(150),created_at TIMESTAMP DEFAULT NOW());
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS encrypted_profile TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS vehicles (id SERIAL PRIMARY KEY,brand VARCHAR(80),model VARCHAR(100),manufacture_year INTEGER,color VARCHAR(50),price NUMERIC(15,2),status VARCHAR(30),created_at TIMESTAMP DEFAULT NOW());
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vehicles ALTER COLUMN status SET DEFAULT 'available';
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vin_unique ON vehicles(vin) WHERE vin IS NOT NULL;

CREATE TABLE IF NOT EXISTS accessories (id SERIAL PRIMARY KEY,name VARCHAR(150),quantity INTEGER DEFAULT 0,price NUMERIC(15,2));
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS sku VARCHAR(80);
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE accessories SET stock=COALESCE(quantity,stock,0);
CREATE UNIQUE INDEX IF NOT EXISTS accessories_sku_unique ON accessories(sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY,customer_id INTEGER REFERENCES customers(id),vehicle_id INTEGER REFERENCES vehicles(id),order_date TIMESTAMP DEFAULT NOW(),status VARCHAR(30));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
UPDATE orders SET created_at=COALESCE(order_date,created_at);

CREATE TABLE IF NOT EXISTS contracts (id SERIAL PRIMARY KEY,order_id INTEGER REFERENCES orders(id),customer_id INTEGER REFERENCES customers(id),contract_number VARCHAR(80),total_amount NUMERIC(15,2),status VARCHAR(30),security_level_id INTEGER REFERENCES security_levels(id),created_at TIMESTAMP DEFAULT NOW());
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS contracts_order_unique ON contracts(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_number_unique ON contracts(contract_number);

CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY,contract_id INTEGER REFERENCES contracts(id),amount NUMERIC(15,2),payment_method VARCHAR(30),payment_date TIMESTAMP DEFAULT NOW(),status VARCHAR(30));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(30);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS inspections (id SERIAL PRIMARY KEY,vehicle_id INTEGER REFERENCES vehicles(id),contract_id INTEGER REFERENCES contracts(id),inspector_id INTEGER REFERENCES users(id),result VARCHAR(30),note TEXT,inspection_date TIMESTAMP DEFAULT NOW());
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE inspections SET status=CASE WHEN LOWER(result) IN ('pass','passed') THEN 'passed' WHEN LOWER(result) IN ('fail','failed') THEN 'failed' ELSE COALESCE(status,'pending') END,notes=COALESCE(notes,note),created_at=COALESCE(inspection_date,created_at);

CREATE TABLE IF NOT EXISTS inspection_images (id SERIAL PRIMARY KEY,inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,image_url TEXT);
ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id),contract_id INTEGER REFERENCES contracts(id),action VARCHAR(50),old_data JSONB,new_data JSONB,created_at TIMESTAMP DEFAULT NOW());
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(80);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type,entity_id,created_at DESC);

CREATE TABLE IF NOT EXISTS backup_records (id SERIAL PRIMARY KEY,file_name TEXT NOT NULL,file_path TEXT NOT NULL,status VARCHAR(20) NOT NULL,size_bytes BIGINT,created_by INTEGER REFERENCES users(id),created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS monitoring_alert_configs (id SERIAL PRIMARY KEY,cpu_threshold NUMERIC(5,2) DEFAULT 85,memory_threshold NUMERIC(5,2) DEFAULT 85,load_threshold NUMERIC(8,2) DEFAULT 5,updated_by INTEGER REFERENCES users(id),updated_at TIMESTAMPTZ DEFAULT NOW());

-- Normalize legacy uppercase checks while preserving existing values.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (UPPER(role) IN ('ADMIN','MANAGER','STAFF','CUSTOMER'));
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check CHECK (UPPER(status) IN ('AVAILABLE','RESERVED','SOLD','INSPECTION','MAINTENANCE','INACTIVE'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (UPPER(status) IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED'));
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (UPPER(status) IN ('CREATED','DRAFT','APPROVED','SIGNED','CANCELLED','COMPLETED'));
