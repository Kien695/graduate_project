// Tạo hàng loạt tài khoản khách thử qua API đăng ký thật.
// Chạy: BASE_URL=http://localhost:5000/api COUNT=100 node load-tests/seedUsers.js
// Mỗi tài khoản: tai001@loadtest.local ... , mật khẩu LOADTEST_PASSWORD
const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const COUNT = Number(process.env.COUNT || 100);
const PREFIX = process.env.PREFIX || "tai";
const PASSWORD = process.env.LOADTEST_PASSWORD || "LoadTest@2026Aa";
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 3);

const pad = (n) => String(n).padStart(3, "0");
const register = async (n) => {
  const body = {
    name: `Tai Khoan Thu ${pad(n)}`,
    email: `${PREFIX}${pad(n)}@loadtest.local`,
    phone: `0900${String(100000 + n)}`,
    password: PASSWORD,
    confirmPassword: PASSWORD,
  };
  const response = await fetch(`${BASE_URL}/auth/register/customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 201) return "created";
  if (response.status === 409) return "exists";
  throw new Error(`#${n}: HTTP ${response.status} ${payload.message || ""}`);
};

(async () => {
  const stats = { created: 0, exists: 0, failed: 0 };
  let next = 1;
  const worker = async () => {
    while (next <= COUNT) {
      const n = next++;
      try {
        stats[await register(n)] += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(error.message);
      }
      if (n % 10 === 0) console.log(`... ${n}/${COUNT}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("Kết quả:", stats);
  if (stats.failed) process.exitCode = 1;
})();
