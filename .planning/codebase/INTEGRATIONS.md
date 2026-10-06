---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# External Integrations & Services

**Analysis Date:** 2026-10-06

---

## 1. Primary Database Integration

ClassSync relies on a relational database layer configured via `mysql2/promise` in `src/config/db.js`.

- **Primary Database Engine:** MySQL 8.0 or TiDB Serverless Cloud.
- **Connection Model:** Connection pool (`primaryPool`) with max 10 concurrent connections.
- **SSL Security:** Automatically enforced (`ssl: { rejectUnauthorized: true }`) when host is non-local (`isCloud = true`).
- **Dual-Sync / Replication Feature:**
  - When `ENABLE_DUAL_WRITE=true` or running cloud DB with `LOCAL_DB_HOST` specified locally, a secondary `localPool` is created.
  - Intercepts all write queries (`INSERT`, `UPDATE`, `DELETE`, `REPLACE`, `CREATE`, `ALTER`, `DROP`) and mirrors them asynchronously to the local database.

---

## 2. Automated Code Execution Engine

ClassSync evaluates coding submissions via an external code runner API in `src/utils/pistonApi.js`.

- **Provider:** Paiza.io API (`https://api.paiza.io/runners/create?api_key=guest` & `https://api.paiza.io/runners/get_details`).
- **Supported Languages:** Python 3, JavaScript (Node.js), C++, C, Java, C#, Go, Ruby, PHP.
- **Execution Flow:**
  1. POST request creates an asynchronous runner session for the given code snippet and stdin input.
  2. Polling loop fetches execution status until `completed`, `timeout`, `failure`, or error.
  3. Output (`stdout`), compiler errors (`build_stderr`), and runtime errors (`stderr`) are evaluated against expected test case outputs.

---

## 3. Email Delivery & OTP Verification

Transactional emails (password reset OTPs, notification updates) are dispatched using `nodemailer` in `src/utils/mailer.js`.

- **Protocol:** SMTP via `nodemailer.createTransport()`.
- **Configuration:** Reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` from environment.
- **Fallback / Development Mode:** If SMTP credentials are missing, logs OTP codes directly to the console without crashing.

---

## 4. Cloud Serverless Platform

- **Platform:** Vercel (`api/index.js`, `vercel.json`).
- **Behavior Adaptation:**
  - When `VERCEL=1` is set, background cron workers (`checkApproachingDeadlines`, `startScheduledSessionChecker`) and auto-schema initialization in `src/server.js` are disabled to prevent duplicate executions in ephemeral lambda functions.
  - Endpoints in `src/routes/cronRoutes.js` are provided for external cron triggers (e.g., Vercel Cron jobs) to invoke background tasks via HTTP.

---

*ClassSync Integrations analysis: 2026-10-06*
