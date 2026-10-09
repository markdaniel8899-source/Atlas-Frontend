import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, Loader2, RotateCcw } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onRetry: () => void;
  disabled: boolean;
  canRetry: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
}

const MAX_LENGTH = 8000;

export function ChatComposer({
  onSend,
  onRetry,
  disabled,
  canRetry,
  draft,
  onDraftChange,
}: ChatComposerProps) {
  const [focused, setFocused] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Short placeholder on small screens so it never wraps and overlaps the
  // send/retry buttons inside the single-row composer.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (disabled) return;
    onSend(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t border-white/[0.06] p-3 sm:p-4"
    >
      <div
        className={`flex items-end gap-2 rounded-2xl border bg-white/[0.03] px-3 py-2 transition-[border-color] ${
          focused ? "border-[#cf9eff]/55" : "border-white/10"
        }`}
      >
        <textarea
          ref={ref}
          rows={1}
          value={draft}
          maxLength={MAX_LENGTH}
          placeholder={
            narrow
              ? "Ask ATLAS anything…"
              : "Ask about your course, a concept, or your next step…"
          }
          aria-label="Message ATLAS"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            onDraftChange(event.target.value);
            grow();
          }}
          onKeyDown={handleKeyDown}
          className="max-h-[180px] min-h-[44px] w-full min-w-0 flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-white/30"
        />

        {canRetry && !draft.trim() && (
          <button
            type="button"
            onClick={onRetry}
            disabled={disabled}
            className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/50 transition-[border-color,color] hover:border-[#cf9eff]/45 hover:text-white disabled:opacity-40"
            aria-label="Retry last message"
            title="Retry"
          >
            <RotateCcw className="size-4" />
          </button>
        )}

        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          aria-label="Send message"
          className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#cf9eff] text-[#0a0a14] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          {disabled ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <p className="text-[11px] text-white/30">
          Enter to send · Shift + Enter for a new line
        </p>
        <p className="text-[11px] tabular-nums text-white/25">
          {draft.length}/{MAX_LENGTH}
        </p>
      </div>
    </form>
  );
}
