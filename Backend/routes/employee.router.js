const express = require("express");
const controller = require("../controller/employee.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const router = express.Router();
const permissions = require("../controller/databasePermission.controller");

router.use(auth, authorize("admin"));
router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.post("/:id/lock", controller.lock);
router.post("/:id/unlock", controller.unlock);
router.patch("/:id/security-level", controller.updateSecurityLevel);
router.delete("/:id/permanent", controller.permanentlyDelete);
router.get("/:id/database-permissions", permissions.get);
router.put("/:id/database-permissions", permissions.update);

module.exports = router;
