import assert from "node:assert/strict";
import { hasAdminAccess, hasRole } from "../src/utils/adminAccess.js";

assert.equal(hasAdminAccess({ role: "ADMIN" }), true);
assert.equal(hasAdminAccess({ role: "manager" }), true);
assert.equal(hasAdminAccess({ role: "STAFF" }), true);
assert.equal(hasAdminAccess({ role: "CUSTOMER" }), false);
assert.equal(hasAdminAccess(null), false);
assert.equal(hasRole({ role: "admin" }, ["ADMIN"]), true);
assert.equal(hasRole({ role: "manager" }, ["ADMIN"]), false);
assert.equal(hasRole({ role: "staff" }, ["ADMIN"]), false);
assert.equal(hasRole({ role: "customer" }, ["ADMIN"]), false);
console.log("Admin role access test passed");
