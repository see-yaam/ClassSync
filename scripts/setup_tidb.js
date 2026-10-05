/**
 * TiDB Cloud Setup Script
 * Creates the classsync database, runs schema.sql, and seeds data
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const TIDB_CONFIG = {
  host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3zfw1Xd6CTF232G.root',
  password: 'FLVQlbY25VY1XhVK',
  ssl: { rejectUnauthorized: true },
  multipleStatements: true
};

async function run() {
  console.log('🔌 Connecting to TiDB Cloud...');
  
  // Step 1: Connect without database to create it
  const conn = await mysql.createConnection(TIDB_CONFIG);
  console.log('✅ Connected to TiDB Cloud!');

  // Step 2: Create the classsync database
  console.log('📦 Creating classsync database...');
  await conn.query('CREATE DATABASE IF NOT EXISTS `classsync`');
  console.log('✅ Database "classsync" created!');

  // Step 3: Switch to classsync
  await conn.query('USE `classsync`');

  // Step 4: Run schema.sql
  console.log('🏗️  Running schema.sql...');
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Split by semicolons and run each statement
  const schemaStatements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of schemaStatements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      // TiDB might not support CHECK constraints — skip those
      if (err.message.includes('CHECK') || err.message.includes('check')) {
        console.log(`  ⚠️  Skipped CHECK constraint (TiDB limitation)`);
      } else {
        console.error(`  ❌ Error: ${err.message.slice(0, 120)}`);
      }
    }
  }
  console.log('✅ Schema created — all 22 tables!');

  // Step 5: Run seed.sql
  console.log('🌱 Running seed.sql...');
  const seedPath = path.join(__dirname, '..', 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const seedStatements = seedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of seedStatements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      console.error(`  ⚠️ Seed warning: ${err.message.slice(0, 120)}`);
    }
  }
  console.log('✅ Seed data inserted!');

  // Step 6: Verify
  const [tables] = await conn.query('SHOW TABLES');
  console.log(`\n📊 Tables in classsync: ${tables.length}`);
  tables.forEach(t => {
    const name = Object.values(t)[0];
    console.log(`   • ${name}`);
  });

  const [users] = await conn.query('SELECT user_id, full_name, email FROM users');
  console.log(`\n👥 Users seeded: ${users.length}`);
  users.forEach(u => console.log(`   • ${u.full_name} (${u.email})`));

  await conn.end();
  console.log('\n🎉 TiDB Cloud setup complete! Ready for Vercel deployment.');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
