const { database } = require("../database/database");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");

// ---------------------------------------------------------------------------
// Lấy clearance của chủ thể: mức (rank) và tập ngăn (categories).
// ---------------------------------------------------------------------------
const getSubject = async (userId) => {
  const { rows } = await database.query(
    `SELECT COALESCE(sl.rank, 0) AS rank, COALESCE(u.categories, '{}') AS categories
     FROM users u
     LEFT JOIN security_levels sl ON sl.id = u.security_level_id
     WHERE u.id = $1`,
    [userId],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay subject MAC", 401);
  return { rank: Number(rows[0].rank), categories: rows[0].categories };
};

// ---------------------------------------------------------------------------
// Kiểm tra quyền truy cập một hợp đồng ĐÃ TỒN TẠI — dùng cho GET/PUT/DELETE/
// approve/sign/payment/audit-logs. Tính cả level dominance lẫn category
// dominance ngay trong một câu SQL, dùng chung hàm mac_categories_dominate()
// đã định nghĩa ở migration 20260908 — một nguồn chân lý duy nhất cho luật
// MAC, thay vì viết lại phép so sánh mảng ở phía Node rồi có thể lệch với
// bản sẽ dùng cho Row Level Security sau này.
// ---------------------------------------------------------------------------
const enforceContractAccess = catchAsyncError(async (req, res, next) => {
  const { rows } = await database.query(
    `SELECT
       c.categories AS object_categories,
       COALESCE(us.rank, 0) >= COALESCE(os.rank, 0) AS level_ok,
       mac_categories_dominate(u.categories, c.categories) AS category_ok
     FROM users u
     LEFT JOIN security_levels us ON us.id = u.security_level_id
     CROSS JOIN contracts c
     LEFT JOIN security_levels os ON os.id = c.security_level_id
     WHERE u.id = $1 AND c.id = $2`,
    [req.user.id, req.params.id],
  );
  if (!rows[0]) return next(new ErrorHandler("Khong tim thay hop dong", 404));
  if (!rows[0].level_ok || !rows[0].category_ok)
    return next(new ErrorHandler("MAC policy tu choi truy cap", 403));

  if (req.user.role === "customer") {
    const owner = await database.query(
      `SELECT 1 FROM contracts ct
       JOIN orders o ON o.id = ct.order_id
       JOIN customers c ON c.id = o.customer_id
       WHERE ct.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!owner.rows[0])
      return next(
        new ErrorHandler("Khong co quyen truy cap hop dong nay", 403),
      );
  }

  // Middleware phía sau (enforceContractSecurityChange) tái sử dụng giá trị
  // này làm mặc định khi request đổi mức mà không đổi ngăn — tránh phải
  // truy vấn lại contracts một lần nữa.
  req.contractClassification = { categoryIds: rows[0].object_categories || [] };
  next();
});

// ---------------------------------------------------------------------------
// Xác thực (level, categories) mà request đang YÊU CẦU gán cho một hợp đồng —
// dùng chung cho cả TẠO MỚI và PHÂN LOẠI LẠI vì luật giống nhau: subject phải
// chi phối được cả mức lẫn ngăn mà nó đang muốn gán.
//
//   readLevel(req)            đọc levelId thô từ request
//   readCategories(req)       đọc mảng CODE ngăn thô từ request (hoặc
//                             undefined nếu request không chỉ định)
//   fallbackCategories(req, subject)
//                             categories dùng khi request KHÔNG chỉ định
//
// Kết quả hợp lệ được gắn vào req.macClassification. Service phía sau CHỈ
// được dùng giá trị này, không đọc lại req.body.
// ---------------------------------------------------------------------------
const enforceRequestedClassification = ({
  readLevel,
  readCategories,
  fallbackCategories,
}) =>
  catchAsyncError(async (req, res, next) => {
    const subject = await getSubject(req.user.id);

    const levelId = readLevel(req) ?? req.user.security_level_id;
    if (!levelId)
      return next(new ErrorHandler("Nhan bao mat la bat buoc", 400));

    const { rows: levelRows } = await database.query(
      "SELECT rank FROM security_levels WHERE id = $1",
      [levelId],
    );
    if (!levelRows[0])
      return next(new ErrorHandler("Nhan bao mat khong hop le", 400));
    if (subject.rank < Number(levelRows[0].rank))
      return next(new ErrorHandler("MAC policy tu choi muc bao mat nay", 403));

    const requestedCodes = readCategories(req);
    let categoryIds;

    if (requestedCodes === undefined) {
      categoryIds = fallbackCategories(req, subject);
    } else {
      if (!Array.isArray(requestedCodes) || !requestedCodes.length)
        return next(new ErrorHandler("Ngan bao mat la bat buoc", 400));
      const uniqueCodes = [...new Set(requestedCodes)];
      const { rows: catRows } = await database.query(
        "SELECT id FROM mac_categories WHERE code = ANY($1::text[])",
        [uniqueCodes],
      );
      if (catRows.length !== uniqueCodes.length)
        return next(new ErrorHandler("Ngan bao mat khong hop le", 400));
      categoryIds = catRows.map((row) => row.id);
    }

    const { rows: domRows } = await database.query(
      "SELECT mac_categories_dominate($1::smallint[], $2::smallint[]) AS ok",
      [subject.categories, categoryIds],
    );
    if (!domRows[0].ok)
      return next(new ErrorHandler("MAC policy tu choi ngan bao mat nay", 403));

    req.macClassification = { levelId: Number(levelId), categoryIds };
    next();
  });

// Tạo mới: không có nhãn cũ để tham chiếu, nên khi request không chỉ định
// categories thì mặc định lấy đúng ngăn của người tạo (không tự ý mở rộng).
const enforceContractCreate = enforceRequestedClassification({
  readLevel: (req) => req.body.security_level_id ?? req.body.securityLevelId,
  readCategories: (req) => req.body.categories,
  fallbackCategories: (req, subject) => subject.categories,
});

// Phân loại lại: route này LUÔN chạy sau enforceContractAccess (xem
// contract.router.js), nên req.contractClassification đã có sẵn ngăn hiện
// tại của hợp đồng — dùng làm mặc định khi chỉ đổi mức mà không đổi ngăn.
const enforceContractSecurityChange = enforceRequestedClassification({
  readLevel: (req) => req.body.securityLevelId ?? req.body.security_level_id,
  readCategories: (req) => req.body.categories,
  fallbackCategories: (req) => req.contractClassification?.categoryIds ?? [],
});

module.exports = {
  enforceContractAccess,
  enforceContractRead: enforceContractAccess,
  enforceContractCreate,
  enforceContractSecurityChange,
};
