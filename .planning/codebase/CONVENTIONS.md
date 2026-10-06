---
last_mapped_commit: 2a603abd2fc88ca0c55ad11146a73fa05e5104aa
last_mapped_at: 2026-10-06
---
# Coding Conventions & Development Standards

**Analysis Date:** 2026-10-06

---

## 1. Code Style & Syntax

ClassSync follows standard Node.js JavaScript (ES6+ / CommonJS) conventions across backend code.

- **Module Pattern:** CommonJS modules using `require()` for imports and `module.exports` or `exports.func = ...` for exports.
- **Variables & Functions:** `const` and `let` preferred; arrow functions `async () => {}` used extensively for async handler logic.
- **Formatting:** 2-space indentation, double or single quotes consistently per file, semicolons at statement ends.

---

## 2. API Response & Error Handling Patterns

### Standard JSON Response Shape

All backend API endpoints follow a consistent JSON envelope pattern:

**Success Response:**

```json
{
  "success": true,
  "message": "Classroom created successfully",
  "data": {
    "classroom_id": 12,
    "title": "Data Structures 101"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Forbidden: You are not an instructor of this classroom"
}
```

### Async Error Handling Pattern

Controllers wrap all database calls and async operations in explicit `try ... catch` blocks:

```javascript
// Typical Controller Endpoint Structure
exports.getClassroomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM classrooms WHERE classroom_id = ? AND is_active = true`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching classroom details:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
```

---

## 3. Database Access Conventions

- **Prepared Parameterized Statements:** All database queries use `?` parameter placeholders with `mysql2/promise` arrays (`[param1, param2]`) to eliminate SQL injection vulnerabilities.
- **Destructuring Query Results:** `const [rows] = await db.query(...)` for `SELECT` queries; `const [result] = await db.query(...)` for `INSERT`/`UPDATE` to read `result.insertId` or `result.affectedRows`.
- **Soft Deletes:** Table schemas utilize `is_active` boolean flags (e.g., `is_active = true`) rather than permanent SQL `DELETE` rows.

---

## 4. Authentication & Middleware Usage

- **Protected Routes:** Express routes attach `verifyToken` middleware (`src/middleware/auth.js`) prior to controller handlers.
- **Role Enforced Routes:** Express routes attach `requireClassroomRole(['instructor', 'TA'], 'entityType')` (`src/middleware/rbac.js`) after `verifyToken` to assert authorization.

---

*ClassSync Conventions analysis: 2026-10-06*
