import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  Clock,
  Crown,
  Flame,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Swords,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { getUser } from "../../lib/auth";
import { rankForLevel } from "../../lib/gamification";
import {
  createSquad,
  fetchBrowseSquads,
  fetchMySquad,
  inviteByEmail,
  leaveSquad,
  requestJoinSquad,
  respondToRequest,
} from "../../lib/db/squads";
import type {
  BrowseSquad,
  LeaderboardRow,
  MySquad,
  SquadNotification,
  SquadStatus,
  Squadmate,
} from "../../lib/db/squads";
import { PROFILE_CHANGED_EVENT } from "../../lib/db/profile";
import { EASE } from "../../lib/motion";

const STATUS_LABEL: Record<SquadStatus, string> = {
  studying: "Active today",
  online: "Active yesterday",
  offline: "Offline",
};

const STATUS_DOT: Record<SquadStatus, string> = {
  studying: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  online: "bg-star shadow-[0_0_8px_rgba(157,180,255,0.9)]",
  offline: "bg-white/25",
};

const CROWN_STYLE = [
  { text: "text-amber-300", glow: "shadow-[0_0_18px_rgba(251,191,36,0.5)]", label: "Gold" },
  { text: "text-slate-200", glow: "shadow-[0_0_16px_rgba(203,213,225,0.4)]", label: "Silver" },
  { text: "text-orange-400", glow: "shadow-[0_0_16px_rgba(251,146,60,0.4)]", label: "Bronze" },
];

/* ------------------------------------------------------------------ */
/* Premium squad member card                                           */
/* ------------------------------------------------------------------ */

function SquadCard({
  member,
  index,
}: {
  member: Squadmate;
  index: number;
}) {
  const rank = rankForLevel(member.level);
  const RankIcon = rank.icon;
  const pct = Math.min(100, Math.max(0, member.progressPercent));

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#111111] p-5 transition-all duration-300 hover:border-white/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(207,158,255,0.08),transparent_55%),radial-gradient(90%_70%_at_0%_100%,rgba(64,68,204,0.10),transparent_60%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative flex items-center gap-4">
        <div className="relative">
          <span
            className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-[#111111] ${member.avatarGradient} ${rank.ring}`}
          >
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt=""
                className="size-full rounded-full object-cover"
              />
            ) : (
              member.initials
            )}
          </span>
          <span
            className={`absolute right-0 bottom-0 size-3 rounded-full border-2 border-[#111111] ${STATUS_DOT[member.status]}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-white">
              {member.displayName}
            </h2>
            {member.isLeader && (
              <span
                title="Squad leader"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
              >
                <Crown className="size-2.5" />
                Leader
              </span>
            )}
            {member.isYou && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-star/40 bg-star/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-star">
                You
              </span>
            )}
          </div>
          <p className="truncate text-xs text-white/40">@{member.username}</p>
        </div>

        <span
          title={`${rank.label} rank`}
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold tracking-wide ${rank.border} ${rank.bg} ${rank.text} ${rank.glow}`}
        >
          <RankIcon className="size-3" />
          Lvl {member.level}
        </span>
      </div>

      <div className="relative mt-5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-white/50">
            <Zap className="size-3.5 text-blue-300/80" />
            <span className="font-medium text-white/80">{member.weeklyXp}</span>
            <span className="text-white/35">weekly XP</span>
            <span className="text-white/20">·</span>
            <span className="text-white/45">{member.totalXp} total</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-300/90">
            <Flame className="size-3.5" />
            {member.streak}d
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, delay: 0.2 + index * 0.06, ease: EASE }}
            className={`h-full rounded-full bg-gradient-to-r ${rank.gradient}`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/35">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {STATUS_LABEL[member.status]}
          </span>
          <span>
            {pct}% to Lvl {member.level + 1} · {rank.label}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Notification bell                                                   */
/* ------------------------------------------------------------------ */

function NotificationBell({
  requests,
  invites,
  busyId,
  onRespond,
}: {
  requests: SquadNotification[];
  invites: SquadNotification[];
  busyId: number | null;
  onRespond: (id: number, accept: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = requests.length + invites.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rows = [...requests, ...invites];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          count > 0
            ? `Notifications: ${count} pending`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-white/20 hover:text-white"
      >
        <Bell className="size-4.5" />
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -top-1.5 -right-1.5 grid min-w-4.5 place-items-center rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(244,63,94,0.7)]"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute top-[calc(100%+10px)] right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#0a0a12]/95 p-2 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <p className="px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
              Squad notifications
            </p>
            {rows.length === 0 ? (
              <p className="px-2.5 pb-3 text-sm text-white/40">
                No pending requests. New join requests will ring here.
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-[10px] font-semibold text-white ring-1 ring-white/10 ${row.avatarGradient}`}
                      >
                        {row.avatarUrl ? (
                          <img
                            src={row.avatarUrl}
                            alt=""
                            className="size-full rounded-full object-cover"
                          />
                        ) : (
                          row.initials || <Swords className="size-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-white">
                          {row.kind === "invite"
                            ? `${row.squadName} invited you`
                            : `${row.displayName} wants to join`}
                        </p>
                        <p className="truncate text-[11px] text-white/40">
                          {row.kind === "invite"
                            ? "Accept to join the squad"
                            : `Request for ${row.squadName}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => onRespond(row.id, true)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-2 py-1.5 text-[11px] font-medium text-emerald-200 transition-colors hover:bg-emerald-300/20 disabled:opacity-50"
                      >
                        <Check className="size-3" />
                        {busyId === row.id ? "…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => onRespond(row.id, false)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                      >
                        <X className="size-3" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                         */
/* ------------------------------------------------------------------ */

function LeaderboardPodium({ rows }: { rows: LeaderboardRow[] }) {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean) as LeaderboardRow[];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {order.map((row) => {
        const crown = CROWN_STYLE[row.position - 1] ?? CROWN_STYLE[0];
        const rank = rankForLevel(row.member.level);
        const RankIcon = rank.icon;
        const isFirst = row.position === 1;
        return (
          <motion.div
            key={row.member.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: row.position * 0.08, ease: EASE }}
            className={`relative overflow-hidden rounded-2xl border border-white/5 bg-[#111111] p-5 text-center ${
              isFirst ? "sm:-mt-3 sm:pb-7" : ""
            }`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 ${
                isFirst
                  ? "bg-[radial-gradient(110%_80%_at_50%_0%,rgba(251,191,36,0.14),transparent_60%)]"
                  : "bg-[radial-gradient(110%_80%_at_50%_0%,rgba(255,255,255,0.05),transparent_60%)]"
              }`}
            />
            <Crown
              className={`relative mx-auto size-6 ${crown.text} ${crown.glow}`}
            />
            <span className="relative mt-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              #{row.position} · {crown.label}
            </span>
            <span
              className={`relative mx-auto mt-3 flex ${isFirst ? "size-16" : "size-14"} items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-[#111111] ${row.member.avatarGradient} ${rank.ring}`}
            >
              {row.member.avatarUrl ? (
                <img
                  src={row.member.avatarUrl}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
              ) : (
                row.member.initials
              )}
            </span>
            <p className="relative mt-3 truncate text-sm font-semibold text-white">
              {row.member.displayName}
              {row.member.isYou && (
                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-star">
                  You
                </span>
              )}
            </p>
            <p className="relative mt-1 inline-flex items-center gap-1 text-[11px] text-white/40">
              <RankIcon className={`size-3 ${rank.text}`} />
              Lvl {row.member.level} · {rank.label}
            </p>
            <p className="relative mt-3 text-2xl font-semibold tracking-tight text-white">
              {row.member.weeklyXp}
              <span className="ml-1.5 text-[11px] font-medium text-white/35">
                weekly XP
              </span>
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function LeaderboardList({
  rows,
  busy,
}: {
  rows: LeaderboardRow[];
  busy: boolean;
}) {
  if (busy) {
    return (
      <p className="flex items-center gap-2 text-sm text-white/40">
        <Loader2 className="size-4 animate-spin" />
        Loading leaderboard…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <Swords className="mx-auto size-6 text-white/30" />
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-white">
          No squad, no podium
        </h2>
        <p className="mt-1 text-sm text-white/45">
          Create or join a squad to compete on the weekly leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LeaderboardPodium rows={rows} />

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#111111]">
        {rows.map((row, index) => {
          const rank = rankForLevel(row.member.level);
          const RankIcon = rank.icon;
          return (
            <motion.div
              key={row.member.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04, ease: EASE }}
              className={`flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5 last:border-b-0 sm:px-5 ${
                row.member.isYou
                  ? "border-star/25 bg-star/[0.06]"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              <span
                className={`w-7 shrink-0 text-center text-sm font-semibold ${
                  row.position <= 3
                    ? (CROWN_STYLE[row.position - 1] ?? CROWN_STYLE[0]).text
                    : "text-white/35"
                }`}
              >
                {row.position}
              </span>
              <span
                className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-[11px] font-semibold text-white ring-1 ring-white/10 ${row.member.avatarGradient}`}
              >
                {row.member.avatarUrl ? (
                  <img
                    src={row.member.avatarUrl}
                    alt=""
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  row.member.initials
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                  {row.member.displayName}
                  {row.member.isYou && (
                    <span className="shrink-0 rounded-full border border-star/40 bg-star/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-star">
                      You
                    </span>
                  )}
                  {row.member.isLeader && (
                    <Crown className="size-3 shrink-0 text-amber-300/80" />
                  )}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-white/40">
                  <RankIcon className={`size-3 ${rank.text}`} />
                  Lvl {row.member.level} · {rank.label} · 🔥 {row.member.streak}d
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-white">
                  {row.member.weeklyXp}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  weekly XP
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Tab = "members" | "leaderboard" | "browse";

const TABS: { id: Tab; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "browse", label: "Find a squad" },
];

const EMPTY_SQUAD: MySquad = {
  squad: null,
  members: [],
  pendingRequests: [],
  pendingInvites: [],
};

export default function SquadPage() {
  const user = getUser();
  const [state, setState] = useState<MySquad>(EMPTY_SQUAD);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("members");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [squadName, setSquadName] = useState("");
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState("");
  const [inviting, setInviting] = useState(false);

  const [browse, setBrowse] = useState<BrowseSquad[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [joinBusy, setJoinBusy] = useState<number | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  const load = useCallback(async () => {
    try {
      const next = await fetchMySquad();
      setState(next);
      if (next.squad) {
        setLeaderboard(
          [...next.members]
            .sort(
              (a, b) => b.weeklyXp - a.weeklyXp || b.totalXp - a.totalXp,
            )
            .map((member, index) => ({ position: index + 1, member })),
        );
      } else {
        setLeaderboard([]);
      }
    } catch {
      setState(EMPTY_SQUAD);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
  }, [load]);

  useEffect(() => {
    if (tab !== "browse" || browseLoading) return;
    let cancelled = false;
    setBrowseLoading(true);
    void fetchBrowseSquads()
      .then((rows) => {
        if (!cancelled) setBrowse(rows);
      })
      .catch(() => {
        if (!cancelled) setBrowse([]);
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const respond = async (id: number, accept: boolean) => {
    if (busyId !== null) return;
    setBusyId(id);
    const result = await respondToRequest(id, accept);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setFlash(result.message);
    await load();
  };

  const onCreateSquad = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    const result = await createSquad(squadName);
    setCreating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setFlash(result.message);
    setSquadName("");
    await load();
  };

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    const result = await inviteByEmail(invite);
    setInviting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setFlash(result.message);
    setInvite("");
  };

  const onJoin = async (squadId: number) => {
    if (joinBusy !== null) return;
    setJoinBusy(squadId);
    const result = await requestJoinSquad(squadId);
    setJoinBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setFlash(result.message);
    setBrowse(await fetchBrowseSquads().catch(() => browse));
  };

  const onLeave = async () => {
    if (!state.squad) return;
    const confirmed = window.confirm(
      `Leave "${state.squad.name}"?\n\nYou can rejoin only if the leader accepts you again.`,
    );
    if (!confirmed) return;
    const result = await leaveSquad();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setFlash(result.message);
    await load();
  };

  const isLeader = Boolean(
    user && state.squad && state.squad.leaderId === user.id,
  );
  const members = [...state.members].sort((a, b) => {
    if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
    return b.weeklyXp - a.weeklyXp;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            The squad
          </p>
          <RevealText
            as="h1"
            text="Climbing, together."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
          {state.squad && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/45">
              <span className="font-medium text-white/75">
                {state.squad.name}
              </span>
              <span>·</span>
              <span>{state.members.length} members</span>
              {isLeader && (
                <>
                  <span>·</span>
                  <span className="text-amber-300/80">You lead this squad</span>
                </>
              )}
            </p>
          )}
        </div>

        <NotificationBell
          requests={state.pendingRequests}
          invites={state.pendingInvites}
          busyId={busyId}
          onRespond={(id, accept) => void respond(id, accept)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`relative flex-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors sm:flex-none sm:text-sm ${
                active ? "text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="squad-tab-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.07]"
                />
              )}
              <span className="relative">{entry.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-xs text-rose-300/80"
            role="alert"
          >
            {error}
          </motion.p>
        )}
        {flash && !error && (
          <motion.p
            key={flash}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 text-sm text-emerald-300/90"
          >
            <Check className="size-4" />
            {flash}
          </motion.p>
        )}
      </AnimatePresence>

      {tab === "members" && (
        <div className="space-y-5">
          {state.pendingInvites.length > 0 && (
            <div className="rounded-2xl border border-star/25 bg-star/[0.05] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-star/80">
                Pending invites
              </p>
              <div className="mt-3 space-y-2">
                {state.pendingInvites.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5"
                  >
                    <span className="text-sm text-white/80">
                      <span className="font-medium text-white">
                        {row.squadName}
                      </span>{" "}
                      invited you to join.
                    </span>
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void respond(row.id, true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-300/20 disabled:opacity-50"
                      >
                        <Check className="size-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void respond(row.id, false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                      >
                        <X className="size-3.5" />
                        Decline
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="size-4 animate-spin" />
              Loading squad…
            </p>
          ) : !state.squad ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="rounded-2xl border border-white/5 bg-[#111111] p-6 sm:p-7"
              >
                <span className="grid size-11 place-items-center rounded-xl border border-[#cf9eff]/30 bg-[#cf9eff]/10">
                  <Swords className="size-5 text-[#cf9eff]" />
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">
                  Create your squad
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                  Name your crew, invite friends by email, and climb the weekly
                  leaderboard together.
                </p>
                <form onSubmit={onCreateSquad} className="mt-5 flex gap-2">
                  <div className="glass flex flex-1 items-center gap-2.5 rounded-xl px-4 py-2.5">
                    <Plus className="size-4 text-white/30" />
                    <input
                      type="text"
                      value={squadName}
                      maxLength={40}
                      onChange={(e) => setSquadName(e.target.value)}
                      placeholder="Squad name"
                      aria-label="Squad name"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating || squadName.trim().length < 2}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-[#05050a] transition-all hover:shadow-[0_0_28px_rgba(207,158,255,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {creating ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Swords className="size-3.5" />
                    )}
                    Create
                  </button>
                </form>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
                className="rounded-2xl border border-white/5 bg-[#111111] p-6 sm:p-7"
              >
                <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <UserPlus className="size-5 text-white/40" />
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">
                  Or join one
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                  Browse open squads and send a request - the leader approves
                  every new member personally.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("browse")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
                >
                  Browse squads
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#111111] p-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10">
                    <Swords className="size-4.5 text-[#cf9eff]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {state.squad.name}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {state.members.length} members · weekly leaderboard resets
                      Monday
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onLeave()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/55 transition-colors hover:border-rose-400/40 hover:text-rose-300"
                >
                  <LogOut className="size-3.5" />
                  Leave squad
                </button>
              </div>

              {isLeader && (
                <form
                  onSubmit={onInvite}
                  className="flex flex-wrap items-center gap-2"
                >
                  <div className="glass flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 py-2.5 sm:max-w-sm">
                    <Mail className="size-4 text-white/30" />
                    <input
                      type="email"
                      value={invite}
                      onChange={(e) => setInvite(e.target.value)}
                      placeholder="friend@email.com"
                      aria-label="Invite a friend by email"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-[#05050a] transition-all hover:shadow-[0_0_28px_rgba(207,158,255,0.4)] disabled:opacity-50"
                  >
                    {inviting ? "Sending…" : "Send invite"}
                  </button>
                  <span className="text-[11px] text-white/35">
                    Invites land in their notification bell.
                  </span>
                </form>
              )}

              {isLeader && state.pendingRequests.length > 0 && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-300/80">
                    <Bell className="size-3.5" />
                    {state.pendingRequests.length} pending join request
                    {state.pendingRequests.length > 1 ? "s" : ""}
                  </p>
                  <div className="mt-3 space-y-2">
                    {state.pendingRequests.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-[10px] font-semibold text-white ring-1 ring-white/10 ${row.avatarGradient}`}
                          >
                            {row.avatarUrl ? (
                              <img
                                src={row.avatarUrl}
                                alt=""
                                className="size-full rounded-full object-cover"
                              />
                            ) : (
                              row.initials
                            )}
                          </span>
                          <span className="truncate text-sm text-white/80">
                            <span className="font-medium text-white">
                              {row.displayName}
                            </span>{" "}
                            wants to join
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void respond(row.id, true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-300/20 disabled:opacity-50"
                          >
                            <Check className="size-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void respond(row.id, false)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                          >
                            <X className="size-3.5" />
                            Decline
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((member, i) => (
                  <SquadCard key={member.id} member={member} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "leaderboard" && (
        <LeaderboardList rows={leaderboard} busy={loading} />
      )}

      {tab === "browse" && (
        <div className="space-y-3">
          {browseLoading ? (
            <p className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="size-4 animate-spin" />
              Loading squads…
            </p>
          ) : browse.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <Swords className="mx-auto size-6 text-white/30" />
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-white">
                No squads yet
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Be the first - create one from the Members tab.
              </p>
            </div>
          ) : (
            browse.map((squad, index) => (
              <motion.div
                key={squad.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.04, ease: EASE }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#111111] px-4 py-3.5 transition-colors hover:border-white/10 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Swords className="size-4 text-white/40" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {squad.name}
                    </p>
                    <p className="truncate text-[11px] text-white/40">
                      Led by {squad.leaderName} · {squad.memberCount} member
                      {squad.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {squad.isMember ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3.5 py-2 text-xs font-medium text-emerald-200">
                    <Check className="size-3.5" />
                    Your squad
                  </span>
                ) : squad.requested ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3.5 py-2 text-xs font-medium text-amber-200">
                    <Bell className="size-3.5" />
                    Requested
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={joinBusy === squad.id}
                    onClick={() => void onJoin(squad.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-[#05050a] transition-all hover:shadow-[0_0_24px_rgba(207,158,255,0.35)] disabled:opacity-50"
                  >
                    {joinBusy === squad.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Request to join
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Screen-reader summary for the bell state. */}
      <p className="sr-only" aria-live="polite">
        {state.pendingRequests.length + state.pendingInvites.length} pending
        squad notifications.
      </p>
    </div>
  );
}
