-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 21, 2026 at 03:34 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `classsync_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `learner_id` int(11) NOT NULL,
  `join_time` timestamp NULL DEFAULT NULL,
  `leave_time` timestamp NULL DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT 0,
  `is_present` tinyint(1) DEFAULT 0,
  `instructor_override` tinyint(1) DEFAULT 0,
  `override_present` tinyint(1) DEFAULT 0,
  `override_reason` varchar(255) DEFAULT NULL,
  `marked_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `session_id`, `learner_id`, `join_time`, `leave_time`, `duration_minutes`, `is_present`, `instructor_override`, `override_present`, `override_reason`, `marked_at`) VALUES
(1, 1, 1, '2026-09-07 17:52:15', '2026-09-20 16:20:41', 40, 0, 0, 0, NULL, '2026-09-07 17:52:15'),
(2, 1, 6, '2026-09-08 08:37:47', '2026-09-20 16:55:41', 110, 1, 0, 0, NULL, '2026-09-08 08:37:47'),
(3, 8, 1, '2026-09-21 12:15:40', '2026-09-21 12:16:20', 10, 0, 0, 0, NULL, '2026-09-21 12:15:40'),
(4, 8, 6, '2026-09-21 12:15:46', '2026-09-21 12:18:16', 20, 0, 0, 0, NULL, '2026-09-21 12:15:46');

-- --------------------------------------------------------

--
-- Table structure for table `classrooms`
--

CREATE TABLE `classrooms` (
  `classroom_id` int(11) NOT NULL,
  `creator_id` int(11) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `room_password` varchar(255) NOT NULL,
  `classroom_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `visibility` enum('public','private') NOT NULL DEFAULT 'private',
  `is_paid` tinyint(1) DEFAULT 0,
  `price` decimal(10,2) DEFAULT NULL,
  `cover_photo_url` longtext DEFAULT NULL,
  `attendance_threshold_percent` int(11) DEFAULT 75
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classrooms`
--

INSERT INTO `classrooms` (`classroom_id`, `creator_id`, `room_number`, `room_password`, `classroom_name`, `description`, `created_at`, `updated_at`, `is_active`, `visibility`, `is_paid`, `price`, `cover_photo_url`, `attendance_threshold_percent`) VALUES
(1, 1, 'CSE3522-01', 'pass123', 'CSE 3522: Database Management Systems Lab', '', '2026-09-07 17:45:35', '2026-09-20 14:48:34', 1, 'private', 0, NULL, NULL, 75),
(2, 1, 'ROOM-760671', 'avp01rfe', 'CSE 4511: Distributed Systems', 'Advanced DB & Systems Lab', '2026-09-07 17:45:51', '2026-09-07 17:45:51', 1, 'private', 0, NULL, NULL, 75),
(3, 1, 'ROOM-757678', 'suj51ut9', 'seyam', 'seyam', '2026-09-07 17:48:49', '2026-09-07 17:48:49', 1, 'private', 0, NULL, NULL, 75),
(4, 1, 'ROOM-337473', 'newsecretpass', 'Advanced Web Architecture 2026 (Updated)', 'Master Node.js, Express & MySQL Security with Certification', '2026-09-15 20:42:27', '2026-09-15 20:42:27', 1, 'public', 1, 59.99, NULL, 75),
(5, 1, 'ROOM-775951', 'pua0vfje', 'amar matha', '', '2026-09-15 20:47:27', '2026-09-15 20:47:27', 1, 'private', 1, 10.00, NULL, 75),
(6, 1, 'ROOM-526504', 'newsecretpass', 'Advanced Web Architecture 2026 (Updated)', 'Master Node.js, Express & MySQL Security with Certification', '2026-09-15 20:54:57', '2026-09-15 20:54:57', 1, 'public', 1, 59.99, NULL, 75);

-- --------------------------------------------------------

--
-- Table structure for table `classroom_members`
--

CREATE TABLE `classroom_members` (
  `member_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `role` enum('instructor','TA','learner') NOT NULL DEFAULT 'learner',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classroom_members`
--

INSERT INTO `classroom_members` (`member_id`, `user_id`, `classroom_id`, `role`, `joined_at`, `updated_at`, `is_active`) VALUES
(1, 1, 1, 'instructor', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 1),
(2, 2, 1, 'learner', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 1),
(3, 3, 1, 'learner', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 1),
(4, 4, 1, 'TA', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 1),
(5, 1, 2, 'instructor', '2026-09-07 17:45:51', '2026-09-07 17:45:51', 1),
(6, 2, 2, 'learner', '2026-09-07 17:45:51', '2026-09-07 17:45:51', 1),
(7, 3, 2, 'learner', '2026-09-07 17:45:51', '2026-09-07 17:45:51', 1),
(8, 1, 3, 'instructor', '2026-09-07 17:48:49', '2026-09-07 17:48:49', 1),
(9, 6, 1, 'learner', '2026-09-08 05:37:45', '2026-09-08 05:37:45', 1),
(10, 2, 3, 'learner', '2026-09-13 09:07:58', '2026-09-13 09:07:58', 1),
(11, 4, 3, 'TA', '2026-09-13 09:07:58', '2026-09-13 09:07:58', 1),
(12, 1, 4, 'instructor', '2026-09-15 20:42:27', '2026-09-15 20:42:27', 1),
(13, 2, 4, 'learner', '2026-09-15 20:42:27', '2026-09-15 20:42:27', 1),
(14, 1, 5, 'instructor', '2026-09-15 20:47:27', '2026-09-15 20:47:27', 1),
(15, 1, 6, 'instructor', '2026-09-15 20:54:57', '2026-09-15 20:54:57', 1),
(16, 2, 6, 'learner', '2026-09-15 20:54:57', '2026-09-15 20:54:57', 1);

-- --------------------------------------------------------

--
-- Table structure for table `classroom_messages`
--

CREATE TABLE `classroom_messages` (
  `message_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message_text` text NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classroom_messages`
--

INSERT INTO `classroom_messages` (`message_id`, `classroom_id`, `sender_id`, `message_text`, `sent_at`) VALUES
(1, 1, 1, 'Test automated group chat message', '2026-09-20 13:50:14'),
(2, 1, 6, 'ghnghnhgnghnghn', '2026-09-20 14:51:24'),
(3, 1, 6, 'ghnghnhgnghnghn', '2026-09-20 14:51:29'),
(4, 1, 6, 'bbbbbbb', '2026-09-20 14:51:48'),
(5, 1, 2, 'Hello class! Verification test message.', '2026-09-20 15:03:22'),
(6, 1, 6, 'ghnghnhgnghnghn', '2026-09-20 15:04:09'),
(7, 1, 6, 'mmmmmmmmmmmmmm', '2026-09-20 15:04:20'),
(8, 1, 2, 'Hello class! Verification test message.', '2026-09-20 15:06:28'),
(9, 1, 6, '.', '2026-09-20 15:11:41');

-- --------------------------------------------------------

--
-- Table structure for table `code_reviews`
--

CREATE TABLE `code_reviews` (
  `review_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `line_start` int(11) NOT NULL,
  `line_end` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_resolved` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `code_reviews`
--

INSERT INTO `code_reviews` (`review_id`, `submission_id`, `reviewer_id`, `line_start`, `line_end`, `comment`, `created_at`, `updated_at`, `is_resolved`) VALUES
(1, 1, 1, 1, 1, 'Consider using DECIMAL(3,2) instead of DOUBLE for GPA calculations.', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 0);

-- --------------------------------------------------------

--
-- Table structure for table `direct_messages`
--

CREATE TABLE `direct_messages` (
  `message_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `message_text` text NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `direct_messages`
--

INSERT INTO `direct_messages` (`message_id`, `classroom_id`, `sender_id`, `recipient_id`, `message_text`, `sent_at`, `is_read`) VALUES
(1, 1, 1, 2, 'Test automated direct message', '2026-09-20 13:50:14', 0),
(2, 1, 2, 1, 'Hi Dr. Alice, I have a question about HW 1.', '2026-09-20 15:03:22', 1),
(3, 1, 2, 1, 'Hi Dr. Alice, I have a question about HW 1.', '2026-09-20 15:06:29', 1),
(4, 1, 6, 1, 'hello sir', '2026-09-20 15:11:55', 1),
(5, 1, 1, 6, 'chal bhag sale', '2026-09-20 15:12:38', 1);

-- --------------------------------------------------------

--
-- Table structure for table `enrollment_requests`
--

CREATE TABLE `enrollment_requests` (
  `request_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payer_phone_number` varchar(20) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `enrollment_requests`
--

INSERT INTO `enrollment_requests` (`request_id`, `classroom_id`, `user_id`, `payment_method`, `payer_phone_number`, `transaction_id`, `status`, `requested_at`, `reviewed_by`, `reviewed_at`) VALUES
(1, 4, 2, 'bKash', '01711223344', 'TRX9988776655', 'approved', '2026-09-15 20:42:27', 1, '2026-09-15 20:42:27'),
(2, 4, 6, 'bKash', '01310006960', 'sdfghjkl;', 'pending', '2026-09-15 20:50:36', NULL, NULL),
(3, 6, 2, 'bKash', '01711223344', 'TRX9988776655', 'approved', '2026-09-15 20:54:57', 1, '2026-09-15 20:54:57');

-- --------------------------------------------------------

--
-- Table structure for table `grades`
--

CREATE TABLE `grades` (
  `grade_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `graded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_draft` tinyint(1) DEFAULT 0,
  `status` varchar(50) DEFAULT 'Accepted',
  `approval_status` enum('none','auto_pending','approved','manual') DEFAULT 'none',
  `auto_score` decimal(5,2) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grades`
--

INSERT INTO `grades` (`grade_id`, `submission_id`, `instructor_id`, `score`, `feedback`, `graded_at`, `updated_at`, `is_draft`) VALUES
(1, 1, 1, 48.00, 'Good job! Clean syntax.', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 0),
(2, 3, 1, 95.00, 'Excellent implementation!', '2026-09-07 17:45:51', '2026-09-07 17:45:51', 0);

-- --------------------------------------------------------

--
-- Table structure for table `homework`
--

CREATE TABLE `homework` (
  `homework_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `total_points` int(11) DEFAULT 100,
  `created_by` int(11) NOT NULL,
  `deadline` timestamp NULL DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deadline_reminder_sent` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `homework`
--

INSERT INTO `homework` (`homework_id`, `classroom_id`, `title`, `description`, `total_points`, `created_by`, `deadline`, `is_published`, `published_at`, `created_at`, `updated_at`, `deadline_reminder_sent`) VALUES
(1, 1, 'Lab Homework 1: SQL DDL & DML', 'Basic table creation, constraints, and queries', 100, 1, '2026-09-14 17:45:35', 1, '2026-09-07 17:45:35', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 0),
(2, 2, 'Lab 01: 2PC Implementation', 'Coding assignment on 2PC', 100, 1, NULL, 1, '2026-09-07 17:45:51', '2026-09-07 17:45:51', '2026-09-07 17:45:51', 0),
(3, 3, 'RBAC Test HW 1789288339590', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 08:32:19', '2026-09-13 08:32:19', '2026-09-13 08:32:19', 0),
(4, 3, 'RBAC Test HW 1789290384567', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 09:06:24', '2026-09-13 09:06:24', '2026-09-13 09:06:24', 0),
(5, 3, 'RBAC Test HW 1789290438957', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 09:07:19', '2026-09-13 09:07:18', '2026-09-13 09:07:19', 0),
(6, 3, 'RBAC Test HW 1789290462809', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 09:07:42', '2026-09-13 09:07:42', '2026-09-13 09:07:42', 0),
(7, 3, 'RBAC Test HW 1789290478305', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 09:07:58', '2026-09-13 09:07:58', '2026-09-13 09:07:58', 0),
(8, 3, 'RBAC Test HW 1789290777140', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 09:12:57', '2026-09-13 09:12:57', '2026-09-13 09:12:57', 0),
(9, 3, 'RBAC Test HW 1789290928900', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-13 09:15:28', '2026-09-13 09:15:28', '2026-09-13 09:15:28', 0),
(10, 3, 'RBAC Test HW 1789291555969', 'Testing RBAC', 100, 1, NULL, 1, '2026-09-15 19:58:11', '2026-09-13 09:25:55', '2026-09-15 19:58:11', 0),
(11, 4, 'cfghj', '', 100, 1, NULL, 1, '2026-09-15 20:52:20', '2026-09-15 20:43:59', '2026-09-15 20:52:20', 0),
(12, 1, 'Database Schema & Query Homework', 'Solve questions 1 through 3 below.', 100, 1, NULL, 1, '2026-09-15 21:00:22', '2026-09-15 21:00:22', '2026-09-15 21:00:22', 0);

-- --------------------------------------------------------

--
-- Table structure for table `homework_answers`
--

CREATE TABLE `homework_answers` (
  `answer_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `answer_text` text DEFAULT NULL,
  `answer_file_url` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `homework_answers`
--

INSERT INTO `homework_answers` (`answer_id`, `question_id`, `instructor_id`, `answer_text`, `answer_file_url`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'CREATE TABLE students (id INT PRIMARY KEY, name VARCHAR(100), gpa DECIMAL(3,2));', NULL, '2026-09-07 17:45:35', '2026-09-07 17:45:35'),
(2, 4, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 08:32:19', '2026-09-13 08:32:19'),
(3, 5, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:06:24', '2026-09-13 09:06:24'),
(4, 6, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:07:18', '2026-09-13 09:07:18'),
(5, 7, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:07:42', '2026-09-13 09:07:42'),
(6, 8, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:07:58', '2026-09-13 09:07:58'),
(7, 9, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:12:57', '2026-09-13 09:12:57'),
(8, 10, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:15:28', '2026-09-13 09:15:28'),
(9, 11, 1, 'SELECT 2 + 2;', NULL, '2026-09-13 09:25:55', '2026-09-13 09:25:55'),
(10, 12, 1, 'SELECT course_id, AVG(score) FROM grades GROUP BY course_id;', NULL, '2026-09-15 21:00:22', '2026-09-15 21:00:22'),
(11, 13, 1, 'See attached reference PDF key', NULL, '2026-09-15 21:00:22', '2026-09-15 21:00:22');

-- --------------------------------------------------------

--
-- Table structure for table `learner_alerts`
--

CREATE TABLE `learner_alerts` (
  `alert_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `learner_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `alert_type` enum('yellow','red') NOT NULL,
  `alert_message` text NOT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `learner_alerts`
--

INSERT INTO `learner_alerts` (`alert_id`, `classroom_id`, `learner_id`, `instructor_id`, `alert_type`, `alert_message`, `is_resolved`, `resolved_at`, `resolved_by`, `created_at`, `updated_at`) VALUES
(1, 1, 6, 1, 'red', 'kire beta', 0, NULL, NULL, '2026-09-08 08:42:32', '2026-09-08 08:42:32'),
(2, 3, 2, 1, 'yellow', 'Testing RBAC alert filter', 0, NULL, NULL, '2026-09-13 08:32:19', '2026-09-13 08:32:19'),
(3, 3, 2, 1, 'yellow', 'Testing RBAC alert filter', 0, NULL, NULL, '2026-09-13 09:07:58', '2026-09-13 09:07:58'),
(4, 3, 2, 1, 'yellow', 'Testing RBAC alert filter', 0, NULL, NULL, '2026-09-13 09:12:57', '2026-09-13 09:12:57'),
(5, 3, 2, 1, 'yellow', 'Testing RBAC alert filter', 0, NULL, NULL, '2026-09-13 09:15:28', '2026-09-13 09:15:28'),
(6, 3, 2, 1, 'yellow', 'Testing RBAC alert filter', 0, NULL, NULL, '2026-09-13 09:25:56', '2026-09-13 09:25:56');

-- --------------------------------------------------------

--
-- Table structure for table `live_sessions`
--

CREATE TABLE `live_sessions` (
  `session_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `session_title` varchar(200) NOT NULL,
  `session_description` text DEFAULT NULL,
  `scheduled_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expected_duration` int(11) DEFAULT 60,
  `jitsi_room_id` varchar(100) NOT NULL,
  `created_by` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `recording_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `live_sessions`
--

INSERT INTO `live_sessions` (`session_id`, `classroom_id`, `session_title`, `session_description`, `scheduled_time`, `expected_duration`, `jitsi_room_id`, `created_by`, `is_active`, `started_at`, `ended_at`, `recording_url`, `created_at`, `updated_at`) VALUES
(1, 1, 'Lecture 01: Relational Algebra & SQL', 'Interactive lab discussion on SQL queries', '2026-09-20 16:55:16', 60, 'classsync-cse3522-session-1', 1, 0, '2026-09-20 16:05:13', '2026-09-20 16:55:16', NULL, '2026-09-07 17:45:35', '2026-09-20 16:55:16'),
(2, 1, 'sdfghjbvcxz', 'vbnmbvcxz', '2026-09-20 16:55:16', 60, 'classsync-room-1-mu9zdvtg', 1, 0, NULL, '2026-09-20 16:55:16', NULL, '2026-09-20 15:38:30', '2026-09-20 16:55:16'),
(3, 1, 'Automated Test Live Lecture', 'E2E test live session flow', '2026-09-20 16:03:18', 45, 'classsync-room-1-mua09s76', 1, 0, '2026-09-20 16:03:18', '2026-09-20 16:03:18', NULL, '2026-09-20 16:03:18', '2026-09-20 16:03:18'),
(4, 1, 'Automated Test Live Lecture', 'E2E test live session flow', '2026-09-20 16:03:44', 45, 'classsync-room-1-mua0acfw', 1, 0, '2026-09-20 16:03:44', '2026-09-20 16:03:44', NULL, '2026-09-20 16:03:44', '2026-09-20 16:03:44'),
(5, 1, 'Repeat Fix Test Lecture', '', '2026-09-20 16:55:16', 30, 'classsync-room-1-mua21u33', 1, 0, '2026-09-20 16:53:06', '2026-09-20 16:55:16', NULL, '2026-09-20 16:53:06', '2026-09-20 16:55:16'),
(6, 1, 'Repeat Fix Test Lecture', '', '2026-09-20 16:55:16', 30, 'classsync-room-1-mua230vl', 1, 0, '2026-09-20 16:54:02', '2026-09-20 16:55:16', NULL, '2026-09-20 16:54:02', '2026-09-20 16:55:16'),
(7, 1, 'Repeat Fix Test Lecture', '', '2026-09-20 16:54:36', 30, 'classsync-room-1-mua23rl2', 1, 0, '2026-09-20 16:54:36', '2026-09-20 16:54:36', NULL, '2026-09-20 16:54:36', '2026-09-20 16:54:36'),
(8, 1, 'dance', '', '2026-09-21 12:15:23', 60, 'classsync-room-1-mub7jzzl', 1, 1, '2026-09-21 12:15:23', NULL, NULL, '2026-09-21 12:14:58', '2026-09-21 12:15:23');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `notification_type`, `title`, `message`, `link_url`, `is_read`, `created_at`, `read_at`) VALUES
(1, 2, 'grade', 'Grade Published', 'Your submission for Question 1 in Lab Homework 1 has been graded: 48/50.', '/homework.html?id=1', 0, '2026-09-07 17:45:35', NULL),
(2, 2, 'code_review', 'New Code Review Comment', 'Dr. Alice added a line review on your submission.', '/homework.html?id=1', 0, '2026-09-07 17:45:35', NULL),
(3, 2, 'homework', 'New Homework Published', 'New homework \"Lab 01: 2PC Implementation\" has been published.', '/homework.html?id=2', 0, '2026-09-07 17:45:51', NULL),
(4, 2, 'grade', 'Grade Received', 'Your submission for \"Lab 01: 2PC Implementation\" has been graded: 95 points.', '/homework.html?id=2', 0, '2026-09-07 17:45:51', NULL),
(5, 6, 'alert', 'RED ALERT Warning Issued', 'Instructor issued a red alert: kire beta', '/classroom.html?id=1', 1, '2026-09-08 08:42:32', '2026-09-08 08:43:00'),
(6, 2, 'alert', 'YELLOW ALERT Warning Issued', 'Instructor issued a yellow alert: Testing RBAC alert filter', '/classroom.html?id=3', 0, '2026-09-13 08:32:19', NULL),
(7, 2, 'alert', 'YELLOW ALERT Warning Issued', 'Instructor issued a yellow alert: Testing RBAC alert filter', '/classroom.html?id=3', 0, '2026-09-13 09:07:58', NULL),
(8, 2, 'alert', 'YELLOW ALERT Warning Issued', 'Instructor issued a yellow alert: Testing RBAC alert filter', '/classroom.html?id=3', 0, '2026-09-13 09:12:57', NULL),
(9, 2, 'alert', 'YELLOW ALERT Warning Issued', 'Instructor issued a yellow alert: Testing RBAC alert filter', '/classroom.html?id=3', 0, '2026-09-13 09:15:28', NULL),
(10, 2, 'alert', 'YELLOW ALERT Warning Issued', 'Instructor issued a yellow alert: Testing RBAC alert filter', '/classroom.html?id=3', 0, '2026-09-13 09:25:56', NULL),
(11, 1, 'enrollment_request', 'New Paid Course Enrollment Request', 'Student Bob Johnson (Learner) submitted a payment request (bKash - Trx: TRX9988776655) for \"Advanced Web Architecture 2026 (Updated)\".', '/classroom.html?id=4', 1, '2026-09-15 20:42:27', '2026-09-15 20:46:17'),
(12, 2, 'enrollment_approved', 'Course Enrollment Approved!', 'Your paid enrollment request for \"Advanced Web Architecture 2026 (Updated)\" has been approved! You now have full access to the classroom.', '/classroom.html?id=4', 0, '2026-09-15 20:42:27', NULL),
(13, 2, 'homework', 'New Homework Published', 'New homework \"cfghj\" has been published.', '/homework.html?id=11', 0, '2026-09-15 20:43:59', NULL),
(14, 1, 'enrollment_request', 'New Paid Course Enrollment Request', 'Student Seyam Bhuyan submitted a payment request (bKash - Trx: sdfghjkl;) for \"Advanced Web Architecture 2026 (Updated)\".', '/classroom.html?id=4', 1, '2026-09-15 20:50:36', '2026-09-15 20:52:11'),
(15, 1, 'enrollment_request', 'New Paid Course Enrollment Request', 'Student Bob Johnson (Learner) submitted a payment request (bKash - Trx: TRX9988776655) for \"Advanced Web Architecture 2026 (Updated)\".', '/classroom.html?id=6&tab=requests', 1, '2026-09-15 20:54:57', '2026-09-15 21:12:56'),
(16, 2, 'enrollment_approved', 'Course Enrollment Approved!', 'Your paid enrollment request for \"Advanced Web Architecture 2026 (Updated)\" has been approved! You now have full access to the classroom.', '/classroom.html?id=6', 0, '2026-09-15 20:54:57', NULL),
(17, 2, 'homework', 'New Homework Published', 'New homework \"Database Schema & Query Homework\" has been published.', '/homework.html?id=12', 0, '2026-09-15 21:00:22', NULL),
(18, 3, 'homework', 'New Homework Published', 'New homework \"Database Schema & Query Homework\" has been published.', '/homework.html?id=12', 0, '2026-09-15 21:00:22', NULL),
(19, 6, 'homework', 'New Homework Published', 'New homework \"Database Schema & Query Homework\" has been published.', '/homework.html?id=12', 1, '2026-09-15 21:00:22', '2026-09-20 15:38:45'),
(20, 2, 'live_session', 'Live Class Scheduled', 'A new live class \"sdfghjbvcxz\" has been scheduled.', '/live.html?id=2', 0, '2026-09-20 15:38:30', NULL),
(21, 3, 'live_session', 'Live Class Scheduled', 'A new live class \"sdfghjbvcxz\" has been scheduled.', '/live.html?id=2', 0, '2026-09-20 15:38:30', NULL),
(22, 6, 'live_session', 'Live Class Scheduled', 'A new live class \"sdfghjbvcxz\" has been scheduled.', '/live.html?id=2', 0, '2026-09-20 15:38:30', NULL),
(23, 2, 'live_session', 'Live Class Scheduled', 'Live class \"Automated Test Live Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:03:18 PM', '/classroom.html?id=1', 0, '2026-09-20 16:03:18', NULL),
(24, 3, 'live_session', 'Live Class Scheduled', 'Live class \"Automated Test Live Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:03:18 PM', '/classroom.html?id=1', 0, '2026-09-20 16:03:18', NULL),
(25, 6, 'live_session', 'Live Class Scheduled', 'Live class \"Automated Test Live Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:03:18 PM', '/classroom.html?id=1', 0, '2026-09-20 16:03:18', NULL),
(26, 2, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=3', 0, '2026-09-20 16:03:18', NULL),
(27, 3, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=3', 0, '2026-09-20 16:03:18', NULL),
(28, 4, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=3', 0, '2026-09-20 16:03:18', NULL),
(29, 6, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=3', 0, '2026-09-20 16:03:18', NULL),
(30, 2, 'live_session', 'Live Class Scheduled', 'Live class \"Automated Test Live Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:03:44 PM', '/classroom.html?id=1', 0, '2026-09-20 16:03:44', NULL),
(31, 3, 'live_session', 'Live Class Scheduled', 'Live class \"Automated Test Live Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:03:44 PM', '/classroom.html?id=1', 0, '2026-09-20 16:03:44', NULL),
(32, 6, 'live_session', 'Live Class Scheduled', 'Live class \"Automated Test Live Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:03:44 PM', '/classroom.html?id=1', 0, '2026-09-20 16:03:44', NULL),
(33, 2, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=4', 0, '2026-09-20 16:03:44', NULL),
(34, 3, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=4', 0, '2026-09-20 16:03:44', NULL),
(35, 4, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=4', 0, '2026-09-20 16:03:44', NULL),
(36, 6, 'live_session', 'Live Class Started', 'Live class \"Automated Test Live Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=4', 0, '2026-09-20 16:03:44', NULL),
(37, 2, 'live_session', 'Live Class Started', 'Live class \"Lecture 01: Relational Algebra & SQL\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=1', 0, '2026-09-20 16:05:13', NULL),
(38, 3, 'live_session', 'Live Class Started', 'Live class \"Lecture 01: Relational Algebra & SQL\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=1', 0, '2026-09-20 16:05:13', NULL),
(39, 4, 'live_session', 'Live Class Started', 'Live class \"Lecture 01: Relational Algebra & SQL\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=1', 0, '2026-09-20 16:05:13', NULL),
(40, 6, 'live_session', 'Live Class Started', 'Live class \"Lecture 01: Relational Algebra & SQL\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=1', 0, '2026-09-20 16:05:13', NULL),
(41, 2, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:53:06 PM', '/classroom.html?id=1', 0, '2026-09-20 16:53:06', NULL),
(42, 3, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:53:06 PM', '/classroom.html?id=1', 0, '2026-09-20 16:53:06', NULL),
(43, 6, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:53:06 PM', '/classroom.html?id=1', 0, '2026-09-20 16:53:06', NULL),
(44, 2, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=5', 0, '2026-09-20 16:53:06', NULL),
(45, 3, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=5', 0, '2026-09-20 16:53:06', NULL),
(46, 4, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=5', 0, '2026-09-20 16:53:06', NULL),
(47, 6, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=5', 0, '2026-09-20 16:53:06', NULL),
(48, 2, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:54:02 PM', '/classroom.html?id=1', 0, '2026-09-20 16:54:02', NULL),
(49, 3, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:54:02 PM', '/classroom.html?id=1', 0, '2026-09-20 16:54:02', NULL),
(50, 6, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:54:02 PM', '/classroom.html?id=1', 0, '2026-09-20 16:54:02', NULL),
(51, 2, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=6', 0, '2026-09-20 16:54:02', NULL),
(52, 3, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=6', 0, '2026-09-20 16:54:02', NULL),
(53, 4, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=6', 0, '2026-09-20 16:54:02', NULL),
(54, 6, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=6', 0, '2026-09-20 16:54:02', NULL),
(55, 2, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:54:36 PM', '/classroom.html?id=1', 0, '2026-09-20 16:54:36', NULL),
(56, 3, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:54:36 PM', '/classroom.html?id=1', 0, '2026-09-20 16:54:36', NULL),
(57, 6, 'live_session', 'Live Class Scheduled', 'Live class \"Repeat Fix Test Lecture\" scheduled for CSE 3522: Database Management Systems Lab at 9/20/2026, 10:54:36 PM', '/classroom.html?id=1', 0, '2026-09-20 16:54:36', NULL),
(58, 2, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=7', 0, '2026-09-20 16:54:36', NULL),
(59, 3, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=7', 0, '2026-09-20 16:54:36', NULL),
(60, 4, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=7', 0, '2026-09-20 16:54:36', NULL),
(61, 6, 'live_session', 'Live Class Started', 'Live class \"Repeat Fix Test Lecture\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=7', 0, '2026-09-20 16:54:36', NULL),
(62, 2, 'live_session', 'Live Class Scheduled', 'Live class \"dance\" scheduled for CSE 3522: Database Management Systems Lab at 9/21/2006, 6:15:00 PM', '/classroom.html?id=1', 0, '2026-09-21 12:14:58', NULL),
(63, 3, 'live_session', 'Live Class Scheduled', 'Live class \"dance\" scheduled for CSE 3522: Database Management Systems Lab at 9/21/2006, 6:15:00 PM', '/classroom.html?id=1', 0, '2026-09-21 12:14:58', NULL),
(64, 6, 'live_session', 'Live Class Scheduled', 'Live class \"dance\" scheduled for CSE 3522: Database Management Systems Lab at 9/21/2006, 6:15:00 PM', '/classroom.html?id=1', 0, '2026-09-21 12:14:58', NULL),
(65, 2, 'live_session', 'Live Class Started', 'Live class \"dance\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=8', 0, '2026-09-21 12:15:23', NULL),
(66, 3, 'live_session', 'Live Class Started', 'Live class \"dance\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=8', 0, '2026-09-21 12:15:23', NULL),
(67, 4, 'live_session', 'Live Class Started', 'Live class \"dance\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=8', 0, '2026-09-21 12:15:23', NULL),
(68, 6, 'live_session', 'Live Class Started', 'Live class \"dance\" is starting now in CSE 3522: Database Management Systems Lab', '/live.html?id=8', 0, '2026-09-21 12:15:23', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_otp`
--

CREATE TABLE `password_reset_otp` (
  `otp_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `otp_purpose` enum('registration','password_reset') NOT NULL DEFAULT 'password_reset'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_reset_otp`
--

INSERT INTO `password_reset_otp` (`otp_id`, `user_id`, `otp_code`, `expires_at`, `is_used`, `created_at`, `otp_purpose`) VALUES
(1, 5, '625082', '2026-09-08 05:14:34', 1, '2026-09-08 05:14:31', 'registration'),
(2, 5, '732581', '2026-09-08 05:14:36', 1, '2026-09-08 05:14:34', 'password_reset'),
(3, 6, '810384', '2026-09-08 05:18:34', 1, '2026-09-08 05:17:31', 'registration'),
(4, 6, '583936', '2026-09-08 05:36:42', 1, '2026-09-08 05:36:13', 'password_reset'),
(5, 7, '220509', '2026-09-09 04:39:57', 1, '2026-09-09 04:39:15', 'registration'),
(6, 6, '839148', '2026-09-15 20:50:08', 1, '2026-09-15 20:49:45', 'password_reset');

-- --------------------------------------------------------

--
-- Table structure for table `plagiarism_flags`
--

CREATE TABLE `plagiarism_flags` (
  `flag_id` int(11) NOT NULL,
  `submission_id_1` int(11) NOT NULL,
  `submission_id_2` int(11) NOT NULL,
  `similarity_score` decimal(5,2) DEFAULT NULL,
  `flagged_by` int(11) NOT NULL,
  `is_reviewed` tinyint(1) DEFAULT 0,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `plagiarism_flags`
--

INSERT INTO `plagiarism_flags` (`flag_id`, `submission_id_1`, `submission_id_2`, `similarity_score`, `flagged_by`, `is_reviewed`, `reviewed_by`, `reviewed_at`, `review_notes`, `created_at`, `updated_at`) VALUES
(1, 3, 4, 100.00, 1, 0, NULL, NULL, NULL, '2026-09-07 17:45:51', '2026-09-07 17:45:51'),
(2, 1, 2, 100.00, 1, 0, NULL, NULL, NULL, '2026-09-08 17:30:41', '2026-09-08 17:30:41');

-- --------------------------------------------------------

--
-- Table structure for table `problems`
--

CREATE TABLE `problems` (
  `problem_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `problem_title` varchar(200) NOT NULL,
  `problem_description` text NOT NULL,
  `difficulty` enum('easy','medium','hard') DEFAULT 'medium',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `problems`
--

INSERT INTO `problems` (`problem_id`, `classroom_id`, `category`, `problem_title`, `problem_description`, `difficulty`, `created_by`, `created_at`, `updated_at`, `is_active`) VALUES
(1, 1, 'SQL Joins', 'Inner Join vs Left Join Challenge', 'Given tables `orders` and `customers`, write a query retrieving all orders along with customer names including orders without registered customers.', 'medium', 1, '2026-09-07 17:45:35', '2026-09-07 17:45:35', 1),
(2, 1, 'Normalization', '3NF Normalization Practice', 'Normalize the given universal relation to 3NF showing functional dependencies.', 'easy', 1, '2026-09-07 17:45:35', '2026-09-07 17:45:35', 1),
(3, 2, 'Distributed DB', 'Two-Phase Commit Protocol', 'Describe 2PC prepared and commit states.', 'hard', 1, '2026-09-07 17:45:51', '2026-09-07 17:45:51', 1);

-- --------------------------------------------------------

--
-- Table structure for table `problem_answers`
--

CREATE TABLE `problem_answers` (
  `problem_answer_id` int(11) NOT NULL,
  `problem_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `solution_text` text DEFAULT NULL,
  `solution_file_url` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `problem_answers`
--

INSERT INTO `problem_answers` (`problem_answer_id`, `problem_id`, `instructor_id`, `solution_text`, `solution_file_url`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'SELECT o.order_id, c.customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id;', NULL, '2026-09-07 17:45:35', '2026-09-07 17:45:35'),
(2, 3, 1, 'Phase 1: Prepare request -> Phase 2: Commit/Abort', NULL, '2026-09-07 17:45:51', '2026-09-07 17:45:51');

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `question_id` int(11) NOT NULL,
  `homework_id` int(11) NOT NULL,
  `question_type` enum('link','text','pdf','docx','pptx') NOT NULL DEFAULT 'text',
  `question_text` text NOT NULL,
  `question_data` longtext DEFAULT NULL,
  `points` int(11) DEFAULT 10,
  `order_number` int(11) DEFAULT 0,
  `is_coding_question` tinyint(1) DEFAULT 0,
  `coding_language` varchar(50) DEFAULT 'python',
  `coding_language_version` varchar(50) DEFAULT NULL,
  `time_limit_seconds` decimal(4,2) DEFAULT 2.00,
  `memory_limit_mb` int(11) DEFAULT 128,
  `starter_code` text DEFAULT NULL,
  `required_function_signature` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `test_cases` (
  `test_case_id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) NOT NULL,
  `input_data` text DEFAULT NULL,
  `expected_output` text NOT NULL,
  `is_hidden` tinyint(1) DEFAULT 0,
  `points` int(11) DEFAULT 1,
  `order_number` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`test_case_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`question_id`, `homework_id`, `question_type`, `question_text`, `question_data`, `points`, `order_number`, `created_at`, `updated_at`) VALUES
(1, 1, 'text', 'Write a SQL query to create a table `students` with id, name, and gpa.', NULL, 50, 1, '2026-09-07 17:45:35', '2026-09-07 17:45:35'),
(2, 1, 'text', 'Write a SQL query to select all students with GPA > 3.5.', NULL, 50, 2, '2026-09-07 17:45:35', '2026-09-07 17:45:35'),
(3, 2, 'text', 'Implement phase 1 voting logic.', NULL, 100, 0, '2026-09-07 17:45:51', '2026-09-07 17:45:51'),
(4, 3, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 08:32:19', '2026-09-13 08:32:19'),
(5, 4, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:06:24', '2026-09-13 09:06:24'),
(6, 5, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:07:18', '2026-09-13 09:07:18'),
(7, 6, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:07:42', '2026-09-13 09:07:42'),
(8, 7, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:07:58', '2026-09-13 09:07:58'),
(9, 8, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:12:57', '2026-09-13 09:12:57'),
(10, 9, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:15:28', '2026-09-13 09:15:28'),
(11, 10, 'text', 'What is 2 + 2 in SQL?', NULL, 10, 0, '2026-09-13 09:25:55', '2026-09-13 09:25:55'),
(12, 12, 'text', 'Question 1: Write an SQL query to calculate average student grade by course.', NULL, 25, 1, '2026-09-15 21:00:22', '2026-09-15 21:00:22'),
(13, 12, 'pdf', 'Question 2: Read the attached relational algebra PDF worksheet and list all primary keys.', NULL, 25, 2, '2026-09-15 21:00:22', '2026-09-15 21:00:22'),
(14, 12, 'pptx', 'Question 3: Inspect lecture slide #14 in the attached PPTX presentation and define 3NF.', NULL, 50, 3, '2026-09-15 21:00:22', '2026-09-15 21:00:22');

-- --------------------------------------------------------

--
-- Table structure for table `resources`
--

CREATE TABLE `resources` (
  `resource_id` int(11) NOT NULL,
  `classroom_id` int(11) NOT NULL,
  `submitted_by` int(11) NOT NULL,
  `resource_title` varchar(200) NOT NULL,
  `resource_url` longtext NOT NULL,
  `resource_description` text DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT 0,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `resource_type` varchar(50) NOT NULL DEFAULT 'link'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `resources`
--

INSERT INTO `resources` (`resource_id`, `classroom_id`, `submitted_by`, `resource_title`, `resource_url`, `resource_description`, `is_approved`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `resource_type`) VALUES
(1, 1, 1, 'W3Schools SQL Tutorial', 'https://www.w3schools.com/sql/', 'Recommended reading for SQL basics', 1, 1, '2026-09-07 17:45:35', '2026-09-07 17:45:35', '2026-09-07 17:45:35', 'link'),
(2, 1, 2, 'PostgreSQL Documentation', 'https://www.postgresql.org/docs/', 'Useful reference for DBMS concepts', 0, NULL, NULL, '2026-09-07 17:45:35', '2026-09-07 17:45:35', 'link'),
(3, 1, 1, 'Lecture 4: Database Normalization Slides (.pptx)', 'https://example.com/slides/lecture4.pptx', 'PPTX slides covering 1NF, 2NF, 3NF, BCNF.', 1, 1, '2026-09-15 21:00:22', '2026-09-15 21:00:22', '2026-09-15 21:00:22', 'pptx');

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `submission_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `learner_id` int(11) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `code_content` text DEFAULT NULL,
  `file_url` longtext DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_late` tinyint(1) DEFAULT 0,
  `minutes_late` int(11) DEFAULT 0,
  `penalty_applied` int(11) DEFAULT 0,
  `is_final` tinyint(1) DEFAULT 1,
  `submission_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`submission_metadata`)),
  `submission_type` enum('text','link','pdf','docx','pptx') NOT NULL DEFAULT 'text',
  `auto_eval_status` enum('none','pending','done','error') DEFAULT 'none',
  `auto_eval_score` decimal(5,2) DEFAULT NULL,
  `auto_eval_results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auto_eval_results`)),
  `auto_eval_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`submission_id`, `question_id`, `learner_id`, `code_hash`, `code_content`, `file_url`, `submitted_at`, `is_late`, `minutes_late`, `penalty_applied`, `is_final`, `submission_metadata`, `submission_type`) VALUES
(1, 1, 2, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'CREATE TABLE students (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), gpa DOUBLE);', NULL, '2026-09-07 17:45:35', 0, 0, 0, 1, NULL, 'text'),
(2, 1, 3, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'CREATE TABLE students (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), gpa DOUBLE);', NULL, '2026-09-07 17:45:35', 0, 0, 0, 1, NULL, 'text'),
(3, 3, 2, '6b08ac3a5c3a45c600a0fdee3231fd06', 'function phase1Vote() { return \"VOTE_COMMIT\"; }', NULL, '2026-09-07 17:45:51', 0, 0, 0, 1, NULL, 'text'),
(4, 3, 3, '6b08ac3a5c3a45c600a0fdee3231fd06', 'function phase1Vote() { return \"VOTE_COMMIT\"; }', NULL, '2026-09-07 17:45:51', 0, 0, 0, 1, NULL, 'text'),
(5, 4, 2, '5c5daf08e06ef519f9959030545af848', 'SELECT 4;', NULL, '2026-09-13 08:32:19', 0, 0, 0, 1, NULL, 'text'),
(6, 8, 2, '5c5daf08e06ef519f9959030545af848', 'SELECT 4;', NULL, '2026-09-13 09:07:58', 0, 0, 0, 1, NULL, 'text'),
(7, 9, 2, '5c5daf08e06ef519f9959030545af848', 'SELECT 4;', NULL, '2026-09-13 09:12:57', 0, 0, 0, 1, NULL, 'text'),
(8, 10, 2, '5c5daf08e06ef519f9959030545af848', 'SELECT 4;', NULL, '2026-09-13 09:15:28', 0, 0, 0, 1, NULL, 'text'),
(9, 11, 2, '5c5daf08e06ef519f9959030545af848', 'SELECT 4;', NULL, '2026-09-13 09:25:56', 0, 0, 0, 1, NULL, 'text');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `profile_picture_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `phone_number` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `email`, `password_hash`, `full_name`, `profile_picture_url`, `created_at`, `updated_at`, `is_active`, `last_login`, `is_verified`, `phone_number`) VALUES
(1, 'alice@uiu.ac.bd', '$2b$10$ExoU0HAYJ6RiOMCkqTfS.esJzQ5e2AMZUneko3Xauo/q0vhJY2Hnu', 'Dr. Alice Smith', 'https://ui-avatars.com/api/?name=Alice+Smith&background=0D8ABC&color=fff', '2026-09-07 17:45:35', '2026-09-21 12:13:02', 1, '2026-09-21 12:13:02', 1, NULL),
(2, 'bob@uiu.ac.bd', '$2b$10$ExoU0HAYJ6RiOMCkqTfS.esJzQ5e2AMZUneko3Xauo/q0vhJY2Hnu', 'Bob Johnson', 'https://ui-avatars.com/api/?name=Bob+Johnson&background=2ecc71&color=fff', '2026-09-07 17:45:35', '2026-09-15 20:47:57', 1, '2026-09-15 20:47:57', 1, NULL),
(3, 'charlie@uiu.ac.bd', '$2b$10$ExoU0HAYJ6RiOMCkqTfS.esJzQ5e2AMZUneko3Xauo/q0vhJY2Hnu', 'Charlie Brown', 'https://ui-avatars.com/api/?name=Charlie+Brown&background=e74c3c&color=fff', '2026-09-07 17:45:35', '2026-09-13 09:15:21', 1, NULL, 1, NULL),
(4, 'diana@uiu.ac.bd', '$2b$10$ExoU0HAYJ6RiOMCkqTfS.esJzQ5e2AMZUneko3Xauo/q0vhJY2Hnu', 'Diana Prince', 'https://ui-avatars.com/api/?name=Diana+Prince&background=f39c12&color=fff', '2026-09-07 17:45:35', '2026-09-13 09:25:55', 1, '2026-09-13 09:25:55', 1, NULL),
(5, 'testuser_1788844470912@uiu.ac.bd', '$2b$10$ExoU0HAYJ6RiOMCkqTfS.esJzQ5e2AMZUneko3Xauo/q0vhJY2Hnu', 'Test User Auth', 'https://ui-avatars.com/api/?name=Test%20User%20Auth&background=2563eb&color=fff', '2026-09-08 05:14:34', '2026-09-13 09:15:21', 1, '2026-09-08 05:14:36', 1, NULL),
(6, 'abdurrahmanbhuyanseyam@gmail.com', '$2b$10$5oJvJlg3F7e90dZGVCcN2eVcufy5R1.gbL6D/8mLRTrS27WCzDcye', 'Seyam Bhuyan', 'https://ui-avatars.com/api/?name=Seyam%20Bhuyan&background=2563eb&color=fff', '2026-09-08 05:18:34', '2026-09-21 12:12:57', 1, '2026-09-21 12:12:57', 1, NULL),
(7, 'arbseyam0719@gmail.com', '$2b$10$ExoU0HAYJ6RiOMCkqTfS.esJzQ5e2AMZUneko3Xauo/q0vhJY2Hnu', 'abc', 'https://ui-avatars.com/api/?name=abc&background=2563eb&color=fff', '2026-09-09 04:39:57', '2026-09-13 09:15:21', 1, '2026-09-09 04:44:14', 1, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD UNIQUE KEY `attendance_index_2` (`session_id`,`learner_id`),
  ADD KEY `learner_id` (`learner_id`);

--
-- Indexes for table `classrooms`
--
ALTER TABLE `classrooms`
  ADD PRIMARY KEY (`classroom_id`),
  ADD UNIQUE KEY `room_number` (`room_number`),
  ADD KEY `creator_id` (`creator_id`);

--
-- Indexes for table `classroom_members`
--
ALTER TABLE `classroom_members`
  ADD PRIMARY KEY (`member_id`),
  ADD UNIQUE KEY `classroom_members_index_0` (`user_id`,`classroom_id`),
  ADD KEY `classroom_id` (`classroom_id`);

--
-- Indexes for table `classroom_messages`
--
ALTER TABLE `classroom_messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Indexes for table `code_reviews`
--
ALTER TABLE `code_reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `submission_id` (`submission_id`),
  ADD KEY `reviewer_id` (`reviewer_id`);

--
-- Indexes for table `direct_messages`
--
ALTER TABLE `direct_messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `enrollment_requests`
--
ALTER TABLE `enrollment_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `grades`
--
ALTER TABLE `grades`
  ADD PRIMARY KEY (`grade_id`),
  ADD UNIQUE KEY `submission_id` (`submission_id`),
  ADD KEY `instructor_id` (`instructor_id`);

--
-- Indexes for table `homework`
--
ALTER TABLE `homework`
  ADD PRIMARY KEY (`homework_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `homework_answers`
--
ALTER TABLE `homework_answers`
  ADD PRIMARY KEY (`answer_id`),
  ADD UNIQUE KEY `question_id` (`question_id`),
  ADD KEY `instructor_id` (`instructor_id`);

--
-- Indexes for table `learner_alerts`
--
ALTER TABLE `learner_alerts`
  ADD PRIMARY KEY (`alert_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `learner_id` (`learner_id`),
  ADD KEY `instructor_id` (`instructor_id`),
  ADD KEY `resolved_by` (`resolved_by`);

--
-- Indexes for table `live_sessions`
--
ALTER TABLE `live_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD UNIQUE KEY `jitsi_room_id` (`jitsi_room_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `password_reset_otp`
--
ALTER TABLE `password_reset_otp`
  ADD PRIMARY KEY (`otp_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `plagiarism_flags`
--
ALTER TABLE `plagiarism_flags`
  ADD PRIMARY KEY (`flag_id`),
  ADD UNIQUE KEY `plagiarism_flags_index_3` (`submission_id_1`,`submission_id_2`),
  ADD KEY `submission_id_2` (`submission_id_2`),
  ADD KEY `flagged_by` (`flagged_by`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `problems`
--
ALTER TABLE `problems`
  ADD PRIMARY KEY (`problem_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `problem_answers`
--
ALTER TABLE `problem_answers`
  ADD PRIMARY KEY (`problem_answer_id`),
  ADD UNIQUE KEY `problem_id` (`problem_id`),
  ADD KEY `instructor_id` (`instructor_id`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `homework_id` (`homework_id`);

--
-- Indexes for table `test_cases`
--
ALTER TABLE `test_cases`
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `resources`
--
ALTER TABLE `resources`
  ADD PRIMARY KEY (`resource_id`),
  ADD KEY `classroom_id` (`classroom_id`),
  ADD KEY `submitted_by` (`submitted_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD UNIQUE KEY `submissions_index_1` (`question_id`,`learner_id`),
  ADD KEY `learner_id` (`learner_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `classrooms`
--
ALTER TABLE `classrooms`
  MODIFY `classroom_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `classroom_members`
--
ALTER TABLE `classroom_members`
  MODIFY `member_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `classroom_messages`
--
ALTER TABLE `classroom_messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `code_reviews`
--
ALTER TABLE `code_reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `direct_messages`
--
ALTER TABLE `direct_messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `enrollment_requests`
--
ALTER TABLE `enrollment_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `grades`
--
ALTER TABLE `grades`
  MODIFY `grade_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `homework`
--
ALTER TABLE `homework`
  MODIFY `homework_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `homework_answers`
--
ALTER TABLE `homework_answers`
  MODIFY `answer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `learner_alerts`
--
ALTER TABLE `learner_alerts`
  MODIFY `alert_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `live_sessions`
--
ALTER TABLE `live_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `password_reset_otp`
--
ALTER TABLE `password_reset_otp`
  MODIFY `otp_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `plagiarism_flags`
--
ALTER TABLE `plagiarism_flags`
  MODIFY `flag_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `problems`
--
ALTER TABLE `problems`
  MODIFY `problem_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `problem_answers`
--
ALTER TABLE `problem_answers`
  MODIFY `problem_answer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `resources`
--
ALTER TABLE `resources`
  MODIFY `resource_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `live_sessions` (`session_id`),
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `classrooms`
--
ALTER TABLE `classrooms`
  ADD CONSTRAINT `classrooms_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `classroom_members`
--
ALTER TABLE `classroom_members`
  ADD CONSTRAINT `classroom_members_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `classroom_members_ibfk_2` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`);

--
-- Constraints for table `classroom_messages`
--
ALTER TABLE `classroom_messages`
  ADD CONSTRAINT `classroom_messages_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `classroom_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `code_reviews`
--
ALTER TABLE `code_reviews`
  ADD CONSTRAINT `code_reviews_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `code_reviews_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `direct_messages`
--
ALTER TABLE `direct_messages`
  ADD CONSTRAINT `direct_messages_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `direct_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `direct_messages_ibfk_3` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `enrollment_requests`
--
ALTER TABLE `enrollment_requests`
  ADD CONSTRAINT `enrollment_requests_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enrollment_requests_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enrollment_requests_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `grades`
--
ALTER TABLE `grades`
  ADD CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `homework`
--
ALTER TABLE `homework`
  ADD CONSTRAINT `homework_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `homework_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `homework_answers`
--
ALTER TABLE `homework_answers`
  ADD CONSTRAINT `homework_answers_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  ADD CONSTRAINT `homework_answers_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `learner_alerts`
--
ALTER TABLE `learner_alerts`
  ADD CONSTRAINT `learner_alerts_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `learner_alerts_ibfk_2` FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `learner_alerts_ibfk_3` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `learner_alerts_ibfk_4` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `live_sessions`
--
ALTER TABLE `live_sessions`
  ADD CONSTRAINT `live_sessions_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `live_sessions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `password_reset_otp`
--
ALTER TABLE `password_reset_otp`
  ADD CONSTRAINT `password_reset_otp_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `plagiarism_flags`
--
ALTER TABLE `plagiarism_flags`
  ADD CONSTRAINT `plagiarism_flags_ibfk_1` FOREIGN KEY (`submission_id_1`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `plagiarism_flags_ibfk_2` FOREIGN KEY (`submission_id_2`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `plagiarism_flags_ibfk_3` FOREIGN KEY (`flagged_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `plagiarism_flags_ibfk_4` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `problems`
--
ALTER TABLE `problems`
  ADD CONSTRAINT `problems_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `problems_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `problem_answers`
--
ALTER TABLE `problem_answers`
  ADD CONSTRAINT `problem_answers_ibfk_1` FOREIGN KEY (`problem_id`) REFERENCES `problems` (`problem_id`),
  ADD CONSTRAINT `problem_answers_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`homework_id`) REFERENCES `homework` (`homework_id`);

--
-- Constraints for table `test_cases`
--
ALTER TABLE `test_cases`
  ADD CONSTRAINT `test_cases_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE;

--
-- Constraints for table `resources`
--
ALTER TABLE `resources`
  ADD CONSTRAINT `resources_ibfk_1` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`classroom_id`),
  ADD CONSTRAINT `resources_ibfk_2` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `resources_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  ADD CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`learner_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
