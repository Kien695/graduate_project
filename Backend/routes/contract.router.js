const express = require("express");
const c = require("../controller/contract.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const {
  enforceContractAccess,
  enforceContractCreate,
  enforceContractSecurityChange,
} = require("../middleware/mac.middleware");
const r = express.Router();
const { GROUPS, loadContractGroup, requireGroup } = require("../middleware/contractWorkflow.middleware");
r.use(auth);
r.use(loadContractGroup);
r.get("/capabilities", c.capabilities);
r.get("/", authorize("admin", "manager", "staff"), c.list);
r.post(
  "/",
  requireGroup(GROUPS.EMPLOYEE),
  enforceContractCreate,
  c.create,
);
r.get("/:id", enforceContractAccess, c.get);
r.put(
  "/:id",
  requireGroup(GROUPS.EMPLOYEE),
  enforceContractAccess,
  c.update,
);
r.post("/:id/submit", requireGroup(GROUPS.EMPLOYEE), enforceContractAccess, c.submit);
r.post(
  "/:id/approve",
  requireGroup(GROUPS.LEADER),
  enforceContractAccess,
  c.approve,
);
r.post("/:id/return", requireGroup(GROUPS.LEADER), enforceContractAccess, c.returnForRevision);
r.post("/:id/reject", requireGroup(GROUPS.LEADER, GROUPS.DIRECTOR), enforceContractAccess, c.reject);
r.post("/:id/sign", requireGroup(GROUPS.DIRECTOR), enforceContractAccess, c.sign);
r.post(
  "/:id/payment",
  authorize("admin"),
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
