-- Lower the pipeline publish score requirement from 90 to 80 so articles that
-- pass the editorial gate at the new 80 threshold can be published.

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
    if coalesce(v_post.seo_score, 0) < 80
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
