import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ChartColumn,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { getUser, signOut } from "../../lib/auth";
import { fetchUnreadMessageCount } from "../../lib/admin";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/wp-admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/wp-admin/users", label: "Users", icon: Users },
  { to: "/wp-admin/posts", label: "Posts", icon: FileText },
  { to: "/wp-admin/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/wp-admin/messages", label: "Messages", icon: Mail },
  { to: "/wp-admin/usage", label: "Usage & Analytics", icon: ChartColumn },
  { to: "/wp-admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  onNavigate,
  unread = 0,
}: {
  onNavigate?: () => void;
  unread?: number;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-gradient-to-r from-[#4044cc]/40 to-[#cf9eff]/20 text-white shadow-[inset_0_0_0_1px_rgba(207,158,255,0.25)]"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
            }`
          }
        >
          <Icon className="size-4 shrink-0" />
          {label}
          {to === "/wp-admin/messages" && unread > 0 && (
            <span
              title={`${unread} unread message${unread === 1 ? "" : "s"}`}
              aria-label={`${unread} unread message${unread === 1 ? "" : "s"}`}
              className="ml-auto inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setEmail(getUser()?.email ?? null);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Refresh the Messages badge whenever the admin route changes (so it is
  // up to date after marking messages read). Never throws: falls back to 0.
  useEffect(() => {
    let alive = true;
    void fetchUnreadMessageCount().then((n) => {
      if (alive) setUnread(n);
    });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const onLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-dvh bg-[#09090b] text-white">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-[#0b0b12] lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-[#cf9eff]/30 bg-gradient-to-br from-[#4044cc]/40 to-[#cf9eff]/25">
            <ShieldCheck className="size-4 text-[#cf9eff]" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">ATLAS</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
              Admin
            </p>
          </div>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto">
          <NavLinks unread={unread} />
        </div>

        {email && (
          <div className="border-t border-white/10 px-5 py-4">
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
        )}
      </aside>

      {/* ---------------- Mobile drawer ---------------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col border-r border-white/10 bg-[#0b0b12]">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border border-[#cf9eff]/30 bg-gradient-to-br from-[#4044cc]/40 to-[#cf9eff]/25">
                  <ShieldCheck className="size-4 text-[#cf9eff]" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold tracking-tight">ATLAS</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-gray-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-2 flex-1 overflow-y-auto">
              <NavLinks unread={unread} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- Main column ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#09090b]/85 px-4 py-3.5 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:text-white lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">
            Admin Panel
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <LogOut className="size-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
