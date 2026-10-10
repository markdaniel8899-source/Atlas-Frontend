-- 0011_gamification.sql
-- Gamification upgrade: rank tiers, weekly XP, achievements, quiz sessions,
-- and real squads with join requests + leaderboards.
-- Run after 0010_blog_posts_content_images.sql.

-- =========================================================================
-- 1. PROFILE COLUMNS - rank, weekly XP, spec-friendly aliases
-- =========================================================================
alter table public.profiles
  add column if not exists weekly_xp integer not null default 0
    check (weekly_xp >= 0),
  add column if not exists weekly_xp_week_start date,
  -- Aliases kept in sync automatically so the API matches the product spec
  -- (total_xp / day_streak) without breaking existing xp / streak queries.
  add column if not exists total_xp integer generated always as (xp) stored,
  add column if not exists day_streak integer generated always as (streak) stored,
  add column if not exists rank text generated always as (
    case
      when level >= 50 then 'Grandmaster'
      when level >= 31 then 'Master'
      when level >= 16 then 'Expert'
      when level >= 6  then 'Scholar'
      else 'Novice'
    end
  ) stored;

-- Bootstrap weekly boards for existing learners from lifetime XP.
update public.profiles
   set weekly_xp = xp,
       weekly_xp_week_start = date_trunc('week', (now() at time zone 'utc'))::date
 where weekly_xp = 0 and xp > 0;

-- =========================================================================
-- 2. RECORD_ACTIVITY - accumulate weekly XP with a Monday reset
-- =========================================================================
create or replace function public.record_activity(p_xp integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_today date := (now() at time zone 'utc')::date;
  v_last date;
  v_streak integer;
  v_xp integer;
  v_week date := date_trunc('week', (now() at time zone 'utc'))::date;
  v_week_start date;
  v_week_xp integer;
  v_gain integer := greatest(coalesce(p_xp, 0), 0);
begin
  if v_uid is null then
    raise exception 'record_activity requires an authenticated user';
  end if;

  select last_active_date, streak, xp, weekly_xp, weekly_xp_week_start
    into v_last, v_streak, v_xp, v_week_xp, v_week_start
    from public.profiles
   where id = v_uid
     for update;

  if not found then
    raise exception 'profile % not found', v_uid;
  end if;

  if v_last is null or v_last < (v_today - 1) then
    v_streak := 1;
  elsif v_last = (v_today - 1) then
    v_streak := v_streak + 1;
  end if;

  if v_week_start is null or v_week_start < v_week then
    v_week_xp := 0;
    v_week_start := v_week;
  end if;

  v_xp := v_xp + v_gain;
  v_week_xp := v_week_xp + v_gain;

  update public.profiles
     set streak = v_streak,
         xp = v_xp,
         weekly_xp = v_week_xp,
         weekly_xp_week_start = v_week_start,
         level = 1 + (v_xp / 200),
         last_active_date = v_today,
         updated_at = now()
   where id = v_uid;

  return (select to_jsonb(p) from public.profiles p where p.id = v_uid);
end;
$$;

-- =========================================================================
-- 3. GAMIFICATION COLUMN SHIELD - clients may edit profile fields, never
--    XP/level/streak counters (only security-definer RPCs and the
--    service role move those).
-- =========================================================================
create or replace function public.protect_gamification_columns()
returns trigger
language plpgsql
as $$
begin
  -- Inside SECURITY DEFINER functions the owner role (postgres) or the
  -- service role is active; those paths are trusted.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  new.xp := old.xp;
  new.streak := old.streak;
  new.level := old.level;
  new.weekly_xp := old.weekly_xp;
  new.weekly_xp_week_start := old.weekly_xp_week_start;
  return new;
end;
$$;

drop trigger if exists profiles_protect_gamification on public.profiles;
create trigger profiles_protect_gamification
  before update on public.profiles
  for each row execute function public.protect_gamification_columns();

-- =========================================================================
-- 4. ACHIEVEMENTS
-- =========================================================================
create table if not exists public.achievements (
  id bigint generated always as identity primary key,
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default 'trophy',
  tier text not null default 'bronze'
    check (tier in ('bronze', 'silver', 'gold', 'legendary')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  achievement_id bigint not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  constraint user_achievements_unique unique (user_id, achievement_id)
);

create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists achievements_select_all on public.achievements;
create policy achievements_select_all
  on public.achievements for select to authenticated
  using (true);

drop policy if exists user_achievements_select_own on public.user_achievements;
create policy user_achievements_select_own
  on public.user_achievements for select to authenticated
  using (user_id = (select auth.uid()));

insert into public.achievements (code, title, description, icon, tier) values
  ('first_quiz', 'First Steps', 'Complete your very first quiz.', 'footprints', 'bronze'),
  ('streak_master', '7-Day Streak Master', 'Keep a study streak alive for 7 days in a row.', 'flame', 'gold'),
  ('night_owl', 'Night Owl', 'Finish a quiz or study session between midnight and 4 AM.', 'moon', 'silver'),
  ('quiz_wizard', 'Quiz Wizard', 'Score 90% or higher on 10 different quizzes.', 'wand', 'legendary')
on conflict (code) do nothing;

-- =========================================================================
-- 5. QUIZ SESSIONS - per-quiz results feed the achievement engine
-- =========================================================================
create table if not exists public.quiz_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  topic text not null default '',
  kind text not null default 'mixed',
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= 0),
  score_percent numeric(5, 2) not null default 0
    check (score_percent between 0 and 100),
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now()
);

create index if not exists quiz_sessions_user_created_idx
  on public.quiz_sessions (user_id, created_at desc);
create index if not exists quiz_sessions_user_score_idx
  on public.quiz_sessions (user_id, score_percent);

alter table public.quiz_sessions enable row level security;

drop policy if exists quiz_sessions_select_own on public.quiz_sessions;
create policy quiz_sessions_select_own
  on public.quiz_sessions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists quiz_sessions_insert_own on public.quiz_sessions;
create policy quiz_sessions_insert_own
  on public.quiz_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

-- =========================================================================
-- 6. ACHIEVEMENT ENGINE
-- =========================================================================
create or replace function public.check_user_achievements(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_unlocked text[] := '{}';
  v_night timestamptz;
begin
  if v_uid is null then
    if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
      raise exception 'check_user_achievements requires an authenticated user';
    end if;
    v_uid := p_user_id;
  end if;

  -- "7-Day Streak Master"
  if exists (
    select 1 from public.profiles where id = v_uid and streak >= 7
  ) then
    insert into public.user_achievements (user_id, achievement_id)
    select v_uid, a.id from public.achievements a where a.code = 'streak_master'
    on conflict do nothing;
    if found then
      v_unlocked := array_append(v_unlocked, 'streak_master');
    end if;
  end if;

  -- "Night Owl" - a study session or quiz finished between 00:00 and 04:00 UTC.
  select ls.started_at into v_night
    from public.learning_sessions ls
   where ls.user_id = v_uid
     and extract(hour from ls.started_at at time zone 'utc') between 0 and 3
   limit 1;

  if v_night is null then
    select qs.created_at into v_night
      from public.quiz_sessions qs
     where qs.user_id = v_uid
       and extract(hour from qs.created_at at time zone 'utc') between 0 and 3
     limit 1;
  end if;

  if v_night is not null then
    insert into public.user_achievements (user_id, achievement_id)
    select v_uid, a.id from public.achievements a where a.code = 'night_owl'
    on conflict do nothing;
    if found then
      v_unlocked := array_append(v_unlocked, 'night_owl');
    end if;
  end if;

  -- "Quiz Wizard" - 90%+ on 10 different quizzes.
  if (
    select count(*)
      from public.quiz_sessions qs
     where qs.user_id = v_uid and qs.score_percent >= 90
  ) >= 10 then
    insert into public.user_achievements (user_id, achievement_id)
    select v_uid, a.id from public.achievements a where a.code = 'quiz_wizard'
    on conflict do nothing;
    if found then
      v_unlocked := array_append(v_unlocked, 'quiz_wizard');
    end if;
  end if;

  -- "First Steps"
  if exists (select 1 from public.quiz_sessions qs where qs.user_id = v_uid) then
    insert into public.user_achievements (user_id, achievement_id)
    select v_uid, a.id from public.achievements a where a.code = 'first_quiz'
    on conflict do nothing;
    if found then
      v_unlocked := array_append(v_unlocked, 'first_quiz');
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'unlocked', to_jsonb(v_unlocked),
    'total', (select count(*) from public.user_achievements ua where ua.user_id = v_uid)
  );
end;
$$;

-- =========================================================================
-- 7. RECORD_QUIZ_SESSION - persist results, award XP, run achievements
-- =========================================================================
create or replace function public.record_quiz_session(
  p_topic text default '',
  p_kind text default 'mixed',
  p_correct integer default 0,
  p_total integer default 0,
  p_xp integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_correct integer := greatest(coalesce(p_correct, 0), 0);
  v_total integer := greatest(coalesce(p_total, 0), 0);
  v_xp integer := greatest(coalesce(p_xp, 0), 0);
  v_score numeric(5, 2);
  v_session_id bigint;
  v_profile jsonb;
  v_achievements jsonb;
begin
  if v_uid is null then
    raise exception 'record_quiz_session requires an authenticated user';
  end if;

  v_score := case
    when v_total > 0 then round((v_correct::numeric / v_total) * 100, 2)
    else 0
  end;

  insert into public.quiz_sessions
    (user_id, topic, kind, correct, total, score_percent, xp)
  values
    (v_uid, left(coalesce(p_topic, ''), 160), left(coalesce(p_kind, 'mixed'), 24),
     v_correct, v_total, least(greatest(v_score, 0), 100), v_xp)
  returning id into v_session_id;

  v_profile := public.record_activity(v_xp);
  v_achievements := public.check_user_achievements();

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'score_percent', v_score,
    'profile', v_profile,
    'achievements', v_achievements
  );
end;
$$;

-- =========================================================================
-- 8. SQUADS - squads, members, join requests
-- =========================================================================
create table if not exists public.squads (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 40),
  leader_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.squad_members (
  id bigint generated always as identity primary key,
  squad_id bigint not null references public.squads (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint squad_members_unique unique (squad_id, user_id)
);

create index if not exists squad_members_user_idx on public.squad_members (user_id);
create index if not exists squad_members_squad_idx on public.squad_members (squad_id);

create table if not exists public.squad_requests (
  id bigint generated always as identity primary key,
  squad_id bigint not null references public.squads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  -- Set when the squad leader invited this user (as opposed to a join request).
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists squad_requests_pending_unique
  on public.squad_requests (squad_id, user_id) where status = 'pending';
create index if not exists squad_requests_squad_status_idx
  on public.squad_requests (squad_id, status);
create index if not exists squad_requests_user_status_idx
  on public.squad_requests (user_id, status);
create index if not exists squad_requests_inviter_status_idx
  on public.squad_requests (invited_by, status);

drop trigger if exists squad_requests_set_updated_at on public.squad_requests;
create trigger squad_requests_set_updated_at
  before update on public.squad_requests
  for each row execute function public.set_updated_at();

alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_requests enable row level security;

drop policy if exists squads_select_all on public.squads;
create policy squads_select_all
  on public.squads for select to authenticated
  using (true);

drop policy if exists squads_insert_own on public.squads;
create policy squads_insert_own
  on public.squads for insert to authenticated
  with check (leader_id = (select auth.uid()));

drop policy if exists squads_update_leader on public.squads;
create policy squads_update_leader
  on public.squads for update to authenticated
  using (leader_id = (select auth.uid()))
  with check (leader_id = (select auth.uid()));

drop policy if exists squad_members_select_all on public.squad_members;
create policy squad_members_select_all
  on public.squad_members for select to authenticated
  using (true);

drop policy if exists squad_requests_select_related on public.squad_requests;
create policy squad_requests_select_related
  on public.squad_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or invited_by = (select auth.uid())
    or exists (
      select 1 from public.squads s
       where s.id = squad_id and s.leader_id = (select auth.uid())
    )
  );

-- =========================================================================
-- 9. SQUAD HELPERS + RPCs
-- =========================================================================
create or replace function public.current_squad_of(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select sm.squad_id
    from public.squad_members sm
   where sm.user_id = p_user_id
   limit 1;
$$;

create or replace function public.create_squad(p_name text, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_squad_id bigint;
begin
  if v_uid is null then
    if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
      raise exception 'create_squad requires an authenticated user';
    end if;
    v_uid := p_user_id;
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'message', 'Squad names must be 2-40 characters.');
  end if;

  if exists (select 1 from public.squad_members sm where sm.user_id = v_uid) then
    return jsonb_build_object('ok', false, 'message', 'You are already in a squad. Leave it first.');
  end if;

  insert into public.squads (name, leader_id)
  values (left(v_name, 40), v_uid)
  returning id into v_squad_id;

  insert into public.squad_members (squad_id, user_id) values (v_squad_id, v_uid);

  return jsonb_build_object('ok', true, 'squad_id', v_squad_id, 'message', 'Squad created.');
end;
$$;

create or replace function public.request_join_squad(p_squad_id bigint, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_squad public.squads%rowtype;
  v_request_id bigint;
begin
  if v_uid is null then
    if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
      raise exception 'request_join_squad requires an authenticated user';
    end if;
    v_uid := p_user_id;
  end if;

  select * into v_squad from public.squads s where s.id = p_squad_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Squad not found.');
  end if;

  if v_squad.leader_id = v_uid then
    return jsonb_build_object('ok', false, 'message', 'That is your own squad.');
  end if;

  if exists (
    select 1 from public.squad_members sm
     where sm.squad_id = p_squad_id and sm.user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'message', 'You are already in this squad.');
  end if;

  insert into public.squad_requests (squad_id, user_id, status)
  values (p_squad_id, v_uid, 'pending')
  on conflict (squad_id, user_id) where status = 'pending' do nothing
  returning id into v_request_id;

  if v_request_id is null then
    return jsonb_build_object('ok', false, 'message', 'Your request is already pending.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'message', left(v_squad.name, 60) || ' leader will review your request.'
  );
end;
$$;

create or replace function public.invite_to_squad(p_email text, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_squad_id bigint;
  v_squad public.squads%rowtype;
  v_peer uuid;
  v_request_id bigint;
begin
  if v_uid is null then
    if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
      raise exception 'invite_to_squad requires an authenticated user';
    end if;
    v_uid := p_user_id;
  end if;

  v_squad_id := public.current_squad_of(v_uid);
  if v_squad_id is null then
    return jsonb_build_object('ok', false, 'message', 'Create a squad before inviting anyone.');
  end if;

  select * into v_squad from public.squads s where s.id = v_squad_id;
  if v_squad.leader_id <> v_uid then
    return jsonb_build_object('ok', false, 'message', 'Only the squad leader can invite.');
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter an email address.');
  end if;

  select u.id into v_peer
    from auth.users u
   where lower(u.email) = lower(trim(p_email))
   limit 1;

  if v_peer is null then
    return jsonb_build_object('ok', false, 'message', 'No ATLAS account uses that email yet.');
  end if;

  if v_peer = v_uid then
    return jsonb_build_object('ok', false, 'message', 'That is your own email.');
  end if;

  if exists (
    select 1 from public.squad_members sm
     where sm.squad_id = v_squad_id and sm.user_id = v_peer
  ) then
    return jsonb_build_object('ok', false, 'message', 'They are already in your squad.');
  end if;

  insert into public.squad_requests (squad_id, user_id, status, invited_by)
  values (v_squad_id, v_peer, 'pending', v_uid)
  on conflict (squad_id, user_id) where status = 'pending' do nothing
  returning id into v_request_id;

  if v_request_id is null then
    return jsonb_build_object('ok', false, 'message', 'An invite is already pending.');
  end if;

  return jsonb_build_object('ok', true, 'message', 'Invite sent.');
end;
$$;

create or replace function public.respond_squad_request(
  p_request_id bigint,
  p_accept boolean,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.squad_requests%rowtype;
  v_is_leader boolean;
begin
  if v_uid is null then
    if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
      raise exception 'respond_squad_request requires an authenticated user';
    end if;
    v_uid := p_user_id;
  end if;

  select * into v_request
    from public.squad_requests r
   where r.id = p_request_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Request not found.');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'message', 'This request was already handled.');
  end if;

  v_is_leader := exists (
    select 1 from public.squads s
     where s.id = v_request.squad_id and s.leader_id = v_uid
  );

  if v_request.invited_by is not null then
    -- Leader invite: only the invited user may accept. The inviter (or the
    -- squad leader) may withdraw it, which records as declined.
    if v_request.user_id <> v_uid and v_request.invited_by <> v_uid and not v_is_leader then
      return jsonb_build_object('ok', false, 'message', 'Only the invited member can respond.');
    end if;
    if v_request.user_id <> v_uid and coalesce(p_accept, false) then
      return jsonb_build_object('ok', false, 'message', 'Only the invited member can accept an invite.');
    end if;
  elsif not v_is_leader then
    return jsonb_build_object('ok', false, 'message', 'Only the squad leader can respond to join requests.');
  end if;

  if coalesce(p_accept, false) then
    insert into public.squad_members (squad_id, user_id)
    values (v_request.squad_id, v_request.user_id)
    on conflict do nothing;

    update public.squad_requests r
       set status = 'accepted'
     where r.id = v_request.id;

    return jsonb_build_object('ok', true, 'message', 'Member joined the squad.');
  end if;

  update public.squad_requests r
     set status = 'declined'
   where r.id = v_request.id;

  return jsonb_build_object('ok', true, 'message', 'Request declined.');
end;
$$;

create or replace function public.leave_squad(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_squad_id bigint;
  v_is_leader boolean;
  v_next_leader uuid;
begin
  if v_uid is null then
    if coalesce(auth.role(), '') <> 'service_role' or p_user_id is null then
      raise exception 'leave_squad requires an authenticated user';
    end if;
    v_uid := p_user_id;
  end if;

  v_squad_id := public.current_squad_of(v_uid);
  if v_squad_id is null then
    return jsonb_build_object('ok', false, 'message', 'You are not in a squad.');
  end if;

  select (s.leader_id = v_uid) into v_is_leader
    from public.squads s where s.id = v_squad_id;

  delete from public.squad_members sm
   where sm.squad_id = v_squad_id and sm.user_id = v_uid;

  if coalesce(v_is_leader, false) then
    select sm.user_id into v_next_leader
      from public.squad_members sm
     where sm.squad_id = v_squad_id
     order by sm.joined_at
     limit 1;

    if v_next_leader is not null then
      update public.squads s set leader_id = v_next_leader where s.id = v_squad_id;
    else
      delete from public.squads s where s.id = v_squad_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'message', 'You left the squad.');
end;
$$;

-- =========================================================================
-- 10. GRANTS
-- =========================================================================
revoke execute on function public.check_user_achievements(uuid) from public, anon;
revoke execute on function public.record_quiz_session(text, text, integer, integer, integer) from public, anon;
revoke execute on function public.record_activity(integer) from public, anon;
revoke execute on function public.current_squad_of(uuid) from public, anon;
revoke execute on function public.create_squad(text, uuid) from public, anon;
revoke execute on function public.request_join_squad(bigint, uuid) from public, anon;
revoke execute on function public.invite_to_squad(text, uuid) from public, anon;
revoke execute on function public.respond_squad_request(bigint, boolean, uuid) from public, anon;
revoke execute on function public.leave_squad(uuid) from public, anon;

grant execute on function public.check_user_achievements(uuid) to authenticated, service_role;
grant execute on function public.record_quiz_session(text, text, integer, integer, integer) to authenticated, service_role;
grant execute on function public.current_squad_of(uuid) to authenticated, service_role;
grant execute on function public.create_squad(text, uuid) to authenticated, service_role;
grant execute on function public.request_join_squad(bigint, uuid) to authenticated, service_role;
grant execute on function public.invite_to_squad(text, uuid) to authenticated, service_role;
grant execute on function public.respond_squad_request(bigint, boolean, uuid) to authenticated, service_role;
grant execute on function public.leave_squad(uuid) to authenticated, service_role;
