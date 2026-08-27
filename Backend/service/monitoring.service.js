const os = require("os");
const { database } = require("../database/database");

const requestState = { count: 0, errors: 0, totalDurationMs: 0, samples: [] };
const lastAlerts = new Map();
const memory = () => {
  const total = os.totalmem();
  const free = os.freemem();
  return { totalBytes: total, freeBytes: free, usedBytes: total - free,
    usagePercent: Number((((total - free) / total) * 100).toFixed(2)) };
};
const cpu = () => {
  const cpus = os.cpus(); let idle = 0; let total = 0;
  for (const core of cpus) { idle += core.times.idle; total += Object.values(core.times).reduce((a, b) => a + b, 0); }
  return { cores: cpus.length, usagePercent: Number(((1 - idle / total) * 100).toFixed(2)) };
};
const load = () => ({ loadAverage: os.loadavg(), uptimeSeconds: os.uptime() });
const recordRequest = (durationMs, statusCode) => {
  requestState.count += 1; requestState.totalDurationMs += durationMs;
  if (statusCode >= 500) requestState.errors += 1;
  requestState.samples.push(durationMs);
  if (requestState.samples.length > 1000) requestState.samples.shift();
};
const requestMetrics = () => {
  const sorted = [...requestState.samples].sort((a, b) => a - b);
  const percentile = (value) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] : 0;
  return {
    requestCount: requestState.count, errorCount: requestState.errors,
    errorRate: requestState.count ? requestState.errors / requestState.count : 0,
    averageLatencyMs: requestState.count ? requestState.totalDurationMs / requestState.count : 0,
    p95LatencyMs: percentile(0.95),
  };
};
const status = async () => ({
  status: "ok", hostname: os.hostname(), platform: os.platform(), nodeVersion: process.version,
  processUptimeSeconds: process.uptime(), cpu: cpu(), memory: memory(), load: load(),
  requests: requestMetrics(),
  database: { totalConnections: database.totalCount, idleConnections: database.idleCount, waitingRequests: database.waitingCount },
});
const configure = async (input, userId) => {
  const existing = await database.query("SELECT id FROM monitoring_alert_configs ORDER BY id LIMIT 1");
  const values = [Number(input.cpuThreshold), Number(input.memoryThreshold), Number(input.loadThreshold), Number(input.responseTimeThresholdMs || 2000), userId];
  const { rows } = existing.rows[0]
    ? await database.query(
      `UPDATE monitoring_alert_configs SET cpu_threshold=$1,memory_threshold=$2,
       load_threshold=$3,response_time_threshold_ms=$4,updated_by=$5,updated_at=NOW()
       WHERE id=$6 RETURNING *`, [...values, existing.rows[0].id])
    : await database.query(
      `INSERT INTO monitoring_alert_configs(cpu_threshold,memory_threshold,load_threshold,
       response_time_threshold_ms,updated_by) VALUES($1,$2,$3,$4,$5) RETURNING *`, values);
  return rows[0];
};
const alertList = async () => (await database.query(
  "SELECT * FROM monitoring_alerts ORDER BY created_at DESC LIMIT 100",
)).rows;
const deliverAlert = async (metric, value, threshold) => {
  const cooldownMs = Number(process.env.MONITORING_ALERT_COOLDOWN_MS || 300000);
  if (Date.now() - (lastAlerts.get(metric) || 0) < cooldownMs) return;
  lastAlerts.set(metric, Date.now());
  const message = `${metric} is ${value}, exceeding threshold ${threshold}`;
  console.warn("MONITORING ALERT:", message);
  let deliveryStatus = "logged";
  if (process.env.MONITORING_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ metric, value, threshold, message }),
      });
      deliveryStatus = response.ok ? "webhook_sent" : `webhook_http_${response.status}`;
    } catch (_) { deliveryStatus = "webhook_failed"; }
  }
  await database.query(
    `INSERT INTO monitoring_alerts(metric,measured_value,threshold_value,message,delivery_status)
     VALUES($1,$2,$3,$4,$5)`, [metric, value, threshold, message, deliveryStatus]);
};
const evaluateAlerts = async () => {
  const config = await database.query("SELECT * FROM monitoring_alert_configs ORDER BY id LIMIT 1");
  const thresholds = config.rows[0] || { cpu_threshold: 80, memory_threshold: 80, response_time_threshold_ms: 2000 };
  const snapshot = { cpu: cpu().usagePercent, memory: memory().usagePercent, latency: requestMetrics().p95LatencyMs };
  if (snapshot.cpu > Number(thresholds.cpu_threshold)) await deliverAlert("cpu_percent", snapshot.cpu, thresholds.cpu_threshold);
  if (snapshot.memory > Number(thresholds.memory_threshold)) await deliverAlert("memory_percent", snapshot.memory, thresholds.memory_threshold);
  if (snapshot.latency > Number(thresholds.response_time_threshold_ms)) await deliverAlert("p95_latency_ms", snapshot.latency, thresholds.response_time_threshold_ms);
  return snapshot;
};
const startAlertWorker = () => {
  if (String(process.env.MONITORING_ENABLED || "true").toLowerCase() === "false") return null;
  const timer = setInterval(() => evaluateAlerts().catch((error) =>
    console.error("Monitoring worker failed:", error.message)), Number(process.env.MONITORING_INTERVAL_MS || 60000));
  timer.unref(); return timer;
};

module.exports = { memory, cpu, load, status, configure, recordRequest, requestMetrics, alertList, evaluateAlerts, startAlertWorker };
