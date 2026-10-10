-- 0012_friends_only_and_freefire_ranks.sql
-- Reverts the social graph to friends only (drop squads + join requests)
-- and switches the generated rank column to Free Fire style tiers:
-- Bronze 1-10, Silver 11-20, Gold 21-30, Platinum 31-40, Diamond 41-49,
-- Heroic 50+. Weekly XP, achievements and quiz sessions stay untouched.
-- Run after 0011_gamification.sql.

-- =========================================================================
-- 1. FREE FIRE RANKS - generated column must be dropped to change its CASE
-- =========================================================================
alter table public.profiles drop column if exists rank;

alter table public.profiles
  add column rank text generated always as (
    case
      when level >= 50 then 'Heroic'
      when level >= 41 then 'Diamond'
      when level >= 31 then 'Platinum'
      when level >= 21 then 'Gold'
      when level >= 11 then 'Silver'
      else 'Bronze'
    end
  ) stored;

-- =========================================================================
-- 2. DROP SQUADS - functions first, then tables (policies, triggers and
--    indexes follow their table). friendships + invite_friend remain the
--    whole social system.
-- =========================================================================
drop function if exists public.current_squad_of(uuid);
drop function if exists public.create_squad(text, uuid);
drop function if exists public.request_join_squad(bigint, uuid);
drop function if exists public.invite_to_squad(text, uuid);
drop function if exists public.respond_squad_request(bigint, boolean, uuid);
drop function if exists public.leave_squad(uuid);

drop table if exists public.squad_requests cascade;
drop table if exists public.squad_members cascade;
drop table if exists public.squads cascade;
