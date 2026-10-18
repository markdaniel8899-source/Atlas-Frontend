import { useCallback, useEffect, useRef, useState } from "react";
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
  SUGGESTIONS,
  validate,
  type Turn,
} from "../../lib/assistant";
import { getUser } from "../../lib/auth";
import { useDashboard } from "../../hooks/useDashboard";
import { EASE } from "../../lib/motion";

/** Transcripts older than this are discarded on load. */
const CHAT_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredChat {
  savedAt: number;
  turns: Turn[];
}

function chatStorageKey(): string {
  return `atlas.assistant.chat.v1.${getUser()?.id ?? "guest"}`;
}

/** Saved chat younger than 24h, or an empty thread. */
function loadStoredTurns(): Turn[] {
  try {
    const key = chatStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredChat>;
    if (
      !parsed ||
      !Array.isArray(parsed.turns) ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > CHAT_TTL_MS
    ) {
      localStorage.removeItem(key);
      return [];
    }
    return parsed.turns.filter(
      (turn): turn is Turn =>
        Boolean(turn) &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.id === "string" &&
        typeof turn.content === "string",
    );
  } catch {
    return [];
  }
}

function saveStoredTurns(turns: Turn[]): void {
  try {
    const key = chatStorageKey();
    if (turns.length === 0) {
      localStorage.removeItem(key);
      return;
    }
    const payload: StoredChat = { savedAt: Date.now(), turns };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage unavailable — the chat simply won't persist.
  }
}

export default function AiAssistantPage() {
  const { profile, focus } = useDashboard();

  const [turns, setTurns] = useState<Turn[]>(() => loadStoredTurns());
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);

  // Persist every appended user/assistant turn (24h TTL, refreshed per save).
  useEffect(() => {
    saveStoredTurns(turns);
  }, [turns]);

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
        const reply = await ask(
          trimmed,
          historyRef.current,
          systemPrompt,
          profile?.display_name?.trim(),
        );
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
    [turns, thinking, systemPrompt, profile],
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
    <div className="flex h-full min-h-0 w-full flex-col gap-5">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
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
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <div className="glass card-sheen relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div
            aria-hidden="true"
            className="atlas-glow pointer-events-none absolute inset-0"
          />

          <div className="relative flex min-h-0 flex-1 flex-col">
            <ChatThread turns={turns} thinking={thinking} />

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

            {/* ChatGPT-style: suggestion chips sit below the composer while
                the thread is empty. */}
            {turns.length === 0 && (
              <div className="shrink-0 px-3 pb-3 sm:px-4 sm:pb-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSuggest(item.prompt)}
                      disabled={thinking}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/55 transition-[border-color,background-color,color] hover:border-[#cf9eff]/45 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 flex shrink-0 items-center gap-1.5 text-[11px] text-white/30">
          <Sparkles className="size-3" />
          Answers use the ATLAS tutor model · keep private data out of prompts.
        </p>
      </motion.section>
    </div>
  );
}
