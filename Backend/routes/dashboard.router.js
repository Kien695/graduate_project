const express = require("express");
const controller = require("../controller/dashboard.controller");
const { auth, authorize } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(auth, authorize("admin", "manager", "staff"));
router.get("/", controller.overview);

module.exports = router;
