import { useEffect } from "react";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";

interface SeoProps {
  /** Clean route path, e.g. `/` or `/login`. */
  path: string;
  title: string;
  description?: string;
  /** `false` → `noindex, nofollow` (private routes stay out of the index). */
  index?: boolean;
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

/**
 * Route-level head manager (no helmet dependency). Sets title, description,
 * self-referencing canonical, robots directive and Open Graph / Twitter tags.
 * Renders nothing — it only mutates `<head>` metadata.
 */
export function Seo({ path, title, description, index = true }: SeoProps) {
  useEffect(() => {
    const url = absoluteUrl(path);
    document.title = title;

    if (description) upsertMeta("description", description);
    upsertMeta("robots", index ? "index, follow" : "noindex, nofollow");

    // Canonical only on indexable pages: a canonical hint on a noindex URL
    // sends crawlers mixed signals.
    if (index) upsertCanonical(url);

    upsertMeta("og:title", title, "property");
    upsertMeta("og:site_name", SITE_NAME, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:url", url, "property");
    upsertMeta("og:locale", "en_US", "property");
    if (description) upsertMeta("og:description", description, "property");

    upsertMeta("twitter:card", "summary");
    upsertMeta("twitter:title", title);
    if (description) upsertMeta("twitter:description", description);
  }, [path, title, description, index]);

  return null;
}

/** Absolute URL exposed for components that link to themselves (og:image etc.). */
export const siteUrl = SITE_URL;
