-- 0013_step_based_ranks.sql
-- Removes the old generated `rank` column (tied to the level system).
-- The new step-based Free Fire rank system (Bronze I-IV, Silver I-IV,
-- Gold I-IV, Platinum I-IV, Conqueror) is calculated on the fly from
-- total XP using the client-side getRankFromXP() helper. No database
-- storage needed since ranks derive from the `xp` column.
-- Run after 0012_friends_only_and_freefire_ranks.sql.

-- Drop the old generated rank column (was level-based, now unused)
alter table public.profiles drop column if exists rank;

-- Add a comment documenting the new rank system
comment on column public.profiles.xp is
  'Total lifetime XP. Used to calculate Free Fire style step-based ranks
   (Bronze I-IV, Silver I-IV, Gold I-IV, Platinum I-IV, Conqueror) via
   client-side getRankFromXP(). No rank column needed in database.';
