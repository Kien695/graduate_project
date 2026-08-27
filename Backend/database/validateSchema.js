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
      "SELECT id,email,full_name,role,security_level_id,is_locked,is_active,avatar_url,avatar_public_id,avatar_size_bytes FROM users LIMIT 0",
      "SELECT id,user_id,employee_code,full_name,phone,email,position,department,created_at,updated_at FROM employees LIMIT 0",
      "SELECT id,device_id,device_type,user_agent,ip_address,last_activity_at,expires_at,revoked_at,created_at FROM user_sessions LIMIT 0",
      "SELECT id,user_id,full_name,email,phone,address,encrypted_profile,is_active,updated_at FROM customers LIMIT 0",
      "SELECT cccd_encrypted,email_encrypted,phone_encrypted,address_encrypted FROM customers LIMIT 0",
      "SELECT id,customer_id,quota_mb,used_mb,created_at,updated_at FROM customer_storage LIMIT 0",
      "SELECT email_encrypted,phone_encrypted,email_lookup_hash FROM users LIMIT 0",
      "SELECT id,vin,brand,model,price,status,description,images,updated_at FROM vehicles LIMIT 0",
      "SELECT id,name,sku,price,stock,is_active,images,updated_at FROM accessories LIMIT 0",
      "SELECT id,customer_id,vehicle_id,total_amount,note,created_by,status,updated_at FROM orders LIMIT 0",
      "SELECT id,order_id,contract_number,terms,security_level_id,approved_by,approved_at,signed_at,updated_at FROM contracts LIMIT 0",
      "SELECT id,contract_id,amount,method,reference,paid_at,created_by FROM payments LIMIT 0",
      "SELECT id,vehicle_id,order_id,contract_id,inspector_id,status,checklist,notes,inspected_at,updated_at FROM inspections LIMIT 0",
      "SELECT id,inspection_id,url,public_id,size_bytes,customer_id,created_at FROM inspection_images LIMIT 0",
      "SELECT id,user_id,action,entity_type,entity_id,old_values,new_values,ip_address FROM audit_logs LIMIT 0",
      "SELECT id,file_name,file_path,status,size_bytes,created_by FROM backup_records LIMIT 0",
      "SELECT id,backup_record_id,file_name,size,status,created_at,completed_at FROM backup_history LIMIT 0",
      "SELECT id,cpu_threshold,memory_threshold,load_threshold,updated_by FROM monitoring_alert_configs LIMIT 0",
      "SELECT response_time_threshold_ms FROM monitoring_alert_configs LIMIT 0",
      "SELECT id,metric,measured_value,threshold_value,message,delivery_status,created_at FROM monitoring_alerts LIMIT 0",
      "SELECT id,user_id,title,message,type,reference_id,is_read,created_at,updated_at FROM notifications LIMIT 0",
    ];
    for (const query of checks) await client.query(query);
    const customerUsers = await client.query(
      `SELECT COUNT(*)::int violations FROM users
       WHERE UPPER(role)='CUSTOMER' AND (
         email IS NOT NULL OR phone IS NOT NULL OR
         email_lookup_hash IS NULL OR email_encrypted IS NULL
       )`,
    );
    const customerProfiles = await client.query(
      `SELECT COUNT(*)::int violations FROM customers
       WHERE email IS NOT NULL OR phone IS NOT NULL OR address IS NOT NULL`,
    );
    if (customerUsers.rows[0].violations || customerProfiles.rows[0].violations)
      throw new Error("Customer profile plaintext validation failed");
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
