-- 0004_roadmaps.sql
-- AI-generated learning roadmaps: a roadmap, its phase metadata, its nodes,
-- and the edges between nodes.
-- Run after 0001_core_schema.sql, 0002_triggers_functions.sql, 0003_squad.sql.
--
-- Note: courses.id is a bigint identity, so roadmaps.course_id is bigint too.

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  course_id bigint references public.courses (id) on delete set null,
  goal text not null check (char_length(goal) between 1 and 400),
  title text not null default '',
  summary text not null default '',
  model text,
  -- phase metadata: [{number,title,objective,duration_weeks,hours,milestones}]
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  phase_number integer not null default 1 check (phase_number >= 1),
  -- order of the node inside its phase (1, 2, 3 ...)
  position integer not null default 0,
  -- optional persisted layout hints; the client recomputes these anyway
  position_x integer,
  position_y integer,
  status text not null default 'locked'
    check (status in ('locked', 'active', 'completed')),
  estimated_hours integer not null default 0 check (estimated_hours >= 0),
  prerequisites uuid[] not null default '{}'::uuid[],
  resources jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint roadmap_nodes_no_self check (not (id = any (prerequisites)))
);

create table public.roadmap_connections (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  from_node_id uuid references public.roadmap_nodes (id) on delete cascade,
  to_node_id uuid references public.roadmap_nodes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint roadmap_connections_no_self
    check (from_node_id is null or from_node_id <> to_node_id),
  constraint roadmap_connections_unique
    unique (roadmap_id, from_node_id, to_node_id)
);

create index roadmaps_user_id_idx on public.roadmaps (user_id);
create index roadmaps_user_created_idx on public.roadmaps (user_id, created_at desc);

create index roadmap_nodes_roadmap_id_idx on public.roadmap_nodes (roadmap_id);
create index roadmap_nodes_order_idx
  on public.roadmap_nodes (roadmap_id, phase_number, position);
create index roadmap_nodes_status_idx on public.roadmap_nodes (roadmap_id, status);
create index roadmap_nodes_prerequisites_idx
  on public.roadmap_nodes using gin (prerequisites);

create index roadmap_connections_roadmap_id_idx
  on public.roadmap_connections (roadmap_id);
create index roadmap_connections_from_idx
  on public.roadmap_connections (from_node_id);
create index roadmap_connections_to_idx
  on public.roadmap_connections (to_node_id);

alter table public.roadmaps enable row level security;
alter table public.roadmap_nodes enable row level security;
alter table public.roadmap_connections enable row level security;

create policy "roadmaps_select_own"
  on public.roadmaps for select to authenticated
  using (user_id = (select auth.uid()));

create policy "roadmaps_insert_own"
  on public.roadmaps for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "roadmaps_update_own"
  on public.roadmaps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "roadmaps_delete_own"
  on public.roadmaps for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "roadmap_nodes_select_own"
  on public.roadmap_nodes for select to authenticated
  using (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_nodes_insert_own"
  on public.roadmap_nodes for insert to authenticated
  with check (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_nodes_update_own"
  on public.roadmap_nodes for update to authenticated
  using (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  )
  with check (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_nodes_delete_own"
  on public.roadmap_nodes for delete to authenticated
  using (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_connections_select_own"
  on public.roadmap_connections for select to authenticated
  using (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_connections_insert_own"
  on public.roadmap_connections for insert to authenticated
  with check (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_connections_delete_own"
  on public.roadmap_connections for delete to authenticated
  using (
    roadmap_id in (
      select r.id from public.roadmaps r
      where r.user_id = (select auth.uid())
    )
  );

create trigger roadmaps_set_updated_at
  before update on public.roadmaps
  for each row execute function public.set_updated_at();
