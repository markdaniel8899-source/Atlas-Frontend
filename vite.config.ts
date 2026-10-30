import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import seoConfig from "./src/seo/config.json" with { type: "json" };
import {
  buildRobots,
  buildRss,
  buildSitemap,
  buildStaticBlogIndexHtml,
  buildStaticPostHtml,
  fetchStaticBlogPosts,
  type StaticAssets,
  type StaticBlogPost,
} from "./src/seo/blogStatic";

interface SeoFile {
  body: string;
  type: string;
}

interface BlogSeoPluginOptions {
  origin: string;
  siteName: string;
  siteDescription: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

/**
 * Build-time SEO: robots.txt, sitemap.xml, rss.xml, plus a fully rendered
 * /blog.html and /blog/<slug>.html for every published post. Crawlers and
 * link unfurlers get real HTML before the SPA boots. Vercel `cleanUrls` maps
 * /blog and /blog/<slug> onto these files; the React app then takes over.
 *
 * The post feed is read from Supabase REST with the public anon key (RLS
 * limits it to published rows). If the fetch is unavailable the build still
 * succeeds with base routes only.
 */
function blogSeoPlugin(options: BlogSeoPluginOptions): Plugin {
  const origin = options.origin.replace(/\/+$/, "");
  let feedPromise: Promise<StaticBlogPost[]> | undefined;

  const getFeed = (): Promise<StaticBlogPost[]> => {
    if (!feedPromise) {
      feedPromise = fetchStaticBlogPosts({
        origin,
        siteName: options.siteName,
        siteDescription: options.siteDescription,
        supabaseUrl: options.supabaseUrl,
        supabaseKey: options.supabaseKey,
        limit: 200,
      }).catch((error: unknown) => {
        feedPromise = undefined;
        throw error;
      });
    }
    return feedPromise;
  };

  const safeFeed = async (): Promise<StaticBlogPost[]> => {
    try {
      return await getFeed();
    } catch (error) {
      console.warn(
        `[blog-seo] Could not read published posts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  };

  const seoFiles = (posts: StaticBlogPost[]): Record<string, SeoFile> => ({
    "/robots.txt": {
      body: buildRobots(origin),
      type: "text/plain; charset=utf-8",
    },
    "/sitemap.xml": {
      body: buildSitemap(origin, seoConfig.routes, posts),
      type: "application/xml; charset=utf-8",
    },
    "/rss.xml": {
      body: buildRss(
        origin,
        options.siteName,
        options.siteDescription,
        posts,
      ),
      type: "application/rss+xml; charset=utf-8",
    },
  });

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const pathname = (req.url ?? "").split("?")[0];
    if (
      pathname !== "/robots.txt" &&
      pathname !== "/sitemap.xml" &&
      pathname !== "/rss.xml"
    ) {
      next();
      return;
    }
    void safeFeed().then((posts) => {
      const file = seoFiles(posts)[pathname];
      res.setHeader("Content-Type", file.type);
      res.end(file.body);
    });
  };

  const findEntryAssets = (
    bundle: Record<
      string,
      {
        type: string;
        isEntry?: boolean;
        fileName: string;
        viteMetadata?: { importedCss?: Set<string> };
      }
    >,
  ): StaticAssets => {
    for (const item of Object.values(bundle)) {
      if (item.type !== "chunk" || !item.isEntry) continue;
      return {
        js: `/${item.fileName}`,
        css: Array.from(item.viteMetadata?.importedCss ?? []).map(
          (file) => `/${file}`,
        ),
      };
    }
    return {};
  };

  return {
    name: "atlas-blog-seo",
    transformIndexHtml(html) {
      // Keep the static fallback metadata aligned with VITE_SITE_URL even
      // before React mounts and rewrites canonical/Open Graph tags.
      return html.replaceAll(seoConfig.url, origin);
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    async generateBundle(_outputOptions, bundle) {
      const posts = await safeFeed();
      const assets = findEntryAssets(
        bundle as unknown as Record<
          string,
          {
            type: string;
            isEntry?: boolean;
            fileName: string;
            viteMetadata?: { importedCss?: Set<string> };
          }
        >,
      );
      const files = seoFiles(posts);

      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({
          type: "asset",
          fileName: fileName.replace(/^\//, ""),
          source: file.body,
        });
      }

      this.emitFile({
        type: "asset",
        fileName: "blog.html",
        source: buildStaticBlogIndexHtml(
          posts,
          {
            origin,
            siteName: options.siteName,
            siteDescription: options.siteDescription,
          },
          assets,
        ),
      });

      for (const post of posts) {
        this.emitFile({
          type: "asset",
          fileName: `blog/${post.slug}.html`,
          source: buildStaticPostHtml(
            post,
            {
              origin,
              siteName: options.siteName,
              siteDescription: options.siteDescription,
            },
            assets,
          ),
        });
      }

      this.info(
        `[blog-seo] ${posts.length} static post page(s), sitemap and RSS emitted.`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const siteUrl = env.VITE_SITE_URL ?? seoConfig.url;

  return {
    plugins: [
      react(),
      tailwindcss(),
      blogSeoPlugin({
        origin: siteUrl,
        siteName: seoConfig.name,
        siteDescription: seoConfig.description,
        supabaseUrl: env.VITE_SUPABASE_URL,
        supabaseKey: env.VITE_SUPABASE_ANON_KEY,
      }),
    ],
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
