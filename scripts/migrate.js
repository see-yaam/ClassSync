const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('--- Starting Database Schema Migration ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classsync_db'
  });

  console.log('Connected to MySQL classsync_db database.');

  // 1. ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  try {
    const [cols1] = await connection.query(`SHOW COLUMNS FROM users LIKE 'is_verified'`);
    if (cols1.length === 0) {
      await connection.query(`ALTER TABLE \`users\` ADD COLUMN \`is_verified\` BOOLEAN DEFAULT false;`);
      console.log('✅ Added `is_verified` column to `users` table.');
    } else {
      console.log('ℹ️ Column `is_verified` already exists in `users` table.');
    }
  } catch (err) {
    console.error('Error adding is_verified:', err.message);
  }

  // 2. ALTER TABLE password_reset_otp ADD COLUMN otp_purpose ENUM('registration','password_reset') NOT NULL DEFAULT 'password_reset';
  try {
    const [cols2] = await connection.query(`SHOW COLUMNS FROM password_reset_otp LIKE 'otp_purpose'`);
    if (cols2.length === 0) {
      await connection.query(
        `ALTER TABLE \`password_reset_otp\` ADD COLUMN \`otp_purpose\` ENUM('registration','password_reset') NOT NULL DEFAULT 'password_reset';`
      );
      console.log('✅ Added `otp_purpose` column to `password_reset_otp` table.');
    } else {
      console.log('ℹ️ Column `otp_purpose` already exists in `password_reset_otp` table.');
    }
  } catch (err) {
    console.error('Error adding otp_purpose:', err.message);
  }

  // Set existing seeded users to is_verified = true
  await connection.query(`UPDATE \`users\` SET \`is_verified\` = true WHERE \`user_id\` <= 10;`);
  console.log('✅ Marked seed users as verified.');

  await connection.end();
  console.log('--- Migration Completed Successfully! ---');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
