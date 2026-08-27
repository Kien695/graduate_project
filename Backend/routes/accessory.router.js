const express = require("express");
const { makeCrudController } = require("../controller/crud.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");
const c = makeCrudController("accessories"),
  r = express.Router();
r.get("/", c.list);
r.get("/:id", c.get);
r.use(auth, authorize("admin", "manager", "staff"));
r.post("/", upload.array("images", 10), c.create);
r.put("/:id", upload.array("images", 10), c.update);
r.delete("/:id/images", c.removeImage);
r.delete("/:id", authorize("admin", "manager"), c.remove);
module.exports = r;
