const express = require("express");
const c = require("../controller/auditLog.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const r = express.Router();
r.use(auth, authorize("admin", "manager"));
r.get("/", c.all);
r.get("/contracts/:id", c.contracts);
r.get("/users/:id", c.users);
module.exports = r;
