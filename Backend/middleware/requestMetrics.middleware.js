const monitoring = require("../service/monitoring.service");

const requestMetrics = (req, res, next) => {
  // Không tính các lần admin tải trang giám sát vào số liệu tải của hệ thống
  if (req.path.startsWith("/api/monitoring")) return next();
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    monitoring.recordRequest(durationMs, res.statusCode);
  });
  next();
};

module.exports = { requestMetrics };
