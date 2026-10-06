---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# Technical Debt, Known Issues & Risks

**Analysis Date:** 2026-10-06

---

## 1. Critical Bugs & Runtime Defects

### A. ReferenceError in Authentication Middleware (`src/middleware/auth.js`)

- **Location:** `src/middleware/auth.js` (Line 28)
- **Issue:** In `verifyToken()`, the line `else if (mockUserId && allowMock)` references `mockUserId`. However, `mockUserId` is **never declared** inside `verifyToken()`. (It is only declared in `optionalToken()`).
- **Impact:** When `ALLOW_MOCK_AUTH=true` and an unauthenticated request without a `Bearer` token arrives, Node.js throws `ReferenceError: mockUserId is not defined`. The `catch` block catches this and returns a `500 Internal authentication error` instead of properly using `x-user-id` or returning `401`.

---

## 2. Security & Credential Concerns

### A. Hardcoded Secret Fallbacks

- **JWT Secret:** `src/middleware/auth.js` falls back to `'classsync_secret_jwt_key_2026'` if `JWT_SECRET` is missing in environment variables.
- **Database Password:** `src/config/db.js` falls back to hardcoded default `'seyam'` if `DB_PASSWORD` is omitted.
- **Risk:** Potential security vulnerability if deployed without explicit `.env` values set.

### B. Mock Auth Risk in Production

- If `ALLOW_MOCK_AUTH=true` is accidentally enabled in production environment variables, users could impersonate arbitrary accounts via `x-user-id` HTTP header.

---

## 3. Architecture & Code Maintenance Concerns

### A. Redundant Middleware Directory

- Both `src/middleware/` and `src/middlewares/` exist.
- `src/middlewares/authMiddleware.js` is a legacy auth middleware that duplicates logic in `src/middleware/auth.js`.
- **Recommendation:** Remove `src/middlewares/` after verifying all routes import from `src/middleware/`.

### B. Unauthenticated Guest Dependency for Code Execution

- `src/utils/pistonApi.js` sends user code to `https://api.paiza.io/runners/create?api_key=guest`.
- Using a public guest API key means ClassSync is vulnerable to Paiza rate-limiting, IP throttling, or unexpected API downtime.
- **Recommendation:** Provide fallback to self-hosted Piston / Docker container instance for production deployments.

---

## 4. Test Automation Gaps

- **Missing `npm test` Script:** `package.json` contains no `"test"` entry in `"scripts"`.
- Developers must manually discover and execute individual scripts inside `scripts/`.

---

*ClassSync Concerns analysis: 2026-10-06*
