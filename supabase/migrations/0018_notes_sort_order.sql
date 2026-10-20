alter table public.notes
  add column if not exists sort_order integer;

create index if not exists notes_user_sort_order_idx
  on public.notes (user_id, sort_order);
