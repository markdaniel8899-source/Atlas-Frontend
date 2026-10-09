create type public.course_status as enum (
  'not_started', 'in_progress', 'paused', 'completed'
);

create type public.quiz_kind as enum ('mcq', 'code', 'debug', 'output');

create type public.quiz_difficulty as enum ('easy', 'medium', 'hard');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 30),
  display_name text not null default '',
  streak integer not null default 0 check (streak >= 0),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  avatar_url text,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  status public.course_status not null default 'not_started',
  progress_percentage numeric(5, 2) not null default 0
    check (progress_percentage between 0 and 100),
  accent text not null default '#cf9eff',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_topics (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '',
  position integer not null default 0,
  status public.course_status not null default 'not_started',
  progress_percentage numeric(5, 2) not null default 0
    check (progress_percentage between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  course_id bigint references public.courses (id) on delete set null,
  topic_id bigint references public.course_topics (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_seconds integer not null default 0
    check (total_seconds >= 0),
  label text not null default ''
);

create table public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  topic_id bigint references public.course_topics (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quizzes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  course_id bigint references public.courses (id) on delete cascade,
  topic_id bigint references public.course_topics (id) on delete cascade,
  kind public.quiz_kind not null,
  difficulty public.quiz_difficulty not null default 'medium',
  prompt text not null,
  code text not null default '',
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb not null default '{}'::jsonb,
  explanation text not null default '',
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  quiz_id bigint not null references public.quizzes (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  answer jsonb not null default '{}'::jsonb,
  is_correct boolean not null default false,
  score numeric(5, 2) not null default 0
    check (score between 0 and 100),
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique unique (requester_id, addressee_id)
);

create index courses_user_id_idx on public.courses (user_id);
create index courses_user_status_idx on public.courses (user_id, status);
create index course_topics_course_id_idx on public.course_topics (course_id);
create index course_topics_user_id_idx on public.course_topics (user_id);
create index course_topics_course_position_idx
  on public.course_topics (course_id, position);
create index learning_sessions_user_started_idx
  on public.learning_sessions (user_id, started_at desc);
create index learning_sessions_topic_id_idx
  on public.learning_sessions (topic_id);
create index learning_sessions_course_id_idx
  on public.learning_sessions (course_id);
create index notes_user_id_idx on public.notes (user_id);
create index notes_topic_id_idx on public.notes (topic_id);
create index notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index notes_tags_idx on public.notes using gin (tags);
create index quizzes_user_id_idx on public.quizzes (user_id);
create index quizzes_course_id_idx on public.quizzes (course_id);
create index quizzes_topic_id_idx on public.quizzes (topic_id);
create index quizzes_user_kind_idx on public.quizzes (user_id, kind);
create index quiz_attempts_quiz_id_idx on public.quiz_attempts (quiz_id);
create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id);
create index quiz_attempts_user_created_idx
  on public.quiz_attempts (user_id, created_at desc);
create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_topics enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.notes enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.friendships enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "courses_select_own"
  on public.courses for select to authenticated
  using (user_id = (select auth.uid()));

create policy "courses_insert_own"
  on public.courses for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "courses_update_own"
  on public.courses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "courses_delete_own"
  on public.courses for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "course_topics_select_own"
  on public.course_topics for select to authenticated
  using (user_id = (select auth.uid()));

create policy "course_topics_insert_own"
  on public.course_topics for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "course_topics_update_own"
  on public.course_topics for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "course_topics_delete_own"
  on public.course_topics for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "learning_sessions_select_own"
  on public.learning_sessions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "learning_sessions_insert_own"
  on public.learning_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "learning_sessions_update_own"
  on public.learning_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "learning_sessions_delete_own"
  on public.learning_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "notes_select_own"
  on public.notes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notes_insert_own"
  on public.notes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "notes_update_own"
  on public.notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notes_delete_own"
  on public.notes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "quizzes_select_own"
  on public.quizzes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "quizzes_insert_own"
  on public.quizzes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "quizzes_delete_own"
  on public.quizzes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "friendships_select_parties"
  on public.friendships for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy "friendships_insert_requester"
  on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "friendships_update_parties"
  on public.friendships for update to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy "friendships_delete_parties"
  on public.friendships for delete to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
