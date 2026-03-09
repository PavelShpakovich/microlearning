-- Add pending email verification columns to profiles.
-- The stub auth email stays unchanged until the user clicks the verification link.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pending_email text,
  ADD COLUMN IF NOT EXISTS email_verification_token text,
  ADD COLUMN IF NOT EXISTS email_verification_token_expires_at timestamptz;

-- Index for fast token lookup on click
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_verification_token_idx
  ON profiles (email_verification_token)
  WHERE email_verification_token IS NOT NULL;
