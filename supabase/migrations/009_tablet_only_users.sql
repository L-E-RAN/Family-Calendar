-- Tablet-only accounts: redirect straight to /tablet, no app navigation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tablet_only boolean DEFAULT false;
