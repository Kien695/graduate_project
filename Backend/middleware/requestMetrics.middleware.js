const monitoring = require("../service/monitoring.service");

const requestMetrics = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    monitoring.recordRequest(durationMs, res.statusCode);
  });
  next();
};

module.exports = { requestMetrics };
