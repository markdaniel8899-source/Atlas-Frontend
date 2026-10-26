import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Share2, Users, X, Check } from "lucide-react";
import { fetchSquadResult } from "../../lib/db/squad";
import type { SquadMember } from "../../lib/db/squad";
import { bulkShareNotes } from "../../lib/db/shares";
import { toast } from "../../lib/toast";
import { EASE } from "../../lib/motion";

interface BulkShareModalProps {
  open: boolean;
  noteIds: string[];
  noteCount: number;
  onClose: () => void;
}

export function BulkShareModal({
  open,
  noteIds,
  noteCount,
  onClose,
}: BulkShareModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [friends, setFriends] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

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
    setBusy(false);
    setError(null);
    setSelectedFriends(new Set());
    void load();
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, load, onClose]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const selectAllFriends = () => {
    if (selectedFriends.size === friends.length) {
      setSelectedFriends(new Set());
    } else {
      setSelectedFriends(new Set(friends.map((f) => f.id)));
    }
  };

  const send = async () => {
    if (noteIds.length === 0 || selectedFriends.size === 0 || busy) return;
    setBusy(true);
    setError(null);

    const recipientIds = Array.from(selectedFriends);
    const result = await bulkShareNotes(noteIds, recipientIds);

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(
      `Shared ${result.sharedCount} note${
        result.sharedCount > 1 ? "s" : ""
      } with ${recipientIds.length} friend${
        recipientIds.length > 1 ? "s" : ""
      }`,
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
            aria-labelledby="bulk-share-title"
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
                  Share {noteCount} note{noteCount > 1 ? "s" : ""}
                </p>
                <h3
                  id="bulk-share-title"
                  className="mt-1 truncate text-base font-semibold text-white"
                >
                  {noteCount} note{noteCount > 1 ? "s" : ""} selected
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Pick friends - each note will be copied into their Notes.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close share notes"
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
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-1 rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 px-4 py-2 text-xs font-medium text-[#cf9eff] transition-colors hover:bg-[#cf9eff]/20"
                >
                  Open Friends
                </button>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="border-b border-white/[0.07] px-6 py-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFriends.size === friends.length && friends.length > 0}
                      onChange={selectAllFriends}
                      className="size-4 rounded border-white/20 bg-white/[0.03] text-[#cf9eff] focus:ring-2 focus:ring-[#cf9eff]/50"
                      aria-label="Select all friends"
                    />
                    <span className="text-sm font-medium text-white">
                      {selectedFriends.size === friends.length && friends.length > 0
                        ? "Deselect all"
                        : "Select all"}
                    </span>
                    <span className="text-xs text-white/50 px-2 py-0.5 rounded-full bg-white/[0.05]">
                      {selectedFriends.size} selected
                    </span>
                  </label>
                </div>

                <ul className="overflow-y-auto flex-1 px-3 pb-2">
                  {friends.map((friend) => {
                    const isSelected = selectedFriends.has(friend.id);
                    const name = friend.displayName || `@${friend.username}`;
                    return (
                      <li key={friend.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleFriend(friend.id)}
                          aria-label={`Toggle ${name}`}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                        >
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[#cf9eff] bg-[#cf9eff]/20"
                                : "border-white/20 bg-white/[0.03]"
                            } transition-colors`}
                          >
                            {isSelected && <Check className="size-3 text-[#cf9eff]" />}
                          </span>
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-xs font-semibold text-white ${
                              friend.avatar
                            }`}
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
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-white/[0.07] px-6 py-4">
                  <button
                    type="button"
                    onClick={send}
                    disabled={selectedFriends.size === 0 || busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                    style={{
                      backgroundColor:
                        selectedFriends.size > 0 && !busy
                          ? "rgba(207, 158, 255, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                      borderColor:
                        selectedFriends.size > 0 && !busy
                          ? "rgba(207, 158, 255, 0.3)"
                          : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sharing…
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Share {noteCount} note{noteCount > 1 ? "s" : ""}
                      </>
                    )}
                  </button>

                  {error ? (
                    <p className="mt-3 text-center text-xs leading-relaxed text-rose-200/90">
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}