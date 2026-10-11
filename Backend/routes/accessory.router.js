const express = require("express");
const { makeCrudController } = require("../controller/crud.controller");
const { auth, authorize } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");
const c = makeCrudController("accessories"),
  r = express.Router();
r.use(auth);
r.get("/", c.list);
r.get("/:id", c.get);
r.post("/", authorize("admin", "manager", "staff"), upload.array("images", 10), c.create);
r.put("/:id", authorize("admin", "manager", "staff"), upload.array("images", 10), c.update);
r.delete("/:id/images", authorize("admin", "manager", "staff"), c.removeImage);
r.delete("/:id", authorize("admin", "manager", "staff"), c.remove);
module.exports = r;
