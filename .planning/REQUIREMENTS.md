# ClassSync — Project Requirements

**Milestone:** User Profile & Avatar Enhancement  
**Status:** Active

---

## 1. Requirement Specifications

### User Profile & Identity Features

- [x] **`USER-PROFILE-01` (DB Extension):** Update database schema to add `bio` (TEXT), `github_link` (VARCHAR), `linkedin_link` (VARCHAR), and `website_link` (VARCHAR) to `users` table with migration/auto-init support.
- [x] **`USER-PROFILE-02` (Auth Bug Fix):** Fix `ReferenceError: mockUserId is not defined` in `src/middleware/auth.js` `verifyToken` function to prevent unhandled 500 server crashes.
- [x] **`USER-PROFILE-03` (Registration Avatar):** Add optional profile picture file upload input to `public/register.html` and `public/js/register.js`. If skipped, assign default fallback avatar.
- [x] **`USER-PROFILE-04` (Navbar Integration):** Display user avatar image in top-left navigation (`public/js/navbar.js`) with an interactive dropdown menu for Quick Profile Edit, Theme Toggle, and Logout.
- [x] **`USER-PROFILE-05` (Profile Edit View):** Create user profile management UI allowing users to view and update their Name, Email, Password, Bio, Avatar Picture, and Social Links with instant backend persistence.

---

## 2. Requirement Traceability Matrix

| ID | Description | Component Target | Target Phase |
| :--- | :--- | :--- | :--- |
| `USER-PROFILE-01` | DB Schema Migration for Bio & Social Links | `schema.sql`, `src/config/db.js` | Phase 1 |
| `USER-PROFILE-02` | Auth Middleware Bug Fix | `src/middleware/auth.js` | Phase 1 |
| `USER-PROFILE-03` | Registration Avatar Upload & Fallback | `public/register.html`, `src/controllers/authController.js` | Phase 2 |
| `USER-PROFILE-04` | Navbar Avatar & Dropdown Menu | `public/js/navbar.js`, `public/css/style.css` | Phase 2 |
| `USER-PROFILE-05` | Profile Management UI & Endpoint | `public/profile.html`, `src/controllers/userController.js` | Phase 3 |

---

*ClassSync Requirements: 2026-10-06*
