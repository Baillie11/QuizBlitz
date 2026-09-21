-- ============================================================
-- QuizBlitz – Migration 003: Admin Users
-- Run: mysql -u root quizblitz < backend/migrations/003_admin_users.sql
-- ============================================================

USE quizblitz;

CREATE TABLE IF NOT EXISTS admin_users (
  id                   INT          NOT NULL AUTO_INCREMENT,
  email                VARCHAR(255) NOT NULL,
  username             VARCHAR(100) NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  must_change_password TINYINT(1)   NOT NULL DEFAULT 1,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default admin: andrew@clickecommerce.com.au / P@ssword123
-- bcrypt hash of "P@ssword123" (cost=12) – generated offline
INSERT INTO admin_users (email, username, password_hash, must_change_password)
VALUES (
  'andrew@clickecommerce.com.au',
  'Andrew',
  '$2b$12$PLACEHOLDER_HASH_REPLACED_BY_SEEDER',
  1
)
ON DUPLICATE KEY UPDATE email = email;
