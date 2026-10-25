-- 0020_blog_posts_seo_fields.sql
-- Dynamic SEO/AEO/GEO pipeline output.
--
-- meta_title / meta_description hold the enforced 50-60 and 150-160 character
-- search snippets. keywords_json stores the structured keyword map (primary,
-- secondary, long-tail, LSI) while the existing keywords text[] column remains
-- the flat list the frontend already reads. word_count and seo_score make
-- quality visible in the admin dashboard without parsing HTML.

alter table public.blog_posts
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists keywords_json jsonb not null default '{}'::jsonb,
  add column if not exists word_count integer not null default 0,
  add column if not exists seo_score integer;

create index if not exists blog_posts_keywords_json_idx
  on public.blog_posts using gin (keywords_json);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_word_count_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_word_count_check check (word_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_seo_score_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_seo_score_check
      check (seo_score is null or (seo_score >= 0 and seo_score <= 100));
  end if;
end $$;

comment on column public.blog_posts.meta_title is
  'Search-title variant enforced to 50-60 characters by the AutoBlog pipeline.';
comment on column public.blog_posts.meta_description is
  'Search-description variant enforced to 150-160 characters with a CTA.';
comment on column public.blog_posts.keywords_json is
  'Structured keyword map: {primary, secondary[], long_tail[], lsi[], search_intent}.';
comment on column public.blog_posts.word_count is
  'Body word count at publish time.';
comment on column public.blog_posts.seo_score is
  'Internal SEO/AEO/GEO validator score (0-100). Pipeline publishes at 90+.';
