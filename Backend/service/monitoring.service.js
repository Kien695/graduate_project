const os = require("os");
const fs = require("fs");
const { systemDatabase: database } = require("../database/database");
const databaseSessions = require("./databaseSession.service");

const WINDOW_MS = Math.max(5000, Number(process.env.MONITORING_WINDOW_MS || 60000));
const MIN_SAMPLES = Math.max(1, Number(process.env.MONITORING_MIN_SAMPLES || 5));
const SUSTAIN_CHECKS = Math.max(1, Number(process.env.MONITORING_SUSTAIN_CHECKS || 2));
const MAX_SAMPLES = 20000;

// ---- Yêu cầu HTTP: lưu từng mẫu kèm thời điểm để tính theo cửa sổ thời gian ----
const requestState = { count: 0, errors: 0, totalDurationMs: 0, samples: [] };
const recordRequest = (durationMs, statusCode) => {
  requestState.count += 1;
  requestState.totalDurationMs += durationMs;
  if (statusCode >= 500) requestState.errors += 1;
  requestState.samples.push({ at: Date.now(), ms: durationMs, error: statusCode >= 500 });
  if (requestState.samples.length > MAX_SAMPLES) requestState.samples.shift();
};
const requestMetrics = () => {
  const since = Date.now() - WINDOW_MS;
  const recent = requestState.samples.filter((s) => s.at >= since);
  const sorted = recent.map((s) => s.ms).sort((a, b) => a - b);
  const percentile = (value) =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] : 0;
  const errors = recent.filter((s) => s.error).length;
  return {
    requestCount: requestState.count,
    errorCount: requestState.errors,
    errorRate: requestState.count ? requestState.errors / requestState.count : 0,
    averageLatencyMs: requestState.count ? requestState.totalDurationMs / requestState.count : 0,
    windowSeconds: WINDOW_MS / 1000,
    windowRequestCount: recent.length,
    windowErrorCount: errors,
    requestsPerSecond: Number((recent.length / (WINDOW_MS / 1000)).toFixed(2)),
    p95LatencyMs: percentile(0.95),
  };
};

// ---- CPU: tính phần trăm sử dụng giữa hai lần lấy mẫu (không phải trung bình từ lúc bật máy) ----
const readCpuTimes = () => {
  let idle = 0;
  let total = 0;
  for (const core of os.cpus()) {
    idle += core.times.idle;
    total += Object.values(core.times).reduce((a, b) => a + b, 0);
  }
  return { idle, total };
};
let lastCpuTimes = readCpuTimes();
let cpuPercent = 0;
const sampleCpu = () => {
  const now = readCpuTimes();
  const totalDelta = now.total - lastCpuTimes.total;
  const idleDelta = now.idle - lastCpuTimes.idle;
  if (totalDelta > 0) cpuPercent = Number(((1 - idleDelta / totalDelta) * 100).toFixed(2));
  lastCpuTimes = now;
};
const cpuTimer = setInterval(sampleCpu, 5000);
cpuTimer.unref();
const cpu = () => ({ cores: os.cpus().length, usagePercent: cpuPercent });

// ---- Bộ nhớ: ưu tiên giới hạn của container (cgroup) nếu có ----
const readNumber = (file) => {
  try {
    const text = fs.readFileSync(file, "utf8").trim();
    return text === "max" ? null : Number(text);
  } catch (_) {
    return null;
  }
};
const memory = () => {
  const limit = readNumber("/sys/fs/cgroup/memory.max");
  const current = readNumber("/sys/fs/cgroup/memory.current");
  const physical = os.totalmem();
  if (limit && current !== null && limit < physical)
    return {
      source: "container",
      totalBytes: limit,
      freeBytes: limit - current,
      usedBytes: current,
      usagePercent: Number(((current / limit) * 100).toFixed(2)),
    };
  const free = os.freemem();
  return {
    source: "host",
    totalBytes: physical,
    freeBytes: free,
    usedBytes: physical - free,
    usagePercent: Number((((physical - free) / physical) * 100).toFixed(2)),
  };
};
// Load average 1 phút (luôn bằng 0 trên Windows)
const load = () => ({
  loadAverage: os.loadavg(),
  load1: os.loadavg()[0],
  loadPerCore: Number((os.loadavg()[0] / Math.max(1, os.cpus().length)).toFixed(2)),
  uptimeSeconds: os.uptime(),
});

// ---- Cơ sở dữ liệu: pool hệ thống và số pool phiên đăng nhập ----
const databaseStats = () => {
  const sessions = databaseSessions.stats();
  const max = Number(database.options?.max || 10);
  return {
    totalConnections: database.totalCount,
    idleConnections: database.idleCount,
    waitingRequests: database.waitingCount,
    systemPoolMax: max,
    sessionPools: sessions.pools,
    sessionPoolLimit: sessions.limit,
    sessionPoolPercent: Number(((sessions.pools / sessions.limit) * 100).toFixed(2)),
  };
};

// ---- Cấu hình ngưỡng ----
let columnsReady = false;
const ensureColumns = async () => {
  if (columnsReady) return;
  await database.query(
    "ALTER TABLE monitoring_alert_configs ADD COLUMN IF NOT EXISTS response_time_threshold_ms NUMERIC(10,2) DEFAULT 2000",
  );
  await database.query(
    "ALTER TABLE monitoring_alert_configs ADD COLUMN IF NOT EXISTS db_pool_threshold NUMERIC(5,2) DEFAULT 80",
  );
  columnsReady = true;
};
const DEFAULTS = {
  cpu_threshold: 85,
  memory_threshold: 85,
  load_threshold: 5,
  response_time_threshold_ms: 2000,
  db_pool_threshold: 80,
};
const getConfig = async () => {
  await ensureColumns();
  const { rows } = await database.query(
    "SELECT * FROM monitoring_alert_configs ORDER BY id LIMIT 1",
  );
  return { ...DEFAULTS, ...(rows[0] || {}) };
};
const configure = async (input, userId) => {
  await ensureColumns();
  const existing = await database.query("SELECT id FROM monitoring_alert_configs ORDER BY id LIMIT 1");
  const values = [
    Number(input.cpuThreshold),
    Number(input.memoryThreshold),
    Number(input.loadThreshold),
    Number(input.responseTimeThresholdMs || 2000),
    Number(input.dbPoolThreshold || 80),
    userId,
  ];
  const { rows } = existing.rows[0]
    ? await database.query(
        `UPDATE monitoring_alert_configs SET cpu_threshold=$1,memory_threshold=$2,
         load_threshold=$3,response_time_threshold_ms=$4,db_pool_threshold=$5,
         updated_by=$6,updated_at=NOW() WHERE id=$7 RETURNING *`,
        [...values, existing.rows[0].id],
      )
    : await database.query(
        `INSERT INTO monitoring_alert_configs(cpu_threshold,memory_threshold,load_threshold,
         response_time_threshold_ms,db_pool_threshold,updated_by)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        values,
      );
  return rows[0];
};

// ---- Đánh giá ngưỡng ----
const snapshotNow = () => {
  const requests = requestMetrics();
  return {
    cpu: cpu().usagePercent,
    memory: memory().usagePercent,
    load: load().loadPerCore,
    latency: requests.windowRequestCount >= MIN_SAMPLES ? requests.p95LatencyMs : 0,
    dbPool: Math.max(databaseStats().sessionPoolPercent, databaseStats().waitingRequests > 0 ? 100 : 0),
  };
};
const checksFor = (snapshot, t) => [
  { metric: "cpu_percent", value: snapshot.cpu, threshold: Number(t.cpu_threshold) },
  { metric: "memory_percent", value: snapshot.memory, threshold: Number(t.memory_threshold) },
  // Ngưỡng tải được hiểu là load average 1 phút chia cho số nhân CPU
  { metric: "load_per_core", value: snapshot.load, threshold: Number(t.load_threshold) },
  { metric: "p95_latency_ms", value: snapshot.latency, threshold: Number(t.response_time_threshold_ms) },
  { metric: "db_pool_percent", value: snapshot.dbPool, threshold: Number(t.db_pool_threshold) },
];

const lastAlerts = new Map();
const streaks = new Map();
const alertList = async () =>
  (await database.query("SELECT * FROM monitoring_alerts ORDER BY created_at DESC LIMIT 100")).rows;
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
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metric, value, threshold, message }),
      });
      deliveryStatus = response.ok ? "webhook_sent" : `webhook_http_${response.status}`;
    } catch (_) {
      deliveryStatus = "webhook_failed";
    }
  }
  await database.query(
    `INSERT INTO monitoring_alerts(metric,measured_value,threshold_value,message,delivery_status)
     VALUES($1,$2,$3,$4,$5)`,
    [metric, value, threshold, message, deliveryStatus],
  );
};
// Chỉ cảnh báo khi vượt ngưỡng liên tiếp SUSTAIN_CHECKS lần để tránh báo giả do đột biến ngắn
const evaluateAlerts = async () => {
  const thresholds = await getConfig();
  const snapshot = snapshotNow();
  const breaches = [];
  for (const check of checksFor(snapshot, thresholds)) {
    if (check.value > check.threshold) {
      const streak = (streaks.get(check.metric) || 0) + 1;
      streaks.set(check.metric, streak);
      breaches.push(check);
      if (streak >= SUSTAIN_CHECKS) await deliverAlert(check.metric, check.value, check.threshold);
    } else streaks.set(check.metric, 0);
  }
  return { ...snapshot, breaches };
};

const status = async () => {
  const thresholds = await getConfig().catch(() => DEFAULTS);
  const snapshot = snapshotNow();
  return {
    status: "ok",
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version,
    processUptimeSeconds: process.uptime(),
    cpu: cpu(),
    memory: memory(),
    load: load(),
    requests: requestMetrics(),
    database: databaseStats(),
    thresholds,
    breaches: checksFor(snapshot, thresholds).filter((c) => c.value > c.threshold),
  };
};
const startAlertWorker = () => {
  if (String(process.env.MONITORING_ENABLED || "true").toLowerCase() === "false") return null;
  const timer = setInterval(
    () => evaluateAlerts().catch((error) => console.error("Monitoring worker failed:", error.message)),
    Number(process.env.MONITORING_INTERVAL_MS || 60000),
  );
  timer.unref();
  return timer;
};

module.exports = {
  memory, cpu, load, status, getConfig, configure, recordRequest, requestMetrics,
  alertList, evaluateAlerts, startAlertWorker,
};
