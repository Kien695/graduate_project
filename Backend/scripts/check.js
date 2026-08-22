const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const roots = [
  "config",
  "controller",
  "database",
  "middleware",
  "routes",
  "service",
  "utils",
];
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".js")) files.push(full);
  }
};
for (const root of roots) walk(path.join(__dirname, "..", root));
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax check passed: ${files.length} files`);
