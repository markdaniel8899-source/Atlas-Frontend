import { useEffect } from "react";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";

interface SeoProps {
  /** Clean route path, e.g. `/` or `/login`. */
  path: string;
  title: string;
  description?: string;
  /** `false` → `noindex, nofollow` (private routes stay out of the index). */
  index?: boolean;
  /** Relative or absolute social preview image. */
  image?: string | null;
  type?: "website" | "article";
  publishedAt?: string | null;
  updatedAt?: string | null;
  tags?: string[];
  schema?: Record<string, unknown> | null;
}

const upsertMeta = (
  key: string,
  content: string,
  attr: "name" | "property" = "name",
) => {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const removeMeta = (key: string, attr: "name" | "property" = "name") => {
  document.head
    .querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`)
    .forEach((el) => el.remove());
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(
    `link[rel="canonical"]`,
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const removeCanonical = () => {
  document.head
    .querySelectorAll('link[rel="canonical"]')
    .forEach((el) => el.remove());
};

const EMPTY_TAGS: string[] = [];

const absoluteAsset = (value: string): string => {
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, "https:");
  const base = SITE_URL.replace(/\/+$/, "");
  return value.startsWith("/") ? `${base}${value}` : `${base}/${value}`;
};

/**
 * Route-level head manager (no helmet dependency). Sets title, description,
 * self-referencing canonical, robots directive, Open Graph / Twitter tags,
 * article timestamps and optional JSON-LD. Renders nothing — it only mutates
 * `<head>` metadata.
 */
export function Seo({
  path,
  title,
  description,
  index = true,
  image = null,
  type = "website",
  publishedAt = null,
  updatedAt = null,
  tags = EMPTY_TAGS,
  schema = null,
}: SeoProps) {
  useEffect(() => {
    const url = absoluteUrl(path);
    document.title = title;

    if (description) {
      upsertMeta("description", description);
      upsertMeta("og:description", description, "property");
      upsertMeta("twitter:description", description);
    } else {
      removeMeta("description");
      removeMeta("og:description", "property");
      removeMeta("twitter:description");
    }

    upsertMeta("robots", index ? "index, follow" : "noindex, nofollow");
    if (index) {
      upsertCanonical(url);
    } else {
      removeCanonical();
    }

    upsertMeta("og:title", title, "property");
    upsertMeta("og:site_name", SITE_NAME, "property");
    upsertMeta("og:type", type, "property");
    upsertMeta("og:url", url, "property");
    upsertMeta("og:locale", "en_US", "property");

    if (image) {
      const absoluteImage = absoluteAsset(image);
      upsertMeta("og:image", absoluteImage, "property");
      upsertMeta("og:image:alt", title, "property");
      upsertMeta("twitter:image", absoluteImage);
      upsertMeta("twitter:image:alt", title);
      upsertMeta("twitter:card", "summary_large_image");
    } else {
      removeMeta("og:image", "property");
      removeMeta("og:image:alt", "property");
      removeMeta("twitter:image");
      removeMeta("twitter:image:alt");
      upsertMeta("twitter:card", "summary");
    }

    upsertMeta("twitter:title", title);

    if (type === "article" && publishedAt) {
      upsertMeta("article:published_time", publishedAt, "property");
      if (updatedAt) {
        upsertMeta("article:modified_time", updatedAt, "property");
      } else {
        removeMeta("article:modified_time", "property");
      }
      document.head
        .querySelectorAll('meta[property="article:tag"]')
        .forEach((el) => el.remove());
      for (const tag of tags) {
        const el = document.createElement("meta");
        el.setAttribute("property", "article:tag");
        el.setAttribute("content", tag);
        document.head.appendChild(el);
      }
    } else {
      removeMeta("article:published_time", "property");
      removeMeta("article:modified_time", "property");
      document.head
        .querySelectorAll('meta[property="article:tag"]')
        .forEach((el) => el.remove());
    }

    let script = document.head.querySelector<HTMLScriptElement>("#blog-schema");
    let serialized = "";
    if (schema) {
      if (!script) {
        script = document.createElement("script");
        script.id = "blog-schema";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      serialized = (JSON.stringify(schema) ?? "").replace(/</g, "\\u003c");
      script.textContent = serialized;
    } else {
      script?.remove();
    }

    return () => {
      // Only remove the schema if it is still the one this effect wrote:
      // navigating between articles must not delete the next article's JSON-LD.
      if (script && serialized && script.textContent === serialized) {
        script.remove();
      }
    };
  }, [
    path,
    title,
    description,
    index,
    image,
    type,
    publishedAt,
    updatedAt,
    tags,
    schema,
  ]);

  return null;
}

/** Absolute URL exposed for components that link to themselves (og:image etc.). */
export const siteUrl = SITE_URL;
