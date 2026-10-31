import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  CheckCheck,
  FileText,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  type NotificationKind,
} from "../../lib/notifications";
import { syncAllNotifications } from "../../lib/liveNotifications";
import { EASE } from "../../lib/motion";

const ICONS: Record<NotificationKind, typeof Bell> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  note_shared: FileText,
};

const TONES: Record<NotificationKind, string> = {
  friend_request: "border-[#cf9eff]/35 bg-[#cf9eff]/12 text-[#cf9eff]",
  friend_accepted: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  note_shared: "border-star/35 bg-star/10 text-star",
};

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;
    void syncAllNotifications();
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const openItem = (id: string, href: string) => {
    markNotificationRead(id);
    setOpen(false);
    navigate(href);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        {unread > 0 ? (
          <BellRing className="size-[18px] text-[#cf9eff]" />
        ) : (
          <Bell className="size-[18px]" />
        )}
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-[#cf9eff] px-1 text-[9px] font-bold leading-4 text-[#0a0a12] shadow-[0_0_12px_rgba(207,158,255,0.7)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="fixed inset-x-4 top-[calc(4rem+8px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#07070e]/95 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:top-[calc(100%+10px)] sm:right-0 sm:w-[22rem]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-[#cf9eff]/20 blur-3xl"
            />
            <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="grid min-w-4.5 place-items-center rounded-full bg-[#cf9eff]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#cf9eff]">
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="relative max-h-[min(26rem,70vh)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Bell className="mx-auto size-6 text-white/20" />
                  <p className="mt-3 text-sm text-white/45">
                    You're all caught up.
                  </p>
                  <p className="mt-1 text-[11px] text-white/30">
                    Friend requests and shared notes land here instantly.
                  </p>
                </div>
              ) : (
                <ul>
                  {items.map((item) => {
                    const Icon = ICONS[item.kind];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => openItem(item.id, item.href)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05] ${
                            item.read ? "opacity-60" : "bg-white/[0.02]"
                          }`}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-xl border ${TONES[item.kind]}`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm leading-snug text-white">
                              {item.message}
                            </span>
                            {item.detail && (
                              <span className="mt-0.5 block truncate text-[11px] text-white/45">
                                {item.detail}
                              </span>
                            )}
                            <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-white/30">
                              {timeAgo(item.createdAt)}
                            </span>
                          </span>
                          {!item.read && (
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#cf9eff] shadow-[0_0_8px_rgba(207,158,255,0.9)]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}