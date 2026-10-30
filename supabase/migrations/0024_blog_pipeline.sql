-- 0024_blog_pipeline.sql
-- AutoBlog orchestration schema: topics, runs, steps, sources, media and
-- provider usage, plus the atomic run lock and publish/unpublish RPCs.
--
-- Idempotent by design: the production project may already have this
-- migration applied while a local checkout is rebuilt.

-- =========================================================================
-- 1. POST COLUMNS USED BY THE PIPELINE
-- =========================================================================
alter table public.blog_posts
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists keywords_json jsonb not null default '{}'::jsonb,
  add column if not exists word_count integer not null default 0,
  add column if not exists seo_score integer,
  add column if not exists topic_id uuid,
  add column if not exists pipeline_run_id uuid,
  add column if not exists gate_report jsonb,
  add column if not exists faq_json jsonb,
  add column if not exists visuals_json jsonb,
  add column if not exists research_json jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists blog_posts_pipeline_run_idx
  on public.blog_posts (pipeline_run_id);
create index if not exists blog_posts_topic_idx
  on public.blog_posts (topic_id);

-- =========================================================================
-- 2. TOPIC BANK + HISTORY
-- =========================================================================
create table if not exists public.blog_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  slug text not null unique,
  category text not null,
  primary_keyword text not null,
  secondary_keywords text[] not null default '{}'::text[],
  source text not null default 'seed',
  trend_score double precision,
  seo_score double precision,
  product_fit double precision,
  diversity_score double precision,
  total_score double precision,
  score_breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'selected'
    check (status in ('seed', 'selected', 'used', 'rejected')),
  used_post_id uuid references public.blog_posts(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_topics_status_idx
  on public.blog_topics (status);
create index if not exists blog_topics_category_idx
  on public.blog_topics (category);
create index if not exists blog_topics_used_at_idx
  on public.blog_topics (used_at desc);

-- =========================================================================
-- 3. RUN + STEP OBSERVABILITY
-- =========================================================================
create table if not exists public.blog_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null default 'admin'
    check (trigger in ('cron', 'admin', 'manual', 'retry')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'cancelled')),
  current_stage text,
  topic_id uuid references public.blog_topics(id) on delete set null,
  post_id uuid references public.blog_posts(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer check (score is null or (score >= 0 and score <= 100)),
  word_count integer check (word_count is null or word_count >= 0),
  error text,
  provider_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists blog_pipeline_runs_status_idx
  on public.blog_pipeline_runs (status);
create index if not exists blog_pipeline_runs_started_idx
  on public.blog_pipeline_runs (started_at desc);

create table if not exists public.blog_pipeline_steps (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.blog_pipeline_runs(id)
    on delete cascade,
  stage text not null,
  status text not null default 'started'
    check (status in ('started', 'completed', 'failed', 'skipped')),
  attempt integer not null default 1 check (attempt >= 1),
  provider text,
  model text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  detail jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists blog_pipeline_steps_run_idx
  on public.blog_pipeline_steps (run_id, created_at);

-- =========================================================================
-- 4. SOURCES, MEDIA REUSE, PROVIDER USAGE
-- =========================================================================
create table if not exists public.blog_post_sources (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  url text not null,
  domain text not null default '',
  title text not null default '',
  accessed_at timestamptz not null default now(),
  used_for text not null default 'citation',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (post_id, url)
);

create index if not exists blog_post_sources_post_idx
  on public.blog_post_sources (post_id);

create table if not exists public.blog_media_usage (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.blog_posts(id) on delete cascade,
  provider text not null default 'generated',
  external_id text,
  url text not null,
  url_hash text not null unique,
  kind text not null default 'content',
  created_at timestamptz not null default now()
);

create index if not exists blog_media_usage_post_idx
  on public.blog_media_usage (post_id);

create table if not exists public.blog_provider_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  usage_date date not null default (timezone('utc', now()))::date,
  requests integer not null default 0 check (requests >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  errors integer not null default 0 check (errors >= 0),
  created_at timestamptz not null default now(),
  unique (provider, model, usage_date)
);

create index if not exists blog_provider_usage_date_idx
  on public.blog_provider_usage (usage_date desc);

-- Add the two post foreign keys after the run/topic tables exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_topic_fk'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_topic_fk
      foreign key (topic_id) references public.blog_topics(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_pipeline_run_fk'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_pipeline_run_fk
      foreign key (pipeline_run_id) references public.blog_pipeline_runs(id)
      on delete set null;
  end if;
end $$;

-- =========================================================================
-- 5. UPDATED_AT TRIGGERS
-- =========================================================================
create or replace function public.blog_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_touch_updated_at on public.blog_posts;
create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function public.blog_touch_updated_at();

drop trigger if exists blog_topics_touch_updated_at on public.blog_topics;
create trigger blog_topics_touch_updated_at
  before update on public.blog_topics
  for each row execute function public.blog_touch_updated_at();

-- =========================================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================================
alter table public.blog_topics enable row level security;
alter table public.blog_pipeline_runs enable row level security;
alter table public.blog_pipeline_steps enable row level security;
alter table public.blog_post_sources enable row level security;
alter table public.blog_media_usage enable row level security;
alter table public.blog_provider_usage enable row level security;

drop policy if exists "blog_topics_select_admin" on public.blog_topics;
create policy "blog_topics_select_admin"
  on public.blog_topics for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_pipeline_runs_select_admin"
  on public.blog_pipeline_runs;
create policy "blog_pipeline_runs_select_admin"
  on public.blog_pipeline_runs for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_pipeline_steps_select_admin"
  on public.blog_pipeline_steps;
create policy "blog_pipeline_steps_select_admin"
  on public.blog_pipeline_steps for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_post_sources_select_admin"
  on public.blog_post_sources;
create policy "blog_post_sources_select_admin"
  on public.blog_post_sources for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_media_usage_select_admin"
  on public.blog_media_usage;
create policy "blog_media_usage_select_admin"
  on public.blog_media_usage for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_provider_usage_select_admin"
  on public.blog_provider_usage;
create policy "blog_provider_usage_select_admin"
  on public.blog_provider_usage for select to authenticated
  using (public.is_admin());

drop policy if exists "blog_posts_update_admin" on public.blog_posts;
create policy "blog_posts_update_admin"
  on public.blog_posts for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "blog_posts_insert_admin" on public.blog_posts;
create policy "blog_posts_insert_admin"
  on public.blog_posts for insert to authenticated
  with check (public.is_admin());

revoke all on public.blog_topics from anon;
revoke all on public.blog_pipeline_runs from anon;
revoke all on public.blog_pipeline_steps from anon;
revoke all on public.blog_post_sources from anon;
revoke all on public.blog_media_usage from anon;
revoke all on public.blog_provider_usage from anon;

-- =========================================================================
-- 7. ATOMIC RUN LOCK + STALE RECOVERY
-- =========================================================================
create or replace function public.blog_acquire_run(p_trigger text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trigger text := lower(coalesce(trim(p_trigger), 'admin'));
  v_run_id uuid;
begin
  if v_trigger not in ('cron', 'admin', 'manual', 'retry') then
    raise exception 'unsupported blog trigger: %', p_trigger;
  end if;

  -- Serialize concurrent run acquisition across every backend worker.
  perform pg_advisory_xact_lock(hashtext('atlas_blog_pipeline_run'));

  update public.blog_pipeline_runs
  set
    status = 'failed',
    finished_at = now(),
    error = coalesce(error, '') ||
      case when coalesce(error, '') = '' then '' else ' | ' end ||
      'Recovered stale run after 2 hours.'
  where status = 'running'
    and started_at < now() - interval '2 hours';

  if exists (
    select 1 from public.blog_pipeline_runs where status = 'running'
  ) then
    return null;
  end if;

  insert into public.blog_pipeline_runs (trigger, status, current_stage)
  values (v_trigger, 'running', 'queued')
  returning id into v_run_id;

  return v_run_id;
end;
$$;

revoke all on function public.blog_acquire_run(text) from public;
revoke all on function public.blog_acquire_run(text) from anon;
revoke all on function public.blog_acquire_run(text) from authenticated;
grant execute on function public.blog_acquire_run(text) to service_role;

-- =========================================================================
-- 8. PUBLISH / UNPUBLISH RPCS
-- =========================================================================
create or replace function public.blog_publish_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.blog_posts%rowtype;
begin
  select * into v_post
  from public.blog_posts
  where id = p_post_id
  for update;

  if not found then
    return false;
  end if;

  if v_post.published_at is not null then
    return true;
  end if;

  if length(trim(coalesce(v_post.title, ''))) < 10
    or length(trim(coalesce(v_post.slug, ''))) = 0
    or length(trim(coalesce(v_post.excerpt, ''))) < 40
    or length(trim(coalesce(v_post.content, ''))) < 500
    or coalesce(v_post.cover_image_url, '') = '' then
    return false;
  end if;

  -- Pipeline-created drafts must carry the full hard-gate evidence.
  if v_post.pipeline_run_id is not null then
    if coalesce(v_post.seo_score, 0) < 90
      or coalesce(v_post.gate_report ->> 'passed', 'false') <> 'true'
      or v_post.faq_json is null
      or coalesce(v_post.word_count, 0) < 900 then
      return false;
    end if;
  end if;

  update public.blog_posts
  set
    published_at = now(),
    updated_at = now()
  where id = p_post_id;

  return true;
end;
$$;

revoke all on function public.blog_publish_post(uuid) from public;
revoke all on function public.blog_publish_post(uuid) from anon;
revoke all on function public.blog_publish_post(uuid) from authenticated;
grant execute on function public.blog_publish_post(uuid) to service_role;

create or replace function public.blog_unpublish_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.blog_posts
  set
    published_at = null,
    updated_at = now()
  where id = p_post_id
    and published_at is not null;

  return found;
end;
$$;

revoke all on function public.blog_unpublish_post(uuid) from public;
revoke all on function public.blog_unpublish_post(uuid) from anon;
revoke all on function public.blog_unpublish_post(uuid) from authenticated;
grant execute on function public.blog_unpublish_post(uuid) to service_role;

-- =========================================================================
-- 9. COMMENTS
-- =========================================================================
comment on table public.blog_topics is
  'Topic bank and used-topic history for dedupe across runs.';
comment on table public.blog_pipeline_runs is
  'One row per AutoBlog run; the run lock is acquired by blog_acquire_run.';
comment on table public.blog_pipeline_steps is
  'Per-stage timing, provider/model and error trace for the admin timeline.';
comment on table public.blog_provider_usage is
  'Daily provider usage ledger persisted from provider attempts.';
