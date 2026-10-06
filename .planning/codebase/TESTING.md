---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# Testing Strategy & Execution Guide

**Analysis Date:** 2026-10-06

---

## 1. Testing Framework & Environment Overview

ClassSync uses custom integration test scripts written in Node.js instead of a standard test framework like Jest or Mocha.

- **Test Files Location:** `scripts/`
- **Execution Mechanism:** Node.js HTTP client scripts using standard `http` module or `fetch` hitting `http://localhost:3000/api`.
- **Mock Authentication:** Tests send custom header `'x-user-id': '<user_id>'` when `ALLOW_MOCK_AUTH=true` or `NODE_ENV=test` is active.

---

## 2. Test Suite Inventory

| Test Script Name | Primary Focus & Verification |
| :--- | :--- |
| `scripts/test_api.js` | End-to-end API integration flow (Users, Classrooms, Problems, Submissions, Grading, Notifications, Plagiarism) |
| `scripts/test_auth_api.js` | Authentication & Registration endpoints (Login, Signup, OTP, Password Reset) |
| `scripts/test_rbac_permissions.js` | Role-based authorization matrix (`instructor`, `TA`, `learner` access limits) |
| `scripts/test_live_session_flow.js` | Live Session creation, status transitions, attendance logging, interactive chat |
| `scripts/test_messages_end2end.js` | Direct and classroom channel messaging flows |
| `scripts/test_file_upload.js` | Attachment upload validation and static server hosting |
| `scripts/test_submission_heatmap_api.js` | Analytics API heatmap data generation |
| `scripts/test_active_live_sessions_endpoint.js` | Live session query accuracy |

---

## 3. How to Run Tests

### Standard Test Execution

Ensure the database is running locally (or configured via `.env`), then run the test script:

```bash

# Run end-to-end API test suite

node scripts/test_api.js

# Run authentication test suite

node scripts/test_auth_api.js

# Run RBAC permission test suite

node scripts/test_rbac_permissions.js
```

---

## 4. Current Testing Gaps & Recommendations

1. **No Automated Unit Test Runner:** `package.json` lacks an `npm test` script. Adding Jest or Vitest would enable automated unit tests for core utilities (`src/utils/pistonApi.js`, `src/utils/notificationHelper.js`).
2. **Database State Cleanup:** Integration tests create real database records. Test teardowns (`scripts/cleanup_test_sessions.js`) should be automated to run after test completion.
3. **Frontend E2E Tests:** No Playwright or Cypress suite currently exists for testing HTML/JS frontend pages (`public/*.html`).

---

*ClassSync Testing analysis: 2026-10-06*
