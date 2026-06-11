-- ============================================================
-- TriviaApp – Migration 002: App Settings
-- Run: mysql -u root triviaapp < backend/migrations/002_app_settings.sql
-- ============================================================

USE triviaapp;

CREATE TABLE IF NOT EXISTS app_settings (
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pre-seed default settings
INSERT INTO app_settings (`key`, `value`) VALUES
  ('ads_enabled',                    'true'),
  ('admob_banner_android',           ''),
  ('admob_banner_ios',               ''),
  ('admob_interstitial_android',     ''),
  ('admob_interstitial_ios',         ''),
  ('applovin_sdk_key',               ''),
  ('applovin_banner_ad_unit',        ''),
  ('applovin_interstitial_ad_unit',  '')
ON DUPLICATE KEY UPDATE `key` = `key`;
