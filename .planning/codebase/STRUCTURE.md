---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# Project Directory Structure & Organization

**Analysis Date:** 2026-10-06

---

## 1. Directory Tree Overview

```
ClassSync/
├── api/                        # Vercel serverless integration
│   └── index.js                # Serverless function entry point wrapping src/server.js
├── public/                     # Static frontend assets served by Express
│   ├── css/                    # Modular stylesheets (theme, dashboard, components)
│   ├── js/                     # Frontend client-side JS logic
│   ├── uploads/                # File uploads storage directory
│   ├── index.html              # Main dashboard / landing view
│   ├── login.html              # User login page
│   ├── register.html           # User registration page
│   ├── classroom.html          # Main classroom management view
│   ├── homework.html           # Homework assignment view & code runner UI
│   ├── live.html               # Live classroom session view
│   ├── problems.html           # Coding problem practice view
│   ├── leaderboard.html        # Learner analytics & leaderboard view
│   ├── forgot-password.html    # Password recovery view
│   ├── reset-password.html     # Password reset token validation view
│   └── verify-otp.html         # OTP email verification view
├── src/                        # Express backend application source code
│   ├── config/                 # Application configuration & DB pools
│   │   └── db.js               # MySQL / TiDB primary & dual-write connection pools
│   ├── controllers/            # 16 Express REST API request controllers
│   ├── middleware/             # Active middleware modules
│   │   ├── auth.js             # JWT verification & mock auth handler
│   │   └── rbac.js             # Classroom role-based access control engine
│   ├── middlewares/            # Legacy directory (contains authMiddleware.js)
│   ├── routes/                 # 17 Express route definitions mapping endpoints to controllers
│   ├── utils/                  # Helper utilities (Piston API, Mailer, Notifications, Cron)
│   └── server.js               # Core Express app setup, static hosting, and dev listener
├── scripts/                    # Database initialization, migration, and test scripts
│   ├── init_db.js              # Database table initializer script
│   ├── import_db.js            # SQL file import helper
│   ├── setup_tidb.js           # Cloud TiDB schema installer
│   ├── seed_tidb.js            # Cloud TiDB test data seeder
│   └── test_*.js               # 16 API test & flow validation scripts
├── schema.sql                  # Main DDL SQL schema for ClassSync
├── seed.sql                    # Initial development dataset (users, classrooms, homework)
├── classsync_db.sql            # Full SQL export backup
├── package.json                # Project dependencies, scripts, metadata
├── vercel.json                 # Vercel deployment configuration
└── .env.example                # Template environment variables
```

---

## 2. Key Component Locations

| Component / Layer | Primary Path | Description |
| :--- | :--- | :--- |
| Application Entry | `src/server.js` | Express app initialization, static middleware, API routes, background tasks |
| Vercel Handler | `api/index.js` | Serverless adapter for Vercel deployment |
| DB Connector | `src/config/db.js` | MySQL pool setup with cloud SSL support and local dual-write |
| Auth Middleware | `src/middleware/auth.js` | Express middleware verifying JWT `Bearer` token and `x-user-id` |
| RBAC Middleware | `src/middleware/rbac.js` | Multi-tenant classroom permission enforcement |
| Code Runner | `src/utils/pistonApi.js` | Paiza.io integration for running user code against test cases |
| Database Schemas | `schema.sql`, `classsync_db.sql` | Relational table schemas and seed data |

---

## 3. Naming Conventions

- **Controllers:** camelCase with `Controller.js` suffix (e.g., `src/controllers/classroomController.js`).
- **Routes:** camelCase with `Routes.js` suffix (e.g., `src/routes/classroomRoutes.js`).
- **Middleware:** camelCase short names (e.g., `src/middleware/auth.js`, `src/middleware/rbac.js`).
- **Frontend Pages:** kebab-case HTML files in `public/` (e.g., `public/forgot-password.html`).
- **Scripts:** snake_case JS files in `scripts/` (e.g., `scripts/setup_tidb.js`, `scripts/test_rbac_permissions.js`).

---

*ClassSync Structure analysis: 2026-10-06*
