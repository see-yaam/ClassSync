/**
 * TiDB Cloud Seed Script — properly handles SQL comments
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const TIDB_CONFIG = {
  host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3zfw1Xd6CTF232G.root',
  password: 'FLVQlbY25VY1XhVK',
  database: 'classsync',
  ssl: { rejectUnauthorized: true }
};

async function run() {
  console.log('🔌 Connecting to TiDB Cloud (classsync)...');
  const conn = await mysql.createConnection(TIDB_CONFIG);
  console.log('✅ Connected!');

  console.log('🌱 Running seed.sql...');
  const seedPath = path.join(__dirname, '..', 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  // Remove all comment lines BEFORE splitting by semicolons
  const cleanedSql = seedSql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let success = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      success++;
      console.log(`  ✅ ${stmt.slice(0, 80)}...`);
    } catch (err) {
      failed++;
      console.error(`  ❌ ${err.message.slice(0, 100)}`);
      console.error(`     Statement: ${stmt.slice(0, 100)}`);
    }
  }

  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);

  // Verify
  const [users] = await conn.query('SELECT user_id, full_name, email FROM users');
  console.log(`\n👥 Users in database: ${users.length}`);
  users.forEach(u => console.log(`   • [${u.user_id}] ${u.full_name} (${u.email})`));

  const [classrooms] = await conn.query('SELECT classroom_id, classroom_name FROM classrooms');
  console.log(`\n🏫 Classrooms: ${classrooms.length}`);
  classrooms.forEach(c => console.log(`   • [${c.classroom_id}] ${c.classroom_name}`));

  const [hw] = await conn.query('SELECT homework_id, title FROM homework');
  console.log(`\n📝 Homework: ${hw.length}`);
  hw.forEach(h => console.log(`   • [${h.homework_id}] ${h.title}`));

  await conn.end();
  console.log('\n🎉 Seeding complete!');
}

run().catch(err => {
  console.error('💥 Fatal:', err.message);
  process.exit(1);
});
