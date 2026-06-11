INSERT INTO app_settings (`key`, `value`) VALUES
  ('multiplayer_min_players', '2'),
  ('multiplayer_default_max_players', '10'),
  ('multiplayer_start_threshold_percent', '80')
ON DUPLICATE KEY UPDATE `key` = `key`;
