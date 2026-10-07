import { CodeBlock } from "./CodeBlock";
import { RichText } from "./RichText";
import type { QuizQuestion } from "../../lib/ai";
import type { QuizAnswer } from "../../lib/quiz";

interface QuestionInputProps {
  question: QuizQuestion;
  answer: QuizAnswer;
  onChange: (answer: QuizAnswer) => void;
  disabled?: boolean;
}

const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-star/45 focus:outline-none disabled:opacity-60";

const AREA =
  "w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-[13px] leading-relaxed text-white/85 placeholder:text-white/25 transition-colors focus:border-star/45 focus:outline-none disabled:opacity-60";

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
      {children}
    </p>
  );
}

export function QuestionInput({
  question,
  answer,
  onChange,
  disabled = false,
}: QuestionInputProps) {
  if (question.kind === "mcq") {
    const chosen = typeof answer === "number" ? answer : null;
    return (
      <div role="radiogroup" aria-label="Answer options" className="space-y-2">
        {question.options.map((option, index) => {
          const active = chosen === index;
          return (
            <label
              key={`${index}-${option.slice(0, 16)}`}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                active
                  ? "border-[#cf9eff]/50 bg-[#cf9eff]/[0.07]"
                  : "border-white/10 bg-white/[0.03] hover:border-[#cf9eff]/35 hover:bg-white/[0.05]"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="atlas-quiz-option"
                className="peer sr-only"
                checked={active}
                disabled={disabled}
                onChange={() => onChange(index)}
              />
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-star/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#05050a] ${
                  active
                    ? "border-[#cf9eff] bg-[#cf9eff]/20"
                    : "border-white/30"
                }`}
              >
                {active && <span className="size-2.5 rounded-full bg-[#cf9eff]" />}
              </span>
              <span
                className={`text-sm leading-relaxed ${
                  active ? "text-white" : "text-white/70"
                }`}
              >
                <RichText text={option} />
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.kind === "code") {
    return (
      <div>
        <Legend>Your solution - {question.language || "python"}</Legend>
        <textarea
          value={String(answer ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          spellCheck={false}
          rows={10}
          aria-label="Your code"
          className={`${AREA} resize-none`}
        />
      </div>
    );
  }

  if (question.kind === "debug") {
    const raw = String(answer ?? "");
    const split = raw.indexOf("\n");
    const lineText = split === -1 ? raw : raw.slice(0, split);
    const fixText = split === -1 ? "" : raw.slice(split + 1);

    return (
      <div className="space-y-4">
        <div>
          <Legend>Buggy code</Legend>
          <CodeBlock
            code={question.code}
            language={question.language || "python"}
            caption="Find the problem"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <div>
            <Legend>Line number</Legend>
            <input
              type="number"
              min={1}
              value={lineText}
              disabled={disabled}
              onChange={(event) =>
                onChange(`${event.target.value}\n${fixText}`)
              }
              aria-label="Buggy line number"
              placeholder={question.buggy_line ? String(question.buggy_line) : "1"}
              className={`${INPUT} font-mono tabular-nums`}
            />
          </div>
          <div>
            <Legend>The fix</Legend>
            <textarea
              value={fixText}
              disabled={disabled}
              rows={5}
              spellCheck={false}
              onChange={(event) => onChange(`${lineText}\n${event.target.value}`)}
              aria-label="Corrected line"
              placeholder="What that line should say instead"
              className={AREA}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Legend>Code under test</Legend>
        <CodeBlock
          code={question.code}
          language={question.language || "python"}
          caption="What does this print?"
        />
      </div>
      <div>
        <Legend>Predicted output</Legend>
        <input
          type="text"
          value={String(answer ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Predicted output"
          placeholder="e.g. 42"
          className={`${INPUT} font-mono`}
        />
      </div>
    </div>
  );
}
