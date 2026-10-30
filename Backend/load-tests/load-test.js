// Kịch bản đo tải bằng k6.
// Mỗi người dùng ảo (VU) dùng MỘT tài khoản riêng (tai001, tai002, ...) vì mỗi
// khách chỉ được 1 phiên cho mỗi loại thiết bị; dùng chung tài khoản sẽ tự đăng xuất nhau.
//
// Biến môi trường:
//   BASE_URL   (mặc định http://localhost:5000/api)
//   TARGET_VUS (mặc định 50)  số người dùng ảo tối đa; phải <= USER_COUNT
//   USER_COUNT (mặc định 100) số tài khoản đã tạo bằng seedUsers.js
//   DURATION   (mặc định 60s) thời gian giữ ở mức tải tối đa
//   SCENARIO   browse | login | order  (mặc định browse)
//   VEHICLE_ID bắt buộc với SCENARIO=order
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000/api";
const TARGET_VUS = Number(__ENV.TARGET_VUS || 50);
const USER_COUNT = Number(__ENV.USER_COUNT || 100);
const DURATION = __ENV.DURATION || "60s";
const SCENARIO = __ENV.SCENARIO || "browse";
const PASSWORD = __ENV.LOADTEST_PASSWORD || "LoadTest@2026Aa";
const PREFIX = __ENV.PREFIX || "tai";

const errorRate = new Rate("errors");
const loginTime = new Trend("login_time", true);
const apiTime = new Trend("api_time", true);
const status5xx = new Counter("status_5xx");
const status401 = new Counter("status_401");
const loginFail = new Counter("login_failures");

// 4xx do nghiệp vụ (409 tranh xe) không được tính là lỗi hệ thống
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const options = {
  scenarios: {
    load: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "20s", target: TARGET_VUS },
        { duration: DURATION, target: TARGET_VUS },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    errors: ["rate<0.05"],
  },
};

export function setup() {
  if (TARGET_VUS > USER_COUNT)
    throw new Error(`TARGET_VUS (${TARGET_VUS}) lớn hơn USER_COUNT (${USER_COUNT}): thiếu tài khoản thử`);
  const probe = http.get(`${BASE_URL}/vehicles`);
  if (probe.status === 0) throw new Error(`Không kết nối được ${BASE_URL}`);
}

const pad = (n) => String(n).padStart(3, "0");
let token = null;
let iteration = 0;
const json = { "Content-Type": "application/json" };

function login() {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: `${PREFIX}${pad(__VU)}@loadtest.local`,
      password: PASSWORD,
      deviceId: `k6-mobile-${__VU}`,
      deviceType: "MOBILE",
    }),
    { headers: json, tags: { name: "login" } },
  );
  loginTime.add(response.timings.duration);
  const ok = check(response, { "login 200": (r) => r.status === 200 });
  errorRate.add(!ok);
  if (!ok) {
    loginFail.add(1);
    if (response.status >= 500) status5xx.add(1);
    token = null;
    return false;
  }
  token = response.json("data.accessToken");
  return true;
}

function call(method, path, body, expected = [200], name) {
  const params = {
    headers: { ...json, Authorization: `Bearer ${token}` },
    tags: { name: name || path.split("?")[0] },
  };
  const response = method === "GET" ? http.get(`${BASE_URL}${path}`, params) : http.post(`${BASE_URL}${path}`, body, params);
  apiTime.add(response.timings.duration);
  const ok = expected.includes(response.status);
  errorRate.add(!ok);
  if (response.status >= 500) status5xx.add(1);
  if (response.status === 401) {
    status401.add(1);
    token = null; // phiên hết hạn/bị thu hồi -> lần sau đăng nhập lại
  }
  check(response, { [`${method} ${name || path.split("?")[0]} ok`]: () => ok });
  return response;
}

export default function () {
  iteration += 1;
  if (SCENARIO === "login") {
    login();
    sleep(0.5);
    return;
  }
  if (!token && !login()) {
    sleep(1);
    return;
  }
  if (SCENARIO === "order") {
    call("POST", "/customer/orders", JSON.stringify({ vehicle_id: Number(__ENV.VEHICLE_ID) }), [201, 409], "/customer/orders");
    sleep(1);
    return;
  }
  call("GET", "/vehicles?limit=20");
  call("GET", "/accessories?limit=20");
  if (iteration % 5 === 0) call("GET", "/customer/orders");
  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  const dir = __ENV.RESULT_DIR || "results";
  const name = `${dir}/${SCENARIO}-${TARGET_VUS}vu`;
  const m = (key, stat) => (data.metrics[key] && data.metrics[key].values[stat]) ?? null;
  const row = {
    scenario: SCENARIO,
    vus: TARGET_VUS,
    requests: m("http_reqs", "count"),
    rps: m("http_reqs", "rate"),
    avg_ms: m("http_req_duration", "avg"),
    p95_ms: m("http_req_duration", "p(95)"),
    max_ms: m("http_req_duration", "max"),
    error_rate: m("errors", "rate"),
    login_p95_ms: m("login_time", "p(95)"),
    status_5xx: m("status_5xx", "count") || 0,
    status_401: m("status_401", "count") || 0,
    login_failures: m("login_failures", "count") || 0,
  };
  const text = Object.entries(row).map(([k, v]) => `${k}: ${typeof v === "number" ? Math.round(v * 100) / 100 : v}`).join("\n");
  return {
    [`${name}.json`]: JSON.stringify({ summary: row, raw: data }, null, 2),
    [`${name}.txt`]: text + "\n",
    stdout: `\n===== ${SCENARIO} ${TARGET_VUS} VU =====\n${text}\n`,
  };
}
