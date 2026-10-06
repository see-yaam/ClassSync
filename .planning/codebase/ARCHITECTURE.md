---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# System Architecture & Design Patterns

**Analysis Date:** 2026-10-06

---

## 1. High-Level Architectural Pattern

ClassSync follows a **Layered Monolithic Architecture** with a RESTful Express backend, modularized into Controllers, Routes, Middleware, Utilities, and static HTML/JS Frontend views.

```
Client (Browser / Fetch API)
       │
       ▼
Static Assets (`public/*.html`, `public/js/*.js`)
       │
       ▼
Express Application (`src/server.js` / `api/index.js`)
       │
       ├── Middleware Layer (`src/middleware/auth.js`, `src/middleware/rbac.js`)
       ├── Route Controllers (`src/controllers/*.controller.js`)
       ├── Service / Helper Layer (`src/utils/*.js`)
       └── Database Pool (`src/config/db.js`) ──► MySQL / TiDB Serverless
```

---

## 2. Multi-Tenancy & Authorization Model

ClassSync enforces tenant isolation at the **Classroom level** (`classroom_id`).

### Membership Roles

1. **`instructor`:** Full administrative control over classroom settings, homework, problems, grading, live sessions, and learner management.
2. **`TA` (Teaching Assistant):** Can review submissions, auto-evaluations, manage live sessions, and assist grading.
3. **`learner`:** Can view enrolled classrooms, submit homework solutions, run code live, attend live sessions, and inspect their own grades.

### RBAC Pipeline (`src/middleware/rbac.js`)

The `requireClassroomRole(allowedRoles, entityType)` middleware factory dynamically resolves the target `classroom_id`:
- **Direct Lookup:** Evaluates `req.params.id`, `req.params.classroomId`, or `req.body.classroom_id`.
- **Indirect Entity Resolution:** Queries the database for entity types (`homework`, `question`, `submission`, `live-session`, `problem`, `resource`, `alert`, `enrollment-request`) to find the parent `classroom_id`.
- **Role Verification:** Queries `classroom_members` to verify `user_id` membership and role permission.

---

## 3. Data Flow & Core Systems

### A. Authentication Flow

1. User logs in via `POST /api/auth/login` (`src/controllers/authController.js`).
2. Server validates password hash (`bcrypt.compare`) and issues a signed JWT (`src/middleware/auth.js`).
3. Client stores JWT in `localStorage` and includes `Authorization: Bearer <token>` header in API calls.

### B. Automated Code Submission & Evaluation Flow

1. Learner submits code via `POST /api/submissions` (`src/controllers/submissionController.js`).
2. Controller invokes `evaluateAllTestCases` (`src/utils/pistonApi.js`).
3. Paiza.io API runs code against test cases; outputs are validated against expected outputs.
4. Submission result, score, and individual test results are saved to database.

### C. Live Session & Interactive Classroom Flow

1. Instructor creates or schedules session (`src/controllers/liveSessionController.js`).
2. Background timer (`src/utils/scheduledSessionChecker.js`) updates session statuses from `scheduled` to `active` or `ended`.
3. Learners join sessions, log attendance, and post in session-specific chat rooms.

---

## 4. System Entry Points

- **Express Local Entry:** `src/server.js` (Binds HTTP server to `PORT`, initializes background cron loops, and runs schema auto-init).
- **Vercel Serverless Entry:** `api/index.js` (Exports `src/server.js` Express application object for serverless lambdas).

---

*ClassSync Architecture analysis: 2026-10-06*
