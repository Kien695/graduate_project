const express = require("express");
const controller = require("../controller/employee.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const router = express.Router();

router.use(auth, authorize("admin"));
router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.patch("/:id/security-level", controller.updateSecurityLevel);

module.exports = router;
