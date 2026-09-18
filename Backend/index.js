const { loadEnv } = require("./config/env");
loadEnv();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./database/database");
const mountRoutes = require("./routes");
const backupScheduler = require("./service/backupScheduler.service");
const monitoring = require("./service/monitoring.service");
const { requestMetrics } = require("./middleware/requestMetrics.middleware");
const {
  ErrorHandler,
  ErrorMiddleware,
} = require("./middleware/errorMiddleware");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestMetrics);
// Expo web (bản web cho khách hàng) mở bằng "localhost", còn Expo Go trên điện thoại
// dùng IP LAN — cả 2 đều phải được phép vì cùng là MOBILE_URL, chỉ khác host.
const mobileWebLocalOrigin = process.env.MOBILE_URL?.replace(
  /^(https?:\/\/)[^:/]+(:\d+)?/,
  (_, protocol, port) => `${protocol}localhost${port || ""}`,
);
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.MOBILE_URL,
      mobileWebLocalOrigin,
    ],
    credentials: true,
  }),
);
mountRoutes(app);
app.use((req, res, next) =>
  next(new ErrorHandler("Không tìm thấy endpoint", 404)),
);
app.use(ErrorMiddleware);

const port = Number(process.env.PORT || 5000);
const start = async () => {
  await connectDB();
  backupScheduler.start();
  monitoring.startAlertWorker();
  app.listen(port, () => console.log(`API server listening on port ${port}`));
};
if (require.main === module) start();
module.exports = app;
