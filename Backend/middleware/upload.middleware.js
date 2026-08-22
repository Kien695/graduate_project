const multer = require("multer");
const { ErrorHandler } = require("./errorMiddleware");
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    allowed.has(file.mimetype)
      ? cb(null, true)
      : cb(new ErrorHandler("Chỉ chấp nhận JPEG, PNG hoặc WEBP", 400)),
});
module.exports = { upload };
