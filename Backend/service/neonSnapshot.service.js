const { ErrorHandler } = require("../middleware/errorMiddleware");

const API_BASE = "https://console.neon.tech/api/v2";
const TERMINAL = new Set(["finished", "failed", "cancelled", "skipped"]);

const configuration = () => {
  const config = { apiKey: process.env.NEON_API_KEY, projectId: process.env.NEON_PROJECT_ID,
    branchId: process.env.NEON_BRANCH_ID, branchName: process.env.NEON_BRANCH_NAME };
  const missing = [["NEON_API_KEY", config.apiKey], ["NEON_PROJECT_ID", config.projectId],
    ["NEON_BRANCH_ID", config.branchId]].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new ErrorHandler(`Thiếu cấu hình Neon phía server: ${missing.join(", ")}`, 503);
  for (const [name, value] of [["NEON_PROJECT_ID", config.projectId], ["NEON_BRANCH_ID", config.branchId]])
    if (!/^[a-z0-9-]{1,60}$/i.test(value)) throw new ErrorHandler(`${name} không hợp lệ`, 503);
  return config;
};

const request = async (path, options = {}) => {
  const { apiKey } = configuration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.NEON_API_TIMEOUT_MS) || 30000);
  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}) } });
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
    if (!response.ok) {
      const detail = body.message || body.error || `HTTP ${response.status}`;
      const status = response.status === 403 ? 403 : response.status === 404 ? 404 :
        response.status === 423 ? 409 : response.status === 401 ? 503 : 502;
      throw new ErrorHandler(`Neon API từ chối yêu cầu: ${detail}`, status);
    }
    return body;
  } catch (error) {
    if (error.name === "AbortError")
      throw new ErrorHandler("Neon API quá thời gian phản hồi; hãy tải lại danh sách trước khi thử lại", 504);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler(`Không thể kết nối Neon API: ${error.message}`, 502);
  } finally { clearTimeout(timeout); }
};

const listBranches = async () => {
  const { projectId } = configuration();
  return (await request(`/projects/${encodeURIComponent(projectId)}/branches`)).branches || [];
};
const resolveBranch = async () => {
  const config = configuration();
  const branches = await listBranches();
  const branch = config.branchName ? branches.find((item) => item.name === config.branchName) :
    branches.find((item) => item.id === config.branchId);
  if (!branch) throw new ErrorHandler(config.branchName ? `Không tìm thấy Neon branch tên ${config.branchName}` :
    `Không tìm thấy Neon branch ID ${config.branchId}`, 503);
  return branch;
};
const listSnapshots = async () => {
  const { projectId } = configuration();
  return (await request(`/projects/${encodeURIComponent(projectId)}/snapshots`)).snapshots || [];
};
const operationIds = (result) => (result.operations || []).map((operation) =>
  typeof operation === "string" ? operation : operation.id).filter(Boolean);
const waitForOperations = async (result) => {
  const { projectId } = configuration();
  const ids = operationIds(result);
  const deadline = Date.now() + (Number(process.env.NEON_OPERATION_TIMEOUT_MS) || 120000);
  for (const id of ids) {
    let completed = false;
    while (Date.now() < deadline) {
      const data = await request(`/projects/${encodeURIComponent(projectId)}/operations/${encodeURIComponent(id)}`);
      const operation = data.operation || data;
      if (TERMINAL.has(operation.status)) {
        if (!["finished", "skipped"].includes(operation.status))
          throw new ErrorHandler(`Thao tác Neon ${id} kết thúc với trạng thái ${operation.status}`, 502);
        completed = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!completed) throw new ErrorHandler("Neon vẫn đang xử lý thao tác; hãy tải lại trạng thái sau", 504);
  }
  return ids;
};
const createSnapshot = async ({ branchId, name, expiresAt }) => {
  const { projectId } = configuration();
  const query = new URLSearchParams({ name, expires_at: expiresAt });
  const result = await request(`/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}/snapshot?${query}`, { method: "POST" });
  return { ...result, operationIds: await waitForOperations(result) };
};
const restoreSnapshot = async ({ snapshotId, targetBranchId, name }) => {
  const { projectId } = configuration();
  const body = { target_branch_id: targetBranchId, finalize_restore: true };
  if (name) body.name = name;
  const result = await request(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/restore`, {
    method: "POST", body: JSON.stringify(body) });
  return { ...result, operationIds: await waitForOperations(result) };
};
const deleteSnapshot = async (id) => {
  const { projectId } = configuration();
  const result = await request(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(id)}`, { method: "DELETE" });
  await waitForOperations(result);
  return result;
};

module.exports = { configuration, resolveBranch, listSnapshots, createSnapshot, restoreSnapshot, deleteSnapshot };
