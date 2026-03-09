-- ============================================================
-- Reset script — run this in the Supabase SQL editor FIRST,
-- then run supabase/migrations/0001_schema.sql (or db push).
-- ============================================================

-- Drop functions
drop function if exists public.increment_card_usage(uuid, int) cascade;
drop function if exists public.get_user_plan(uuid) cascade;
drop function if exists public.get_user_usage(uuid) cascade;
drop function if exists public.reset_monthly_usage() cascade;
drop function if exists public.initialize_user_usage() cascade;

-- Drop tables (reverse dependency order)
drop table if exists public.billing_history        cascade;
drop table if exists public.user_usage             cascade;
drop table if exists public.user_subscriptions     cascade;
drop table if exists public.subscription_plans     cascade;
drop table if exists public.bookmarked_cards       cascade;
drop table if exists public.session_cards          cascade;
drop table if exists public.sessions               cascade;
drop table if exists public.cards                  cascade;
drop table if exists public.data_sources           cascade;
drop table if exists public.themes                 cascade;
drop table if exists public.profiles               cascade;

-- Clear Supabase migration history so db push can reapply from scratch
delete from supabase_migrations.schema_migrations;
