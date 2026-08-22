const express = require("express");
const c = require("../controller/contract.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const { enforceContractRead } = require("../middleware/mac.middleware");
const r = express.Router();
r.use(auth);
r.get("/", authorize("admin", "manager", "staff"), c.list);
r.post("/", authorize("admin", "manager", "staff"), c.create);
r.get("/:id", enforceContractRead, c.get);
r.put(
  "/:id",
  authorize("admin", "manager", "staff"),
  enforceContractRead,
  c.update,
);
r.delete("/:id", authorize("admin", "manager"), enforceContractRead, c.remove);
r.post("/:id/approve", authorize("admin", "manager"), enforceContractRead, c.approve);
r.post("/:id/sign", enforceContractRead, c.sign);
r.post(
  "/:id/payment",
  authorize("admin", "manager", "staff"),
  enforceContractRead,
  c.payment,
);
r.get("/:id/audit-logs", enforceContractRead, c.logs);
r.patch("/:id/security-level", authorize("admin"), c.security);
module.exports = r;
