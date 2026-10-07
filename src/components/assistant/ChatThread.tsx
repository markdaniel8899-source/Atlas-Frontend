import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles, UserRound } from "lucide-react";
import type { Turn } from "../../lib/assistant";
import { SUGGESTIONS } from "../../lib/assistant";
import { EASE } from "../../lib/motion";

interface ChatThreadProps {
  turns: Turn[];
  thinking: boolean;
  onSuggest: (prompt: string) => void;
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

function EmptyThread({ onSuggest }: { onSuggest?: (prompt: string) => void }) {
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

      <div className="mt-7 flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSuggest?.(item.prompt)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/55 transition-[border-color,background-color,color] hover:border-[#cf9eff]/45 hover:bg-white/[0.06] hover:text-white"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatThread({ turns, thinking, onSuggest }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, thinking]);

  if (turns.length === 0) {
    return (
      <div className="relative flex-1 overflow-hidden">
        <EmptyThread onSuggest={onSuggest} />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
      <AnimatePresence initial={false}>
        {turns.map((turn) => {
          const mine = turn.role === "user";
          return (
            <motion.div
              key={turn.id}
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
      <div ref={endRef} />
    </div>
  );
}
