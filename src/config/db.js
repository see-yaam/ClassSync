const mysql = require('mysql2/promise');
require('dotenv').config();

const isCloud = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';

const primaryConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'seyam',
  database: process.env.DB_NAME || 'classsync',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

// Enable SSL for cloud databases (TiDB, PlanetScale, Aiven, etc.)
if (isCloud) {
  primaryConfig.ssl = { rejectUnauthorized: true };
}

const primaryPool = mysql.createPool(primaryConfig);

// Secondary Local MySQL Workbench Pool (for dual-sync when running locally)
let localPool = null;
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (!isVercel && (process.env.ENABLE_DUAL_WRITE === 'true' || (isCloud && process.env.LOCAL_DB_HOST))) {
  const localConfig = {
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT) : 3306,
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD !== undefined ? process.env.LOCAL_DB_PASSWORD : 'seyam',
    database: process.env.LOCAL_DB_NAME || 'classsync',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    dateStrings: true
  };
  localPool = mysql.createPool(localConfig);
}

const pool = {
  async query(sql, params) {
    const res = await primaryPool.query(sql, params);
    if (localPool && typeof sql === 'string') {
      const trimmed = sql.trim().toUpperCase();
      if (
        trimmed.startsWith('INSERT') ||
        trimmed.startsWith('UPDATE') ||
        trimmed.startsWith('DELETE') ||
        trimmed.startsWith('REPLACE') ||
        trimmed.startsWith('CREATE') ||
        trimmed.startsWith('ALTER') ||
        trimmed.startsWith('DROP')
      ) {
        localPool.query(sql, params).catch(err => {
          // console.warn('⚠️ Dual-write to local MySQL Workbench failed:', err.message);
        });
      }
    }
    return res;
  },

  async execute(sql, params) {
    const res = await primaryPool.execute(sql, params);
    if (localPool && typeof sql === 'string') {
      const trimmed = sql.trim().toUpperCase();
      if (
        trimmed.startsWith('INSERT') ||
        trimmed.startsWith('UPDATE') ||
        trimmed.startsWith('DELETE') ||
        trimmed.startsWith('REPLACE')
      ) {
        localPool.execute(sql, params).catch(err => {
          // console.warn('⚠️ Dual-write to local MySQL Workbench failed:', err.message);
        });
      }
    }
    return res;
  },

  async getConnection() {
    return primaryPool.getConnection();
  }
};

module.exports = pool;


