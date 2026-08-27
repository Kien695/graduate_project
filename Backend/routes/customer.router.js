const express = require("express");
const { makeCrudController } = require("../controller/crud.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const { database } = require("../database/database");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const customerContractService = require("../service/customerContract.service");
const contractService = require("../service/contract.service");
const c = makeCrudController("customers"),
  r = express.Router();

const resolveCustomerId = async (req) => {
  if (req.user.role !== "customer") return req.params.id;
  const { rows } = await database.query(
    "SELECT id FROM customers WHERE user_id=$1 AND is_active IS DISTINCT FROM FALSE",
    [req.user.id],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay ho so khach hang", 404);
  return rows[0].id;
};

r.use(auth);
r.get("/", authorize("admin", "manager", "staff"), c.list);
r.post("/", authorize("admin", "manager", "staff"), c.create);
r.get(
  "/:id/orders",
  catchAsyncError(async (req, res) => {
    const customerId = await resolveCustomerId(req);
    const { rows } = await database.query(
      "SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC",
      [customerId],
    );
    return successResponse(res, 200, "Lấy lịch sử đơn hàng thành công", rows);
  }),
);
r.get(
  "/:id/contracts",
  catchAsyncError(async (req, res) => {
    if (req.user.role === "customer")
      return successResponse(
        res,
        200,
        "Lấy hợp đồng thành công",
        await customerContractService.list(req.user.id),
      );
    const customerId = await resolveCustomerId(req);
    const contracts = await contractService.list(req.user);
    return successResponse(
      res,
      200,
      "Lấy hợp đồng thành công",
      contracts.filter(
        (contract) => Number(contract.customer_id) === Number(customerId),
      ),
    );
  }),
);
r.post(
  "/:id/encrypt-profile",
  authorize("admin", "manager"),
  catchAsyncError(async (req, res) => {
    if (!process.env.PROFILE_ENCRYPTION_KEY) throw new ErrorHandler("Thiếu PROFILE_ENCRYPTION_KEY", 500);
    const { rows } = await database.query(
      "UPDATE customers SET encrypted_profile=encode(pgp_sym_encrypt($2::text,$3),'base64') WHERE id=$1 RETURNING id",
      [
        req.params.id,
        JSON.stringify(req.body.profile),
        process.env.PROFILE_ENCRYPTION_KEY,
      ],
    );
    return successResponse(res, 200, "Mã hóa hồ sơ thành công", rows[0]);
  }),
);
r.get(
  "/:id/encrypted-profile",
  authorize("admin", "manager"),
  catchAsyncError(async (req, res) => {
    if (!process.env.PROFILE_ENCRYPTION_KEY) throw new ErrorHandler("Thiếu PROFILE_ENCRYPTION_KEY", 500);
    const { rows } = await database.query(
      "SELECT id,pgp_sym_decrypt(decode(encrypted_profile,'base64'),$2) profile FROM customers WHERE id=$1 AND encrypted_profile IS NOT NULL",
      [req.params.id, process.env.PROFILE_ENCRYPTION_KEY],
    );
    return successResponse(res, 200, "Truy xuất hồ sơ thành công", rows[0] || null);
  }),
);
r.get("/:id", authorize("admin", "manager", "staff"), c.get);
r.put("/:id", authorize("admin", "manager", "staff"), c.update);
r.delete("/:id", authorize("admin", "manager"), c.remove);
module.exports = r;
