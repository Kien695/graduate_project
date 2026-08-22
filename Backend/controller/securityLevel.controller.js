const { database } = require("../database/database");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) => {
  const { rows } = await database.query(
    "SELECT * FROM security_levels ORDER BY rank",
  );
  return successResponse(res, 200, "Lấy nhãn bảo mật thành công", rows);
});
module.exports = { list };
