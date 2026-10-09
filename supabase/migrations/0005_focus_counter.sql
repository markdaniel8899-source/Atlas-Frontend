-- 0005_focus_counter.sql
-- Cumulative focus counter: lifetime focused seconds per course.
-- The timer loads this on start, counts up from it, and writes deltas back
-- on pause/stop. Discrete sessions still go to learning_sessions (heatmap).
-- Run after 0004_roadmaps.sql.

alter table public.courses
  add column if not exists total_focus_seconds integer not null default 0
  check (total_focus_seconds >= 0);
