-- Track who shared a note (for sender tags on received notes)
alter table public.notes
  add column if not exists shared_by uuid references auth.users (id) on delete set null;

create index if not exists notes_shared_by_idx on public.notes (shared_by)
  where shared_by is not null;

-- Also add a shared_at timestamp for ordering
alter table public.notes
  add column if not exists shared_at timestamptz;

create index if not exists notes_shared_at_idx on public.notes (shared_at desc)
  where shared_at is not null;