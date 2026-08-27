require('dotenv').config({ quiet: true });
const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { database } = require('../database/database');

(async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  try {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, deviceId: 'refresh-flow-test', deviceType: 'PC' }),
  });
  assert.equal(login.status, 200);
  const loginData = (await login.json()).data;
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert(cookie?.startsWith('refreshToken='), 'Refresh cookie must be set');
  const original = jwt.decode(loginData.accessToken);
  const expiredToken = jwt.sign(
    { userId: original.userId, role: original.role, sessionId: original.sessionId, securityLevelId: original.securityLevelId },
    process.env.SECRET_KEY_ACCESS_TOKEN, { expiresIn: -1 },
  );
  const expired = await fetch(`${baseUrl}/users/me`, { headers: { authorization: `Bearer ${expiredToken}` } });
  assert.equal(expired.status, 401);
  const refreshed = await fetch(`${baseUrl}/auth/refresh-token`, { method: 'POST', headers: { cookie } });
  const refreshedPayload = await refreshed.json();
  assert.equal(refreshed.status, 200, refreshedPayload.message);
  const refreshedData = refreshedPayload.data;
  assert(refreshedData.accessToken && refreshedData.accessToken !== expiredToken);
  const retried = await fetch(`${baseUrl}/users/me`, { headers: { authorization: `Bearer ${refreshedData.accessToken}` } });
  assert.equal(retried.status, 200);
  await fetch(`${baseUrl}/auth/logout`, { method: 'POST', headers: { cookie } });
  console.log('Expired access token -> cookie refresh -> retry flow passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await database.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
