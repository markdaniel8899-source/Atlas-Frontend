-- 0017_admin_contact_inbox.sql
-- Contact-form inbox for /wp-admin/messages + admin-wide focus-time reads.
--
-- The contact_messages table already exists in production (created from the
-- SQL editor with exactly the columns below), so the CREATE is idempotent
-- and only runs where the table is missing. The policies use the same
-- is_admin() gate as 0014_admin.sql:
--
--   * admins: SELECT / UPDATE (mark read) / DELETE over the whole inbox
--   * anyone: INSERT (public contact form submissions)
--   * learning_sessions gains an admin SELECT policy so the Usage page can
--     sum total_seconds platform-wide instead of only the admin's own rows
--
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null default '',
  subject text not null default '',
  message text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Admins own the inbox.
drop policy if exists "contact_messages_select_admin" on public.contact_messages;
create policy "contact_messages_select_admin"
  on public.contact_messages for select to authenticated
  using (public.is_admin());

drop policy if exists "contact_messages_update_admin" on public.contact_messages;
create policy "contact_messages_update_admin"
  on public.contact_messages for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contact_messages_delete_admin" on public.contact_messages;
create policy "contact_messages_delete_admin"
  on public.contact_messages for delete to authenticated
  using (public.is_admin());

-- Anyone may submit a message from the public contact form.
drop policy if exists "contact_messages_insert_public" on public.contact_messages;
create policy "contact_messages_insert_public"
  on public.contact_messages for insert
  with check (true);

-- Usage & Analytics: total focus time across all users (0001 only lets
-- users read their own sessions).
drop policy if exists "learning_sessions_select_admin" on public.learning_sessions;
create policy "learning_sessions_select_admin"
  on public.learning_sessions for select to authenticated
  using (public.is_admin());
