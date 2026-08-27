require('dotenv').config({ quiet: true });
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../index');
const cloudinary = require('../config/cloudinary');
const { database } = require('../database/database');
const { generateAccessToken } = require('../utils/generatAccessToken');

(async () => {
  let server; let userId; let publicId;
  try {
    const user = await database.query(
      `INSERT INTO users(username,password_hash,full_name,role,status,is_active,is_locked)
       VALUES($1,'test','Avatar Endpoint Test','admin','ACTIVE',TRUE,FALSE)
       RETURNING id,role,security_level_id`,
      [`avatar_endpoint_${Date.now()}`],
    );
    userId = user.rows[0].id;
    const session = await database.query(
      `INSERT INTO user_sessions(user_id,device_id,device_type,last_activity_at,expires_at)
       VALUES($1,'avatar-endpoint-test','PC',NOW(),NOW()+INTERVAL '1 hour') RETURNING id`,
      [userId],
    );
    const token = generateAccessToken(user.rows[0], session.rows[0].id);
    let baseUrl = process.env.AVATAR_TEST_BASE_URL;
    if (!baseUrl) {
      server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    }
    const form = new FormData();
    const buffer = fs.readFileSync(path.resolve(__dirname, '../../Frontend/src/assets/showroom-login.png'));
    form.append('avatar', new Blob([buffer], { type: 'image/png' }), 'avatar.png');
    const response = await fetch(`${baseUrl}/api/users/me/avatar`, {
      method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: form,
    });
    const payload = await response.json();
    assert.equal(response.status, 200, payload.message);
    assert(payload.data.avatar_url && payload.data.avatar_public_id);
    publicId = payload.data.avatar_public_id;
    console.log('Authenticated multipart avatar endpoint test passed');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => undefined);
    if (userId) {
      await database.query('DELETE FROM user_sessions WHERE user_id=$1', [userId]).catch(() => undefined);
      await database.query('DELETE FROM users WHERE id=$1', [userId]).catch(() => undefined);
    }
    await database.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
