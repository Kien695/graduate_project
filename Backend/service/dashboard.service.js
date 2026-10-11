const { database } = require("../database/database");

const getOverview = async () => {
  const { rows } = await database.query("SELECT * FROM dashboard_overview");
  return rows[0];
};

module.exports = { getOverview };
