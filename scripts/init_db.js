const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDB() {
  console.log('Connecting to MySQL host:', process.env.DB_HOST);
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log('Connected to MySQL server successfully.');

  const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  console.log('Running schema.sql...');
  await connection.query(schemaSql);
  console.log('Schema executed successfully.');

  const seedSql = fs.readFileSync(path.join(__dirname, '../seed.sql'), 'utf8');
  console.log('Running seed.sql...');
  await connection.query(seedSql);
  console.log('Seed executed successfully.');

  await connection.end();
  console.log('Database initialized and seeded successfully!');
}

initDB().catch(err => {
  console.error('Database Initialization Failed:', err);
  process.exit(1);
});
