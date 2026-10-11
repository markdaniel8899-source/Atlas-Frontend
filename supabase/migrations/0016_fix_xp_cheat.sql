-- 0016_fix_xp_cheat.sql
-- SERVER-SIDE XP AUTHORITY: clients can no longer mint arbitrary XP.
--
-- * record_activity keeps its (p_xp) signature (existing callers: frontend
--   rpc calls and record_quiz_session) but now CAPS the client-supplied
--   value at 1440 - the most legitimate focus can produce in one day
--   (XP_PER_MINUTE = 1, so 24h x 60min = 1440). Values like 999999 are
--   clamped to the daily ceiling; all real values pass through unchanged.
--
-- * record_quiz_session now IGNORES the client's p_xp entirely and derives
--   the award from p_correct using the app's own formula
--   (XP_PER_CORRECT = 10 in src/lib/quiz.ts), with sane bounds on the
--   counts themselves. p_xp stays in the signature for backward
--   compatibility only - it is never trusted again.

-- =========================================================================
-- 1. RECORD_ACTIVITY - cap the client-supplied gain
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
  -- Capped, never trusted: <= 1440 XP (a full day of focus at 1 XP/min).
  v_gain integer := least(greatest(coalesce(p_xp, 0), 0), 1440);
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
-- 2. RECORD_QUIZ_SESSION - derive XP from p_correct; p_xp is ignored
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
  -- Bounds: quizzes are capped at 20 questions (schemas.py count le=20);
  -- 50 leaves headroom without allowing fabricated totals.
  v_correct integer := least(greatest(coalesce(p_correct, 0), 0), 50);
  v_total integer := least(greatest(coalesce(p_total, 0), 0), 50);
  v_gain integer;
  v_score numeric(5, 2);
  v_session_id bigint;
  v_profile jsonb;
  v_achievements jsonb;
begin
  if v_uid is null then
    raise exception 'record_quiz_session requires an authenticated user';
  end if;

  -- Never more correct answers than questions.
  v_correct := least(v_correct, v_total);

  -- SERVER-COMPUTED award: XP_PER_CORRECT = 10 (src/lib/quiz.ts).
  -- The client's p_xp argument is deliberately ignored.
  v_gain := v_correct * 10;

  v_score := case
    when v_total > 0 then round((v_correct::numeric / v_total) * 100, 2)
    else 0
  end;

  insert into public.quiz_sessions
    (user_id, topic, kind, correct, total, score_percent, xp)
  values
    (v_uid, left(coalesce(p_topic, ''), 160), left(coalesce(p_kind, 'mixed'), 24),
     v_correct, v_total, least(greatest(v_score, 0), 100), v_gain)
  returning id into v_session_id;

  v_profile := public.record_activity(v_gain);
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

-- Signatures are unchanged, so all existing EXECUTE grants (0002:143,
-- 0011:731) carry over - no re-grant needed, no client changes needed.
