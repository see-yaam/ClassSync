# ClassSync — Multi-Tenant Classroom Management System

DBMS Lab Project (CSE 3522), United International University (UIU).

## 🚀 Quick Setup Guide for Teammates

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment & Database
1. Make sure **XAMPP MySQL** is running.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Initialize the database and populate sample demo data:
   ```bash
   node scripts/init_db.js
   ```

### 3. Run Application
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 📁 Project Structure
- `src/` - Backend Express REST API controllers, routes, and middleware.
- `public/` - Static HTML/CSS/JS frontend pages.
- `schema.sql` - Complete MySQL Database schema.
- `seed.sql` - Sample demo data (Users, Classrooms, Homework, Problems, Submissions).
