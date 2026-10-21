import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles, UserRound } from "lucide-react";
import type { Turn } from "../../lib/assistant";
import { EASE } from "../../lib/motion";

interface ChatThreadProps {
  turns: Turn[];
  thinking: boolean;
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex items-start gap-3"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60">
        <Bot className="size-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-3.5">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="size-1.5 rounded-full bg-white/45"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: index * 0.16,
              ease: EASE,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function EmptyThread() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#cf9eff]">
        <Sparkles className="size-6" />
      </span>
      <p className="mt-5 text-lg font-medium tracking-tight text-white">
        Ask ATLAS anything
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">
        It already knows your level, streak and current course, so answers come
        back tuned to where you actually are.
      </p>
    </div>
  );
}

export function ChatThread({ turns, thinking }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(turns.length);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const last = turns[turns.length - 1];
    const added = turns.length > prevCount.current;
    prevCount.current = turns.length;

    // Keep the start of a freshly received reply in view so long answers can
    // be read from the top instead of jumping to their tail.
    if (added && last?.role === "assistant") {
      const node = el.querySelector<HTMLElement>(
        `[data-turn-id="${last.id}"]`,
      );
      if (node) {
        const offset =
          el.scrollTop +
          node.getBoundingClientRect().top -
          el.getBoundingClientRect().top -
          12;
        el.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
        return;
      }
    }

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // A retry adds no new turn, so bring the typing indicator into view here.
  useEffect(() => {
    if (!thinking) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thinking]);

  if (turns.length === 0) {
    return (
      <div className="relative flex-1 overflow-hidden">
        <EmptyThread />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
    >
      <AnimatePresence initial={false}>
        {turns.map((turn) => {
          const mine = turn.role === "user";
          return (
            <motion.div
              key={turn.id}
              data-turn-id={turn.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`flex items-start gap-3 ${mine ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border ${
                  mine
                    ? "border-[#cf9eff]/35 bg-[#cf9eff]/12 text-[#cf9eff]"
                    : "border-white/10 bg-white/[0.05] text-white/60"
                }`}
              >
                {mine ? (
                  <UserRound className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </span>

              <div className={`min-w-0 max-w-[min(100%,46rem)] ${mine ? "text-right" : ""}`}>
                <div
                  className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-md border border-[#cf9eff]/30 bg-[#cf9eff]/12 text-white"
                      : "rounded-bl-md border border-white/10 bg-white/[0.04] text-white/80"
                  }`}
                >
                  {turn.content}
                </div>
                {!mine && turn.model && (
                  <p className="mt-1.5 font-mono text-[10px] tracking-tight text-white/25">
                    ATLAS
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>{thinking && <TypingIndicator />}</AnimatePresence>
    </div>
  );
}
