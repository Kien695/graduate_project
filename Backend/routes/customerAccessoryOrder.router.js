const express = require("express");
const controller = require("../controller/customerAccessoryOrder.controller");
const { auth, authorize } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(auth, authorize("customer"));
router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.post("/:id/cancel", controller.cancel);

module.exports = router;
