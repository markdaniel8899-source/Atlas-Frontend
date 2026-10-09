-- 0010_blog_posts_content_images.sql
-- Multi-image AI articles: metadata for the in-article Pollinations images
-- that the pipeline embeds inside blog_posts.content as <figure> blocks.
--
-- Shape: jsonb array of {"url": "...", "caption": "..."} — one entry per
-- embedded image (up to 3). The URLs also appear inside content; the column
-- exists so the frontend can list/preview images without parsing HTML.
-- Older rows written before this migration default to an empty array.

alter table public.blog_posts
  add column if not exists content_images jsonb not null default '[]'::jsonb;
