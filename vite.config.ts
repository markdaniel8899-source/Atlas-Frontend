import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import seoConfig from "./src/seo/config.json" with { type: "json" };

interface SeoFile {
  body: string;
  type: string;
}

/**
 * Build-time SEO files: robots.txt + sitemap.xml generated from the single
 * public route list in src/seo/config.json — adding a public route is one
 * edit. The origin comes from `VITE_SITE_URL` (env var or .env file) and
 * falls back to the placeholder in that JSON; the same value drives
 * canonical/og:url tags at runtime (src/seo/site.ts).
 */
function seoStaticPlugin(siteUrl: string): Plugin {
  const origin = siteUrl.replace(/\/+$/, "");
  const lastmod = new Date().toISOString().slice(0, 10);

  const files: Record<string, SeoFile> = {
    "/robots.txt": {
      body: [
        "# ATLAS - AI-powered personal learning OS (ASCII-safe for parsers)",
        "User-agent: *",
        "Allow: /",
        "",
        "# Auth-gated app + API endpoints are not crawlable content",
        "Disallow: /app/",
        "Disallow: /api/",
        "",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
      ].join("\n"),
      type: "text/plain; charset=utf-8",
    },
    "/sitemap.xml": {
      body: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...seoConfig.routes.map((route) =>
          [
            "  <url>",
            `    <loc>${origin}${route.path}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <changefreq>${route.changefreq}</changefreq>`,
            `    <priority>${route.priority}</priority>`,
            "  </url>",
          ].join("\n"),
        ),
        "</urlset>",
        "",
      ].join("\n"),
      type: "application/xml; charset=utf-8",
    },
  };

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const file = files[(req.url ?? "").split("?")[0]];
    if (!file) {
      next();
      return;
    }
    res.setHeader("Content-Type", file.type);
    res.end(file.body);
  };

  return {
    name: "atlas-seo-static",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({
          type: "asset",
          fileName: fileName.replace(/^\//, ""),
          source: file.body,
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const siteUrl = env.VITE_SITE_URL ?? seoConfig.url;

  return {
    plugins: [react(), tailwindcss(), seoStaticPlugin(siteUrl)],
    build: {
      rollupOptions: {
        output: {
          // Vendor split: heavy libs land in their own chunks so route-level
          // lazy imports never pull them in (dashboard pays for three/ogl,
          // landing never pays for supabase/katex). Pure chunking — identical
          // runtime behaviour and rendering.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/](@supabase|supabase)[\\/]/.test(id))
              return "supabase";
            if (/[\\/]node_modules[\\/]katex[\\/]/.test(id)) return "katex";
            if (/[\\/]node_modules[\\/]ogl[\\/]/.test(id)) return "ogl";
            if (
              /[\\/]node_modules[\\/](three|@react-three|three-stdlib|troika|maath)[\\/]/.test(
                id,
              )
            )
              return "three";
            if (/[\\/]node_modules[\\/]gsap[\\/]/.test(id)) return "gsap";
            if (/[\\/]node_modules[\\/](framer-motion|motion)[\\/]/.test(id))
              return "motion";
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
                id,
              )
            )
              return "react";
          },
        },
      },
    },
  };
});
