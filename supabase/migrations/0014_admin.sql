-- 0014_admin.sql
-- Admin panel support: a `role` on profiles, an `is_admin()` helper that is
-- safe to call from inside RLS policies, admin-scoped policies, and two
-- SECURITY DEFINER RPCs (list users w/ email, delete a user fully).
--
-- Security model:
--   * Role lives on profiles (default 'user'). is_admin() is SECURITY DEFINER
--     so a profiles policy can read the caller's role without recursing.
--   * Every admin capability is gated by is_admin() at the database, so the
--     client-side role check is only a UX guard -- the DB is the authority.
--   * Emails live in auth.users (not profiles, which is world-readable to
--     authenticated users). They are exposed ONLY through admin_list_users(),
--     which is SECURITY DEFINER and refuses to return rows for non-admins.

-- =========================================================================
-- 1. ROLE COLUMN
-- =========================================================================
alter table public.profiles
  add column if not exists role text not null default 'user';

-- =========================================================================
-- 2. is_admin() - SECURITY DEFINER so policies can call it without recursion
-- =========================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- =========================================================================
-- 3. ADMIN-SCOPED ROW LEVEL SECURITY
-- =========================================================================

-- Profiles: any authenticated user may already SELECT (see 0001). Admins may
-- additionally DELETE a profile. (Full user removal goes through
-- admin_delete_user below; this policy covers a direct profiles delete.)
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- Blog posts: admins see drafts + published, and may delete any post.
drop policy if exists "blog_posts_select_admin" on public.blog_posts;
create policy "blog_posts_select_admin"
  on public.blog_posts for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_posts_delete_admin" on public.blog_posts;
create policy "blog_posts_delete_admin"
  on public.blog_posts for delete to authenticated
  using (public.is_admin());

-- Quiz attempts: admins may SELECT all rows (for the platform-wide count).
drop policy if exists "quiz_attempts_select_admin" on public.quiz_attempts;
create policy "quiz_attempts_select_admin"
  on public.quiz_attempts for select to authenticated
  using (public.is_admin());

-- =========================================================================
-- 4. admin_list_users() - join profiles + auth.users for email, admin-gated
-- =========================================================================
create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  email text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    u.email,
    p.role,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- =========================================================================
-- 5. admin_delete_user() - delete the auth user (cascades to profiles + data)
-- =========================================================================
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if target is null or target = (select auth.uid()) then
    raise exception 'cannot delete your own admin account';
  end if;

  -- Deleting auth.users cascades to profiles and every user-owned table.
  delete from auth.users where id = target;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
