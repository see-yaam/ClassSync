const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updateOtpTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classsync_db'
  });

  console.log('Modifying password_reset_otp table to allow NULL user_id for registration OTPs...');

  try {
    // Drop foreign key if necessary or modify column
    await connection.query(`ALTER TABLE \`password_reset_otp\` MODIFY COLUMN \`user_id\` INT NULL;`);
    console.log('✅ Modified user_id to INT NULL in password_reset_otp.');
  } catch (err) {
    console.log('Notice:', err.message);
  }

  await connection.end();
}

updateOtpTable().catch(console.error);
