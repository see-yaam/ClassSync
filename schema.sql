CREATE DATABASE IF NOT EXISTS `classsync_db`;
USE `classsync_db`;

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
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `homework`;
DROP TABLE IF EXISTS `classroom_members`;
DROP TABLE IF EXISTS `classrooms`;
DROP TABLE IF EXISTS `password_reset_otp`;
DROP TABLE IF EXISTS `users`;

-- Base Tables Definition (Original Schema)
CREATE TABLE `users` (
  `user_id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `profile_picture_url` varchar(500),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` boolean DEFAULT true,
  `last_login` timestamp NULL
);

CREATE TABLE `password_reset_otp` (
  `otp_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `is_used` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `classrooms` (
  `classroom_id` int PRIMARY KEY AUTO_INCREMENT,
  `creator_id` int NOT NULL,
  `room_number` varchar(50) UNIQUE NOT NULL,
  `room_password` varchar(255) NOT NULL,
  `classroom_name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` boolean DEFAULT true
);

CREATE TABLE `classroom_members` (
  `member_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `classroom_id` int NOT NULL,
  `role` enum('instructor','TA','learner') NOT NULL DEFAULT 'learner',
  `joined_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` boolean DEFAULT true
);

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
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `questions` (
  `question_id` int PRIMARY KEY AUTO_INCREMENT,
  `homework_id` int NOT NULL,
  `question_type` enum('link','text','pdf') NOT NULL DEFAULT 'text',
  `question_text` text NOT NULL,
  `question_data` text,
  `points` int DEFAULT 10,
  `order_number` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `submissions` (
  `submission_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `learner_id` int NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `code_content` text,
  `file_url` varchar(500),
  `submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `is_late` boolean DEFAULT false,
  `minutes_late` int DEFAULT 0,
  `penalty_applied` int DEFAULT 0,
  `is_final` boolean DEFAULT true,
  `submission_metadata` json
);

CREATE TABLE `grades` (
  `grade_id` int PRIMARY KEY AUTO_INCREMENT,
  `submission_id` int UNIQUE NOT NULL,
  `instructor_id` int NOT NULL,
  `score` decimal(5,2),
  `feedback` text,
  `graded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_draft` boolean DEFAULT false
);

CREATE TABLE `code_reviews` (
  `review_id` int PRIMARY KEY AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `line_start` int NOT NULL,
  `line_end` int NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_resolved` boolean DEFAULT false
);

CREATE TABLE `homework_answers` (
  `answer_id` int PRIMARY KEY AUTO_INCREMENT,
  `question_id` int UNIQUE NOT NULL,
  `instructor_id` int NOT NULL,
  `answer_text` text,
  `answer_file_url` varchar(500),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `problems` (
  `problem_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `category` varchar(100) NOT NULL,
  `problem_title` varchar(200) NOT NULL,
  `problem_description` text NOT NULL,
  `difficulty` enum('easy','medium','hard') DEFAULT 'medium',
  `created_by` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` boolean DEFAULT true
);

CREATE TABLE `problem_answers` (
  `problem_answer_id` int PRIMARY KEY AUTO_INCREMENT,
  `problem_id` int UNIQUE NOT NULL,
  `instructor_id` int NOT NULL,
  `solution_text` text,
  `solution_file_url` varchar(500),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `resources` (
  `resource_id` int PRIMARY KEY AUTO_INCREMENT,
  `classroom_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `resource_title` varchar(200) NOT NULL,
  `resource_url` varchar(500) NOT NULL,
  `resource_description` text,
  `is_approved` boolean DEFAULT false,
  `approved_by` int,
  `approved_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `notifications` (
  `notification_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `link_url` varchar(500),
  `is_read` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL
);

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
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
  `marked_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

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
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Constraints & Indexes
CREATE UNIQUE INDEX `classroom_members_index_0` ON `classroom_members` (`user_id`, `classroom_id`);
CREATE UNIQUE INDEX `submissions_index_1` ON `submissions` (`question_id`, `learner_id`);
CREATE UNIQUE INDEX `attendance_index_2` ON `attendance` (`session_id`, `learner_id`);
CREATE UNIQUE INDEX `plagiarism_flags_index_3` ON `plagiarism_flags` (`submission_id_1`, `submission_id_2`);

ALTER TABLE `password_reset_otp` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `classrooms` ADD FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `classroom_members` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `classroom_members` ADD FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);
ALTER TABLE `homework` ADD FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);
ALTER TABLE `homework` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `questions` ADD FOREIGN KEY (`homework_id`) REFERENCES `homework` (`homework_id`);
ALTER TABLE `submissions` ADD FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`);
ALTER TABLE `submissions` ADD FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `grades` ADD FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`);
ALTER TABLE `grades` ADD FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `code_reviews` ADD FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`);
ALTER TABLE `code_reviews` ADD FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `homework_answers` ADD FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`);
ALTER TABLE `homework_answers` ADD FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `problems` ADD FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);
ALTER TABLE `problems` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `problem_answers` ADD FOREIGN KEY (`problem_id`) REFERENCES `problems` (`problem_id`);
ALTER TABLE `problem_answers` ADD FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `resources` ADD FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);
ALTER TABLE `resources` ADD FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `notifications` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `learner_alerts` ADD FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);
ALTER TABLE `learner_alerts` ADD FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `learner_alerts` ADD FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `live_sessions` ADD FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);
ALTER TABLE `live_sessions` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `attendance` ADD FOREIGN KEY (`session_id`) REFERENCES `live_sessions` (`session_id`);
ALTER TABLE `attendance` ADD FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `plagiarism_flags` ADD FOREIGN KEY (`submission_id_1`) REFERENCES `submissions` (`submission_id`);
ALTER TABLE `plagiarism_flags` ADD FOREIGN KEY (`submission_id_2`) REFERENCES `submissions` (`submission_id`);
ALTER TABLE `plagiarism_flags` ADD FOREIGN KEY (`flagged_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `resources` ADD FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `learner_alerts` ADD FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `plagiarism_flags` ADD FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `plagiarism_flags` ADD CONSTRAINT `chk_submission_order` CHECK (`submission_id_1` < `submission_id_2`);

-- ==============================================================================
-- MIGRATIONS & NEW FEATURE EXTENSIONS (Added incrementally for Auth module)
-- ==============================================================================

-- 1. Add verification status column to users table
ALTER TABLE `users` ADD COLUMN `is_verified` BOOLEAN DEFAULT false;

-- 2. Add OTP purpose column to password_reset_otp table
ALTER TABLE `password_reset_otp` ADD COLUMN `otp_purpose` ENUM('registration','password_reset') NOT NULL DEFAULT 'password_reset';

-- 3. Allow NULL user_id for registration OTPs before account creation
ALTER TABLE `password_reset_otp` MODIFY COLUMN `user_id` INT NULL;
