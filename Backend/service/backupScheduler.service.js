const backup = require("./backup.service");
const settings = require("./backupSettings.service");
let timer;
let generation = 0;
let nextRun = null;
const millisecondsUntilNextRun = (hour = 2) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};
const start = async () => {
  const version = ++generation;
  clearTimeout(timer);
  nextRun = null;
  try {
    const config = await settings.get();
    if (version !== generation || !config.enabled) return;
    const delay = millisecondsUntilNextRun(config.hour);
    nextRun = new Date(Date.now() + delay).toISOString();
    timer = setTimeout(async () => {
      nextRun = null;
      try {
        await backup.create(null);
        await backup.enforceRetention();
        console.log("Scheduled database backup completed");
      } catch (error) {
        console.error("Scheduled database backup failed:", error.message);
      } finally {
        if (version === generation) await start();
      }
    }, delay);
    timer.unref();
  } catch (error) {
    console.error("Backup scheduling failed:", error.message);
  }
};
module.exports = { millisecondsUntilNextRun, start, getNextRun: () => nextRun };
