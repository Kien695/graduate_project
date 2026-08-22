require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { database } = require("../database/database");
const cloudinary = require("../config/cloudinary");

const baseUrl = `http://localhost:${process.env.PORT || 5000}/api`;
let token;
let refreshToken;
const ids = {};
const uploadedPublicIds = [];
const backupFiles = [];

const call = async (method, endpoint, body, authenticated = true) => {
  const headers = {};
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body:
      body instanceof FormData
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      `${method} ${endpoint} -> ${response.status}: ${payload.message || "Unknown error"}`,
    );
  return payload.data;
};
const pass = (name) => console.log(`PASS ${name}`);
const assert = (condition, name) => {
  if (!condition) throw new Error(`Assertion failed: ${name}`);
  pass(name);
};

const cleanup = async () => {
  for (const publicId of uploadedPublicIds)
    await cloudinary.uploader.destroy(publicId).catch(() => undefined);
  for (const file of backupFiles)
    if (file && fs.existsSync(file))
      await fs.promises.unlink(file).catch(() => undefined);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    if (ids.inspection) {
      await client.query(
        "DELETE FROM inspection_images WHERE inspection_id=$1",
        [ids.inspection],
      );
      await client.query("DELETE FROM inspections WHERE id=$1", [
        ids.inspection,
      ]);
    }
    if (ids.contract) {
      await client.query("DELETE FROM payments WHERE contract_id=$1", [
        ids.contract,
      ]);
      await client.query(
        "DELETE FROM audit_logs WHERE entity_type='contract' AND entity_id=$1",
        [String(ids.contract)],
      );
      await client.query("DELETE FROM contracts WHERE id=$1", [ids.contract]);
    }
    if (ids.order) {
      await client.query(
        "DELETE FROM audit_logs WHERE entity_type='order' AND entity_id=$1",
        [String(ids.order)],
      );
      await client.query("DELETE FROM orders WHERE id=$1", [ids.order]);
    }
    if (ids.customer) {
      await client.query(
        "DELETE FROM audit_logs WHERE entity_type='customers' AND entity_id=$1",
        [String(ids.customer)],
      );
      await client.query("DELETE FROM customers WHERE id=$1", [ids.customer]);
    }
    if (ids.accessory) {
      await client.query(
        "DELETE FROM audit_logs WHERE entity_type='accessories' AND entity_id=$1",
        [String(ids.accessory)],
      );
      await client.query("DELETE FROM accessories WHERE id=$1", [
        ids.accessory,
      ]);
    }
    if (ids.vehicle) {
      await client.query(
        "DELETE FROM audit_logs WHERE entity_type='vehicles' AND entity_id=$1",
        [String(ids.vehicle)],
      );
      await client.query("DELETE FROM vehicles WHERE id=$1", [ids.vehicle]);
    }
    if (ids.backup)
      await client.query("DELETE FROM backup_records WHERE id=$1", [
        ids.backup,
      ]);
    await client.query(
      "DELETE FROM user_sessions WHERE device_id LIKE 'e2e-%'",
    );
    await client.query(
      "UPDATE users SET is_locked=FALSE,locked_until=NULL,failed_login_attempts=0 WHERE LOWER(email)=LOWER($1)",
      [process.env.ADMIN_EMAIL],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cleanup warning:", error.message);
  } finally {
    client.release();
  }
};

const run = async () => {
  try {
    const login = await call(
      "POST",
      "/auth/login",
      {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        deviceId: "e2e-main",
        deviceType: "desktop",
      },
      false,
    );
    token = login.accessToken;
    refreshToken = login.refreshToken;
    assert(token && login.user.role === "admin", "Authentication login");
    const me = await call("GET", "/users/me");
    assert(me.email === process.env.ADMIN_EMAIL, "Current user");
    const refreshed = await call(
      "POST",
      "/auth/refresh-token",
      { refreshToken },
      false,
    );
    assert(refreshed.accessToken, "Refresh token");
    token = refreshed.accessToken;

    const vehicle = await call("POST", "/vehicles", {
      vin: `E2E-VIN-${Date.now()}`,
      brand: "E2E Motors",
      model: "Integration",
      manufacture_year: 2026,
      color: "Navy",
      price: 1000000000,
      status: "available",
      description: "E2E test vehicle",
    });
    ids.vehicle = vehicle.id;
    assert(vehicle.status === "available", "Create vehicle");
    const updatedVehicle = await call("PUT", `/vehicles/${ids.vehicle}`, {
      color: "Midnight Blue",
    });
    assert(updatedVehicle.color === "Midnight Blue", "Update vehicle");
    const available = await call(
      "GET",
      "/vehicles/available",
      undefined,
      false,
    );
    assert(
      (available.items || []).some((item) => item.id === ids.vehicle),
      "Available vehicle list",
    );

    const accessory = await call("POST", "/accessories", {
      name: "E2E Camera",
      sku: `E2E-${Date.now()}`,
      price: 2500000,
      stock: 5,
      is_active: true,
    });
    ids.accessory = accessory.id;
    assert(accessory.stock === 5, "Create accessory");
    const customer = await call("POST", "/customers", {
      full_name: "E2E Customer",
      email: `e2e-${Date.now()}@example.com`,
      phone: "0900000000",
      address: "E2E Address",
      is_active: true,
    });
    ids.customer = customer.id;
    assert(customer.full_name === "E2E Customer", "Create customer");
    await call("POST", `/customers/${ids.customer}/encrypt-profile`, {
      profile: { citizenId: "E2E-IDENTITY" },
    });
    const profile = await call(
      "GET",
      `/customers/${ids.customer}/encrypted-profile`,
    );
    assert(
      profile.profile.includes("E2E-IDENTITY"),
      "Encrypt/decrypt customer profile",
    );

    const order = await call("POST", "/orders", {
      customer_id: ids.customer,
      vehicle_id: ids.vehicle,
      note: "E2E order",
    });
    ids.order = order.id;
    assert(order.status === "pending", "Create order and reserve vehicle");
    const confirmed = await call("POST", `/orders/${ids.order}/confirm`);
    assert(confirmed.status === "confirmed", "Confirm order");
    const contract = await call("POST", "/contracts", {
      order_id: ids.order,
      contract_number: `E2E-HD-${Date.now()}`,
      terms: "E2E terms",
    });
    ids.contract = contract.id;
    assert(contract.status === "draft", "Create contract");
    const approved = await call("POST", `/contracts/${ids.contract}/approve`);
    assert(approved.status === "approved", "Approve contract");
    const signed = await call("POST", `/contracts/${ids.contract}/sign`);
    assert(signed.status === "signed", "Sign contract");
    const payment = await call("POST", `/contracts/${ids.contract}/payment`, {
      amount: 1000000000,
      method: "bank_transfer",
      reference: "E2E-PAY",
    });
    assert(Number(payment.amount) === 1000000000, "Contract payment");
    const logs = await call("GET", `/contracts/${ids.contract}/audit-logs`);
    assert(logs.items.length >= 4, "Contract audit history");

    const inspection = await call("POST", "/inspections", {
      vehicle_id: ids.vehicle,
      notes: "E2E inspection",
    });
    ids.inspection = inspection.id;
    assert(inspection.status === "pending", "Create inspection");
    const imagePath = path.resolve(
      __dirname,
      "../../Frontend/src/assets/showroom-login.png",
    );
    if (
      fs.existsSync(imagePath) &&
      process.env.CLOUD_NAME &&
      process.env.CLOUD_KEY &&
      process.env.CLOUD_SECRET
    ) {
      const form = new FormData();
      form.append(
        "images",
        new Blob([await fs.promises.readFile(imagePath)], {
          type: "image/png",
        }),
        "e2e.png",
      );
      const images = await call(
        "POST",
        `/inspections/${ids.inspection}/images`,
        form,
      );
      for (const image of images) uploadedPublicIds.push(image.public_id);
      assert(images.length === 1, "Cloudinary inspection upload");
    }
    const passedInspection = await call(
      "POST",
      `/inspections/${ids.inspection}/pass`,
    );
    assert(passedInspection.status === "passed", "Pass inspection");
    const completed = await call("POST", `/orders/${ids.order}/complete`);
    assert(completed.status === "completed", "Complete order");

    const devices = await call("GET", "/devices");
    assert(devices.length >= 1, "Device list");
    const sessions = await call("GET", "/sessions");
    assert(sessions.length >= 1, "Session list");
    const levels = await call("GET", "/security-levels");
    assert(levels.length >= 1, "Security levels");
    const audits = await call("GET", "/audit-logs");
    assert(audits.items.length >= 1, "Audit log list");
    for (const endpoint of [
      "/monitoring/server/status",
      "/monitoring/server/cpu",
      "/monitoring/server/memory",
      "/monitoring/server/load",
    ]) {
      const result = await call("GET", endpoint);
      assert(result !== null, `Monitoring ${endpoint.split("/").pop()}`);
    }
    const config = await call("POST", "/monitoring/alerts/config", {
      cpuThreshold: 85,
      memoryThreshold: 85,
      loadThreshold: 5,
    });
    assert(Number(config.cpu_threshold) === 85, "Monitoring alert config");

    const backups = await call("GET", "/backups");
    assert(Array.isArray(backups), "Backup list");
    const backup = await call("POST", "/backups");
    ids.backup = backup.id;
    backupFiles.push(backup.file_path);
    assert(backup.status === "completed", "Create database backup");

    await call("POST", "/auth/logout", { refreshToken }, false);
    pass("Logout");
    console.log("E2E_RESULT=PASS");
  } finally {
    await cleanup();
    await database.end();
  }
};
run().catch((error) => {
  console.error("E2E_RESULT=FAIL", error.message);
  process.exitCode = 1;
});
