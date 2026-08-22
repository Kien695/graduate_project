-- =====================================================
-- DATABASE: AUTO DEALER MANAGEMENT SYSTEM
-- PostgreSQL
-- =====================================================


-- =========================
-- 1. SECURITY LEVEL (MAC)
-- =========================

CREATE TABLE security_levels (
    id SERIAL PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL,
    description TEXT
);


INSERT INTO security_levels(level_name)
VALUES
('PUBLIC'),
('CONFIDENTIAL'),
('SECRET'),
('TOP_SECRET');



-- =========================
-- 2. USERS
-- =========================

CREATE TABLE users (

    id SERIAL PRIMARY KEY,

    username VARCHAR(50) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(30)
    CHECK(role IN
    (
        'ADMIN',
        'STAFF',
        'CUSTOMER'
    )),

    email VARCHAR(100),

    phone VARCHAR(20),

    failed_login_count INT DEFAULT 0,

    locked_until TIMESTAMP,

    security_level_id INT,

    status VARCHAR(20)
    DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(security_level_id)
    REFERENCES security_levels(id)

);



-- =========================
-- 3. CUSTOMER PROFILE
-- =========================


CREATE TABLE customers (

    id SERIAL PRIMARY KEY,

    user_id INT UNIQUE,

    full_name VARCHAR(100),

    cccd_encrypt TEXT,

    address_encrypt TEXT,

    phone_encrypt TEXT,


    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(user_id)
    REFERENCES users(id)

);



-- =========================
-- 4. DEVICE LOGIN MANAGEMENT
-- =========================


CREATE TABLE devices (

    id SERIAL PRIMARY KEY,


    user_id INT,


    device_type VARCHAR(20)
    CHECK(device_type IN
    (
        'PC',
        'MOBILE'
    )),


    device_token TEXT,


    last_login TIMESTAMP,


    is_active BOOLEAN DEFAULT TRUE,


    FOREIGN KEY(user_id)
    REFERENCES users(id)

);



-- =========================
-- 5. VEHICLE INVENTORY
-- =========================


CREATE TABLE vehicles (

    id SERIAL PRIMARY KEY,


    brand VARCHAR(50),

    model VARCHAR(100),

    manufacture_year INT,


    color VARCHAR(50),


    price NUMERIC(15,2),


    status VARCHAR(30)
    CHECK(status IN
    (
        'AVAILABLE',
        'RESERVED',
        'SOLD',
        'INSPECTION'
    )),


    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



-- =========================
-- 6. ACCESSORIES
-- =========================


CREATE TABLE accessories (

    id SERIAL PRIMARY KEY,


    name VARCHAR(100),


    quantity INT DEFAULT 0,


    price NUMERIC(15,2)

);



-- =========================
-- 7. ORDERS
-- =========================


CREATE TABLE orders (

    id SERIAL PRIMARY KEY,


    customer_id INT,


    vehicle_id INT,


    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    status VARCHAR(30)
    CHECK(status IN
    (
        'PENDING',
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED'
    )),


    FOREIGN KEY(customer_id)
    REFERENCES customers(id),


    FOREIGN KEY(vehicle_id)
    REFERENCES vehicles(id)

);



-- =========================
-- 8. CONTRACT
-- =========================


CREATE TABLE contracts (

    id SERIAL PRIMARY KEY,


    order_id INT,


    customer_id INT,


    contract_number VARCHAR(50)
    UNIQUE,


    total_amount NUMERIC(15,2),


    status VARCHAR(30)
    CHECK(status IN
    (
        'CREATED',
        'APPROVED',
        'SIGNED',
        'CANCELLED'
    )),


    security_level_id INT,


    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(order_id)
    REFERENCES orders(id),


    FOREIGN KEY(customer_id)
    REFERENCES customers(id),


    FOREIGN KEY(security_level_id)
    REFERENCES security_levels(id)

);



-- =========================
-- 9. CONTRACT PAYMENT
-- =========================


CREATE TABLE payments (

    id SERIAL PRIMARY KEY,


    contract_id INT,


    amount NUMERIC(15,2),


    payment_method VARCHAR(30),


    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    status VARCHAR(20),


    FOREIGN KEY(contract_id)
    REFERENCES contracts(id)

);



-- =========================
-- 10. VEHICLE INSPECTION
-- =========================


CREATE TABLE inspections (

    id SERIAL PRIMARY KEY,


    vehicle_id INT,


    contract_id INT,


    inspector_id INT,


    result VARCHAR(20)
    CHECK(result IN
    (
        'PASS',
        'FAIL',
        'WAITING'
    )),


    note TEXT,


    inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(vehicle_id)
    REFERENCES vehicles(id),


    FOREIGN KEY(contract_id)
    REFERENCES contracts(id),


    FOREIGN KEY(inspector_id)
    REFERENCES users(id)

);



-- =========================
-- 11. INSPECTION IMAGES
-- =========================


CREATE TABLE inspection_images (

    id SERIAL PRIMARY KEY,


    inspection_id INT,


    image_url TEXT,


    FOREIGN KEY(inspection_id)
    REFERENCES inspections(id)

);



-- =========================
-- 12. AUDIT LOG
-- =========================


CREATE TABLE audit_logs (

    id SERIAL PRIMARY KEY,


    user_id INT,


    contract_id INT,


    action VARCHAR(50),


    old_data JSONB,


    new_data JSONB,


    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(user_id)
    REFERENCES users(id),


    FOREIGN KEY(contract_id)
    REFERENCES contracts(id)

);



-- =========================
-- 13. MAC POLICY
-- =========================


CREATE TABLE mac_policy (

    id SERIAL PRIMARY KEY,


    subject_level INT,


    object_level INT,


    permission VARCHAR(20)
    CHECK(permission IN
    (
        'ALLOW',
        'DENY'
    )),


    FOREIGN KEY(subject_level)
    REFERENCES security_levels(id),


    FOREIGN KEY(object_level)
    REFERENCES security_levels(id)

);



-- =========================
-- 14. BACKUP MANAGEMENT
-- =========================


CREATE TABLE backups (

    id SERIAL PRIMARY KEY,


    file_name TEXT,


    backup_type VARCHAR(20),


    backup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    status VARCHAR(20)

);



-- =========================
-- 15. SERVER MONITORING
-- =========================


CREATE TABLE server_monitoring (

    id SERIAL PRIMARY KEY,


    cpu_usage NUMERIC(5,2),


    memory_usage NUMERIC(5,2),


    disk_usage NUMERIC(5,2),


    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
-- Bổ sung bnag nhân viên
CREATE TABLE employees (
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

-- =========================
-- INDEX OPTIMIZATION
-- =========================


CREATE INDEX idx_vehicle_status
ON vehicles(status);


CREATE INDEX idx_order_customer
ON orders(customer_id);


CREATE INDEX idx_contract_customer
ON contracts(customer_id);


CREATE INDEX idx_audit_contract
ON audit_logs(contract_id);

select * from users