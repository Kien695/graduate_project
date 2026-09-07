const express = require("express");
const controller = require("../controller/customerContract.controller");
const { auth, authorize } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(auth, authorize("customer"));
router.get("/", controller.list);
// Ownership, publication status and current MAC levels are enforced in the service.
router.get("/:id", controller.get);
router.post("/:id/confirm", controller.confirm);

module.exports = router;
