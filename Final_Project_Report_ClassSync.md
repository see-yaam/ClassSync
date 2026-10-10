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
- **Live Vercel Frontend Deployment:** [https://class-sync-ten.vercel.app](https://class-sync-ten.vercel.app)
- **YouTube Video Demonstration:** [https://youtu.be/YOUR_DEMO_VIDEO_LINK_HERE](https://youtu.be/YOUR_DEMO_VIDEO_LINK_HERE)

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
* **Feature Description:** Users register once and can be an Instructor in one classroom while simultaneously being a Learner or Teaching Assistant (TA) in another classroom. When an instructor creates a classroom, the system generates a distinct room number and password. Members enroll via room credentials and are bound in `classroom_members`.
* **Primary Tables:** `classrooms`, `classroom_members`, `users`
* **Underlying SQL Query:**
```sql
-- Creating a new classroom
INSERT INTO classrooms (creator_id, room_number, room_password, classroom_name, description, visibility, is_paid, price, cover_photo_url, attendance_threshold_percent)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Associating the creator as the Primary Instructor
INSERT INTO classroom_members (user_id, classroom_id, role)
VALUES (?, ?, 'instructor');

-- Fetching all classrooms belonging to a user with alert status and creator profile
SELECT c.classroom_id, c.classroom_name, c.description, c.room_number, c.room_password,
       c.visibility, c.is_paid, c.price, c.cover_photo_url,
       c.creator_id, u.full_name AS creator_name, cm.role, cm.joined_at,
       (SELECT la.alert_type FROM learner_alerts la 
        WHERE la.classroom_id = c.classroom_id AND la.learner_id = ? 
        AND la.is_resolved = false 
        ORDER BY la.created_at DESC LIMIT 1) AS active_alert_type
FROM classroom_members cm
JOIN classrooms c ON cm.classroom_id = c.classroom_id
JOIN users u ON c.creator_id = u.user_id
WHERE cm.user_id = ? AND cm.is_active = true AND c.is_active = true
ORDER BY cm.joined_at DESC;
```

---

### 2.2 Paid Classroom Enrollment with Payment Verification Workflow
* **Feature Description:** Instructors can mark courses as `Paid` with a price in BDT. Students submit payment credentials (Bkash/Nagad/Rocket phone number and Transaction ID). The request remains in `pending` status until reviewed by the instructor or TA, which either activates their enrollment or rejects it.
* **Primary Tables:** `enrollment_requests`, `classroom_members`, `users`, `classrooms`
* **Underlying SQL Query:**
```sql
-- Student submits payment transaction details
INSERT INTO enrollment_requests (classroom_id, user_id, payment_method, payer_phone_number, transaction_id, status)
VALUES (?, ?, ?, ?, ?, 'pending');

-- Instructor views pending requests with student details and previous reviewer
SELECT er.request_id, er.classroom_id, er.user_id, er.payment_method,
       er.payer_phone_number, er.transaction_id, er.status, er.requested_at,
       er.reviewed_at, u.full_name AS student_name, u.email AS student_email,
       u.profile_picture_url AS student_avatar, r.full_name AS reviewer_name
FROM enrollment_requests er
JOIN users u ON er.user_id = u.user_id
LEFT JOIN users r ON er.reviewed_by = r.user_id
WHERE er.classroom_id = ?
ORDER BY CASE er.status WHEN 'pending' THEN 1 ELSE 2 END, er.requested_at DESC;

-- On Approval: Add student as learner and update status
UPDATE enrollment_requests 
SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() 
WHERE request_id = ?;

INSERT INTO classroom_members (user_id, classroom_id, role)
VALUES (?, ?, 'learner');
```

---

### 2.3 Homework Assignment & Structured Task Formulation
* **Feature Description:** Instructors build homework sets containing multiple tasks/questions. Tasks support rich text descriptions, starter code templates, and external file link submissions. Late submissions are flagged against the assignment's deadline timestamp.
* **Primary Tables:** `homework`, `questions`, `users`
* **Underlying SQL Query:**
```sql
-- Listing homework sets with dynamic question count and user submission count
SELECT h.homework_id, h.classroom_id, h.title, h.description, h.total_points, h.deadline,
       h.created_by, h.is_published, h.published_at, h.created_at,
       u.full_name AS creator_name,
       (SELECT COUNT(*) FROM questions q WHERE q.homework_id = h.homework_id) AS question_count,
       (SELECT COUNT(DISTINCT s.question_id) FROM submissions s 
        JOIN questions q ON s.question_id = q.question_id 
        WHERE q.homework_id = h.homework_id AND s.learner_id = ?) AS submitted_count
FROM homework h
JOIN users u ON h.created_by = u.user_id
WHERE h.classroom_id = ? AND h.is_active = true;
```

---

### 2.4 Multi-Language Automated Code Evaluation Engine (Piston API Sandbox)
* **Feature Description:** Students write and submit source code directly inside an in-browser code editor across 13 programming languages (Python, C, C++, Java, JavaScript, TypeScript, C#, Go, Rust, Ruby, PHP, Kotlin, Swift). The platform sends code to the Piston execution sandbox against both Public and Hidden test cases, computing execution runtime, memory limits, and automated points.
* **Primary Tables:** `questions`, `test_cases`, `submissions`, `grades`
* **Underlying SQL Query:**
```sql
-- Retrieving all test cases for execution (Public + Hidden)
SELECT * FROM test_cases WHERE question_id = ? ORDER BY order_number ASC, test_case_id ASC;

-- Storing student submission and automated evaluation output
UPDATE submissions 
SET auto_eval_status = 'done', auto_eval_score = ?, auto_eval_results = ?, auto_eval_at = NOW()
WHERE submission_id = ?;

-- Inserting auto-grade into grades table as draft for instructor approval
INSERT INTO grades (submission_id, instructor_id, score, feedback, is_draft, auto_score, approval_status)
VALUES (?, ?, ?, ?, true, ?, 'auto_pending')
ON DUPLICATE KEY UPDATE auto_score = VALUES(auto_score), approval_status = 'auto_pending', is_draft = true;
```

---

### 2.5 Codeforces-Style Submission Matrix & Real-Time Progress Tracking
* **Feature Description:** A 2D pivot grid rendering every student on one axis and every assignment question on the other. Cells are color-coded (Green for on-time, Orange for late, Red/Gray for missing). Clicking any cell opens the submission drawer.
* **Primary Tables:** `classroom_members`, `users`, `questions`, `submissions`, `grades`
* **Underlying SQL Query:**
```sql
-- Fetching all submissions and grade statuses across all homework questions
SELECT s.submission_id, s.question_id, s.learner_id, s.submitted_at, s.is_late, s.penalty_applied,
       g.grade_id, g.score, g.feedback, g.is_draft, g.status
FROM submissions s
JOIN questions q ON s.question_id = q.question_id
JOIN homework h ON q.homework_id = h.homework_id
LEFT JOIN grades g ON s.submission_id = g.submission_id
WHERE h.classroom_id = ?;
```

---

### 2.6 Interactive Live Video Classes & Duration-Based Automated Attendance (Jitsi Meet)
* **Feature Description:** Integrated live video conferences directly inside the browser using Jitsi Meet API. Students join via single click. The backend continuously tracks connected duration; if a student attends >= 75% (or classroom threshold) of the total scheduled duration, they are automatically marked `Present`. Instructors have full manual override permissions.
* **Primary Tables:** `live_sessions`, `attendance`, `classrooms`, `users`
* **Underlying SQL Query:**
```sql
-- Automated attendance calculation comparing duration against threshold
SELECT ls.expected_duration, c.attendance_threshold_percent
FROM live_sessions ls
JOIN classrooms c ON ls.classroom_id = c.classroom_id
WHERE ls.session_id = ?;

-- Updating student attendance with duration
INSERT INTO attendance (session_id, learner_id, join_time, leave_time, duration_minutes, is_present)
VALUES (?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE 
leave_time = VALUES(leave_time), 
duration_minutes = VALUES(duration_minutes), 
is_present = VALUES(is_present);

-- Teacher Attendance Override Query
UPDATE attendance 
SET instructor_override = true, override_present = ?, override_reason = ? 
WHERE attendance_id = ?;
```

---

### 2.7 Plagiarism & Source Code Similarity Scanner (Pairwise N-Gram Shingling)
* **Feature Description:** Scans student submissions across coding assignments. Submissions undergo canonical tokenization, variable normalization, and shingling (3-gram token sequences) to calculate pairwise Jaccard similarity. Submissions with matching thresholds (>75%) are automatically flagged for instructor review with side-by-side diff viewers.
* **Primary Tables:** `plagiarism_flags`, `submissions`, `questions`, `homework`, `users`
* **Underlying SQL Query (7-Way Complex Multi-Table Join):**
```sql
SELECT pf.*,
       s1.code_content AS content_1, u1.full_name AS learner_1_name, u1.email AS learner_1_email,
       s2.code_content AS content_2, u2.full_name AS learner_2_name, u2.email AS learner_2_email,
       q.question_text, h.title AS homework_title
FROM plagiarism_flags pf
JOIN submissions s1 ON pf.submission_id_1 = s1.submission_id
JOIN submissions s2 ON pf.submission_id_2 = s2.submission_id
JOIN users u1 ON s1.learner_id = u1.user_id
JOIN users u2 ON s2.learner_id = u2.user_id
JOIN questions q ON s1.question_id = q.question_id
JOIN homework h ON q.homework_id = h.homework_id
WHERE h.classroom_id = ? AND h.is_active = true
ORDER BY pf.similarity_score DESC, pf.created_at DESC;
```

---

### 2.8 Scheduled Live & Flexible Window Examination Engine
* **Feature Description:** A complete online quiz/exam engine. Supports hard-deadline Scheduled Live Exams (opens and closes at an exact moment) and Flexible Window Exams. Includes real-time timer countdown, auto-submission on expiration, MCQ questions with automatic evaluation, True/False questions, and automated coding test case evaluations.
* **Primary Tables:** `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers`, `quiz_test_cases`
* **Underlying SQL Query:**
```sql
-- Starting an exam attempt with auto-calculated deadline
INSERT INTO quiz_attempts (quiz_id, learner_id, started_at, status)
VALUES (?, ?, NOW(), 'in_progress');

-- Evaluating MCQ answers against correct options
SELECT qa.answer_id, qa.selected_option_id, qo.is_correct, qq.points
FROM quiz_answers qa
JOIN quiz_options qo ON qa.selected_option_id = qo.option_id
JOIN quiz_questions qq ON qa.question_id = qq.question_id
WHERE qa.attempt_id = ?;

-- Updating final score upon submission
UPDATE quiz_attempts 
SET status = 'submitted', submitted_at = NOW(), total_score = ? 
WHERE attempt_id = ?;
```

---

### 2.9 Class Health Dashboard & Automated Learner Warning System (Yellow/Red Risk Flags)
* **Feature Description:** High-level dashboard aggregating classroom metrics: Class Average, Homework Completion Rate, Attendance Percentage, and submission trends. Automatically detects at-risk students (repeated missed deadlines or low attendance) and allows instructors to issue Yellow (Warning) or Red (Critical Risk) alerts directly to the student's dashboard.
* **Primary Tables:** `learner_alerts`, `classroom_members`, `users`, `submissions`, `grades`, `attendance`
* **Underlying SQL Query:**
```sql
-- At-Risk Learner Detection Query
SELECT u.user_id, u.full_name, u.email, u.profile_picture_url,
       (SELECT COUNT(*) FROM learner_alerts la 
        WHERE la.learner_id = u.user_id AND la.classroom_id = ? AND la.is_resolved = false) AS unresolved_alerts,
       (SELECT alert_type FROM learner_alerts la 
        WHERE la.learner_id = u.user_id AND la.classroom_id = ? AND la.is_resolved = false 
        ORDER BY alert_id DESC LIMIT 1) AS highest_alert
FROM classroom_members cm
JOIN users u ON cm.user_id = u.user_id
WHERE cm.classroom_id = ? AND cm.role = 'learner' AND cm.is_active = true;

-- Class Overall Attendance Aggregate
SELECT COUNT(*) AS total_records,
       SUM(CASE WHEN a.is_present = true OR 
           (a.instructor_override = true AND a.override_present = true) THEN 1 ELSE 0 END) AS present_records
FROM attendance a
JOIN live_sessions ls ON a.session_id = ls.session_id
WHERE ls.classroom_id = ?;
```

---

### 2.10 Inline Code Review, Grading Approval & Line-Level Feedback System
* **Feature Description:** Instructors can highlight line ranges on submitted code and leave comments (error/warning/praise). Teachers can review auto-evaluated grades, override scores, and mark feedback before publishing the final grade to the student.
* **Primary Tables:** `code_reviews`, `grades`, `submissions`, `users`
* **Underlying SQL Query (5-Way Multi-Table Consolidated Grading Query):**
```sql
SELECT 
    s.submission_id,
    q.homework_id, h.title AS homework_title,
    s.question_id, q.question_text AS question_title, q.points AS max_score,
    s.learner_id, u.full_name AS learner_name, u.email AS learner_email,
    s.submitted_at, s.is_late, s.submission_type,
    g.score, g.is_draft, g.status,
    CASE WHEN g.grade_id IS NOT NULL THEN true ELSE false END AS is_graded
FROM submissions s
JOIN questions q ON s.question_id = q.question_id
JOIN homework h ON q.homework_id = h.homework_id
JOIN users u ON s.learner_id = u.user_id
LEFT JOIN grades g ON s.submission_id = g.submission_id
WHERE h.classroom_id = ?;
```

---

### 2.11 Competitive Gamified Leaderboard & Streak Multiplier
* **Feature Description:** Class-wide leaderboard computing total points earned across all homework assignments. Features a full-marks streak counter (represented with fire badges) that tracks consecutive full-score submissions.
* **Primary Tables:** `grades`, `submissions`, `questions`, `homework`
* **Underlying SQL Query:**
```sql
-- Leaderboard total score calculation
SELECT SUM(g.score) AS total_score, COUNT(DISTINCT s.question_id) AS submitted_questions
FROM submissions s
JOIN questions q ON s.question_id = q.question_id
JOIN homework h ON q.homework_id = h.homework_id
JOIN grades g ON s.submission_id = g.submission_id
WHERE h.classroom_id = ? AND s.learner_id = ? AND g.is_draft = false;

-- Consecutive Full-Mark Streak Verification
SELECT SUM(g.score) AS earned_pts
FROM submissions s
JOIN questions q ON s.question_id = q.question_id
JOIN grades g ON s.submission_id = g.submission_id
WHERE q.homework_id = ? AND s.learner_id = ? AND g.is_draft = false;
```

---

### 2.12 Categorized Practice Problem Bank & Solution Vault
* **Feature Description:** Repository of programming exercises categorized by topic (e.g., Arrays, Graph Theory, DP) and difficulty (`easy`, `medium`, `hard`). Instructors can publish official sample solutions.
* **Primary Tables:** `problems`, `problem_answers`, `users`
* **Underlying SQL Query:**
```sql
SELECT p.*, u.full_name AS author_name,
       pa.problem_answer_id, pa.solution_text, pa.solution_file_url
FROM problems p
JOIN users u ON p.created_by = u.user_id
LEFT JOIN problem_answers pa ON p.problem_id = pa.problem_id
WHERE p.classroom_id = ? AND p.is_active = true
ORDER BY p.created_at DESC;
```

---

### 2.13 Peer-to-Peer Learning Resource Sharing & Moderation Workflow
* **Feature Description:** Learners and instructors can upload reference documents, slides, and web links. Student-submitted resources remain hidden until an instructor or TA reviews and approves them.
* **Primary Tables:** `resources`, `users`
* **Underlying SQL Query:**
```sql
SELECT r.*, u.full_name AS submitted_by_name, approver.full_name AS approved_by_name
FROM resources r
JOIN users u ON r.submitted_by = u.user_id
LEFT JOIN users approver ON r.approved_by = approver.user_id
WHERE r.classroom_id = ? AND (r.is_approved = true OR r.submitted_by = ?)
ORDER BY r.created_at DESC;
```

---

### 2.14 Scoped Classroom Group Chat & Direct Private Messaging (DM)
* **Feature Description:** Real-time scoped classroom chat forum for announcements and queries, along with 1-on-1 private messaging between classmates and instructors with unread badges.
* **Primary Tables:** `classroom_messages`, `direct_messages`, `users`, `classroom_members`
* **Underlying SQL Query:**
```sql
-- Classroom Group Chat with member roles
SELECT m.message_id, m.classroom_id, m.sender_id, m.message_text, m.sent_at,
       u.full_name AS sender_name, cm.role AS sender_role
FROM classroom_messages m
JOIN users u ON m.sender_id = u.user_id
LEFT JOIN classroom_members cm ON m.sender_id = cm.user_id AND cm.classroom_id = m.classroom_id
WHERE m.classroom_id = ?
ORDER BY m.sent_at DESC LIMIT 100;

-- Private Direct Messages between 2 users
SELECT dm.*, u_from.full_name AS sender_name, u_to.full_name AS recipient_name
FROM direct_messages dm
JOIN users u_from ON dm.sender_id = u_from.user_id
JOIN users u_to ON dm.recipient_id = u_to.user_id
WHERE dm.classroom_id = ?
  AND ((dm.sender_id = ? AND dm.recipient_id = ?) OR (dm.sender_id = ? AND dm.recipient_id = ?))
ORDER BY dm.sent_at ASC;
```

---

### 2.15 User Identity, 90-Day Contribution Heatmap & Personal Task To-Do Manager
* **Feature Description:** Profile management featuring custom avatars, bio, social links (GitHub, LinkedIn, Website), password changes, and a GitHub-style 90-day daily submission heatmap. Includes a personal student To-Do list with time deadlines and automatic notifications.
* **Primary Tables:** `users`, `user_todos`, `submissions`
* **Underlying SQL Query:**
```sql
-- 90-Day Submission Activity Heatmap
SELECT DATE(submitted_at) AS submission_date, COUNT(*) AS count
FROM submissions
WHERE learner_id = ? AND submitted_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY DATE(submitted_at)
ORDER BY submission_date ASC;

-- User Personal To-Dos
SELECT todo_id, title, priority, due_date, due_time, completed, reminder_sent, created_at
FROM user_todos
WHERE user_id = ?
ORDER BY completed ASC, due_date ASC;
```

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
