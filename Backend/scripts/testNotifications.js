require('dotenv').config({ quiet: true });
const assert = require('assert');
const { database } = require('../database/database');
const notification = require('../service/notification.service');

(async () => {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const first = await client.query(`INSERT INTO users(username,password_hash,full_name,role,status,is_active)
      VALUES($1,'test','Notification Customer','customer','ACTIVE',TRUE) RETURNING id`, [`notification_test_${Date.now()}`]);
    const second = await client.query(`INSERT INTO users(username,password_hash,full_name,role,status,is_active)
      VALUES($1,'test','Other Customer','customer','ACTIVE',TRUE) RETURNING id`, [`notification_other_${Date.now()}`]);
    const customer = await client.query('INSERT INTO customers(user_id,full_name) VALUES($1,$2) RETURNING id', [first.rows[0].id, 'Notification Customer']);
    const created = await notification.createForCustomer(client, customer.rows[0].id, { title: 'Test', message: 'Customer update event', type: 'CUSTOMER', referenceId: customer.rows[0].id });
    assert.equal(created.user_id, first.rows[0].id);
    const owner = await client.query('SELECT * FROM notifications WHERE id=$1 AND user_id=$2', [created.id, first.rows[0].id]);
    const stranger = await client.query('SELECT * FROM notifications WHERE id=$1 AND user_id=$2', [created.id, second.rows[0].id]);
    assert.equal(owner.rowCount, 1);
    assert.equal(stranger.rowCount, 0);
    await client.query('ROLLBACK');
    console.log('Notification recipient and ownership tests passed (transaction rolled back)');
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); await database.end(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
