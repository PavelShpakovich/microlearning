-- Language preference is stored exclusively in the NEXT_LOCALE cookie.
-- The DB column was never read back to restore the cookie, making it a dead write.
-- For Telegram users the language is auto-detected from Telegram's language_code on each login.

drop index if exists public.idx_profiles_ui_language;
alter table public.profiles drop column if exists ui_language;
