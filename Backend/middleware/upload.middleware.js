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

const detectImageMime = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "image/jpeg";
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
};

const validateImageContent = (req, res, next) => {
  if (!req.file)
    return next(new ErrorHandler("Vui lòng chọn ảnh đại diện", 400));
  const actualMime = detectImageMime(req.file.buffer);
  if (!actualMime || actualMime !== req.file.mimetype)
    return next(
      new ErrorHandler(
        "Nội dung file không đúng định dạng JPEG, PNG hoặc WEBP",
        400,
      ),
    );
  req.file.detectedMime = actualMime;
  return next();
};

module.exports = { upload, validateImageContent, detectImageMime };
