import { memo, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  LayoutDashboard,
  LogOut,
  Mail,
  Map,
  Menu,
  Settings,
  Sparkles,
  Timer,
  Users,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getUser, signOut } from "../lib/auth";
import { PROFILE_CHANGED_EVENT, fetchProfile } from "../lib/db/profile";
import type { Profile } from "../lib/db/types";
import { EASE } from "../lib/motion";
import { CurtainLink, curtainNavigate } from "../components/PageCurtain";
import { TimerProvider } from "../context/TimerContext";
import DashboardHome from "../pages/dashboard/DashboardHome";
import RoadmapPage from "../pages/dashboard/RoadmapPage";
import CoursesPage from "../pages/dashboard/CoursesPage";
import NotesPage from "../pages/dashboard/NotesPage";
import QuizPage from "../pages/dashboard/QuizPage";
import TimerPage from "../pages/dashboard/TimerPage";
import SquadPage from "../pages/dashboard/SquadPage";
import AiAssistantPage from "../pages/dashboard/AiAssistantPage";
import SettingsPage from "../pages/dashboard/SettingsPage";
import CalendarPage from "../pages/dashboard/CalendarPage";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/roadmap", label: "Roadmap", icon: Map },
  { to: "/app/courses", label: "Courses", icon: GraduationCap },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/quiz", label: "Quiz", icon: ListChecks },
  { to: "/app/timer", label: "Timer", icon: Timer },
  { to: "/app/squad", label: "Squad", icon: Users },
  { to: "/app/assistant", label: "Assistant", icon: Sparkles },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

/** Sections that scope themselves by the shared ?courseId= query param. */
const COURSE_SCOPED_PATHS = new Set([
  "/app/roadmap",
  "/app/courses",
  "/app/notes",
  "/app/timer",
]);

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/roadmap": "Roadmap",
  "/app/courses": "Courses",
  "/app/notes": "Notes",
  "/app/quiz": "Quiz",
  "/app/timer": "Timer",
  "/app/squad": "Squad",
  "/app/settings": "Settings",
  "/app/calendar": "Calendar",
  "/app/assistant": "AI Assistant",
};

const MESH =
  "bg-[radial-gradient(55%_45%_at_12%_0%,rgba(64,68,204,0.20),transparent_65%),radial-gradient(45%_40%_at_88%_12%,rgba(207,158,255,0.10),transparent_65%),radial-gradient(40%_35%_at_50%_100%,rgba(11,34,70,0.40),transparent_70%)]";

// Pages mount on first visit and stay mounted afterwards (shown/hidden with
// CSS), so local state (chat history, drafts, scroll) survives tab switches.
// Mounting only the active page keeps the initial dashboard render light.
const PAGES: { path: string; Component: ComponentType }[] = [
  { path: "/app", Component: DashboardHome },
  { path: "/app/roadmap", Component: RoadmapPage },
  { path: "/app/courses", Component: CoursesPage },
  { path: "/app/notes", Component: NotesPage },
  { path: "/app/quiz", Component: QuizPage },
  { path: "/app/timer", Component: TimerPage },
  { path: "/app/squad", Component: SquadPage },
  { path: "/app/assistant", Component: AiAssistantPage },
  { path: "/app/settings", Component: SettingsPage },
  { path: "/app/calendar", Component: CalendarPage },
];

/** Memoized so a layout re-render (location change) only re-renders the two
 *  slots whose `active` prop actually flipped - not every mounted page. */
const PageSlot = memo(function PageSlot({
  Component,
  active,
}: {
  Component: ComponentType;
  active: boolean;
}) {
  return (
    // Tab switch transition: fades the slot in when it becomes active (and
    // out when it leaves). Opacity only, so no transform ever becomes the
    // containing block for fixed children inside a page.
    <motion.div
      className={active ? "block" : "hidden"}
      aria-hidden={!active}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <Component />
    </motion.div>
  );
});

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-3 rotate-45 rounded-[2px] border border-star/80 bg-star/20" />
      <span className="text-base font-semibold tracking-[-0.03em] text-white">
        ATLAS
      </span>
    </div>
  );
}

function NavLinks({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  // Keep the active course selection while hopping between the course-scoped
  // sections (Roadmap / Courses / Notes / Timer) - they all share ?courseId=.
  const courseId = new URLSearchParams(location.search).get("courseId");
  const keepCourse = (to: string) =>
    courseId && COURSE_SCOPED_PATHS.has(to)
      ? `${to}?courseId=${encodeURIComponent(courseId)}`
      : to;

  return (
    <nav className="flex flex-col gap-1.5">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={keepCourse(item.to)}
          end={item.end}
          onClick={onNavigate}
          title={open ? undefined : item.label}
          aria-label={item.label}
          className={({ isActive }) =>
            `relative flex items-center rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
              open ? "gap-3" : "justify-center"
            } ${
              isActive
                ? "border-[#cf9eff]/25 bg-[#cf9eff]/10 text-white shadow-[0_0_24px_-8px_rgba(207,158,255,0.7)]"
                : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/90"
            }`
          }
        >
          <item.icon className="size-4 shrink-0" />
          {open && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar({
  open,
  onToggle,
  onNavigate,
}: {
  open: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] ${
          open ? "px-5" : "px-3"
        }`}
      >
        {open ? (
          <Logo />
        ) : (
          <span
            aria-label="ATLAS"
            className="size-3 rotate-45 rounded-[2px] border border-star/80 bg-star/20"
          />
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            title={open ? "Collapse sidebar" : "Expand sidebar"}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            {open ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks open={open} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Sidebar toggle - open by default. */
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const user = getUser();
  const userId = user?.id;
  const activePath =
    location.pathname.length > 1 && location.pathname.endsWith("/")
      ? location.pathname.slice(0, -1)
      : location.pathname;
  const title = TITLES[activePath] ?? "Dashboard";

  // Pages the user has opened at least once; they stay mounted from then on.
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([activePath]),
  );
  useEffect(() => {
    setVisited((prev) =>
      prev.has(activePath) ? prev : new Set(prev).add(activePath),
    );
  }, [activePath]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const name = profile?.display_name?.trim() || user?.name || "";
  const avatarUrl = profile?.avatar_url ?? null;

  const initials = (name || user?.email || "A")
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      void fetchProfile(userId)
        .then((next) => {
          if (!cancelled) setProfile(next);
        })
        .catch(() => {
          if (!cancelled) setProfile(null);
        });
    };
    load();
    window.addEventListener(PROFILE_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_CHANGED_EVENT, load);
    };
  }, [userId]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    curtainNavigate(navigate, "/login", { replace: true });
  };

  return (
    <TimerProvider>
    <div className="relative min-h-dvh bg-[#04040a]">
      <div aria-hidden="true" className={`pointer-events-none fixed inset-0 z-0 ${MESH}`} />

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden overflow-hidden border-r border-white/[0.05] bg-white/[0.03] backdrop-blur-md transition-[width] duration-300 md:block ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <Sidebar
          open={isSidebarOpen}
          onToggle={() => setSidebarOpen((value) => !value)}
        />
      </aside>

      <header
        className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-white/[0.05] bg-white/[0.03] px-4 backdrop-blur-md transition-[left] duration-300 md:px-8 ${
          isSidebarOpen ? "md:left-64" : "md:left-20"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          {/* App-shell title, not a document heading: each page owns the
              page's single <h1>, so this stays a plain element. */}
          <div className="truncate text-base font-medium tracking-[-0.02em] text-white">
            {title}
          </div>
        </div>

        <div ref={profileRef} className="relative flex shrink-0 items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="truncate text-sm text-white">{name}</p>
            <p className="truncate text-xs text-white/40">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded-full p-1 transition-colors hover:bg-white/[0.06]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3d4f9e] to-[#7b8ee8] text-xs font-semibold text-white">
                {initials}
              </span>
            )}
            <ChevronDown
              className={`size-3.5 text-white/40 transition-transform duration-300 ${
                profileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="absolute top-[calc(100%+10px)] right-0 z-50 w-60 rounded-2xl border border-white/10 bg-[#0a0a12]/95 p-1.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
              >
                <div className="px-3 py-2">
                  <p className="truncate text-sm text-white">
                    {name || "Your account"}
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {user?.email}
                  </p>
                </div>
                <div className="mx-1 my-1 border-t border-white/[0.07]" />
                <div onClick={() => setProfileMenuOpen(false)}>
                  <CurtainLink
                    to="/about"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Info className="size-4" />
                    About ATLAS
                  </CurtainLink>
                </div>
                <div onClick={() => setProfileMenuOpen(false)}>
                  <CurtainLink
                    to="/contact"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Mail className="size-4" />
                    Help &amp; Contact
                  </CurtainLink>
                </div>
                <div className="mx-1 my-1 border-t border-white/[0.07]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: EASE }}
              className="fixed inset-y-0 left-0 z-50 w-60 border-r border-white/[0.05] bg-[rgba(6,6,14,0.94)] backdrop-blur-2xl md:hidden"
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-2 text-white/50 transition-colors hover:text-white"
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
              <Sidebar
                open
                onNavigate={() => setMenuOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main
        className={`relative z-10 min-h-dvh pt-16 transition-[padding-left] duration-300 md:pt-0 ${
          isSidebarOpen ? "md:pl-64" : "md:pl-20"
        }`}
      >
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
          {PAGES.filter(({ path }) => visited.has(path)).map(
            ({ path, Component }) => (
              <PageSlot
                key={path}
                Component={Component}
                active={activePath === path}
              />
            ),
          )}
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-8 md:px-10">
          <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-6 text-xs text-zinc-500 sm:justify-end">
            <CurtainLink
              to="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy Policy
            </CurtainLink>
            <CurtainLink
              to="/terms"
              className="transition-colors hover:text-white"
            >
              Terms of Service
            </CurtainLink>
            <CurtainLink
              to="/contact"
              className="transition-colors hover:text-white"
            >
              Contact Us
            </CurtainLink>
          </footer>
        </div>
      </main>
    </div>
    </TimerProvider>
  );
}
