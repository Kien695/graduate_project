const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const backupDirectory = () => {
  const configured = process.env.BACKUP_DIR;
  if (!configured) return path.join(__dirname, "..", "backups");
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(__dirname, "..", configured);
};

const connection = () => {
  if (process.env.DATABASE_URL) {
    let url;
    try {
      url = new URL(process.env.DATABASE_URL);
    } catch {
      throw new ErrorHandler("DATABASE_URL không hợp lệ", 503);
    }
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new ErrorHandler(
        "DATABASE_URL phải dùng giao thức PostgreSQL",
        503,
      );
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (!url.hostname || !database || !url.username)
      throw new ErrorHandler(
        "DATABASE_URL thiếu host, tên database hoặc người dùng",
        503,
      );
    return {
      host: url.hostname,
      port: url.port || "5432",
      database,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      sslmode: url.searchParams.get("sslmode") || undefined,
    };
  }
  const missing = ["DB_HOST", "DB_NAME", "DB_USER"].filter(
    (key) => !process.env[key],
  );
  if (missing.length)
    throw new ErrorHandler(
      `Thiếu cấu hình database: ${missing.join(", ")}`,
      503,
    );
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || "5432",
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    sslmode: process.env.DB_SSL === "true" ? "require" : "disable",
  };
};

const databaseArgs = (config) => [
  "--host",
  config.host,
  "--port",
  String(config.port),
  "--username",
  config.user,
  "--dbname",
  config.database,
];
const run = (command, args, config) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: {
        ...process.env,
        PGPASSWORD: config.password,
        PGSSLMODE: config.sslmode || process.env.PGSSLMODE || "prefer",
      },
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-8000);
    });
    child.on("error", (error) =>
      reject(
        new ErrorHandler(
          error.code === "ENOENT"
            ? `Không tìm thấy ${command}. Hãy cài PostgreSQL client hoặc cấu hình đường dẫn công cụ.`
            : error.message,
          503,
        ),
      ),
    );
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new ErrorHandler(
              `${path.basename(command)} kết thúc với mã ${code}: ${stderr.trim() || "không có chi tiết"}`,
              500,
            ),
          ),
    );
  });
const ensureDirectory = async () => {
  const directory = backupDirectory();
  await fs.promises.mkdir(directory, { recursive: true });
  return directory;
};
const isBackupName = (name) => /^autodealer-[A-Za-z0-9._-]+\.dump$/.test(name);
const resolveBackup = async (id) => {
  if (!isBackupName(id) || path.basename(id) !== id)
    throw new ErrorHandler("Mã bản sao lưu không hợp lệ", 400);
  const filePath = path.join(backupDirectory(), id);
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error();
    return { filePath, stat };
  } catch {
    throw new ErrorHandler("Không tìm thấy file sao lưu", 404);
  }
};
const listFiles = async () => {
  const directory = await ensureDirectory();
  const names = await fs.promises.readdir(directory);
  const files = await Promise.all(
    names.filter(isBackupName).map(async (name) => {
      const filePath = path.join(directory, name);
      const stat = await fs.promises.stat(filePath);
      return stat.isFile() ? { name, filePath, stat } : null;
    }),
  );
  return files.filter(Boolean);
};
const createDump = async (name) => {
  const directory = await ensureDirectory();
  const finalPath = path.join(directory, name);
  const temporaryPath = `${finalPath}.tmp`;
  const config = connection();
  try {
    await run(
      process.env.PG_DUMP_PATH || "pg_dump",
      [
        ...databaseArgs(config),
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        temporaryPath,
      ],
      config,
    );
    await fs.promises.rename(temporaryPath, finalPath);
    return {
      filePath: finalPath,
      stat: await fs.promises.stat(finalPath),
      config,
    };
  } catch (error) {
    await fs.promises.unlink(temporaryPath).catch(() => {});
    throw error;
  }
};
const restoreDump = async (id) => {
  const { filePath } = await resolveBackup(id);
  const config = connection();
  await run(
    process.env.PG_RESTORE_PATH || "pg_restore",
    [
      ...databaseArgs(config),
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      filePath,
    ],
    config,
  );
  return config;
};
module.exports = {
  backupDirectory,
  connection,
  createDump,
  listFiles,
  resolveBackup,
  restoreDump,
};
