-- Drop unused columns from profiles table:
-- email_unverified, pending_email, email_verification_token,
-- email_verification_token_expires_at — remnants of the deleted email upgrade flow.
-- streak_count, last_study_date — streak feature was never implemented.

DROP INDEX IF EXISTS profiles_email_verification_token_idx;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS email_unverified,
  DROP COLUMN IF EXISTS pending_email,
  DROP COLUMN IF EXISTS email_verification_token,
  DROP COLUMN IF EXISTS email_verification_token_expires_at,
  DROP COLUMN IF EXISTS streak_count,
  DROP COLUMN IF EXISTS last_study_date;
