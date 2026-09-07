const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { once } = require("events");

// Category constraints are obsolete under the four-level MAC policy. Old dumps
// recreate them before COPY, where their cross-table SQL functions cannot run.
const removeLegacyChecks = `
ALTER TABLE IF EXISTS public.contracts DROP CONSTRAINT IF EXISTS contracts_categories_valid;
ALTER TABLE IF EXISTS public.contracts DROP CONSTRAINT IF EXISTS contracts_categories_not_empty;
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_categories_valid;
`;
module.exports = async ({ run, resolveTool, archive, directory, env }) => {
  const temp = await fs.promises.mkdtemp(path.join(directory, ".restore-"));
  const raw = path.join(temp, "archive.sql");
  const repaired = path.join(temp, "restore.sql");
  try {
    await run(resolveTool(process.env.PG_RESTORE_PATH, "pg_restore"),
      ["--clean", "--if-exists", "--no-owner", "--file", raw, archive], { env });
    const input = fs.createReadStream(raw);
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    const output = fs.createWriteStream(repaired, { mode: 0o600 });
    let inserted = false;
    try {
      for await (const line of lines) {
        if (!inserted && /^COPY public\./.test(line)) {
          if (!output.write(removeLegacyChecks)) await once(output, "drain");
          inserted = true;
        }
        if (!output.write(line + "\n")) await once(output, "drain");
      }
      // Also covers empty archives and any constraints added in post-data.
      output.end(removeLegacyChecks);
      await once(output, "finish");
    } finally { lines.close(); input.destroy(); output.destroy(); }
    await run(resolveTool(process.env.PSQL_PATH, "psql"),
      ["-X", "--single-transaction", "--set", "ON_ERROR_STOP=on", "--dbname", process.env.DB_NAME, "--file", repaired],
      { env, maxBuffer: 16 * 1024 * 1024 });
  } finally {
    // Only remove the two files we created inside this validated temporary folder.
    if (path.dirname(path.resolve(temp)) === path.resolve(directory)) {
      for (const file of [raw, repaired]) await fs.promises.unlink(file).catch(e => { if (e.code !== "ENOENT") throw e; });
      await fs.promises.rmdir(temp);
    }
  }
};
