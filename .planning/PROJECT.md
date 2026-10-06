# ClassSync — Project Context & Vision

**Initial Creation Date:** 2026-10-06  
**Project Status:** Active Development (Brownfield Enhancement)

---

## 1. What This Is

ClassSync is a full-stack, multi-tenant classroom management system featuring real-time code evaluation, live video sessions, homework assignments, plagiarism detection, and student analytics.

This milestone enhances user identity and platform UX with a complete **User Profile & Avatar System**, top navigation profile dropdown, database schema extension, theme toggling, and critical authentication stability fixes.

---

## 2. Core Value

A smooth, personalized experience for instructors, TAs, and learners with clear user identification, customizable profile metadata, and stable authentication across all endpoints.

---

## 3. Requirements & Scope

### Validated (Existing System Capabilities)
- ✓ Multi-tenant classroom management (`instructor`, `TA`, `learner` roles) — existing
- ✓ JWT authentication & OTP email verification — existing
- ✓ Homework assignments & automated multi-language code runner via Paiza.io — existing
- ✓ Plagiarism detection engine & submission matrix — existing
- ✓ Live video sessions via Jitsi Meet — existing
- ✓ Classroom group chat & direct messaging — existing

### Active (Current Milestone Goals)
- [ ] **Registration Avatar Selection:** Optional profile picture upload during registration with skippable default avatar fallback.
- [ ] **Navbar Avatar & Dropdown Menu:** Display user profile avatar in top-left navigation with quick menu (Edit Profile, Theme Toggle, Logout).
- [ ] **User Profile Management Page/Modal:** Comprehensive profile editing UI for Name, Email, Password, Bio, Avatar image, and Social Links (GitHub, LinkedIn, Website).
- [ ] **Database Schema Extension:** Add `bio`, `github_link`, `linkedin_link`, `website_link` columns to `users` table.
- [ ] **Auth Middleware Bug Fix:** Fix `ReferenceError: mockUserId is not defined` in `src/middleware/auth.js` to ensure clean 401 response handling.

### Out of Scope
- Complete backend framework migration (Express.js remains core backend).
- Third-party paid cloud storage services (local `public/uploads` storage used).

---

## 4. Key Decisions Log

| Decision | Rationale | Outcome |
| :--- | :--- | :--- |
| **Local Uploads for Avatars** | Keeps deployment zero-cost and consistent with existing `public/uploads` structure | Pending |
| **Default Fallback Avatar** | Ensures clean visual UX for users who skip profile picture upload on signup | Pending |
| **Database Column Extension** | Extends `users` table without breaking existing query compatibility | Pending |

---

## 5. Evolution Strategy

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-10-06 after initialization*
