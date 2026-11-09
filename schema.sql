-- Dynamic Voice Agent CRM Schema (MySQL 8.0+)
-- Clean-Room Implementation adhering to Founder Labs Architecture Blueprint

CREATE DATABASE IF NOT EXISTS `voice_crm` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `voice_crm`;

-- 1. Contacts
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100) NOT NULL,
  `phone_e164` VARCHAR(25) NOT NULL,
  `email` VARCHAR(255) NULL,
  `segment` VARCHAR(60) NOT NULL DEFAULT 'working_professional',
  `language` VARCHAR(20) NOT NULL DEFAULT 'English',
  `is_suppressed` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_contacts_phone` (`phone_e164`),
  INDEX `idx_contacts_suppressed` (`is_suppressed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Consent Records
CREATE TABLE IF NOT EXISTS `consent_records` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `contact_id` BIGINT UNSIGNED NOT NULL,
  `purpose` VARCHAR(80) NOT NULL DEFAULT 'program_enquiry',
  `channel` VARCHAR(30) NOT NULL DEFAULT 'voice_ai',
  `state` ENUM('granted', 'withdrawn', 'expired') NOT NULL DEFAULT 'granted',
  `source` VARCHAR(100) NOT NULL DEFAULT 'web_form',
  `occurred_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_consent_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE,
  INDEX `idx_consent_contact_purpose_state` (`contact_id`, `purpose`, `state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Programs (Live Fact Inventory)
CREATE TABLE IF NOT EXISTS `programs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(80) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'contact_team',
  `description` TEXT NULL,
  `public_fee_inr` INT UNSIGNED NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT TRUE,
  `next_session_date` DATE NULL,
  `last_verified_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_programs_slug_public` (`slug`, `is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Enrollments (Member Entitlements)
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `contact_id` BIGINT UNSIGNED NOT NULL,
  `program_id` BIGINT UNSIGNED NOT NULL,
  `state` VARCHAR(40) NOT NULL DEFAULT 'registered',
  `verified_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_enrollments_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_program` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE CASCADE,
  INDEX `idx_enrollments_contact_program` (`contact_id`, `program_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Voice Contexts (L1/L2 Opaque Short-lived lookup handles)
CREATE TABLE IF NOT EXISTS `voice_contexts` (
  `ref_hash` VARCHAR(64) PRIMARY KEY,
  `contact_id` BIGINT UNSIGNED NOT NULL,
  `purpose` VARCHAR(80) NOT NULL DEFAULT 'outbound_call',
  `expires_at` TIMESTAMP NOT NULL,
  `used_at` TIMESTAMP NULL,
  `payload_json` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_voice_contexts_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE,
  INDEX `idx_voice_contexts_expires` (`expires_at`),
  INDEX `idx_voice_contexts_contact` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Call Attempts (Outbound lifecycle and provider correlation)
CREATE TABLE IF NOT EXISTS `call_attempts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `contact_id` BIGINT UNSIGNED NOT NULL,
  `request_id` VARCHAR(120) NULL UNIQUE,
  `call_log_id` VARCHAR(120) NULL UNIQUE,
  `provider_call_id` VARCHAR(120) NULL UNIQUE,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `error_message` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_attempts_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE,
  INDEX `idx_attempts_status` (`status`),
  INDEX `idx_attempts_contact` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Call Outcomes (L3 Post-call intelligence and idempotent webhook results)
CREATE TABLE IF NOT EXISTS `call_outcomes` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `call_log_id` VARCHAR(120) NOT NULL UNIQUE,
  `call_attempt_id` BIGINT UNSIGNED NULL,
  `summary` TEXT NULL,
  `interest_level` ENUM('high', 'medium', 'low', 'unknown') NOT NULL DEFAULT 'unknown',
  `interested_program` VARCHAR(100) NULL,
  `callback_requested` BOOLEAN NOT NULL DEFAULT FALSE,
  `callback_datetime` DATETIME NULL,
  `do_not_call` BOOLEAN NOT NULL DEFAULT FALSE,
  `handoff_needed` BOOLEAN NOT NULL DEFAULT FALSE,
  `payload_hash` VARCHAR(64) NOT NULL,
  `raw_report_json` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_outcomes_attempt` (`call_attempt_id`),
  INDEX `idx_outcomes_payload_hash` (`payload_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Audit Events (Trace sensitive reads, DNC suppressions, and dispatches)
CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `actor_id` VARCHAR(100) NOT NULL DEFAULT 'system',
  `action` VARCHAR(80) NOT NULL,
  `object_type` VARCHAR(50) NOT NULL,
  `object_id` VARCHAR(100) NOT NULL,
  `details_json` JSON NULL,
  `occurred_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_action_occurred` (`action`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
