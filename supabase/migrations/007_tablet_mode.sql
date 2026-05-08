-- Tablet mode: PIN hash stored on families table
ALTER TABLE families ADD COLUMN IF NOT EXISTS tablet_pin_hash TEXT;
