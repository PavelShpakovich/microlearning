-- Add streak tracking to profiles table
alter table public.profiles 
  add column if not exists streak_count int default 0,
  add column if not exists last_study_date date;

-- Update profiles RLS policy to allow updates for streak
-- (existing update policy should already allow this)
