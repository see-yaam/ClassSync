const db = require('../src/config/db');
const bcrypt = require('bcrypt');

async function fixPasswords() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated bcrypt hash:', hash);

  await db.query('UPDATE users SET password_hash = ? WHERE user_id <= 10', [hash]);
  console.log('Updated user_ids <= 10 with valid bcrypt hash for password123.');

  // Test bcrypt compare
  const [rows] = await db.query('SELECT email, password_hash FROM users WHERE email = ?', ['alice@uiu.ac.bd']);
  const match = await bcrypt.compare('password123', rows[0].password_hash);
  console.log(`Verification check for ${rows[0].email}: bcrypt match =`, match);

  process.exit(0);
}

fixPasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
