# ClassSync — Project Execution Roadmap

**Milestone:** User Profile & Avatar System Enhancement  
**Status:** In Progress

---

## Phase Overview

```
Phase 1: Core DB Schema & Auth Middleware Stability
   │
   ▼
Phase 2: Registration Avatar Upload & Navbar Integration
   │
   ▼
Phase 3: User Profile Management View & API Endpoints
```

---

## Phase Breakdown

### Phase 1: Core Database & Auth Stability
- **Goal:** Fix critical auth bug and prepare database schema for profile metadata.
- **Requirements Covered:** `USER-PROFILE-01`, `USER-PROFILE-02`
- **Plans:**
  - `01-01-PLAN.md` — Fix `ReferenceError` in `src/middleware/auth.js` and extend `schema.sql` / auto-init DB schema for `bio` and social links.

### Phase 2: Registration & Navbar Avatar System
- **Goal:** Enable optional profile picture upload on signup and render avatar dropdown in top navbar.
- **Requirements Covered:** `USER-PROFILE-03`, `USER-PROFILE-04`
- **Plans:**
  - `02-01-PLAN.md` — Add avatar upload to registration flow with default fallback image.
  - `02-02-PLAN.md` — Build Navbar Avatar component with dropdown menu, profile link, theme switcher, and logout.

### Phase 3: Profile Management View & API
- **Goal:** Provide complete profile editing UI and backend persistence.
- **Requirements Covered:** `USER-PROFILE-05`
- **Plans:**
  - `03-01-PLAN.md` — Build user profile update REST API endpoints (`userController.js`, `userRoutes.js`).
  - `03-02-PLAN.md` — Create interactive `profile.html` and `profile.js` for updating name, email, password, bio, avatar, and social links.

---

*ClassSync Roadmap: 2026-10-06*
