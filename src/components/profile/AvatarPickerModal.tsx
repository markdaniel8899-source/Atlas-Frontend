import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import {
  DICEBEAR_STYLES,
  baseSeedFor,
  generateAvatarCandidates,
  type DiceBearStyle,
} from "../../lib/dicebear";
import { EASE } from "../../lib/motion";

interface AvatarPickerModalProps {
  open: boolean;
  currentUrl: string | null;
  userId: string;
  onClose: () => void;
  /** Persist the chosen avatar; resolve to false when the save failed. */
  onSelect: (url: string) => Promise<boolean>;
}

export function AvatarPickerModal({
  open,
  currentUrl,
  userId,
  onClose,
  onSelect,
}: AvatarPickerModalProps) {
  const [style, setStyle] = useState<DiceBearStyle>("avataaars");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerate = useCallback(
    (nextStyle: DiceBearStyle) => {
      setCandidates(generateAvatarCandidates(baseSeedFor(userId), nextStyle));
      setSelected(null);
    },
    [userId],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelected(null);
    regenerate(style);
  }, [open, style, regenerate]);

  // Lock page scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const save = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    const ok = await onSelect(selected);
    setSaving(false);
    if (!ok) {
      setError("Couldn't save that avatar. Try another one.");
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Pick an avatar"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0a14]/95 p-6 shadow-[0_32px_90px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                  <Sparkles className="size-3.5 text-star" />
                  Edit avatar
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  Pick your look
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  Unique, generated avatars - no upload needed.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close avatar picker"
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {DICEBEAR_STYLES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setStyle(entry.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    style === entry.id
                      ? "border-[#cf9eff]/50 bg-[#cf9eff]/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/80"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {candidates.map((url) => {
                const active = selected === url;
                const current = currentUrl === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelected(url)}
                    aria-label="Choose this avatar"
                    aria-pressed={active}
                    className={`relative aspect-square overflow-hidden rounded-full border-2 transition-all duration-200 ${
                      active
                        ? "scale-105 border-[#cf9eff] shadow-[0_0_22px_rgba(207,158,255,0.45)]"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    {current && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-medium uppercase tracking-wider text-white/80">
                        Current
                      </span>
                    )}
                    {active && (
                      <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-[#cf9eff] text-[#0a0a14]">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => regenerate(style)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white"
              >
                <RefreshCw className="size-3.5" />
                Shuffle
              </button>

              <div className="flex items-center gap-2">
                {error && (
                  <span className="text-xs text-rose-300/85">{error}</span>
                )}
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!selected || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-medium text-[#05050a] transition-all hover:shadow-[0_0_28px_rgba(207,158,255,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      Use this avatar
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
