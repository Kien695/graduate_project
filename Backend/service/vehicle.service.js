const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const SELECT_FIELDS = `
  id,
  vin,
  brand,
  model,
  manufacture_year,
  manufacture_year AS year,
  color,
  price,
  status,
  description,
  NULL::text AS fuel_type,
  NULL::text AS transmission,
  COALESCE(images, '[]'::jsonb) AS images
`;

const list = async () => {
  const { rows } = await database.query(
    `SELECT ${SELECT_FIELDS} FROM vehicles ORDER BY created_at DESC`,
  );
  return rows;
};

const getById = async (id) => {
  const { rows } = await database.query(
    `SELECT ${SELECT_FIELDS} FROM vehicles WHERE id=$1`,
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy xe", 404);
  return rows[0];
};

module.exports = { list, getById };
