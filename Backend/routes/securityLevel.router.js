const express = require("express");
const c = require("../controller/securityLevel.controller");
const { auth } = require("../middleware/auth.middleware");
const r = express.Router();
r.get("/", auth, c.list);
module.exports = r;
