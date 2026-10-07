import { motion } from "framer-motion";
import {
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { RichText } from "./RichText";
import type { QuizAttempt, QuizSummary } from "../../lib/quiz";
import { KIND_LABEL } from "../../lib/quiz";
import { KIND_ICON } from "./icons";
import { EASE } from "../../lib/motion";

interface QuizResultsProps {
  summary: QuizSummary;
  attempts: QuizAttempt[];
  topic: string;
  onRetry: () => void;
  onNewQuiz: () => void;
}

function verdict(percent: number): string {
  if (percent >= 90) return "Outstanding command of the topic.";
  if (percent >= 70) return "Solid - a few rough edges left.";
  if (percent >= 50) return "Halfway there. Review the misses below.";
  return "Tough set. Walk the feedback and go again.";
}

export function QuizResults({
  summary,
  attempts,
  topic,
  onRetry,
  onNewQuiz,
}: QuizResultsProps) {
  const circumference = 2 * Math.PI * 56;
  const offset = circumference * (1 - summary.percent / 100);

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="glass relative overflow-hidden rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="atlas-glow pointer-events-none absolute inset-0"
        />

        <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <svg
              className="size-40 -rotate-90"
              viewBox="0 0 128 128"
              aria-hidden="true"
            >
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#cf9eff"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl tabular-nums text-white">
                {summary.percent}%
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/35">
                score
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
              Quiz complete
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
              {summary.correct} / {summary.total} correct
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {topic} - {verdict(summary.percent)}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cf9eff]/35 bg-[#cf9eff]/10 px-3 py-1.5 text-xs font-medium text-[#cf9eff]">
                <Sparkles className="size-3.5" />
                {summary.xp} XP earned
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55">
                <Trophy className="size-3.5" />
                {summary.total} questions
              </span>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#05050a] transition-shadow hover:shadow-[0_0_36px_rgba(157,180,255,0.4)]"
              >
                <RotateCcw className="size-4" />
                Retake this quiz
              </button>
              <button
                type="button"
                onClick={onNewQuiz}
                className="glass inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
              >
                New quiz
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/40">
          Review
        </h3>
        {attempts.map((attempt, index) => {
          const passed = Boolean(attempt.evaluation?.is_correct);
          const KindIcon = KIND_ICON[attempt.question.kind];
          return (
            <motion.article
              key={`${index}-${attempt.question.prompt.slice(0, 24)}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04, ease: EASE }}
              className={`glass rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
                passed ? "border-[#cf9eff]/25" : "border-red-400/25"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border ${
                    passed
                      ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                      : "border-red-400/40 bg-red-400/10 text-red-200"
                  }`}
                >
                  {passed ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/35">
                      <KindIcon className="size-3 text-star/70" />
                      Q{index + 1} · {KIND_LABEL[attempt.question.kind]}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.2em] ${
                        passed ? "text-emerald-300/80" : "text-red-300/80"
                      }`}
                    >
                      {passed ? "Correct" : "Incorrect"}
                      {!passed &&
                        attempt.evaluation &&
                        ` · ${Math.round(attempt.evaluation.score)}%`}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                    <RichText text={attempt.question.prompt} />
                  </p>

                  {attempt.question.kind !== "mcq" && attempt.question.code && (
                    <div className="mt-3">
                      <CodeBlock
                        code={attempt.question.code}
                        language={attempt.question.language || "python"}
                        caption="Question code"
                      />
                    </div>
                  )}

                  {attempt.evaluation?.feedback && (
                    <p
                      className={`mt-3 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                        passed
                          ? "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100/85"
                          : "border-amber-300/25 bg-amber-300/[0.07] text-amber-100/85"
                      }`}
                    >
                      <RichText text={attempt.evaluation.feedback} />
                    </p>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </section>
    </div>
  );
}
