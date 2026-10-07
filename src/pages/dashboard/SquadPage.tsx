import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Check, Flame, Mail, Timer, UserPlus, X } from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { Button } from "../../components/ui/Button";
import { getUser } from "../../lib/auth";
import {
  acceptInvite,
  declineInvite,
  fetchSquad,
  inviteFriend,
} from "../../lib/db/squad";
import type { SquadMember, SquadStatus } from "../../lib/db/squad";
import { PROFILE_CHANGED_EVENT, fetchProfile } from "../../lib/db/profile";
import { EASE } from "../../lib/motion";

const STATUS_LABEL: Record<SquadStatus, string> = {
  studying: "Active today",
  online: "Active yesterday",
  offline: "Offline",
};

const STATUS_DOT: Record<SquadStatus, string> = {
  studying: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  online: "bg-star shadow-[0_0_8px_rgba(157,180,255,0.8)]",
  offline: "bg-white/25",
};

function MemberCard({
  member,
  index,
  onAccept,
  onDecline,
}: {
  member: SquadMember;
  index: number;
  onAccept: (member: SquadMember) => void;
  onDecline: (member: SquadMember) => void;
}) {
  const incoming = member.relationship === "incoming";
  const pct = Math.min(100, Math.max(0, member.progressPercent));

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      whileHover={{ y: -5, borderColor: "rgba(207,158,255,0.5)" }}
      className="glass card-sheen rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-[border-color] duration-300 hover:border-[#cf9eff]/50"
    >
      <div className="flex items-center gap-4">
        <div
          className={`relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ring-1 ring-white/10 ${member.avatar}`}
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
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#05050a] ${STATUS_DOT[member.status]}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-medium tracking-tight text-white">
            {member.displayName}
          </h2>
          <p className="truncate text-xs text-white/40">@{member.username}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/55">
          Lv {member.level}
        </span>
      </div>

      {incoming ? (
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAccept(member)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-300/20"
          >
            <Check className="size-3.5" />
            Accept
          </button>
          <button
            type="button"
            onClick={() => onDecline(member)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <X className="size-3.5" />
            Decline
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-white/45">
              <Timer className="size-3.5" />
              {member.xp} XP
            </span>
            <span className="flex items-center gap-1 text-amber-300/90">
              <Flame className="size-3.5" />
              {member.streak}d streak
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, delay: 0.2 + index * 0.06, ease: EASE }}
              className="h-full rounded-full bg-gradient-to-r from-star/70 to-star"
            />
          </div>
          <p className="text-[11px] text-white/35">
            {STATUS_LABEL[member.status]} · {pct}% to Lv {member.level + 1}
          </p>
        </div>
      )}
    </motion.article>
  );
}

export default function SquadPage() {
  const user = getUser();
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
  }, [load]);

  const [myAvatar, setMyAvatar] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    const refresh = () => {
      void fetchProfile(userId)
        .then((profile) => {
          if (!cancelled) setMyAvatar(profile?.avatar_url ?? null);
        })
        .catch(() => {
          if (!cancelled) setMyAvatar(null);
        });
    };
    refresh();
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
    };
  }, [user?.id]);

  const friends = members.filter((m) => m.relationship === "friend");
  const incoming = members.filter((m) => m.relationship === "incoming");
  const outgoing = members.filter((m) => m.relationship === "outgoing");

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await inviteFriend(invite);
    setBusy(false);

    if (!result.ok) {
      setSentTo(null);
      setError(result.message);
      return;
    }

    setError(null);
    setSentTo(invite.trim());
    setInvite("");
    await load();
  };

  const respond = async (member: SquadMember, accept: boolean) => {
    if (accept) await acceptInvite(member.friendshipId);
    else await declineInvite(member.friendshipId);
    await load();
  };

  const empty = !loading && friends.length === 0 && incoming.length === 0;

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
        </div>

        <form onSubmit={onInvite} className="flex items-center gap-2">
          <div className="glass flex items-center gap-2.5 rounded-full px-4 py-2.5">
            <Mail className="size-4 text-white/30" />
            <input
              type="email"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="friend@email.com"
              className="w-44 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none sm:w-56"
              aria-label="Invite a friend by email"
            />
          </div>
          <Button type="submit" disabled={busy} className="px-5 py-2.5 text-xs">
            {busy ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </div>

      {error && <p className="text-xs text-red-300/80">{error}</p>}
      {sentTo && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-emerald-300/90"
        >
          <Check className="size-4" />
          Invite sent to {sentTo}. They'll appear here once they accept.
        </motion.p>
      )}

      {outgoing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Waiting on
          </span>
          {outgoing.map((member) => (
            <span
              key={member.id}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55"
            >
              @{member.username}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-2xl border border-star/30 bg-star/[0.05] p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
        >
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#3d4f9e] to-[#7b8ee8] text-sm font-semibold text-white ring-1 ring-white/10">
              {myAvatar ? (
                <img src={myAvatar} alt="" className="size-full object-cover" />
              ) : (
                (user?.name ?? "You")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-medium tracking-tight text-white">
                {user?.name ?? "You"}
              </h2>
              <p className="text-xs text-star/70">That's you</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-white/50">
            Invite a teammate by email. They'll land in this grid the moment
            they accept.
          </p>
        </motion.article>

        {loading ? (
          <p className="col-span-full text-sm text-white/40">
            Loading squad…
          </p>
        ) : empty ? (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
            <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              <UserPlus className="size-5 text-white/40" />
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">
              No squadmates yet
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/45">
              Send an invite above, or accept the requests waiting for you.
            </p>
          </div>
        ) : (
          [...incoming, ...friends].map((member, i) => (
            <MemberCard
              key={member.id}
              member={member}
              index={i}
              onAccept={(m) => void respond(m, true)}
              onDecline={(m) => void respond(m, false)}
            />
          ))
        )}
      </div>
    </div>
  );
}
