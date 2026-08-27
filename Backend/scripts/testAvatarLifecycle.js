require('dotenv').config({ quiet: true });
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { database } = require('../database/database');
const userService = require('../service/user.service');
const { detectImageMime } = require('../middleware/upload.middleware');

(async () => {
  let userId; let currentPublicId;
  try {
    const buffer = fs.readFileSync(path.resolve(__dirname, '../../Frontend/src/assets/showroom-login.png'));
    assert.equal(detectImageMime(buffer), 'image/png');
    assert.equal(detectImageMime(Buffer.from('not an image')), null);
    const user = await database.query(
      `INSERT INTO users(username,password_hash,full_name,role,status,is_active)
       VALUES($1,'test','Avatar Test','admin','ACTIVE',TRUE) RETURNING id,role`,
      [`avatar_test_${Date.now()}`],
    );
    userId = user.rows[0].id;
    const file = { buffer, size: buffer.length, mimetype: 'image/png', originalname: 'avatar.png' };
    const first = await userService.updateAvatar({ id: userId, role: 'admin' }, file);
    const second = await userService.updateAvatar({ id: userId, role: 'admin' }, file);
    currentPublicId = second.avatar_public_id;
    assert(first.avatar_public_id && second.avatar_public_id);
    assert.notEqual(first.avatar_public_id, second.avatar_public_id);
    let oldDeleted = false;
    try { await cloudinary.api.resource(first.avatar_public_id); }
    catch (error) { oldDeleted = Number(error?.error?.http_code || error?.http_code) === 404; }
    assert(oldDeleted, 'Old Cloudinary avatar must be deleted');
    const current = await cloudinary.api.resource(second.avatar_public_id);
    assert(current.secure_url, 'New Cloudinary avatar must exist');
    console.log('Avatar upload, replacement and old-image cleanup tests passed');
  } finally {
    if (currentPublicId) await cloudinary.uploader.destroy(currentPublicId).catch(() => undefined);
    if (userId) await database.query('DELETE FROM users WHERE id=$1', [userId]).catch(() => undefined);
    await database.end();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
