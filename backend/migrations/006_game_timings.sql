ALTER TABLE game_sessions
  ADD COLUMN total_time_ms INT UNSIGNED NULL AFTER total_questions,
  ADD COLUMN answer_times_json JSON NULL AFTER total_time_ms;
