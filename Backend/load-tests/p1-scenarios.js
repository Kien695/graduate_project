import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000/api";
const IMAGE_DATA = __ENV.IMAGE_PATH ? open(__ENV.IMAGE_PATH, "b") : null;
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time", true);

export const options = {
  scenarios: {
    concurrent_login: { executor: "constant-vus", exec: "login", vus: 10, duration: "30s" },
    browse_vehicles: { executor: "constant-arrival-rate", exec: "browse", rate: 30, timeUnit: "1s", duration: "30s", preAllocatedVUs: 20 },
    concurrent_orders: { executor: "per-vu-iterations", exec: "order", vus: 10, iterations: 1, startTime: "35s" },
    image_upload: { executor: "constant-vus", exec: "upload", vus: 3, duration: "20s", startTime: "40s" },
  },
  thresholds: { http_req_duration: ["p(95)<2000"], http_req_failed: ["rate<0.05"], errors: ["rate<0.05"] },
};

const loginPayload = () => JSON.stringify({
  email: __ENV.CUSTOMER_EMAIL, password: __ENV.CUSTOMER_PASSWORD,
  deviceId: `k6-pc-${__VU}`, deviceType: "PC",
});
const record = (response, expected = [200]) => {
  responseTime.add(response.timings.duration);
  const ok = check(response, { "expected status": (r) => expected.includes(r.status) });
  errorRate.add(!ok);
  return response;
};
const token = () => record(http.post(`${BASE_URL}/auth/login`, loginPayload(), {
  headers: { "Content-Type": "application/json" },
})).json("data.accessToken");

export function login() { token(); }
export function browse() { record(http.get(`${BASE_URL}/vehicles?limit=20`)); }
export function order() {
  const accessToken = token();
  record(http.post(`${BASE_URL}/customer/orders`, JSON.stringify({ vehicle_id: Number(__ENV.VEHICLE_ID) }), {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  }), [201, 409]);
}
export function upload() {
  if (!__ENV.ADMIN_TOKEN || !__ENV.VEHICLE_ID || !IMAGE_DATA) return;
  const image = http.file(IMAGE_DATA, "load-test.jpg", "image/jpeg");
  record(http.put(`${BASE_URL}/vehicles/${__ENV.VEHICLE_ID}`, { images: image }, {
    headers: { Authorization: `Bearer ${__ENV.ADMIN_TOKEN}` },
  }));
}
