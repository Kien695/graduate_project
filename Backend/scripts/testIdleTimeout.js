require("dotenv").config({ quiet: true });
const assert = require("assert");
const crypto = require("crypto");
const { database } = require("../database/database");
const sessionActivity = require("../service/sessionActivity.service");

const run = async () => {
  const user = await database.query(
    "SELECT id FROM users WHERE COALESCE(is_active,TRUE)=TRUE AND COALESCE(is_locked,FALSE)=FALSE LIMIT 1",
  );
  if (!user.rows[0]) throw new Error("Can it nhat mot user active de test idle timeout");
  const userId = user.rows[0].id;
  const stale = await database.query(
    `INSERT INTO user_sessions(
       user_id,device_id,device_type,last_activity_at,expires_at
     ) VALUES($1,$2,'PC',NOW()-($3*INTERVAL '1 minute'),NOW()+INTERVAL '1 day')
     RETURNING id`,
    [userId, `idle-test-${crypto.randomUUID()}`, sessionActivity.IDLE_TIMEOUT_MINUTES + 1],
  );
  const fresh = await database.query(
    `INSERT INTO user_sessions(user_id,device_id,device_type,last_activity_at,expires_at)
     VALUES($1,$2,'PC',NOW(),NOW()+INTERVAL '1 day') RETURNING id`,
    [userId, `idle-test-${crypto.randomUUID()}`],
  );
  const ids = [stale.rows[0].id, fresh.rows[0].id];
  try {
    await assert.rejects(
      sessionActivity.touch({ sessionId: ids[0], userId }),
      (error) => error.statusCode === 401,
    );
    const revoked = await database.query("SELECT revoked_at FROM user_sessions WHERE id=$1", [ids[0]]);
    assert.ok(revoked.rows[0].revoked_at);
    const touched = await sessionActivity.touch({ sessionId: ids[1], userId });
    assert.equal(touched.id, userId);
    console.log("Idle timeout integration test passed");
  } finally {
    await database.query("DELETE FROM user_sessions WHERE id=ANY($1::bigint[])", [ids]);
    await database.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
