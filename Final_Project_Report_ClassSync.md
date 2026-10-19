# United International University
## Department of Computer Science and Engineering
### Course: Database Management System Laboratory (CSE 3522)
### Final Project Report

---

# Project Title: ClassSync
### Multi-Tenant Classroom Management & Code Evaluation Platform

**Submitted by: Team Yggdrasil**
- **Abdur Rahman Bhuyan** — ID: 0112420410
- **Meftahul Jannat** — ID: 0112430326
- **Ananya Chakrabartty** — ID: 0112430366

**Submitted to:**
**Abu Bakar Fahad**
Lecturer, Department of CSE, United International University

**Project Links & Demonstrations:**
- **GitHub Repository:** [https://github.com/see-yaam/ClassSync](https://github.com/see-yaam/ClassSync)
- **Live Vercel Frontend Deployment:** [https://classsync-classroom.vercel.app](https://classsync-classroom.vercel.app)
- **YouTube Video Demonstration:** [https://youtu.be/YVOAAkOCyW8](https://youtu.be/YVOAAkOCyW8)

---

## Table of Contents
1. **Chapter 1: Introduction**
   - 1.1 Problem Statement
   - 1.2 Motivation
   - 1.3 Objectives
2. **Chapter 2: Implemented Features & Database Queries**
   - 2.1 Multi-Tenant Classroom Creation & Contextual Role Management
   - 2.2 Paid Classroom Enrollment with Payment Verification Workflow
   - 2.3 Homework Assignment & Structured Task Formulation
   - 2.4 Multi-Language Automated Code Evaluation Engine (Piston API Sandbox)
   - 2.5 Codeforces-Style Submission Matrix & Real-time Progress Tracking
   - 2.6 Interactive Live Video Classes & Duration-Based Automated Attendance (Jitsi Meet)
   - 2.7 Plagiarism & Source Code Similarity Scanner (Pairwise N-Gram Shingling)
   - 2.8 Scheduled Live & Flexible Window Examination Engine (MCQ, True/False, Coding)
   - 2.9 Class Health Dashboard & Automated Learner Warning System (Yellow/Red Risk Flags)
   - 2.10 Inline Code Review, Grading Approval & Line-Level Feedback System
   - 2.11 Competitive Gamified Leaderboard & Streak Multiplier
   - 2.12 Categorized Practice Problem Bank & Solution Vault
   - 2.13 Peer-to-Peer Learning Resource Sharing & Moderation Workflow
   - 2.14 Scoped Classroom Group Chat & Direct Private Messaging (DM)
   - 2.15 User Identity, 90-Day Contribution Heatmap & Personal Task To-Do Manager
3. **Chapter 3: Incomplete Features & Engineering Challenges**
   - 3.1 Initial Proposal Commitments vs. Final Delivery
   - 3.2 Automated Payment Gateway Integration (SSLCommerz / bKash Direct API)
   - 3.3 Abstract Syntax Tree (AST) & MOSS-Grade Plagiarism Analysis
   - 3.4 S3 / Cloudinary Distributed Object Storage for Binary Submissions
   - 3.5 AI-Assisted Subjective Open-Ended Text Question Grading
4. **Chapter 4: Project Structure & Database Schema**
   - 4.1 Relational Architecture & Normalization (3NF)
   - 4.2 Comprehensive Database Schema (All 29 MySQL Tables Export)
   - 4.3 Key Indexes, Composite Uniques, and Referential Cascades
5. **Chapter 5: Technical Stack & Deployment Infrastructure**
6. **Chapter 6: Video Demonstration & Multi-User Testing Guide**
7. **Chapter 7: Conclusion & Future Work**

---

# Chapter 1: Introduction

### 1.1 Problem Statement
The rise of online education has opened the door for anyone to teach and learn. From university professors and school teachers to independent instructors, coding mentors, and subject matter experts. However, managing an online course remains a fragmented and inefficient experience. Instructors rely on a patchwork of disconnected tools like messaging apps for communication, cloud storage for assignment collection, spreadsheets for grade tracking, and manual methods for attendance which leads to error, miscommunication, and significant administrative overhead.

Learners, on the other hand, have no single place to view their assignments, track deadlines, submit work, receive instructor feedback, and monitor their own academic growth. Whether a student is enrolled in a university programming course, a private coding bootcamp, a freelance tutoring session, or a self-organized study group, the experience of managing their coursework is equally disorganized.

ClassSync addresses this gap by providing a comprehensive, multi-tenant online classroom management platform designed for anyone who wants to teach and anyone who wants to learn. Any instructor, regardless of institutional affiliation, can register, create a virtual classroom, and begin managing their course within minutes. Just as instructors can set up a classroom within minutes, students can join multiple classrooms from different instructors using a simple Room Number and Password, making the platform equally effortless for both sides and flexible enough for university courses, private tutoring, online bootcamps, and community learning groups alike.

### 1.2 Motivation
The motivation behind ClassSync arose from observing the practical challenges faced in a programming bootcamp. Key pain points identified include:
- Instructors were manually checking submissions scattered across multiple platforms, with no single place to review them.
- There was no centralized way to view a learner's overall progress or provide structured, consistent feedback.
- Difficulty in organizing DSA practice problems with progress tracking.
- Grading lacked transparency. Instructors had no way to leave inline, line-by-line comments on a learner's code, so feedback stayed vague, delayed, and disconnected from the actual submission.
- Attendance tracking relied on manual methods on spreadsheets.

By building ClassSync, we aim to create a scalable solution that any teacher can adopt to run a structured, accountable, and engaging classroom environment.

### 1.3 Objectives
The primary objectives of ClassSync are to build a platform that serves any instructor who could be university teacher, private tutor, or online mentor and any learner, regardless of their institutional background:
- Allow any instructor to register, create a classroom, and generate a unique Room Number and Password for student enrollment.
- Enable learners to register once and join multiple classrooms using Room credentials.
- Provide a structured homework assignment system with task-level submission tracking.
- Implement a code submission portal where students can upload or test their code and also pdf files for other kinds of homeworks.
- Build a grading system with inline code review, score assignment, and written feedback.
- Track problem-solving progress per student per category.
- Maintain attendance records per session automatically.
- Generate leaderboards based on homework scores with streak tracking.
- Send in-app notifications for grades, deadlines, teacher alerts, announcements.

---

# Chapter 2: Implemented Features & Database Queries

Every single module implemented in ClassSync was constructed around relational database modeling principles in MySQL, utilizing multi-table joins, subqueries, and transactional operations. Below is the comprehensive breakdown of each feature and its underlying SQL operations.

---

### 2.1 Multi-Tenant Classroom Creation & Contextual Role Management
Users can create, customize, and archive classrooms. Each classroom generates a unique room number and password. The system supports public/private visibility and contextual role determination (a user can be an instructor in one room and a learner in another).

The database operations involve `INSERT` statements to create new classrooms and initialize the creator with the `'instructor'` role in the membership table. A multi-table `SELECT` with `INNER JOIN` operations and correlated subqueries retrieves classrooms, creator metadata, and active learner alert states. `UPDATE` statements manage room settings and active status. The primary tables are `classrooms`, `classroom_members`, and `users`.

Implementation resides in `src/controllers/classroomController.js`, `src/routes/classroomRoutes.js`, and `public/js/classroom.js`.

---

### 2.2 Paid Classroom Enrollment with Payment Verification Workflow
Instructors can designate classrooms as paid courses with a specified enrollment fee in BDT. Prospective students submit payment credentials including payment gateway method, sender phone number, and transaction ID. Instructors and TAs review and approve or reject enrollment requests.

The database operations involve `INSERT` statements to record pending payment submissions in the enrollment requests table, `SELECT` queries with `INNER JOIN` on `users` and a `LEFT JOIN` on reviewer profiles to list pending requests, and `UPDATE` statements upon approval that update request status and insert the student into `classroom_members` as a `'learner'`. The primary tables are `enrollment_requests`, `classroom_members`, `users`, and `classrooms`.

Implementation resides in `src/controllers/classroomController.js`, `src/routes/classroomRoutes.js`, and `public/js/classroom.js`.

---

### 2.3 Homework Assignment & Task Formulation
Instructors can create, edit, publish or unpublish, and archive homework sets. Each homework set contains individual tasks or questions that support text prompts, code challenges with starter code templates, or uploaded document formats. Deadlines are configured per homework with automatic late submission detection.

The database operations involve `INSERT` statements to add homework sets and questions, `SELECT` statements with subqueries joining `questions` and `submissions` to count total tasks and student submission progress, and `UPDATE` statements to modify homework properties, publication state, or active status. The primary tables are `homework`, `questions`, and `users`.

Implementation resides in `src/controllers/homeworkController.js`, `src/routes/homeworkRoutes.js`, `public/js/classroom.js`, and `public/js/homework.js`.

---

### 2.4 Multi-Language Automated Code Evaluation Engine
Learners can write, test, and submit source code directly inside an in-browser code editor supporting 13 programming languages (Python, C, C++, Java, JavaScript, TypeScript, C#, Go, Rust, Ruby, PHP, Kotlin, Swift). Code is compiled and evaluated remotely using Piston API against instructor-defined public and hidden test cases.

The database operations involve `SELECT` queries retrieving all test cases ordered by sequence, `UPDATE` queries updating submission records with execution outcome, earned points, execution timestamps, and raw JSON evaluation output, and `INSERT` or `UPDATE` statements on `grades` setting auto-evaluated scores with `'auto_pending'` approval status. The primary tables are `questions`, `test_cases`, `submissions`, and `grades`.

Implementation resides in `src/controllers/autoEvalController.js`, `src/routes/autoEvalRoutes.js`, `src/utils/pistonApi.js`, and `public/js/homework.js`.

---

### 2.5 Codeforces-Style Submission Matrix & Progress Tracking
Instructors and TAs have access to an aggregated 2D submission pivot matrix rendering students along one axis and assignment tasks along the other. Matrix cells are color-coded to distinguish on-time submissions, late submissions, and missing tasks with direct links to student work.

The database operations involve multi-table `SELECT` statements utilizing `JOIN` operations across `submissions`, `questions`, `homework`, and `grades`, filtered by classroom ID. Grouping and mapping logic correlates student records against each task cell. The primary tables are `classroom_members`, `users`, `questions`, `submissions`, and `grades`.

Implementation resides in `src/controllers/submissionController.js`, `src/routes/submissionRoutes.js`, and `public/js/classroom.js`.

---

### 2.6 Interactive Live Video Classes & Automated Attendance
Instructors can schedule and launch live video classrooms powered by embedded Jitsi Meet without leaving the platform. The system tracks each participant's connection join and leave times, automatically computing total duration and marking attendance based on the classroom's threshold percentage (default 75%). Instructors can manually override attendance records.

The database operations involve `INSERT` statements to schedule sessions and record join/leave timestamps, `SELECT` queries joining `live_sessions` and `classrooms` to compare attended duration against session length and attendance threshold rules, and `UPDATE` statements for manual instructor overrides with justification notes. The primary tables are `live_sessions`, `attendance`, `classrooms`, and `users`.

Implementation resides in `src/controllers/liveSessionController.js`, `src/routes/liveSessionRoutes.js`, and `public/js/live.js`.

---

### 2.7 Plagiarism & Source Code Similarity Scanner
The system provides automated pairwise source code similarity scanning across student submissions for any given coding assignment. The scanner uses token canonicalization, comment and literal stripping, and n-gram shingling to compute Jaccard similarity percentages, highlighting matching code side-by-side.

The database operations involve `SELECT` statements retrieving all non-empty text and code submissions for an assignment, `DELETE` statements with multi-table joins to purge obsolete comparison flags, `INSERT` statements to record detected matching pairs with similarity scores, and a complex 7-way `SELECT` query joining `plagiarism_flags`, two instances of `submissions`, two instances of `users`, `questions`, and `homework` to render side-by-side diff comparisons. The primary tables are `plagiarism_flags`, `submissions`, `questions`, `homework`, and `users`.

Implementation resides in `src/controllers/plagiarismController.js`, `src/routes/plagiarismRoutes.js`, and `public/js/classroom.js`.

---

### 2.8 Scheduled Live & Flexible Window Examination Engine
Instructors can create and publish timed quizzes and comprehensive exams supporting Scheduled Live modes (synchronized start and hard deadlines) and Flexible Window modes. The engine supports Multiple Choice (MCQ), True/False, and Automated Coding questions with real-time countdown timers and auto-submission on expiry.

The database operations involve `INSERT` statements creating quiz entries, questions, MCQ options, and student attempt records, `SELECT` queries joining `quiz_answers`, `quiz_options`, and `quiz_questions` to calculate marks automatically for objective questions, and `UPDATE` statements updating attempt status, submitted timestamp, and total marks. The primary tables are `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers`, and `quiz_test_cases`.

Implementation resides in `src/controllers/quizController.js`, `src/routes/quizRoutes.js`, and `public/js/classroom.js`.

---

### 2.9 Class Health Dashboard & Automated Learner Warning System
Instructors have access to high-level diagnostic analytics summarizing classroom performance including average grades, homework completion rates, overall attendance percentages, and inactive student indicators. Instructors can issue formal Yellow (warning) or Red (critical risk) alerts that appear prominently on the student's dashboard.

The database operations involve aggregate `SELECT` queries using `COUNT`, `SUM`, `AVG`, and `CASE` expressions joining `submissions`, `attendance`, `live_sessions`, and `grades`, as well as `INSERT` statements into `learner_alerts` and correlated subqueries tracking unresolved alert counts per learner. The primary tables are `learner_alerts`, `classroom_members`, `users`, `submissions`, `grades`, and `attendance`.

Implementation resides in `src/controllers/analyticsController.js`, `src/controllers/alertController.js`, `src/routes/analyticsRoutes.js`, and `src/routes/alertRoutes.js`.

---

### 2.10 Inline Code Review, Grading Approval & Line-Level Feedback
Instructors and TAs can review submitted source code, highlight specific line ranges, and attach line-level comments, warnings, or correction notes. In addition, teachers can review auto-evaluated grades, override scores with custom points, and publish final marks to students.

The database operations involve `INSERT` statements to store line-range review comments, `SELECT` queries with multi-table `JOIN` operations across `submissions`, `questions`, `homework`, `users`, and `grades` to populate a consolidated grading review panel, and `UPDATE` queries on `grades` to approve draft auto-scores or record instructor manual overrides. The primary tables are `code_reviews`, `grades`, `submissions`, and `users`.

Implementation resides in `src/controllers/gradeController.js`, `src/controllers/autoEvalController.js`, `src/routes/gradeRoutes.js`, and `public/js/homework.js`.

---

### 2.11 Competitive Gamified Leaderboard & Streak Multiplier
The platform fosters engagement by ranking enrolled students based on cumulative scores achieved across homework assignments and quizzes. A streak tracking counter increments whenever a student receives full marks on consecutive submissions, awarding flame badge indicators next to their profile.

The database operations involve aggregate `SELECT` queries joining `submissions`, `questions`, `homework`, and `grades` with `SUM(g.score)` grouped by learner and ordered descending, alongside sequential verification queries that check consecutive assignment submissions for full-point status. The primary tables are `grades`, `submissions`, `questions`, and `homework`.

Implementation resides in `src/controllers/analyticsController.js`, `src/routes/analyticsRoutes.js`, and `public/js/leaderboard.js`.

---

### 2.12 Categorized Practice Problem Bank & Solution Vault
Instructors can curate a repository of standalone practice exercises organized by algorithmic domain (e.g., Arrays, Trees, Dynamic Programming) and difficulty rating (`easy`, `medium`, `hard`). Instructors can publish official sample solutions visible to learners.

The database operations involve `INSERT` statements to add practice problems and corresponding solutions, `SELECT` statements with `LEFT JOIN` on `problem_answers` and `users` to display problem sets alongside author metadata and solution attachments, and `UPDATE` statements to modify problem descriptions or active states. The primary tables are `problems`, `problem_answers`, and `users`.

Implementation resides in `src/controllers/problemController.js`, `src/routes/problemRoutes.js`, and `public/js/problems.js`.

---

### 2.13 Peer-to-Peer Learning Resource Sharing & Moderation Workflow
Students and instructors can share study materials, reference links, lecture notes, and documentation. Student-submitted resources remain hidden until an instructor or TA reviews and approves them, ensuring quality and academic relevance.

The database operations involve `INSERT` statements to upload resource links or documents, `SELECT` queries joining `resources` and `users` with conditional filters for approval status or ownership, and `UPDATE` statements executed by instructors to set `is_approved = true` with approver metadata. The primary tables are `resources` and `users`.

Implementation resides in `src/controllers/resourceController.js`, `src/routes/resourceRoutes.js`, and `public/js/classroom.js`.

---

### 2.14 Scoped Classroom Group Chat & Direct Private Messaging
Members can participate in persistent, classroom-scoped group discussions for announcements and questions. Additionally, students and instructors can initiate 1-on-1 private direct messaging threads with unread message badges.

The database operations involve `INSERT` statements into `classroom_messages` and `direct_messages`, `SELECT` queries joining message tables with `users` and `classroom_members` to retrieve sender identities and classroom roles, and `UPDATE` statements to mark private direct messages as read. The primary tables are `classroom_messages`, `direct_messages`, `users`, and `classroom_members`.

Implementation resides in `src/controllers/messageController.js`, `src/routes/messageRoutes.js`, and `public/js/classroom.js`.

---

### 2.15 User Identity, 90-Day Contribution Heatmap & Personal Task To-Do Manager
Users maintain customized profiles with profile photos, bios, social links (GitHub, LinkedIn, Website), and password reset capabilities. The dashboard includes a GitHub-style 90-day submission heatmap reflecting daily activity, as well as a personal To-Do list with time deadlines and automatic reminders.

The database operations involve `SELECT` queries aggregating submissions grouped by `DATE(submitted_at)` across a 90-day sliding window, `INSERT`, `UPDATE`, and `DELETE` queries on `user_todos` for task management, and background scheduled checks updating task reminder flags and generating in-app notifications. The primary tables are `users`, `user_todos`, `submissions`, and `notifications`.

Implementation resides in `src/controllers/userController.js`, `src/controllers/dashboardController.js`, `src/routes/userRoutes.js`, and `public/js/index.js`.

---

# Chapter 3: Incomplete Features & Engineering Challenges

In software engineering, real-world development often runs into architectural, infrastructure, and timeline constraints. This chapter highlights the features originally scoped in our project proposal that could not be fully integrated into the final release, along with detailed explanations of the engineering difficulties faced.

---

### 3.1 Automated Payment Gateway Integration (SSLCommerz / bKash Direct API)
* **Initial Proposal Goal:** To implement a fully automated checkout flow where learners pay for paid classrooms via automated bKash/Nagad/Cards and are instantly enrolled via instant IPN (Instant Payment Notification) webhooks.
* **Current Status in Final Delivery:** Manual transaction submission (`enrollment_requests`) where students provide their transaction ID and phone number, and the instructor verifies and approves them manually.
* **Reason / Challenges Faced:**
  1. **Merchant Verification Requirements:** Bangladeshi payment aggregators (SSLCommerz, bKash Merchant API, Shurjopay) require valid trade licenses, TIN certificates, and business bank accounts for sandbox-to-production authorization. As a student lab project, obtaining live merchant API keys was legally and practically unfeasible.
  2. **Webhook IP Routing on Localhost:** Testing IPN webhooks requires a publicly accessible static IP or tunneling tools (like ngrok) which frequently timeout or change domains across development sessions.
  3. **Architectural Workaround:** We architected an atomic two-step approval table (`enrollment_requests`) that captures payer metadata, preserves transaction records, and allows the instructor to grant access with a single click.

---

### 3.2 Abstract Syntax Tree (AST) & MOSS-Grade Plagiarism Analysis
* **Initial Proposal Goal:** To implement an industry-grade source code plagiarism detector utilizing Stanford MOSS (Measure of Software Similarity) or Abstract Syntax Tree (AST) parsing capable of detecting algorithmic plagiarism regardless of variable renaming, function inlining, or loop transformations.
* **Current Status in Final Delivery:** Token canonicalization with n-gram shingling and Jaccard similarity index comparison (`plagiarismController.js`).
* **Reason / Challenges Faced:**
  1. **Multi-Language Grammar Compilers:** Parsing ASTs requires dedicated language parsers (e.g., Babel for JavaScript, Clang/Tree-sitter for C++, AST module for Python). Integrating and maintaining 13 language parsers in a lightweight Node.js container proved exceedingly resource-intensive.
  2. **Computational Complexity ($O(N^2)$ Pairwise Scaling):** Generating AST graphs and running subgraph isomorphism algorithms on dozens of student submissions causes severe memory spikes and latency on serverless/micro-tier instances.
  3. **Delivered Solution:** We implemented an advanced token-based canonicalizer that replaces variable names with unified identifier tokens (`IDENTIFIER_0`, `IDENTIFIER_1`), strips string literals and comments, and computes 3-gram shingles. This effectively catches copy-paste plagiarism while running in sub-second response times.

---

### 3.3 S3 / Cloudinary Distributed Object Storage for Binary Submissions
* **Initial Proposal Goal:** Offload all student PDF, DOCX, and image file uploads to cloud object storage (Amazon S3 or Cloudinary) with signed URLs.
* **Current Status in Final Delivery:** Local disk storage in `public/uploads` with fallback to Base64 Data URIs (`uploadController.js`).
* **Reason / Challenges Faced:**
  1. **Deployment Ephemeral Filesystem Limitation:** When deploying the frontend/backend to serverless environments (like Vercel), the filesystem is strictly read-only and ephemeral. Local file writes do not persist across function invocations.
  2. **Fallback Implementation:** To ensure the system still runs during evaluations, we added a try-catch fallback that converts uploaded files into base64 Data URIs when disk writes fail. However, large files (>5 MB) can strain JSON payload limits and MySQL column sizes (`mediumtext`/`longtext`).
  3. **Future Roadmap:** Migrating to AWS S3 SDK using Pre-Signed Upload URLs.

---

### 3.4 AI-Assisted Subjective Open-Ended Text Question Grading
* **Initial Proposal Goal:** Using Large Language Model (LLM) APIs (such as OpenAI or Google Gemini) to automatically grade theoretical and conceptual homework answers against the instructor's rubric.
* **Current Status in Final Delivery:** Coding questions are automatically graded via Piston API test cases; theoretical and text submissions require manual instructor grading.
* **Reason / Challenges Faced:**
  1. **API Cost & Quota Constraints:** Free-tier AI API keys enforce strict rate limits (RPM/TPM), which fail when a classroom of 40 students submits assignments simultaneously.
  2. **Hallucination & Grading Fairness:** In academic environments, grading requires strict deterministic criteria. Without fine-tuning, zero-shot LLM evaluations exhibited variance and inconsistency across identical answers.
  3. **Delivered Solution:** Instructors can view student text side-by-side with the uploaded answer key (`homework_answers`) and assign marks with manual overrides.

---

# Chapter 4: Project Structure & Database Schema

### 4.1 Relational Architecture & Normalization (3NF)
ClassSync is built upon a fully normalized relational schema designed up to the **Third Normal Form (3NF)**:
1. **First Normal Form (1NF):** All tables have atomic values; repeating groups have been eliminated into separate relational tables (e.g., `test_cases`, `quiz_options`, `classroom_members`).
2. **Second Normal Form (2NF):** Every non-key attribute is fully functionally dependent on the primary key. In junction tables like `classroom_members(member_id)` and `quiz_answers(answer_id)`, surrogate primary keys eliminate partial dependencies.
3. **Third Normal Form (3NF):** All transitive dependencies have been removed. User profile data is stored exclusively in `users`, and referenced elsewhere strictly via `user_id`.

---

### 4.2 Comprehensive Database Schema (All 29 MySQL Tables)
Below is the complete, production-verified DDL export of the ClassSync database (`schema.sql`):

```sql
-- =============================================================================
-- ClassSync — Complete Normalized Database Schema (29 Relational Tables)
-- =============================================================================

DROP TABLE IF EXISTS `user_todos`;
DROP TABLE IF EXISTS `quiz_answers`;
DROP TABLE IF EXISTS `quiz_attempts`;
DROP TABLE IF EXISTS `quiz_test_cases`;
DROP TABLE IF EXISTS `quiz_options`;
DROP TABLE IF EXISTS `quiz_questions`;
DROP TABLE IF EXISTS `quizzes`;
DROP TABLE IF EXISTS `plagiarism_flags`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `live_sessions`;
DROP TABLE IF EXISTS `learner_alerts`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `resources`;
DROP TABLE IF EXISTS `problem_answers`;
DROP TABLE IF EXISTS `problems`;
DROP TABLE IF EXISTS `homework_answers`;
DROP TABLE IF EXISTS `code_reviews`;
DROP TABLE IF EXISTS `grades`;
DROP TABLE IF EXISTS `submissions`;
DROP TABLE IF EXISTS `test_cases`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `homework`;
DROP TABLE IF EXISTS `enrollment_requests`;
DROP TABLE IF EXISTS `classroom_messages`;
DROP TABLE IF EXISTS `direct_messages`;
DROP TABLE IF EXISTS `classroom_members`;
DROP TABLE IF EXISTS `classrooms`;
DROP TABLE IF EXISTS `password_reset_otp`;
DROP TABLE IF EXISTS `users`;

-- 1. USERS TABLE
CREATE TABLE `users` (
  `user_id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `profile_picture_url` mediumtext NULL,
  `phone_number` varchar(20) NULL,
  `bio` text NULL,
  `github_link` varchar(255) NULL,
  `linkedin_link` varchar(255) NULL,
  `website_link` varchar(255) NULL,
  `is_verified` boolean DEFAULT false,
  `is_active` boolean DEFAULT true,
  `last_login` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. PASSWORD RESET & VERIFICATION OTP
CREATE TABLE `password_reset_otp` (
  `otp_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NULL,
  `otp_code` varchar(6) NOT NULL,
  `otp_purpose` varchar(50) NOT NULL DEFAULT 'password_reset',
  `expires_at` timestamp NOT NULL,
  `is_used` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);

-- 3. CLASSROOMS TABLE
CREATE TABLE `classrooms` (
  `classroom_id` int PRIMARY KEY AUTO_INCREMENT,
  `creator_id` int NOT NULL,
  `room_number` varchar(50) UNIQUE NOT NULL,
  `room_password` varchar(255) NOT NULL,
  `classroom_name` varchar(100) NOT NULL,
  `description` text,
  `visibility` enum('public','private') NOT NULL DEFAULT 'private',
  `is_paid` boolean DEFAULT false,
  `price` decimal(10,2) NULL,
  `cover_photo_url` longtext NULL,
  `attendance_threshold_percent` int DEFAULT 75,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`)
);

-- 4. CLASSROOM MEMBERS (JUNCTION)
CREATE TABLE `classroom_members` (
  `member_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `classroom_id` int NOT NULL,
  `role` enum('instructor','TA','learner') NOT NULL DEFAULT 'learner',
  `is_active` boolean DEFAULT true,
  `joined_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`)
);

-- 5. PAID ENROLLMENT REQUESTS
CREATE TABLE `enrollment_requests` (
  `request_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `user_id` int NOT NULL,
  `payment_method` varchar(50),
  `payer_phone_number` varchar(20),
  `transaction_id` varchar(100),
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requested_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` int NULL,
  `reviewed_at` timestamp NULL,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`classroom_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL
);

-- 6. CLASSROOM GROUP CHAT
CREATE TABLE `classroom_messages` (
  `message_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_text` text NOT NULL,
  `sent_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`classroom_id`),
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`)
);

-- 7. DIRECT PRIVATE MESSAGES (DM)
CREATE TABLE `direct_messages` (
  `message_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `message_text` text NOT NULL,
  `sent_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `is_read` boolean DEFAULT false,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`classroom_id`),
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`),
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`user_id`)
);

-- 8. HOMEWORK SETS
CREATE TABLE `homework` (
  `homework_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `total_points` int DEFAULT 100,
  `created_by` int NOT NULL,
  `deadline` timestamp NULL,
  `is_published` boolean DEFAULT false,
  `published_at` timestamp NULL,
  `deadline_reminder_sent` boolean DEFAULT false,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
);

-- 9. HOMEWORK QUESTIONS
CREATE TABLE `questions` (
  `question_id` int PRIMARY KEY AUTO_INCREMENT,
  `homework_id` int NOT NULL,
  `question_type` varchar(50) NOT NULL DEFAULT 'text',
  `question_text` text NOT NULL,
  `question_data` longtext,
  `points` int DEFAULT 10,
  `order_number` int DEFAULT 0,
  `is_coding_question` boolean DEFAULT false,
  `coding_language` varchar(50) DEFAULT 'python',
  `coding_language_version` varchar(50) DEFAULT NULL,
  `time_limit_seconds` decimal(4,2) DEFAULT 2.00,
  `memory_limit_mb` int DEFAULT 128,
  `starter_code` text DEFAULT NULL,
  `required_function_signature` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`homework_id`) REFERENCES `homework` (`homework_id`)
);

-- 10. TEST CASES (PUBLIC & HIDDEN)
CREATE TABLE `test_cases` (
  `test_case_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `input_data` text,
  `expected_output` text NOT NULL,
  `is_hidden` boolean DEFAULT false,
  `points` int DEFAULT 1,
  `order_number` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE
);

-- 11. SUBMISSIONS TABLE
CREATE TABLE `submissions` (
  `submission_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `learner_id` int NOT NULL,
  `submission_type` enum('text','link','pdf','docx','pptx') NOT NULL DEFAULT 'text',
  `code_hash` varchar(255) NOT NULL,
  `code_content` text,
  `file_url` longtext,
  `submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `is_late` boolean DEFAULT false,
  `minutes_late` int DEFAULT 0,
  `penalty_applied` int DEFAULT 0,
  `is_final` boolean DEFAULT true,
  `submission_metadata` json,
  `auto_eval_status` enum('none','pending','done','error') DEFAULT 'none',
  `auto_eval_score` decimal(5,2) DEFAULT NULL,
  `auto_eval_results` json DEFAULT NULL,
  `auto_eval_at` timestamp NULL DEFAULT NULL,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`)
);

-- 12. GRADES TABLE
CREATE TABLE `grades` (
  `grade_id` int PRIMARY KEY AUTO_INCREMENT,
  `submission_id` int UNIQUE NOT NULL,
  `instructor_id` int NOT NULL,
  `score` decimal(5,2),
  `feedback` text,
  `status` varchar(50) DEFAULT 'Accepted',
  `graded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_draft` boolean DEFAULT false,
  `approval_status` enum('none','auto_pending','approved','manual') DEFAULT 'none',
  `auto_score` decimal(5,2) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`)
);

-- 13. INLINE CODE REVIEWS
CREATE TABLE `code_reviews` (
  `review_id` int PRIMARY KEY AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `line_start` int NOT NULL,
  `line_end` int NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_resolved` boolean DEFAULT false,
  FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`)
);

-- 14. INSTRUCTOR HOMEWORK ANSWER KEYS
CREATE TABLE `homework_answers` (
  `answer_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int UNIQUE NOT NULL,
  `instructor_id` int NOT NULL,
  `answer_text` text,
  `answer_file_url` longtext,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`)
);

-- 15. PROBLEM BANK
CREATE TABLE `problems` (
  `problem_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `category` varchar(100) NOT NULL,
  `problem_title` varchar(200) NOT NULL,
  `problem_description` text NOT NULL,
  `difficulty` enum('easy','medium','hard') DEFAULT 'medium',
  `created_by` int NOT NULL,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
);

-- 16. PROBLEM SOLUTIONS
CREATE TABLE `problem_answers` (
  `problem_answer_id` int PRIMARY KEY AUTO_INCREMENT,
  `problem_id` int UNIQUE NOT NULL,
  `instructor_id` int NOT NULL,
  `solution_text` text,
  `solution_file_url` longtext,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`problem_id`) REFERENCES `problems` (`problem_id`),
  FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`)
);

-- 17. SHARED RESOURCES
CREATE TABLE `resources` (
  `resource_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `resource_title` varchar(200) NOT NULL,
  `resource_url` longtext NOT NULL,
  `resource_description` text,
  `resource_type` varchar(50) NOT NULL DEFAULT 'link',
  `is_approved` boolean DEFAULT false,
  `approved_by` int,
  `approved_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`)
);

-- 18. NOTIFICATIONS TABLE
CREATE TABLE `notifications` (
  `notification_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `link_url` varchar(500),
  `is_read` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
);

-- 19. LEARNER RISK WARNING ALERTS
CREATE TABLE `learner_alerts` (
  `alert_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `learner_id` int NOT NULL,
  `instructor_id` int NOT NULL,
  `alert_type` enum('yellow','red') NOT NULL,
  `alert_message` text NOT NULL,
  `is_resolved` boolean DEFAULT false,
  `resolved_at` timestamp NULL,
  `resolved_by` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`),
  FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`),
  FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`)
);

-- 20. LIVE JITSI SESSIONS
CREATE TABLE `live_sessions` (
  `session_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `session_title` varchar(200) NOT NULL,
  `session_description` text,
  `scheduled_time` timestamp NOT NULL,
  `expected_duration` int DEFAULT 60,
  `jitsi_room_id` varchar(100) UNIQUE NOT NULL,
  `created_by` int NOT NULL,
  `is_active` boolean DEFAULT true,
  `started_at` timestamp NULL,
  `ended_at` timestamp NULL,
  `recording_url` varchar(500),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
);

-- 21. ATTENDANCE TRACKING TABLE
CREATE TABLE `attendance` (
  `attendance_id` int PRIMARY KEY AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `learner_id` int NOT NULL,
  `join_time` timestamp NULL,
  `leave_time` timestamp NULL,
  `duration_minutes` int DEFAULT 0,
  `is_present` boolean DEFAULT false,
  `instructor_override` boolean DEFAULT false,
  `override_present` boolean DEFAULT false,
  `override_reason` varchar(255),
  `marked_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `live_sessions` (`session_id`),
  FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`)
);

-- 22. PLAGIARISM FLAGS TABLE
CREATE TABLE `plagiarism_flags` (
  `flag_id` int PRIMARY KEY AUTO_INCREMENT,
  `submission_id_1` int NOT NULL,
  `submission_id_2` int NOT NULL,
  `similarity_score` decimal(5,2),
  `flagged_by` int NOT NULL,
  `is_reviewed` boolean DEFAULT false,
  `reviewed_by` int,
  `reviewed_at` timestamp NULL,
  `review_notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`submission_id_1`) REFERENCES `submissions` (`submission_id`),
  FOREIGN KEY (`submission_id_2`) REFERENCES `submissions` (`submission_id`),
  FOREIGN KEY (`flagged_by`) REFERENCES `users` (`user_id`),
  FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_submission_order` CHECK (`submission_id_1` < `submission_id_2`)
);

-- 23. PERSONAL USER TO-DOS
CREATE TABLE `user_todos` (
  `todo_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `due_date` date NULL,
  `due_time` time NULL,
  `completed` boolean DEFAULT false,
  `reminder_sent` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);

-- 24. QUIZZES & EXAMS TABLE
CREATE TABLE `quizzes` (
  `quiz_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `created_by` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `quiz_type` enum('live','flexible') NOT NULL DEFAULT 'flexible',
  `duration_minutes` int NOT NULL DEFAULT 15,
  `start_time` datetime NULL,
  `end_time` datetime NULL,
  `total_marks` int DEFAULT 0,
  `is_published` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);

-- 25. QUIZ QUESTIONS
CREATE TABLE `quiz_questions` (
  `question_id` int PRIMARY KEY AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('mcq','true_false','short_answer','coding') NOT NULL DEFAULT 'mcq',
  `coding_language` varchar(50) DEFAULT 'python',
  `starter_code` text NULL,
  `points` int DEFAULT 5,
  `order_number` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE
);

-- 26. QUIZ OPTIONS (MCQ)
CREATE TABLE `quiz_options` (
  `option_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_text` varchar(500) NOT NULL,
  `is_correct` boolean DEFAULT false,
  FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`question_id`) ON DELETE CASCADE
);

-- 27. QUIZ CODING TEST CASES
CREATE TABLE `quiz_test_cases` (
  `test_case_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `input_data` text NULL,
  `expected_output` text NOT NULL,
  `points` int DEFAULT 1,
  FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`question_id`) ON DELETE CASCADE
);

-- 28. QUIZ STUDENT ATTEMPTS
CREATE TABLE `quiz_attempts` (
  `attempt_id` int PRIMARY KEY AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `learner_id` int NOT NULL,
  `started_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` timestamp NULL,
  `status` enum('in_progress','submitted','time_expired') DEFAULT 'in_progress',
  `approval_status` enum('approved','pending') DEFAULT 'approved',
  `total_score` decimal(5,2) DEFAULT 0.00,
  FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`quiz_id`) ON DELETE CASCADE,
  FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);

-- 29. QUIZ ANSWERS SUBMITTED
CREATE TABLE `quiz_answers` (
  `answer_id` int PRIMARY KEY AUTO_INCREMENT,
  `attempt_id` int NOT NULL,
  `question_id` int NOT NULL,
  `selected_option_id` int NULL,
  `answer_text` text NULL,
  `is_correct` boolean NULL,
  `marks_awarded` decimal(5,2) DEFAULT 0.00,
  FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`attempt_id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`question_id`) ON DELETE CASCADE,
  FOREIGN KEY (`selected_option_id`) REFERENCES `quiz_options` (`option_id`) ON DELETE SET NULL
);

-- UNIQUE COMPOSITE INDEXES
CREATE UNIQUE INDEX `classroom_members_index_0` ON `classroom_members` (`user_id`, `classroom_id`);
CREATE UNIQUE INDEX `submissions_index_1` ON `submissions` (`question_id`, `learner_id`);
CREATE UNIQUE INDEX `attendance_index_2` ON `attendance` (`session_id`, `learner_id`);
CREATE UNIQUE INDEX `plagiarism_flags_index_3` ON `plagiarism_flags` (`submission_id_1`, `submission_id_2`);
CREATE UNIQUE INDEX `quiz_attempts_index_4` ON `quiz_attempts` (`quiz_id`, `learner_id`);
```

---

# Chapter 5: Technical Stack & Deployment Infrastructure

| Layer | Technology | Engineering Role & Rationale |
|---|---|---|
| **Backend Framework** | Node.js + Express.js (v4) | Asynchronous, non-blocking REST API server architecture with custom modular routing. |
| **Relational Database** | MySQL (8.0+) / TiDB Cloud | Relational database enforcing strict foreign-key integrity, multi-table joins, and dual-write resilience. |
| **Driver & Pooling** | `mysql2/promise` | Connection pooling with async/await promise wrappers preventing connection exhaustion. |
| **Authentication** | JWT (`jsonwebtoken`) + `bcrypt` | Stateless token verification with salted password hashing (10 salt rounds) and role-based access control. |
| **Code Runner Engine** | Piston Remote API Engine | Sandbox remote code compiler and execution environment supporting 13 languages with STDIN test cases. |
| **Email Transporter** | Nodemailer (Gmail SMTP) | Transactional email delivery service for 6-digit OTP verification during registration and password reset. |
| **Video Conferencing** | Embedded Jitsi Meet Web API | WebRTC peer-to-peer and SFU video conferencing embedded inside the client dashboard. |
| **Frontend UI** | HTML5, Vanilla JavaScript, CSS3 | Single-page responsive web dashboard utilizing CSS Glassmorphism, CSS variables, and dynamic DOM manipulation. |
| **Cloud Deployment** | Vercel (Frontend) + TiDB / Local MySQL | Serverless edge deployment for the frontend connected to distributed MySQL-compatible database engines. |

---

# Chapter 6: Video Demonstration & Multi-User Testing Guide

For the course video submission, the team has prepared a structured demonstration covering all system capabilities:

### Video Demonstration Outline:
1. **Introduction & System Architecture (0:00 - 2:00):** Overview of ClassSync, tech stack (Node.js, Express, MySQL), and relational architecture.
2. **Database & Schema Tour (2:00 - 5:00):** Walking through MySQL Workbench / phpMyAdmin, showing all 29 tables, explaining foreign-key cascades, composite indexes, and normalization.
3. **Multi-User Live Demonstration (5:00 - 15:00):**
   - **Browser Window 1 (Instructor):** Creating a classroom, publishing homework with coding questions and hidden test cases, scheduling live classes, and checking attendance overrides.
   - **Browser Window 2 (Incognito - Learner A):** Enrolling via room credentials, solving coding questions in the browser editor, executing against public test cases, and submitting.
   - **Browser Window 3 (Incognito - Learner B):** Submitting identical/similar code to trigger the Plagiarism Engine.
4. **Backend Code Walkthrough (15:00 - 20:00):**
   - Explaining the multi-table JOIN queries (Consolidated Grading 5-way join, Plagiarism 7-way join).
   - Reviewing authentication middleware and the Piston API execution runner.

---

# Chapter 7: Conclusion & Future Work

### 7.1 Summary
ClassSync successfully consolidates the disparate tools used in modern technical education into a unified, multi-tenant classroom management platform. By implementing multi-language automated code evaluation, live video sessions with automated duration-based attendance, pairwise plagiarism scanning, interactive examinations, and instructor warning alerts, the project addresses the core administrative and academic challenges of online computer science pedagogy.

### 7.2 Future Work
- **Native Mobile Applications:** Releasing dedicated iOS and Android mobile clients using Flutter or React Native.
- **Microservice Code Execution:** Transitioning from external Piston API calls to an in-house Docker/Kubernetes containerized code sandbox (Judge0 self-hosted cluster).
- **Automated Payment Gateway Integration:** Integrating production merchant APIs (SSLCommerz / bKash) for instant automated payment settlement.
- **AI-Powered Code & Subjective Review:** Incorporating LLMs to provide students with automated hints and line-by-line feedback suggestions without giving away answers.
