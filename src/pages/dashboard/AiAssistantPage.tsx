import { useCallback, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { ChatComposer } from "../../components/assistant/ChatComposer";
import { ChatThread } from "../../components/assistant/ChatThread";
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [turns, thinking]);

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

  const errorBanner = error ? (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-500/[0.08] px-3.5 py-2.5 text-sm text-rose-100/90">
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
  ) : null;

  const hasMessages = turns.length > 0;

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 scroll-smooth">
        {hasMessages ? (
          <>
            <ChatThread key="thread" turns={turns} thinking={thinking} />
            {thinking && (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60" />
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-3.5">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="size-1.5 rounded-full bg-white/45 animate-pulse"
                      style={{ animationDelay: `${index * 160}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 px-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-star/70">
              Study companion
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Ask ATLAS.
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/50">
              Trained on your roadmap, courses and focus history, so the
              answer you get is the one you needed.
            </p>
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

            {errorBanner}
          </div>
        )}
      </div>

      <div className="shrink-0 w-full max-w-3xl mx-auto mt-4">
        {errorBanner}

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
          floating
        />
      </div>
    </div>
  );
}