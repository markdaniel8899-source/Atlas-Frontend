import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Share2, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSquadResult } from "../../lib/db/squad";
import type { SquadMember } from "../../lib/db/squad";
import { shareNote } from "../../lib/db/shares";
import { toast } from "../../lib/toast";
import { EASE } from "../../lib/motion";

interface ShareNoteModalProps {
  open: boolean;
  noteId: string | null;
  noteTitle: string;
  onClose: () => void;
}

/**
 * Friend picker for the Note Sharing RPC. Only accepted friends are listed -
 * pending/outgoing requests never appear here.
 */
export function ShareNoteModal({
  open,
  noteId,
  noteTitle,
  onClose,
}: ShareNoteModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [friends, setFriends] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setError(null);
    const result = await fetchSquadResult();
    if (result.ok) {
      setFriends(
        result.members.filter((member) => member.relationship === "friend"),
      );
    } else {
      setFriends([]);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setBusyId(null);
    setError(null);
    void load();
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, load, onClose]);

  const send = async (friend: SquadMember) => {
    if (!noteId || busyId) return;
    setBusyId(friend.id);
    setError(null);
    const result = await shareNote(noteId, friend.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast.success(
      `Note sent to ${friend.displayName || `@${friend.username}`}`,
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-note-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)]"
            style={{ backgroundColor: "#0a0a12" }}
          >
            <div className="flex items-start gap-4 px-6 pt-5 pb-4">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff]">
                <Share2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
                  Share note
                </p>
                <h3
                  id="share-note-title"
                  className="mt-1 truncate text-base font-semibold text-white"
                >
                  {noteTitle.trim() || "Untitled note"}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Pick a friend - the note is copied into their Notes.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close share note"
                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star"
              >
                <X className="size-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                <Loader2 className="size-5 animate-spin text-[#cf9eff]" />
                <p className="text-sm text-white/45">Loading your friends…</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="max-w-[19rem] text-sm leading-relaxed text-white/50">
                  Couldn&apos;t load your friends. Check your connection and try
                  again.
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 px-4 py-2 text-xs font-medium text-[#cf9eff] transition-colors hover:bg-[#cf9eff]/20"
                >
                  Try again
                </button>
              </div>
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff]">
                  <Users className="size-5" />
                </span>
                <p className="text-sm font-medium text-white">
                  No friends to share with
                </p>
                <p className="max-w-[19rem] text-xs leading-relaxed text-white/45">
                  Notes can only be sent to accepted friends. Add someone
                  first, then come back.
                </p>
                <Link
                  to="/app/squad"
                  onClick={onClose}
                  className="mt-1 rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 px-4 py-2 text-xs font-medium text-[#cf9eff] transition-colors hover:bg-[#cf9eff]/20"
                >
                  Open Friends
                </Link>
              </div>
            ) : (
              <ul className="overflow-y-auto px-3 pb-2">
                {friends.map((friend) => {
                  const busy = busyId === friend.id;
                  const name = friend.displayName || `@${friend.username}`;
                  return (
                    <li key={friend.id}>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void send(friend)}
                        aria-label={`Share with ${name}`}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-xs font-semibold text-white ${friend.avatar}`}
                        >
                          {friend.avatarUrl ? (
                            <img
                              src={friend.avatarUrl}
                              alt=""
                              className="size-full rounded-full object-cover"
                            />
                          ) : (
                            friend.initials
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">
                            {name}
                          </span>
                          <span className="block truncate text-[11px] text-white/40">
                            @{friend.username}
                          </span>
                        </span>
                        {busy ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-[#cf9eff]" />
                        ) : (
                          <Send className="size-4 shrink-0 text-white/30" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {error ? (
              <p className="border-t border-white/[0.07] px-6 py-3 text-xs leading-relaxed text-rose-200/90">
                {error}
              </p>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
