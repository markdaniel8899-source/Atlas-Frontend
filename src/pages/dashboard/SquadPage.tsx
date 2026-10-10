import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Clock,
  Flame,
  Loader2,
  Mail,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { rankForLevel } from "../../lib/gamification";
import {
  acceptInvite,
  declineInvite,
  fetchSquad,
  inviteFriend,
  type SquadMember,
  type SquadStatus,
} from "../../lib/db/squad";
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

/* ------------------------------------------------------------------ */
/* Friend card (tall gradient card)                                    */
/* ------------------------------------------------------------------ */

function FriendCard({ member, index }: { member: SquadMember; index: number }) {
  const rank = rankForLevel(member.level);
  const RankIcon = rank.icon;
  const pct = Math.min(100, Math.max(0, member.progressPercent));

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-black p-6 transition-all duration-300 hover:border-white/10 sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative flex items-center gap-4">
        <div className="relative">
          <span
            className={`flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-base font-semibold text-white ring-2 ring-offset-2 ring-offset-black ${member.avatar} ${rank.ring}`}
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
            className={`absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-[2.5px] border-black ${STATUS_DOT[member.status]}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-white">
              {member.displayName}
            </h2>
          </div>
          <p className="truncate text-xs text-white/40">@{member.username}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-white/45">
            <Clock className="size-3" />
            {STATUS_LABEL[member.status]}
          </p>
        </div>

        <span
          title={`${rank.label} rank`}
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold tracking-wide ${rank.border} ${rank.bg} ${rank.text} ${rank.glow}`}
        >
          <RankIcon className="size-3" />
          Lvl {member.level}
        </span>
      </div>

      <div className="relative mt-6 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-white/50">
            <Zap className="size-3.5 text-blue-300/80" />
            <span className="font-medium text-white/80">
              {member.xp.toLocaleString()}
            </span>
            <span className="text-white/35">total XP</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-300/90">
            <Flame className="size-3.5" />
            {member.streak}d streak
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
          <span className="uppercase tracking-wider">{rank.label}</span>
          <span>
            {pct}% to Lvl {member.level + 1}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Request row                                                         */
/* ------------------------------------------------------------------ */

function RequestRow({
  member,
  busy,
  onAccept,
  onDecline,
}: {
  member: SquadMember;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const incoming = member.relationship === "incoming";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-black px-5 py-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-semibold text-white ring-1 ring-white/10 ${member.avatar}`}
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
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {member.displayName}
          </p>
          <p className="truncate text-[11px] text-white/40">
            {incoming ? "wants to be your friend" : "invitation sent · waiting"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {incoming ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-300/20 disabled:opacity-50"
            >
              <Check className="size-3.5" />
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDecline}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
            >
              <X className="size-3.5" />
              Decline
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/55 transition-colors hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Tab = "friends" | "requests";

const TABS: { id: Tab; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "requests", label: "Requests" },
];

export default function SquadPage() {
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("friends");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [invite, setInvite] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await fetchSquad());
    } catch {
      setMembers([]);
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

  const friends = useMemo(
    () => members.filter((m) => m.relationship === "friend"),
    [members],
  );
  const incoming = useMemo(
    () => members.filter((m) => m.relationship === "incoming"),
    [members],
  );
  const outgoing = useMemo(
    () => members.filter((m) => m.relationship === "outgoing"),
    [members],
  );
  const requestCount = incoming.length + outgoing.length;

  const respond = async (member: SquadMember, accept: boolean) => {
    if (busyId !== null) return;
    setBusyId(member.friendshipId);
    if (accept) {
      await acceptInvite(member.friendshipId);
      setFlash(`${member.displayName} is now your friend.`);
    } else {
      await declineInvite(member.friendshipId);
      setFlash("Request removed.");
    }
    setBusyId(null);
    setError(null);
    await load();
  };

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    const result = await inviteFriend(invite);
    setInviting(false);
    if (!result.ok) {
      setError(result.message);
      setFlash(null);
      return;
    }
    setError(null);
    setFlash(result.message);
    setInvite("");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Your people
          </p>
          <RevealText
            as="h1"
            text="Friends."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
          <p className="mt-2 text-sm text-white/45">
            {loading
              ? "Loading…"
              : `${friends.length} friend${friends.length === 1 ? "" : "s"} · ${
                  requestCount > 0
                    ? `${requestCount} pending request${requestCount === 1 ? "" : "s"}`
                    : "no pending requests"
                }`}
          </p>
        </div>

        <form onSubmit={onInvite} className="flex items-center gap-2">
          <div className="glass flex min-w-0 items-center gap-2.5 rounded-full px-4 py-2.5 sm:w-72">
            <Mail className="size-4 shrink-0 text-white/30" />
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
            disabled={inviting || !invite.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-[#05050a] transition-all hover:shadow-[0_0_28px_rgba(207,158,255,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inviting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Invite
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          const count =
            entry.id === "friends" ? friends.length : requestCount;
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
                  layoutId="friends-tab-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.07]"
                />
              )}
              <span className="relative inline-flex items-center gap-2">
                {entry.label}
                {count > 0 && (
                  <span
                    className={`grid min-w-4.5 place-items-center rounded-full px-1 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-star/20 text-star"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
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

      {tab === "friends" && (
        <div>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="size-4 animate-spin" />
              Loading friends…
            </p>
          ) : friends.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
              <Users className="mx-auto size-7 text-white/25" />
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
                No friends yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/45">
                Invite someone by email above, or accept a request from the
                Requests tab. You climb the leaderboard beside them.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {friends.map((member, index) => (
                <FriendCard key={member.friendshipId} member={member} index={index} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-6">
          <section className="space-y-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-star/80">
              Incoming
              {incoming.length > 0 && (
                <span className="grid min-w-4.5 place-items-center rounded-full bg-star/15 px-1.5 py-0.5 text-[10px] font-bold text-star">
                  {incoming.length}
                </span>
              )}
            </p>
            {incoming.length === 0 ? (
              <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-sm text-white/40">
                No incoming requests right now.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {incoming.map((member) => (
                  <div key={member.friendshipId} className="space-y-3">
                    <RequestRow
                      member={member}
                      busy={busyId === member.friendshipId}
                      onAccept={() => void respond(member, true)}
                      onDecline={() => void respond(member, false)}
                    />
                  </div>
                ))}
              </AnimatePresence>
            )}
          </section>

          <section className="space-y-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              Sent
              {outgoing.length > 0 && (
                <span className="grid min-w-4.5 place-items-center rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
                  {outgoing.length}
                </span>
              )}
            </p>
            {outgoing.length === 0 ? (
              <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-sm text-white/40">
                No invitations waiting for a reply.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {outgoing.map((member) => (
                  <div key={member.friendshipId} className="space-y-3">
                    <RequestRow
                      member={member}
                      busy={busyId === member.friendshipId}
                      onAccept={() => undefined}
                      onDecline={() => void respond(member, false)}
                    />
                  </div>
                ))}
              </AnimatePresence>
            )}
          </section>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {friends.length} friends, {requestCount} pending requests.
      </p>
    </div>
  );
}
