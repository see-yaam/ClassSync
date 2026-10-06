---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# Technology Stack & Environment

**Analysis Date:** 2026-10-06

---

## 1. Application Architecture Overview

ClassSync is a multi-tenant classroom management system with real-time features, automated code execution, plagiarism checking, and grade analytics.

- **Primary Runtime:** Node.js (CommonJS, `"type": "commonjs"`)
- **Backend Framework:** Express.js (`^4.19.2`)
- **Database Engine:** MySQL 8.0 / TiDB Serverless (via `mysql2/promise` `^3.9.7`)
- **Frontend Architecture:** Static Vanilla HTML5, CSS3, JavaScript (ES6+), served statically from `public/` directory or deployed via Vercel serverless.

---

## 2. Dependencies & Core Packages

### Direct Dependencies (`package.json`)

| Package | Version | Purpose & Usage |
| :--- | :--- | :--- |
| `express` | `^4.19.2` | Core HTTP web server and REST API router |
| `mysql2` | `^3.9.7` | Promise-based MySQL/TiDB database driver with connection pooling |
| `bcrypt` | `^6.0.0` | Password hashing for authentication and registration |
| `jsonwebtoken` | `^9.0.3` | JWT creation and verification for auth headers (`Bearer <token>`) |
| `nodemailer` | `^10.0.1` | Transactional email delivery (OTP verification, password reset, notifications) |
| `cors` | `^2.8.5` | Cross-Origin Resource Sharing middleware |
| `dotenv` | `^16.4.5` | Environment variable management from `.env` file |

### Key Third-Party External APIs (In-Code Integrations)

- **Piston API (`https://emkc.org/api/v2/piston`):** Code execution engine for automated evaluation in Node.js, Python, C++, Java, etc. (`src/utils/pistonApi.js`)

---

## 3. Configuration & Runtime Environments

### Environment Variables (`.env` / `.env.example`)

Key environment variables configured for ClassSync:

- **Server Configuration:** `PORT` (default `3000`), `NODE_ENV` (`development` | `production` | `test`)
- **Primary Database:** `DB_HOST`, `DB_PORT` (default `3306`), `DB_USER`, `DB_PASSWORD`, `DB_NAME` (`classsync`)
- **Dual-Write Database (Local):** `ENABLE_DUAL_WRITE`, `LOCAL_DB_HOST`, `LOCAL_DB_PORT`, `LOCAL_DB_USER`, `LOCAL_DB_PASSWORD`, `LOCAL_DB_NAME`
- **Authentication:** `JWT_SECRET`, `ALLOW_MOCK_AUTH` (`true` for test/dev bypass)
- **SMTP Email (Nodemailer):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Serverless Indicator:** `VERCEL` (`1` or `true`)

---

## 4. Deployment Targets & Development Workflows

- **Local Development:** Executed via `npm run dev` (`nodemon src/server.js`) or `npm start` (`node src/server.js`).
- **Cloud Deployment:** Serverless ready on Vercel via entry point `api/index.js` and configuration `vercel.json`.
- **Database Schema Management:**
  - Auto-initialization on startup (`src/server.js` checks `SHOW TABLES LIKE 'users'`) using `schema.sql`.
  - Manual import scripts: `scripts/import_db.js`, `scripts/init_db.js`, `scripts/setup_tidb.js`, `scripts/seed_tidb.js`.

---

*ClassSync Stack analysis: 2026-10-06*
