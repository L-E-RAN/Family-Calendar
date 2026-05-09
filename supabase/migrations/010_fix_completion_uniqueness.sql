-- Fix: completion uniqueness was per (item, profile, date) — proxy completions for different
-- children without accounts all share the parent's profile_id, so child B overwrote child A.
-- New: unique per (item, child_or_profile, date) using COALESCE so child_id takes priority.
ALTER TABLE daily_item_completions
  DROP CONSTRAINT IF EXISTS daily_item_completions_item_id_profile_id_completion_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_item_completions_unique_idx
  ON daily_item_completions (item_id, COALESCE(child_id, profile_id), completion_date);
