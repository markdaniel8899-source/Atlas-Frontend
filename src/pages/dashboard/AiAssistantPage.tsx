import { useCallback, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
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
  const [showSuggestions, setShowSuggestions] = useState(true);

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
        setShowSuggestions(false);
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
      } catch (caught) {
        setError(classify(caught));
      } finally {
        setThinking(false);
      }
    },
    [turns, thinking, systemPrompt, profile],
  );

  const handleSend = (text: string) => {
    void deliver(text, true);
  };

  const handleSuggest = (prompt: string) => {
    void deliver(prompt, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(draft);
    }
  };

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
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#04040a]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {hasMessages ? (
          // STATE 2: Active Chat - Messages with Input at Bottom
          <div className="p-6 space-y-4">
            {turns.map((turn, index) => {
              const isUser = turn.role === "user";
              return (
                <div
                  key={`${turn.id}-${index}`}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? "bg-[#a855f7] text-white"
                        : "bg-white/5 text-white/90 border border-white/5"
                    }`}
                  >
                    {turn.content}
                  </div>
                </div>
              );
            })}
            {thinking && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-white/5 text-white/90 border border-white/5 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="size-1.5 rounded-full bg-white/45 animate-pulse"
                        style={{ animationDelay: `${index * 160}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          // STATE 1: Empty Chat - Centered Layout
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Heading */}
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-widest text-[#cf9eff] mb-2">
                Study companion
              </p>
              <h1 className="text-4xl font-bold text-white mb-3 sm:text-5xl">
                Ask ATLAS.
              </h1>
              <p className="text-white/50 max-w-lg mx-auto text-sm leading-relaxed">
                Trained on your roadmap, courses and focus history, so the answer
                you get is the one you needed.
              </p>
            </div>

            {/* Input Field (Centered) */}
            <div className="w-full max-w-2xl mb-4">
              <input
                type="text"
                placeholder="Ask about your course, a concept, or your next step..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(false)}
                onBlur={() => !hasMessages && setShowSuggestions(true)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#a855f7] placeholder:text-white/30"
                disabled={thinking}
              />
            </div>

            {/* Suggestion Chips (Below Input, Hide on Focus) */}
            {showSuggestions && (
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSuggest(item.prompt)}
                    disabled={thinking}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {errorBanner}
          </div>
        )}
      </div>

      {/* Input Field (Only visible in STATE 2 - Active Chat) */}
      {hasMessages && (
        <div className="shrink-0 p-4 border-t border-white/10 bg-[#04040a]">
          {errorBanner}
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Ask about your course..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#a855f7] placeholder:text-white/30"
              disabled={thinking}
            />
            <button
              type="button"
              onClick={() => handleSend(draft)}
              disabled={thinking || !draft.trim()}
              className="bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}