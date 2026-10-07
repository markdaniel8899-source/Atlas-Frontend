import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TriangleAlert } from "lucide-react";
import { ChatComposer } from "../../components/assistant/ChatComposer";
import { ChatThread } from "../../components/assistant/ChatThread";
import { RevealText } from "../../components/RevealText";
import {
  ask,
  buildLearnerContext,
  classify,
  newTurnId,
  validate,
  type Turn,
} from "../../lib/assistant";
import { useDashboard } from "../../hooks/useDashboard";
import { EASE } from "../../lib/motion";

export default function AiAssistantPage() {
  const { profile, focus } = useDashboard();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);

  /** Turns as they were before the in-flight user message was appended. */
  const historyRef = useRef<Turn[]>([]);

  const systemPrompt = buildLearnerContext({ profile, focus });

  const deliver = useCallback(
    async (text: string, appendUser: boolean) => {
      const problem = validate(text);
      if (problem) {
        setError(problem);
        return;
      }
      if (thinking) return;

      const trimmed = text.trim();
      setError(null);

      if (appendUser) {
        const userTurn: Turn = {
          id: newTurnId(),
          role: "user",
          content: trimmed,
        };
        historyRef.current = turns;
        setTurns((prev) => [...prev, userTurn]);
        setDraft("");
      }

      setThinking(true);
      try {
        const reply = await ask(trimmed, historyRef.current, systemPrompt);
        historyRef.current = [...historyRef.current, reply];
        setTurns((prev) => [...prev, reply]);
        setLastSent(null);
      } catch (caught) {
        setError(classify(caught));
        setLastSent(trimmed);
      } finally {
        setThinking(false);
      }
    },
    [turns, thinking, systemPrompt],
  );

  const handleSend = (text: string) => {
    void deliver(text, true);
  };

  const handleRetry = () => {
    if (lastSent) void deliver(lastSent, false);
  };

  const handleSuggest = (prompt: string) => {
    void deliver(prompt, true);
  };

  const canRetry = Boolean(lastSent && !thinking && !draft.trim());

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-star/70">
            Study companion
          </p>
          <RevealText
            as="h1"
            text="Ask ATLAS."
            className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
          />
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
            Trained on your roadmap, courses and focus history, so the answer
            you get is the one you needed.
          </p>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
        className="relative"
      >
        <div className="glass card-sheen relative flex h-[min(72vh,660px)] flex-col overflow-hidden rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div
            aria-hidden="true"
            className="atlas-glow pointer-events-none absolute inset-0"
          />

          <div className="relative flex min-h-0 flex-1 flex-col">
            <ChatThread turns={turns} thinking={thinking} onSuggest={handleSuggest} />

            {error && (
              <div className="relative border-t border-white/[0.06] px-4 pt-3 sm:px-6">
                <div className="flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-500/[0.08] px-3.5 py-2.5 text-sm text-rose-100/90">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 text-xs text-white/45 transition-colors hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <ChatComposer
              draft={draft}
              onDraftChange={(value) => {
                setDraft(value);
                if (error) setError(null);
              }}
              onSend={handleSend}
              onRetry={handleRetry}
              disabled={thinking}
              canRetry={canRetry}
            />
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/30">
          <Sparkles className="size-3" />
          Answers use the ATLAS tutor model · keep private data out of prompts.
        </p>
      </motion.section>
    </div>
  );
}
