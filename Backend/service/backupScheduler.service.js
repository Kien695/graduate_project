const backup = require("./backup.service");

const millisecondsUntilNextRun = (hour = 2) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

const start = () => {
  if (
    String(process.env.AUTO_BACKUP_ENABLED || "true").toLowerCase() === "false"
  )
    return null;
  const schedule = () => {
    const timer = setTimeout(
      async () => {
        try {
          await backup.create(null);
          await backup.enforceRetention();
          console.log("Scheduled database backup completed");
        } catch (error) {
          console.error("Scheduled database backup failed:", error.message);
        } finally {
          schedule();
        }
      },
      millisecondsUntilNextRun(Number(process.env.BACKUP_HOUR || 2)),
    );
    timer.unref();
  };
  schedule();
  return true;
};

module.exports = { millisecondsUntilNextRun, start };
