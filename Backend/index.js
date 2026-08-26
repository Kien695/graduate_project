const { loadEnv } = require("./config/env");
loadEnv();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./database/database");
const mountRoutes = require("./routes");
const {
  ErrorHandler,
  ErrorMiddleware,
} = require("./middleware/errorMiddleware");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.MOBILE_URL],
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
  app.listen(port, () => console.log(`API server listening on port ${port}`));
};
if (require.main === module) start();
module.exports = app;
