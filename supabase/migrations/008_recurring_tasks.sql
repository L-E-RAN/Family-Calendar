-- Add is_recurring flag to calendar_items
-- Recurring tasks appear every day; non-recurring disappear after completion
ALTER TABLE calendar_items ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
