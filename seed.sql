USE `classsync_db`;

-- Seed Users (Default password for all seed test accounts: password123)
INSERT INTO `users` (`user_id`, `email`, `password_hash`, `full_name`, `profile_picture_url`, `is_verified`) VALUES
(1, 'alice@uiu.ac.bd', '$2b$10$cjA1I6M4hUiFV.m1shsXP.mrJfmwVqChH8FAu9bj/QBodG2WnOr5O', 'Dr. Alice Smith (Instructor)', 'https://ui-avatars.com/api/?name=Alice+Smith&background=0D8ABC&color=fff', true),
(2, 'bob@uiu.ac.bd', '$2b$10$cjA1I6M4hUiFV.m1shsXP.mrJfmwVqChH8FAu9bj/QBodG2WnOr5O', 'Bob Johnson (Learner)', 'https://ui-avatars.com/api/?name=Bob+Johnson&background=2ecc71&color=fff', true),
(3, 'charlie@uiu.ac.bd', '$2b$10$cjA1I6M4hUiFV.m1shsXP.mrJfmwVqChH8FAu9bj/QBodG2WnOr5O', 'Charlie Brown (Learner)', 'https://ui-avatars.com/api/?name=Charlie+Brown&background=e74c3c&color=fff', true),
(4, 'diana@uiu.ac.bd', '$2b$10$cjA1I6M4hUiFV.m1shsXP.mrJfmwVqChH8FAu9bj/QBodG2WnOr5O', 'Diana Prince (TA)', 'https://ui-avatars.com/api/?name=Diana+Prince&background=f39c12&color=fff', true);

-- Seed Classroom 1 (Created by Dr. Alice)
INSERT INTO `classrooms` (`classroom_id`, `creator_id`, `room_number`, `room_password`, `classroom_name`, `description`) VALUES
(1, 1, 'CSE3522-01', 'pass123', 'CSE 3522: Database Management Systems Lab', 'Fall 2026 DBMS Lab Section A');

-- Members for Classroom 1
INSERT INTO `classroom_members` (`user_id`, `classroom_id`, `role`) VALUES
(1, 1, 'instructor'),
(2, 1, 'learner'),
(3, 1, 'learner'),
(4, 1, 'TA');

-- Seed Homework 1
INSERT INTO `homework` (`homework_id`, `classroom_id`, `title`, `description`, `total_points`, `created_by`, `deadline`, `is_published`, `published_at`) VALUES
(1, 1, 'Lab Homework 1: SQL DDL & DML', 'Basic table creation, constraints, and queries', 100, 1, NOW() + INTERVAL 7 DAY, true, NOW());

-- Questions for Homework 1
INSERT INTO `questions` (`question_id`, `homework_id`, `question_type`, `question_text`, `question_data`, `points`, `order_number`) VALUES
(1, 1, 'text', 'Write a SQL query to create a table `students` with id, name, and gpa.', NULL, 50, 1),
(2, 1, 'text', 'Write a SQL query to select all students with GPA > 3.5.', NULL, 50, 2);

-- Answer Key for Question 1
INSERT INTO `homework_answers` (`question_id`, `instructor_id`, `answer_text`) VALUES
(1, 1, 'CREATE TABLE students (id INT PRIMARY KEY, name VARCHAR(100), gpa DECIMAL(3,2));');

-- Seed Submissions
-- Bob's submission for Question 1
INSERT INTO `submissions` (`submission_id`, `question_id`, `learner_id`, `code_hash`, `code_content`, `is_late`, `minutes_late`) VALUES
(1, 1, 2, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'CREATE TABLE students (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), gpa DOUBLE);', false, 0);

-- Charlie's submission for Question 1 (Plagiarism candidate - same code hash!)
INSERT INTO `submissions` (`submission_id`, `question_id`, `learner_id`, `code_hash`, `code_content`, `is_late`, `minutes_late`) VALUES
(2, 1, 3, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'CREATE TABLE students (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), gpa DOUBLE);', false, 0);

-- Grades
INSERT INTO `grades` (`submission_id`, `instructor_id`, `score`, `feedback`, `is_draft`) VALUES
(1, 1, 48.00, 'Good job! Clean syntax.', false);

-- Code Reviews
INSERT INTO `code_reviews` (`submission_id`, `reviewer_id`, `line_start`, `line_end`, `comment`) VALUES
(1, 1, 1, 1, 'Consider using DECIMAL(3,2) instead of DOUBLE for GPA calculations.');

-- Seed Problem Bank
INSERT INTO `problems` (`problem_id`, `classroom_id`, `category`, `problem_title`, `problem_description`, `difficulty`, `created_by`) VALUES
(1, 1, 'SQL Joins', 'Inner Join vs Left Join Challenge', 'Given tables `orders` and `customers`, write a query retrieving all orders along with customer names including orders without registered customers.', 'medium', 1),
(2, 1, 'Normalization', '3NF Normalization Practice', 'Normalize the given universal relation to 3NF showing functional dependencies.', 'easy', 1);

INSERT INTO `problem_answers` (`problem_id`, `instructor_id`, `solution_text`) VALUES
(1, 1, 'SELECT o.order_id, c.customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id;');

-- Seed Resources
INSERT INTO `resources` (`resource_id`, `classroom_id`, `submitted_by`, `resource_title`, `resource_url`, `resource_description`, `is_approved`, `approved_by`, `approved_at`) VALUES
(1, 1, 1, 'W3Schools SQL Tutorial', 'https://www.w3schools.com/sql/', 'Recommended reading for SQL basics', true, 1, NOW()),
(2, 1, 2, 'PostgreSQL Documentation', 'https://www.postgresql.org/docs/', 'Useful reference for DBMS concepts', false, NULL, NULL);

-- Seed Notifications
INSERT INTO `notifications` (`user_id`, `notification_type`, `title`, `message`, `link_url`, `is_read`) VALUES
(2, 'grade', 'Grade Published', 'Your submission for Question 1 in Lab Homework 1 has been graded: 48/50.', '/homework.html?id=1', false),
(2, 'code_review', 'New Code Review Comment', 'Dr. Alice added a line review on your submission.', '/homework.html?id=1', false);

-- Seed Live Session
INSERT INTO `live_sessions` (`session_id`, `classroom_id`, `session_title`, `session_description`, `scheduled_time`, `expected_duration`, `jitsi_room_id`, `created_by`, `is_active`) VALUES
(1, 1, 'Lecture 01: Relational Algebra & SQL', 'Interactive lab discussion on SQL queries', NOW(), 60, 'classsync-cse3522-session-1', 1, true);
