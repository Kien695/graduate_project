const express = require("express");
const { makeCrudController } = require("../controller/crud.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");
const c = makeCrudController("vehicles"),
  r = express.Router();
r.get("/available", (req, res, next) => {
  req.query.status = "available";
  return c.list(req, res, next);
});
r.get("/", c.list);
r.get("/:id", c.get);
r.use(auth);
r.post("/", authorize("admin", "manager", "staff"), upload.array("images", 10), c.create);
r.put("/:id", authorize("admin", "manager", "staff"), upload.array("images", 10), c.update);
r.patch("/:id/status", authorize("admin", "manager", "staff"), c.update);
r.delete("/:id", authorize("admin", "manager"), c.remove);
module.exports = r;
