import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { subscribeToasts, type ToastItem, type ToastTone } from "../../lib/toast";
import { EASE } from "../../lib/motion";

const TONE_STYLES: Record<ToastTone, string> = {
  info: "border-white/15 bg-white/[0.06] text-white",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  error: "border-rose-400/30 bg-rose-500/10 text-rose-100",
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  const cls = "size-4 shrink-0";
  if (tone === "success") return <CheckCircle2 className={`${cls} text-emerald-300`} />;
  if (tone === "error") return <AlertTriangle className={`${cls} text-rose-300`} />;
  return <Info className={`${cls} text-white/70`} />;
}

/** Fixed toast viewport. Mounted once in App.tsx. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((item) => {
      setItems((prev) => [...prev, item].slice(-4));
      if (item.duration > 0) {
        window.setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== item.id));
        }, item.duration);
      }
    });
  }, []);

  const dismiss = (id: number) =>
    setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.28, ease: EASE }}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md ${TONE_STYLES[item.tone]}`}
          >
            <ToneIcon tone={item.tone} />
            <p className="flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="mt-0.5 rounded-md p-0.5 text-white/40 transition-colors hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
