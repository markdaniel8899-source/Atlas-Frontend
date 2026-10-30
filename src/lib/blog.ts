import { supabase } from "./supabase";

export interface ContentImage {
  url: string;
  caption: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  keywords: string[];
  published_at: string;
  updated_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  word_count: number | null;
  content_images: ContentImage[];
}

const SELECT_COLUMNS =
  "id, title, slug, excerpt, content, cover_image_url, tags, keywords, published_at, updated_at, meta_title, meta_description, word_count, content_images";

export function tidyDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/,\s*,/g, ",");
}

/** Trims the URL and upgrades plain http to https: mixed-content images are
 *  blocked on the deployed https site and render as broken placeholders. */
function normalizeImageUrl(value: unknown): string | null {
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

function normalize(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id ?? ""),
    title: tidyDashes(String(row.title ?? "")),
    slug: String(row.slug ?? ""),
    excerpt: tidyDashes(String(row.excerpt ?? "")),
    content: String(row.content ?? ""),
    cover_image_url: normalizeImageUrl(row.cover_image_url),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    published_at: String(row.published_at ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : null,
    meta_title: row.meta_title ? String(row.meta_title) : null,
    meta_description: row.meta_description
      ? String(row.meta_description)
      : null,
    word_count: Number(row.word_count) || null,
    content_images: Array.isArray(row.content_images)
      ? (row.content_images as ContentImage[]).flatMap((img) => {
          const url = normalizeImageUrl(img?.url);
          return url ? [{ url, caption: String(img?.caption ?? "") }] : [];
        })
      : [],
  };
}

export async function fetchPosts(limit = 12): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SELECT_COLUMNS)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as Record<string, unknown>));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SELECT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function fetchRelatedPosts(
  current: BlogPost,
  limit = 3,
): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(SELECT_COLUMNS)
    .not("published_at", "is", null)
    .neq("id", current.id)
    .order("published_at", { ascending: false })
    .limit(24);
  if (error) throw error;
  const posts = (data ?? []).map((row) => normalize(row as Record<string, unknown>));
  const tagged = posts.filter((post) =>
    post.tags.some((tag) => current.tags.includes(tag)),
  );
  const rest = posts.filter((post) => !tagged.includes(post));
  return [...tagged, ...rest].slice(0, limit);
}

export function readingTimeMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatPostDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
