-- 0006_profile_focus.sql
-- Global lifetime focus counter on the user's profile. The dashboard hero
-- reads this, the timer counts up from it, and every committed session writes
-- its delta here alongside the per-course counter (0005).
-- Run after 0005_focus_counter.sql.

alter table public.profiles
  add column if not exists total_focus_seconds integer not null default 0
  check (total_focus_seconds >= 0);
