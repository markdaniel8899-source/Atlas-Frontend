import config from "./config.json";

export const SITE_NAME: string = config.name;
export const SITE_TAGLINE = "Your map for mastery";
export const SITE_DESCRIPTION: string = config.description;

/**
 * Canonical origin for sitemap/robots (build time, vite.config.ts) and for
 * canonical/og:url tags (runtime). Set `VITE_SITE_URL` in the environment to
 * point at the real production domain; the JSON value is the placeholder.
 */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? config.url
).replace(/\/+$/, "");

/** Absolute, self-referencing URL for a clean route path. */
export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path === "/" ? "/" : path}`;
