const express = require("express");
const c = require("../controller/contract.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const {
  enforceContractAccess,
  enforceContractCreate,
  enforceContractSecurityChange,
} = require("../middleware/mac.middleware");
const r = express.Router();
r.use(auth);
r.get("/", authorize("admin", "manager", "staff"), c.list);
r.post("/", authorize("admin", "manager", "staff"), enforceContractCreate, c.create);
r.get("/:id", enforceContractAccess, c.get);
r.put(
  "/:id",
  authorize("admin", "manager", "staff"),
  enforceContractAccess,
  c.update,
);
r.delete("/:id", authorize("admin", "manager"), enforceContractAccess, c.remove);
r.post("/:id/approve", authorize("admin", "manager"), enforceContractAccess, c.approve);
r.post("/:id/sign", enforceContractAccess, c.sign);
r.post(
  "/:id/payment",
  authorize("admin", "manager", "staff"),
  enforceContractAccess,
  c.payment,
);
r.get("/:id/audit-logs", enforceContractAccess, c.logs);
r.patch(
  "/:id/security-level",
  authorize("admin"),
  enforceContractAccess,
  enforceContractSecurityChange,
  c.security,
);
module.exports = r;
