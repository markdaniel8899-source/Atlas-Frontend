import { lazy, Suspense, useEffect, useRef } from "react";
import { useLenis } from "./hooks/useLenis";
import { scrollToTop } from "./lib/scroll";
import { MotionConfig } from "framer-motion";
import { CustomCursor } from "./components/CustomCursor";
import { ScrollProgressIndicator } from "./components/ScrollProgressIndicator";
import {
  DoubleCurtain,
  notifyDoubleCurtainRouteExitComplete,
} from "./components/DoubleCurtain";

// Route-level code splitting: the first paint only evaluates the app shell
// (react/router/motion/lenis). Each route chunk — and its vendor chain
// (three/ogl for landing, supabase/katex for the dashboard) — is fetched on
// demand and warmed in the background during idle time (see prefetch below),
// so navigation never waits on the network.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Auth = lazy(() => import("./pages/Auth"));
const AboutPage = lazy(() => import("./pages/site/AboutPage"));
const ContactPage = lazy(() => import("./pages/site/ContactPage"));
const BlogPage = lazy(() => import("./pages/site/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/site/BlogPostPage"));
const PrivacyPage = lazy(() => import("./pages/site/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/site/TermsPage"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
import { EASE, routeVariants } from "./lib/motion";
import { CURTAIN_REVEALED_EVENT, forceRepaint } from "./lib/repaint";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "./seo/Seo";
import { PAGES } from "./seo/metadata";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import type { ReactNode } from "react";

function GroupTransition({
  variant,
  children,
}: {
  variant: keyof typeof routeVariants;
  children: ReactNode;
}) {
  // Entering /app must paint with NO animation covering it. A full-screen
  // veil fading out over the freshly mounted dashboard makes Chromium paint
  // the glass cards and glow discs while they are occluded by that animated
  // layer, so every blur effect rasterizes as a sharp "blob" and never
  // re-paints until a full reload. Hard refresh always looked correct
  // because AnimatePresence initial={false} blocks initial animations for
  // the whole subtree (PresenceContext.initial === false), so the veil never
  // faded there. initial={false} + animate opacity 0 reproduces exactly that
  // known-good first frame; the veil only animates when leaving /app.
  if (variant === "app") {
    return (
      <div className="relative z-10 min-h-dvh">
        <motion.div
          initial={false}
          animate={{ opacity: 0 }}
          exit={{ opacity: 1, transition: { duration: 0.3, ease: EASE } }}
          transition={{ duration: 0.45, ease: EASE }}
          className="pointer-events-none fixed inset-0 z-[60] bg-[#030305]"
        />
        {children}
      </div>
    );
  }

  const variants = routeVariants[variant];
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      className="relative z-10 min-h-dvh"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const segment = location.pathname.split("/")[1] ?? "";
  const key =
    segment === "login" || segment === "auth"
      ? "auth"
      : segment === "app"
        ? "app"
        : "landing";

  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
      onExitComplete={() => {
        notifyDoubleCurtainRouteExitComplete();
      }}
    >
      <Suspense fallback={null}>
        <Routes location={location} key={key}>
          <Route
            path="/"
            element={
              <GroupTransition variant="landing">
                <Seo {...PAGES.home} />
                <LandingPage />
              </GroupTransition>
            }
          />
          <Route
            path="/login"
            element={
              <GroupTransition variant="auth">
                <Seo {...PAGES.login} />
                <Auth />
              </GroupTransition>
            }
          />
          <Route path="/auth" element={<Navigate to="/login" replace />} />

          <Route
            path="/about"
            element={
              <GroupTransition variant="landing">
                <Seo {...PAGES.about} />
                <AboutPage />
              </GroupTransition>
            }
          />
          <Route
            path="/contact"
            element={
              <GroupTransition variant="landing">
                <Seo {...PAGES.contact} />
                <ContactPage />
              </GroupTransition>
            }
          />
          <Route
            path="/blog"
            element={
              <GroupTransition variant="landing">
                <Seo {...PAGES.blog} />
                <BlogPage />
              </GroupTransition>
            }
          />
          <Route
            path="/blog/:slug"
            element={
              <GroupTransition variant="landing">
                {/* Per-post Seo is set inside BlogPostPage once the row loads. */}
                <BlogPostPage />
              </GroupTransition>
            }
          />
          <Route
            path="/privacy"
            element={
              <GroupTransition variant="landing">
                <Seo {...PAGES.privacy} />
                <PrivacyPage />
              </GroupTransition>
            }
          />
          <Route
            path="/terms"
            element={
              <GroupTransition variant="landing">
                <Seo {...PAGES.terms} />
                <TermsPage />
              </GroupTransition>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/app"
              element={
                <GroupTransition variant="app">
                  {/* Auth-gated: noindex + nofollow, never in the sitemap. */}
                  <Seo {...PAGES.app} />
                  <DashboardLayout />
                </GroupTransition>
              }
            >
              {/* Pages are rendered (and kept mounted) by DashboardLayout so tab
                switches don't unmount them. Routes exist for URLs only. */}
              <Route index element={null} />
              <Route path="roadmap" element={null} />
              <Route path="courses" element={null} />
              <Route path="notes" element={null} />
              <Route path="quiz" element={null} />
              <Route path="timer" element={null} />
              <Route path="assistant" element={null} />
              <Route path="settings" element={null} />
              <Route path="calendar" element={null} />
              <Route path="squad" element={null} />
              <Route
                path="friends"
                element={<Navigate to="/app/squad" replace />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  useLenis();
  const routesRef = useRef<HTMLDivElement>(null);

  // A curtain covers the screen while the next route mounts under it, so
  // Chromium may keep the first (occluded, blurred) raster of the fresh
  // route's backdrop-filter layers. Once the curtain reports it has opened,
  // force one extra layout/paint pass so those layers redraw sharp.
  useEffect(() => {
    const el = routesRef.current;
    if (!el) return;
    const repaint = () => forceRepaint(el);
    window.addEventListener(CURTAIN_REVEALED_EVENT, repaint);
    return () => window.removeEventListener(CURTAIN_REVEALED_EVENT, repaint);
  }, []);

  // Warm every route chunk once the browser is idle so lazy navigation
  // resolves from cache (curtain transitions never stall on a chunk fetch).
  // Same total bytes as the old monolithic bundle, just moved off the
  // critical path of first paint.
  useEffect(() => {
    const idle: (cb: () => void) => void =
      "requestIdleCallback" in window
        ? (cb) => window.requestIdleCallback(() => cb(), { timeout: 4000 })
        : (cb) => window.setTimeout(cb, 2000);
    idle(() => {
      void Promise.allSettled([
        import("./pages/LandingPage"),
        import("./pages/Auth"),
        import("./pages/site/AboutPage"),
        import("./pages/site/ContactPage"),
        import("./pages/site/BlogPage"),
        import("./pages/site/BlogPostPage"),
        import("./pages/site/PrivacyPage"),
        import("./pages/site/TermsPage"),
        import("./layouts/DashboardLayout"),
        import("./components/ProtectedRoute"),
      ]);
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <div ref={routesRef}>
          <AnimatedRoutes />
        </div>
        <CustomCursor />
        <ScrollProgressIndicator />
        <DoubleCurtain />
      </BrowserRouter>
    </MotionConfig>
  );
}
