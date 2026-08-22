const express = require("express");
const c = require("../controller/device.controller");
const { auth } = require("../middleware/auth.middleware");
const r = express.Router();
r.use(auth);
r.get("/", c.list);
r.delete("/:id", c.remove);
r.post("/check-login", c.check);
module.exports = r;
