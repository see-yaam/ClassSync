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
- [x] **`QUIZ-EXAM-01` (Quizzes & Exams Engine):** Support Live scheduled & Flexible window quizzes/exams with duration timers, start/end time windows, and calendar auto-sync.
- [x] **`QUIZ-EXAM-02` (Student Multi-Language Selection):** Allow students to select their preferred programming language (13 languages: Python, C++, C, Java, JS, TS, C#, Go, Rust, Ruby, PHP, Kotlin, Swift) when solving coding questions during exams.
- [x] **`QUIZ-EXAM-03` (Multi-Test Cases & Hidden Flag):** Allow teachers to add multiple test cases per coding question with a `🔒 Hidden Test Case` toggle to conceal hidden evaluation cases from students.
- [x] **`QUIZ-EXAM-04` (Auto-saving & Leaderboard):** Auto-save student progress in real-time during exams and generate student rankings/leaderboards.
- [x] **`DB-CLEAN-01` (Fresh Database Reset):** Safe wipe script to truncate dummy test data across all 29 database tables while preserving schema constraints and feature functionality.

---

## 2. Requirement Traceability Matrix

| ID | Description | Component Target | Target Phase |
| :--- | :--- | :--- | :--- |
| `USER-PROFILE-01` | DB Schema Migration for Bio & Social Links | `schema.sql`, `src/config/db.js` | Phase 1 |
| `USER-PROFILE-02` | Auth Middleware Bug Fix | `src/middleware/auth.js` | Phase 1 |
| `USER-PROFILE-03` | Registration Avatar Upload & Fallback | `public/register.html`, `src/controllers/authController.js` | Phase 2 |
| `USER-PROFILE-04` | Navbar Avatar & Dropdown Menu | `public/js/navbar.js`, `public/css/style.css` | Phase 2 |
| `USER-PROFILE-05` | Profile Management UI & Endpoint | `public/profile.html`, `src/controllers/userController.js` | Phase 3 |
| `QUIZ-EXAM-01` | Quizzes & Exams Engine | `src/controllers/quizController.js`, `public/js/dashboard.js` | Phase 4 |
| `QUIZ-EXAM-02` | Student Multi-Language Selection (13 Langs) | `src/utils/pistonApi.js`, `public/js/dashboard.js` | Phase 4 |
| `QUIZ-EXAM-03` | Multi-Test Cases & Hidden Flag | `schema.sql`, `src/controllers/quizController.js` | Phase 4 |
| `QUIZ-EXAM-04` | Exam Timer, Auto-save & Leaderboard | `public/js/dashboard.js`, `src/controllers/quizController.js` | Phase 4 |
| `DB-CLEAN-01` | Fresh Database Reset | `schema.sql`, MySQL database | Phase 4 |


---

*ClassSync Requirements: 2026-10-06*
