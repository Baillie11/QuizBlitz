-- ============================================================
-- TriviaApp – Initial Schema  (MySQL / MariaDB)
-- Run via phpMyAdmin, cPanel MySQL, or CLI: mysql -u root -p triviaapp < 001_initial_schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS triviaapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE triviaapp;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   INT          NOT NULL AUTO_INCREMENT,
  email                VARCHAR(255) NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  display_name         VARCHAR(100),
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_premium           TINYINT(1)   NOT NULL DEFAULT 0,
  premium_source       VARCHAR(50),           -- 'stripe' | 'iap' | 'manual'
  ad_opt_out           TINYINT(1)   NOT NULL DEFAULT 0,
  preferred_categories JSON,                  -- array of category IDs
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT         NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  external_id INT,                             -- OpenTDB category ID
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── question_sources ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_sources (
  id       INT          NOT NULL AUTO_INCREMENT,
  name     VARCHAR(100) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  notes    TEXT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── questions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id                     INT         NOT NULL AUTO_INCREMENT,
  category_id            INT         NOT NULL,
  source_id              INT         NOT NULL,
  external_ref           VARCHAR(255),
  question_text          TEXT        NOT NULL,
  question_text_hash     CHAR(64)    NOT NULL,  -- SHA-256 for dedup
  difficulty             ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  correct_answer         TEXT        NOT NULL,
  incorrect_answers_json JSON        NOT NULL,
  created_at             DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_source_question_hash (source_id, question_text_hash),
  CONSTRAINT fk_questions_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_questions_source   FOREIGN KEY (source_id)   REFERENCES question_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── game_sessions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id              INT      NOT NULL AUTO_INCREMENT,
  user_id         INT,                              -- nullable for guest play
  category_id     INT      NOT NULL,
  difficulty      VARCHAR(20),
  score           INT      NOT NULL DEFAULT 0,
  total_questions INT      NOT NULL,
  started_at      DATETIME          DEFAULT CURRENT_TIMESTAMP,
  finished_at     DATETIME,
  PRIMARY KEY (id),
  CONSTRAINT fk_sessions_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_sessions_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
