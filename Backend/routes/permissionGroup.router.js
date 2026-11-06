const express = require("express");
const controller = require("../controller/permissionGroup.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const router = express.Router();

router.use(auth, authorize("admin"));
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/members/:employeeId", controller.assignMember);
router.delete("/:id/members/:employeeId", controller.removeMember);

module.exports = router;
