create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_username text;
  v_avatar text;
begin
  v_name := left(coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    ''
  ), 60);

  v_username := regexp_replace(lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(coalesce(new.email, 'learner'), '@', 1)
  )), '[^a-z0-9_]+', '', 'g');

  if char_length(v_username) < 3 then
    v_username := left(v_username || 'learner', 30);
  end if;

  v_username := left(v_username, 24);

  while exists (select 1 from public.profiles p where p.username = v_username) loop
    v_username := left(v_username || floor(random() * 9000 + 1000)::text, 30);
  end loop;

  v_avatar := new.raw_user_meta_data ->> 'avatar_url';

  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, v_username, v_name, v_avatar)
  on conflict (id) do nothing;

  return new;
end;
$$;

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
begin
  if v_uid is null then
    raise exception 'record_activity requires an authenticated user';
  end if;

  select last_active_date, streak, xp
    into v_last, v_streak, v_xp
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

  v_xp := v_xp + greatest(coalesce(p_xp, 0), 0);

  update public.profiles
     set streak = v_streak,
         xp = v_xp,
         level = 1 + (v_xp / 200),
         last_active_date = v_today,
         updated_at = now()
   where id = v_uid;

  return (select to_jsonb(p) from public.profiles p where p.id = v_uid);
end;
$$;

create or replace function public.activity_heatmap(p_days integer default 365)
returns table (day date, total_seconds bigint, session_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select ls.started_at::date as day,
         sum(ls.total_seconds)::bigint as total_seconds,
         count(*)::bigint as session_count
    from public.learning_sessions as ls
   where ls.user_id = auth.uid()
     and ls.started_at >= ((now() at time zone 'utc')::date - ($1 - 1))
   group by ls.started_at::date
   order by 1;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create trigger course_topics_set_updated_at
  before update on public.course_topics
  for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.record_activity(integer) from public, anon;
revoke execute on function public.activity_heatmap(integer) from public, anon;
grant execute on function public.record_activity(integer) to authenticated, service_role;
grant execute on function public.activity_heatmap(integer) to authenticated, service_role;
