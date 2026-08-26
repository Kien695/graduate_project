require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { database } = require("./database");

const validate = async () => {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
    const checks = [
      "SELECT id,email,full_name,role,security_level_id,is_locked,is_active FROM users LIMIT 0",
      "SELECT id,user_id,employee_code,full_name,phone,email,position,department,created_at,updated_at FROM employees LIMIT 0",
      "SELECT id,device_id,device_type,user_agent,ip_address,expires_at,revoked_at,created_at FROM user_sessions LIMIT 0",
      "SELECT id,user_id,full_name,email,phone,address,encrypted_profile,is_active,updated_at FROM customers LIMIT 0",
      "SELECT id,vin,brand,model,price,status,description,images,updated_at FROM vehicles LIMIT 0",
      "SELECT id,name,sku,price,stock,is_active,images,updated_at FROM accessories LIMIT 0",
      "SELECT id,customer_id,vehicle_id,total_amount,note,created_by,status,updated_at FROM orders LIMIT 0",
      "SELECT id,order_id,contract_number,terms,security_level_id,approved_by,approved_at,signed_at,updated_at FROM contracts LIMIT 0",
      "SELECT id,contract_id,amount,method,reference,paid_at,created_by FROM payments LIMIT 0",
      "SELECT id,vehicle_id,inspector_id,status,notes,inspected_at,updated_at FROM inspections LIMIT 0",
      "SELECT id,inspection_id,url,public_id,created_at FROM inspection_images LIMIT 0",
      "SELECT id,user_id,action,entity_type,entity_id,old_values,new_values,ip_address FROM audit_logs LIMIT 0",
      "SELECT id,file_name,file_path,status,size_bytes,created_by FROM backup_records LIMIT 0",
      "SELECT id,cpu_threshold,memory_threshold,load_threshold,updated_by FROM monitoring_alert_configs LIMIT 0",
    ];
    for (const query of checks) await client.query(query);
    await client.query("ROLLBACK");
    console.log("Schema validation passed (transaction rolled back)");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await database.end();
  }
};
validate().catch((error) => { console.error("Schema validation failed:", error.message); process.exitCode=1; });
