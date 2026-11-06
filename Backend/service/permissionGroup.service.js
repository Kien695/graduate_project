const { systemDatabase, withSystemTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { FEATURES, update: applyToEmployee } = require("./databasePermission.service");

const validateFeatures = (features = {}) => {
  const map = {};
  for (const [key, feature] of Object.entries(FEATURES)) {
    map[key] = {};
    for (const privilege of feature.operations)
      map[key][privilege] = features?.[key]?.[privilege] === true;
  }
  return map;
};
const toFeatureList = (map) =>
  Object.entries(FEATURES).map(([key, feature]) => ({
    key,
    label: feature.label,
    operations: feature.operations,
    permissions: Object.fromEntries(
      feature.operations.map((privilege) => [privilege, map?.[key]?.[privilege] === true]),
    ),
  }));
const featuresOf = async (groupId, client = systemDatabase) => {
  const { rows } = await client.query(
    "SELECT feature_key,privilege FROM permission_group_features WHERE group_id=$1",
    [groupId],
  );
  const map = validateFeatures({});
  for (const row of rows) if (map[row.feature_key]) map[row.feature_key][row.privilege] = true;
  return map;
};
const persistFeatures = async (client, groupId, map) => {
  await client.query("DELETE FROM permission_group_features WHERE group_id=$1", [groupId]);
  const rows = [];
  for (const [key, privileges] of Object.entries(map))
    for (const [privilege, enabled] of Object.entries(privileges))
      if (enabled) rows.push({ group_id: groupId, feature_key: key, privilege });
  if (!rows.length) return;
  await client.query(
    `INSERT INTO permission_group_features(group_id,feature_key,privilege)
     SELECT group_id,feature_key,privilege FROM jsonb_to_recordset($1::jsonb)
       AS x(group_id int,feature_key text,privilege text)`,
    [JSON.stringify(rows)],
  );
};

const list = async () => {
  const { rows } = await systemDatabase.query(
    `SELECT g.id,g.name,g.description,g.created_at,g.updated_at,
       COUNT(e.id)::int AS member_count
     FROM permission_groups g LEFT JOIN employees e ON e.permission_group_id=g.id
     GROUP BY g.id ORDER BY g.name`,
  );
  return { items: rows, featureCatalog: toFeatureList({}) };
};
const getGroup = async (groupId, client = systemDatabase) => {
  const { rows } = await client.query("SELECT * FROM permission_groups WHERE id=$1", [groupId]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy nhóm quyền", 404);
  const { rows: members } = await client.query(
    "SELECT id,employee_code,full_name,email FROM employees WHERE permission_group_id=$1 ORDER BY full_name",
    [groupId],
  );
  return {
    ...rows[0],
    features: toFeatureList(await featuresOf(groupId, client)),
    members,
    memberCount: members.length,
  };
};
const create = (name, description, features) =>
  withSystemTransaction(async (client) => {
    if (!String(name || "").trim())
      throw new ErrorHandler("Tên nhóm quyền không được để trống", 400);
    const { rows } = await client.query(
      "INSERT INTO permission_groups(name,description) VALUES($1,$2) RETURNING id",
      [String(name).trim(), description || null],
    );
    await persistFeatures(client, rows[0].id, validateFeatures(features));
    return getGroup(rows[0].id, client);
  });
const deleteGroup = (groupId) =>
  withSystemTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT id FROM permission_groups WHERE id=$1 FOR UPDATE",
      [groupId],
    );
    if (!rows[0]) throw new ErrorHandler("Không tìm thấy nhóm quyền", 404);
    const { rows: countRows } = await client.query(
      "SELECT COUNT(*)::int AS count FROM employees WHERE permission_group_id=$1",
      [groupId],
    );
    if (countRows[0].count > 0)
      throw new ErrorHandler(
        `Không thể xóa nhóm quyền vì còn ${countRows[0].count} nhân viên đang thuộc nhóm`,
        409,
        [{ message: `Còn ${countRows[0].count} nhân viên thuộc nhóm này` }],
      );
    await client.query("DELETE FROM permission_groups WHERE id=$1", [groupId]);
    return { id: groupId };
  });
const updateGroup = async (groupId, { name, description, features } = {}) => {
  const map = features !== undefined ? validateFeatures(features) : null;
  await withSystemTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT id FROM permission_groups WHERE id=$1 FOR UPDATE",
      [groupId],
    );
    if (!rows[0]) throw new ErrorHandler("Không tìm thấy nhóm quyền", 404);
    await client.query(
      "UPDATE permission_groups SET name=COALESCE($2,name),description=COALESCE($3,description),updated_at=NOW() WHERE id=$1",
      [groupId, name ? String(name).trim() : null, description !== undefined ? description : null],
    );
    if (map) await persistFeatures(client, groupId, map);
  });
  const finalMap = map || (await featuresOf(groupId));
  const { rows: members } = await systemDatabase.query(
    "SELECT id,employee_code,full_name FROM employees WHERE permission_group_id=$1",
    [groupId],
  );
  const cascadeFailures = [];
  for (const member of members) {
    try {
      await applyToEmployee(member.id, finalMap);
    } catch (error) {
      cascadeFailures.push({
        employeeId: member.id,
        employeeCode: member.employee_code,
        fullName: member.full_name,
        message: error.message,
      });
    }
  }
  return { ...(await getGroup(groupId)), cascadeFailures };
};
const assignEmployee = async (employeeId, groupId) => {
  const group = await getGroup(groupId);
  await systemDatabase.query(
    "UPDATE employees SET permission_group_id=$2,updated_at=NOW() WHERE id=$1",
    [employeeId, groupId],
  );
  const permissions = await applyToEmployee(employeeId, await featuresOf(groupId));
  return { employeeId: Number(employeeId), group: { id: group.id, name: group.name }, permissions };
};
const unassignEmployee = async (employeeId) => {
  await systemDatabase.query(
    "UPDATE employees SET permission_group_id=NULL,updated_at=NOW() WHERE id=$1",
    [employeeId],
  );
  const permissions = await applyToEmployee(employeeId, {});
  return { employeeId: Number(employeeId), permissions };
};
const getAssignedGroup = async (employeeId, client = systemDatabase) => {
  const { rows } = await client.query(
    `SELECT g.id,g.name FROM employees e JOIN permission_groups g ON g.id=e.permission_group_id
     WHERE e.id=$1`,
    [employeeId],
  );
  return rows[0] || null;
};

module.exports = {
  list,
  get: getGroup,
  create,
  updateGroup,
  deleteGroup,
  assignEmployee,
  unassignEmployee,
  getAssignedGroup,
};
