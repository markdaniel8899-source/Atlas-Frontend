-- Quiz engine (int.md section 2): every quiz's subject domain is decided by
-- the backend from the COURSE, stored on the course itself.
-- One of: math, english, science, humanities, programming, other.
-- '' means "not classified yet" - the backend lazily classifies the title
-- and PATCHes it back on the first course quiz (this migration may be run
-- before or after that code ships; the backend falls back gracefully).

alter table public.courses
  add column if not exists domain text not null default '';
