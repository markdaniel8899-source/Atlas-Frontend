/**
 * Build-time blog SEO. Vite imports this module from vite.config.ts to emit
 * static post pages, sitemap.xml and rss.xml after each deploy. It must stay
 * Node-safe: no DOM APIs, only fetch/Date/Intl.
 */

export interface StaticBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  tags: string[];
  keywords: string[];
  publishedAt: string;
  updatedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  wordCount: number;
}

export interface StaticRoute {
  path: string;
  changefreq: string;
  priority: string;
}

export interface StaticBlogOptions {
  origin: string;
  siteName: string;
  siteDescription: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  limit?: number;
}

export interface StaticAssets {
  js?: string;
  css?: string[];
}

interface FaqEntry {
  question: string;
  answer: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function tidyDashes(value: string): string {
  return value.replace(/\s*—\s*/g, ", ").replace(/,\s*,/g, ",");
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(value: unknown): string {
  return escapeHtml(value);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

export function stripTags(html: string): string {
  return decodeEntities(
    String(html ?? "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageUrl(value: unknown): string | null {
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

function normalizeRow(row: Record<string, unknown>): StaticBlogPost | null {
  const slug = String(row.slug ?? "").trim();
  if (!SLUG_RE.test(slug)) return null;
  const publishedAt = String(row.published_at ?? "").trim();
  if (!publishedAt) return null;

  return {
    id: String(row.id ?? ""),
    title: tidyDashes(String(row.title ?? "")),
    slug,
    excerpt: tidyDashes(String(row.excerpt ?? "")),
    content: String(row.content ?? ""),
    coverImageUrl: normalizeImageUrl(row.cover_image_url),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    publishedAt,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    metaTitle: row.meta_title ? String(row.meta_title) : null,
    metaDescription: row.meta_description
      ? String(row.meta_description)
      : null,
    wordCount: Number(row.word_count) || stripTags(String(row.content ?? ""))
      .split(/\s+/)
      .filter(Boolean).length,
  };
}

/**
 * Fetch published rows at build time with the public anon key. RLS guarantees
 * this can only ever return posts whose published_at is live.
 */
export async function fetchStaticBlogPosts(
  options: StaticBlogOptions,
): Promise<StaticBlogPost[]> {
  const supabaseUrl = options.supabaseUrl?.replace(/\/+$/, "");
  if (!supabaseUrl || !options.supabaseKey) return [];

  const url = new URL(`${supabaseUrl}/rest/v1/blog_posts`);
  url.searchParams.set(
    "select",
    [
      "id",
      "title",
      "slug",
      "excerpt",
      "content",
      "cover_image_url",
      "tags",
      "keywords",
      "published_at",
      "updated_at",
      "meta_title",
      "meta_description",
      "word_count",
    ].join(","),
  );
  url.searchParams.set("published_at", "not.is.null");
  url.searchParams.set("order", "published_at.desc");
  url.searchParams.set("limit", String(Math.max(1, options.limit ?? 200)));

  const response = await fetch(url, {
    headers: {
      apikey: options.supabaseKey,
      Authorization: `Bearer ${options.supabaseKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Supabase blog feed returned HTTP ${response.status}.`,
    );
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((row) =>
    row && typeof row === "object"
      ? [normalizeRow(row as Record<string, unknown>)].filter(
          (post): post is StaticBlogPost => post !== null,
        )
      : [],
  );
}

function postUrl(origin: string, post: StaticBlogPost): string {
  return `${origin.replace(/\/+$/, "")}/blog/${post.slug}`;
}

function postTitle(post: StaticBlogPost): string {
  return (post.metaTitle || `${post.title} | ATLAS Blog`).trim();
}

function postDescription(post: StaticBlogPost): string {
  return (
    post.metaDescription ||
    post.excerpt ||
    stripTags(post.content).slice(0, 157)
  ).trim();
}

function absoluteImage(origin: string, value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, "https:");
  if (value.startsWith("/")) return `${origin.replace(/\/+$/, "")}${value}`;
  return null;
}

function isoDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function readableDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function extractFaqEntries(html: string): FaqEntry[] {
  const source = String(html ?? "");
  const headings = Array.from(
    source.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi),
  );
  const faqHeading = headings.find((match) =>
    /^(faqs?|frequently asked questions)\b/i.test(stripTags(match[1] ?? "")),
  );
  if (!faqHeading || faqHeading.index == null) return [];

  const start = faqHeading.index + faqHeading[0].length;
  const nextHeading = headings.find(
    (match) => match.index != null && match.index > faqHeading.index!,
  );
  const block = source.slice(start, nextHeading?.index ?? source.length);

  const entries: FaqEntry[] = [];
  const questionRe = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|<h2\b|$)/gi;
  for (const match of block.matchAll(questionRe)) {
    const question = stripTags(match[1] ?? "");
    const answer = stripTags(match[2] ?? "");
    if (question && answer) entries.push({ question, answer });
    if (entries.length >= 10) break;
  }
  return entries;
}

function faqSchema(faqs: FaqEntry[]): Record<string, unknown> | null {
  if (!faqs.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function buildBlogPostSchema(
  post: StaticBlogPost,
  options: { origin: string; siteName: string },
): Record<string, unknown> {
  const url = postUrl(options.origin, post);
  const image = absoluteImage(options.origin, post.coverImageUrl);
  const faqs = extractFaqEntries(post.content);
  const faq = faqSchema(faqs);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: postTitle(post),
        name: post.title,
        description: postDescription(post),
        url,
        ...(image ? { image: [image] } : {}),
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        author: { "@type": "Organization", name: options.siteName, url: options.origin },
        publisher: {
          "@type": "Organization",
          name: options.siteName,
          logo: {
            "@type": "ImageObject",
            url: `${options.origin.replace(/\/+$/, "")}/formicon.png`,
          },
        },
        ...(post.tags.length ? { articleSection: post.tags[0] } : {}),
        ...(post.keywords.length
          ? { keywords: post.keywords.join(", ") }
          : {}),
        ...(post.wordCount > 0 ? { wordCount: post.wordCount } : {}),
        inLanguage: "en",
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${options.origin.replace(/\/+$/, "")}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${options.origin.replace(/\/+$/, "")}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: url,
          },
        ],
      },
      ...(faq ? [faq] : []),
    ],
  };
  return schema;
}

function safeJson(value: unknown): string {
  return (JSON.stringify(value) ?? "").replace(/</g, "\\u003c");
}

function safeContent(html: string): string {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi,
      '$1="#"',
    );
}

function assetTags(assets: StaticAssets): string {
  const css = (assets.css ?? [])
    .filter(Boolean)
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join("\n");
  const js = assets.js
    ? `<script type="module" src="${escapeHtml(assets.js)}"></script>`
    : "";
  return [css, js].filter(Boolean).join("\n");
}

const STATIC_CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#030305;color:#e8e5f2;font-family:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.75}
a{color:#cf9eff;text-decoration-thickness:1px;text-underline-offset:3px}
.static-shell{width:min(760px,calc(100% - 40px));margin:0 auto;padding:36px 0 80px}
.static-brand{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:700;letter-spacing:-.02em}
.static-brand span{display:inline-block;width:9px;height:9px;border:1px solid #cf9eff;background:#4044cc;transform:rotate(45deg)}
.static-back{display:inline-block;margin-top:22px;font-size:14px;color:#aaa4bd}
.static-cover{width:100%;height:auto;margin:28px 0 8px;border-radius:20px;border:1px solid #ffffff1a}
.static-tags{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0}
.static-tag{border:1px solid #ffffff24;border-radius:999px;padding:4px 10px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#d8d3e6}
.static-title{margin:18px 0 0;font-size:clamp(2rem,6vw,3.5rem);line-height:1.08;letter-spacing:-.04em;color:#fff}
.static-meta{margin:14px 0 0;color:#9b94ad;font-size:14px}
.static-excerpt{margin:24px 0 0;color:#c8c2d8;font-size:18px}
.static-content{margin-top:28px;border-top:1px solid #ffffff1a;padding-top:28px}
.static-content h2{margin:42px 0 12px;font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.2;color:#fff;letter-spacing:-.02em}
.static-content h3{margin:30px 0 10px;font-size:1.25rem;color:#fff}
.static-content p{margin:16px 0}
.static-content img{max-width:100%;height:auto;border-radius:16px}
.static-content table{display:block;width:100%;overflow-x:auto;border-collapse:collapse;margin:24px 0}
.static-content th,.static-content td{border:1px solid #ffffff24;padding:10px 12px;text-align:left}
.static-content blockquote{margin:24px 0;border-left:2px solid #cf9eff80;padding-left:18px;color:#d3ccdf}
.static-list{list-style:none;padding:0;margin:32px 0 0;display:grid;gap:18px}
.static-card{border:1px solid #ffffff1a;border-radius:18px;padding:20px;background:#ffffff08}
.static-card h2{margin:0;font-size:1.35rem;line-height:1.25}
.static-card p{margin:10px 0 0;color:#bcb5ca}
.static-card a{color:#fff;text-decoration:none}
.static-card small{display:block;margin-top:12px;color:#8e879f}
`;

function headBase(
  options: {
    origin: string;
    siteName: string;
    title: string;
    description: string;
    path: string;
    canonicalPath: string;
    image?: string | null;
    type?: string;
    publishedAt?: string;
    updatedAt?: string | null;
    tags?: string[];
    index?: boolean;
    schema?: Record<string, unknown> | null;
  },
  assets: StaticAssets,
): string {
  const url = `${options.origin.replace(/\/+$/, "")}${options.canonicalPath}`;
  const image = absoluteImage(options.origin, options.image ?? null);
  const robots = options.index === false
    ? "noindex, nofollow"
    : "index, follow";
  const articleTags = (options.tags ?? [])
    .map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`)
    .join("\n");
  const articleTimes = [
    options.publishedAt
      ? `<meta property="article:published_time" content="${escapeHtml(isoDate(options.publishedAt))}">`
      : "",
    options.updatedAt
      ? `<meta property="article:modified_time" content="${escapeHtml(isoDate(options.updatedAt))}">`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const ogImage = image
    ? `<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:image" content="${escapeHtml(image)}">`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#030305">
<title>${escapeHtml(options.title)}</title>
<meta name="description" content="${escapeHtml(options.description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${escapeHtml(url)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(options.siteName)} Blog" href="${escapeHtml(options.origin.replace(/\/+$/, ""))}/rss.xml">
<meta property="og:type" content="${escapeHtml(options.type ?? "website")}">
<meta property="og:site_name" content="${escapeHtml(options.siteName)}">
<meta property="og:title" content="${escapeHtml(options.title)}">
<meta property="og:description" content="${escapeHtml(options.description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:locale" content="en_US">
${ogImage}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHtml(options.title)}">
<meta name="twitter:description" content="${escapeHtml(options.description)}">
${articleTimes}
${articleTags}
${options.schema ? `<script id="blog-schema" type="application/ld+json">${safeJson(options.schema)}</script>` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap">
<style>${STATIC_CSS}</style>
${assetTags(assets)}
</head>`;
}

export function buildStaticPostHtml(
  post: StaticBlogPost,
  options: StaticBlogOptions,
  assets: StaticAssets,
): string {
  const origin = options.origin.replace(/\/+$/, "");
  const url = postUrl(origin, post);
  const schema = buildBlogPostSchema(post, {
    origin,
    siteName: options.siteName,
  });
  const title = postTitle(post);
  const description = postDescription(post);
  const image = absoluteImage(origin, post.coverImageUrl);
  const date = readableDate(post.publishedAt);
  const tags = post.tags
    .map((tag) => `<span class="static-tag">${escapeHtml(tag)}</span>`)
    .join("");

  return `${headBase(
    {
      origin,
      siteName: options.siteName,
      title,
      description,
      path: `/blog/${post.slug}`,
      canonicalPath: `/blog/${post.slug}`,
      image,
      type: "article",
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      tags: post.tags,
      schema,
    },
    assets,
  )}
<body>
<div id="root"><main class="static-shell">
<a class="static-brand" href="/"><span></span>${escapeHtml(options.siteName)}</a>
<article>
<nav aria-label="Breadcrumb"><a class="static-back" href="/blog">← Back to blog</a></nav>
${image ? `<img class="static-cover" src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" width="1200" height="630" loading="eager">` : ""}
<div class="static-tags">${tags}</div>
<h1 class="static-title">${escapeHtml(post.title)}</h1>
<p class="static-meta">${escapeHtml(date)}${post.wordCount > 0 ? ` · ${post.wordCount.toLocaleString()} words` : ""}</p>
<p class="static-excerpt">${escapeHtml(post.excerpt)}</p>
<div class="static-content">${safeContent(post.content)}</div>
</article>
</main></div>
<noscript><p class="static-shell"><a href="${escapeHtml(url)}">Read ${escapeHtml(post.title)} on ${escapeHtml(options.siteName)}</a></p></noscript>
</body>
</html>`;
}

export function buildStaticBlogIndexHtml(
  posts: StaticBlogPost[],
  options: StaticBlogOptions,
  assets: StaticAssets,
): string {
  const origin = options.origin.replace(/\/+$/, "");
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${origin}/blog#page`,
    name: `${options.siteName} Blog`,
    description: options.siteDescription,
    url: `${origin}/blog`,
    hasPart: posts.slice(0, 50).map((post) => {
      const image = absoluteImage(origin, post.coverImageUrl);
      return {
        "@type": "BlogPosting",
        headline: post.title,
        url: postUrl(origin, post),
        datePublished: post.publishedAt,
        ...(image ? { image } : {}),
      };
    }),
  };
  const cards = posts
    .map((post) => {
      const image = absoluteImage(origin, post.coverImageUrl);
      return `<li class="static-card">
${image ? `<img class="static-cover" src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}" width="1200" height="630" loading="lazy">` : ""}
<h2><a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
<p>${escapeHtml(post.excerpt)}</p>
<small>${escapeHtml(readableDate(post.publishedAt))}</small>
</li>`;
    })
    .join("\n");

  return `${headBase(
    {
      origin,
      siteName: options.siteName,
      title: `Blog | ${options.siteName} Learning OS`,
      description: options.siteDescription,
      path: "/blog",
      canonicalPath: "/blog",
      schema,
    },
    assets,
  )}
<body>
<div id="root"><main class="static-shell">
<a class="static-brand" href="/"><span></span>${escapeHtml(options.siteName)}</a>
<h1 class="static-title">Latest Articles</h1>
<p class="static-excerpt">${escapeHtml(options.siteDescription)}</p>
<ul class="static-list">${cards}</ul>
</main></div>
</body>
</html>`;
}

export function buildSitemap(
  origin: string,
  routes: StaticRoute[],
  posts: StaticBlogPost[],
  today = new Date().toISOString().slice(0, 10),
): string {
  const base = origin.replace(/\/+$/, "");
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const route of routes) {
    const path = route.path.startsWith("/") ? route.path : `/${route.path}`;
    if (seen.has(path)) continue;
    seen.add(path);
    entries.push(
      [
        "  <url>",
        `    <loc>${escapeXml(`${base}${path}`)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${escapeXml(route.changefreq)}</changefreq>`,
        `    <priority>${escapeXml(route.priority)}</priority>`,
        "  </url>",
      ].join("\n"),
    );
  }

  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    if (seen.has(path)) continue;
    seen.add(path);
    const lastmod = (post.updatedAt || post.publishedAt).slice(0, 10);
    entries.push(
      [
        "  <url>",
        `    <loc>${escapeXml(`${base}${path}`)}</loc>`,
        `    <lastmod>${escapeXml(lastmod || today)}</lastmod>`,
        "    <changefreq>monthly</changefreq>",
        "    <priority>0.8</priority>",
        "  </url>",
      ].join("\n"),
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export function buildRss(
  origin: string,
  siteName: string,
  siteDescription: string,
  posts: StaticBlogPost[],
): string {
  const base = origin.replace(/\/+$/, "");
  const items = posts
    .map((post) => {
      const url = postUrl(base, post);
      const image = absoluteImage(base, post.coverImageUrl);
      const date = new Date(post.publishedAt);
      const pubDate = Number.isNaN(date.getTime())
        ? ""
        : date.toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(postTitle(post))}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
        `      <description>${escapeXml(postDescription(post))}</description>`,
        image
          ? `      <media:content url="${escapeXml(image)}" medium="image"/>`
          : "",
        `      <content:encoded>${cdata(safeContent(post.content))}</content:encoded>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    `    <title>${escapeXml(siteName)} Blog</title>`,
    `    <link>${escapeXml(`${base}/blog`)}</link>`,
    `    <description>${escapeXml(siteDescription)}</description>`,
    "    <language>en-us</language>",
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function buildRobots(origin: string): string {
  return [
    "# ATLAS - AI-powered personal learning OS (ASCII-safe for parsers)",
    "User-agent: *",
    "Allow: /",
    "",
    "# Auth-gated app + API endpoints are not crawlable content",
    "Disallow: /app/",
    "Disallow: /api/",
    "Disallow: /wp-admin/",
    "",
    `Sitemap: ${origin.replace(/\/+$/, "")}/sitemap.xml`,
    "",
  ].join("\n");
}
