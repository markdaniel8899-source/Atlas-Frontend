import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { CodeBlock } from "../../components/quiz/CodeBlock";
import { QuestionInput } from "../../components/quiz/QuestionInput";
import { QuizResults } from "../../components/quiz/QuizResults";
import { QuizSetup } from "../../components/quiz/QuizSetup";
import { RichText } from "../../components/quiz/RichText";
import { KIND_ICON } from "../../components/quiz/icons";
import { RevealText } from "../../components/RevealText";
import { useCourses } from "../../hooks/useCourses";
import { AiError } from "../../lib/ai";
import type { Evaluation } from "../../lib/ai";
import {
  canSubmit,
  evaluateAnswer,
  initialAnswer,
  KIND_LABEL,
  requestQuiz,
  summarize,
} from "../../lib/quiz";
import type {
  GenerateInput,
  QuizAnswer,
  QuizAttempt,
} from "../../lib/quiz";
import { saveQuizSession } from "../../lib/db/quizSessions";
import { EASE } from "../../lib/motion";

const TIMEOUT_MESSAGE = "The request timed out. Please try again.";

const ACHIEVEMENT_TITLES: Record<string, string> = {
  first_quiz: "First Steps",
  streak_master: "7-Day Streak Master",
  night_owl: "Night Owl",
  quiz_wizard: "Quiz Wizard",
};

type Phase = "setup" | "loading" | "running" | "done";

function classify(error: unknown): string {
  if (error instanceof AiError) {
    if (error.status === 0 || error.status === 503) {
      return "Something went wrong. Please try again.";
    }
    if (error.status === 408) return TIMEOUT_MESSAGE;
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function QuizPage() {
  const { courses, loading: coursesLoading } = useCourses();

  const [phase, setPhase] = useState<Phase>("setup");
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<QuizAnswer>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [unlocked, setUnlocked] = useState<string[]>([]);

  const question = attempts[index]?.question ?? null;
  const KindIcon = KIND_ICON[question?.kind ?? "mixed"];
  const answered = attempts.filter((attempt) => attempt.evaluation).length;
  const percent =
    attempts.length > 0 ? (answered / attempts.length) * 100 : 0;
  const summary = summarize(attempts);

  const generate = async (input: GenerateInput) => {
    setBusy(true);
    setError(null);
    setPhase("loading");
    try {
      const result = await requestQuiz(input);
      if (result.questions.length === 0) {
        throw new AiError("The AI returned an empty quiz. Try again.", 0);
      }
      setAttempts(
        result.questions.map((item) => ({
          question: item,
          answer: initialAnswer(item),
          evaluation: null,
        })),
      );
      setTopic(input.topic);
      setIndex(0);
      setAnswer(initialAnswer(result.questions[0]));
      setEvaluation(null);
      setPhase("running");
    } catch (caught) {
      setError(classify(caught));
      setPhase("setup");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!question || evaluation || !canSubmit(question, answer)) return;
    setEvaluating(true);
    setError(null);
    try {
      const result = await evaluateAnswer(question, answer);
      setAttempts((prev) =>
        prev.map((item, position) =>
          position === index ? { ...item, answer, evaluation: result } : item,
        ),
      );
      setEvaluation(result);
    } catch (caught) {
      setError(classify(caught));
    } finally {
      setEvaluating(false);
    }
  };

  const goNext = async () => {
    if (index >= attempts.length - 1) {
      const result = summarize(attempts);
      const codes = await saveQuizSession({
        topic,
        kind: "mixed",
        correct: result.correct,
        total: result.total,
        xp: result.xp,
      });
      setUnlocked(codes);
      setPhase("done");
      return;
    }
    const next = index + 1;
    setIndex(next);
    setAnswer(initialAnswer(attempts[next].question));
    setEvaluation(null);
    setError(null);
  };

  const goBack = () => {
    if (index === 0) return;
    const previous = index - 1;
    setIndex(previous);
    setAnswer(attempts[previous].answer);
    setEvaluation(attempts[previous].evaluation);
    setError(null);
  };

  const skip = () => {
    void goNext();
  };

  const retake = () => {
    const fresh = attempts.map((item) => ({
      ...item,
      answer: initialAnswer(item.question),
      evaluation: null,
    }));
    setAttempts(fresh);
    setIndex(0);
    setAnswer(fresh[0] ? initialAnswer(fresh[0].question) : null);
    setEvaluation(null);
    setError(null);
    setPhase("running");
  };

  const startOver = () => {
    setAttempts([]);
    setIndex(0);
    setAnswer(null);
    setEvaluation(null);
    setError(null);
    setTopic("");
    setUnlocked([]);
    setPhase("setup");
  };

  const alert =
    error && !evaluating ? (
      <div
        role="alert"
        className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3.5"
      >
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border border-red-400/25 bg-red-400/10 text-red-200">
          <AlertTriangle className="size-3.5" />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-red-100/90">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setError(null)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.12]"
        >
          <RefreshCw className="size-3" />
          Dismiss
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Assessment
          </p>
          <RevealText
            as="h1"
            text="Quiz."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
        </div>
      </header>

      {phase === "setup" && (
        <>
          {alert && <div className="mb-5">{alert}</div>}
          <QuizSetup
            courses={courses}
            loading={coursesLoading}
            busy={busy}
            error={error}
            onGenerate={(input) => void generate(input)}
          />
        </>
      )}

      {phase === "loading" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="glass card-sheen flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
        >
          <Loader2 className="size-7 animate-spin text-star" />
          <div>
            <p className="text-sm font-medium text-white">
              Writing your questions
            </p>
            <p className="mt-1.5 text-xs text-white/40">
              The model is drafting prompts, code snippets and explanations.
            </p>
          </div>
        </motion.div>
      )}

      {phase === "running" && question && (
        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="glass card-sheen rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-white/75">
                Question {index + 1} of {attempts.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50">
                <KindIcon className="size-3 text-star/80" />
                {KIND_LABEL[question.kind]}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9db4ff] to-[#cf9eff] transition-[width] duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </motion.section>

          <motion.section
            key={index}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="glass card-sheen rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-8"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-star/70">
              {topic}
            </p>
            <h2 className="mt-3 text-lg font-medium leading-relaxed text-white">
              <RichText text={question.prompt} />
            </h2>

            {question.kind === "code" && question.code.trim() && (
              <div className="mt-4">
                <CodeBlock
                  code={question.code}
                  language={question.language || "python"}
                  caption="What to build"
                />
              </div>
            )}

            <div className="mt-5">
              <QuestionInput
                question={question}
                answer={answer}
                onChange={setAnswer}
                disabled={Boolean(evaluation) || evaluating}
              />
            </div>

            {evaluation && (
              <div
                role="status"
                className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
                  evaluation.is_correct
                    ? "border-emerald-300/30 bg-emerald-300/[0.08]"
                    : "border-amber-300/30 bg-amber-300/[0.08]"
                }`}
              >
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border ${
                    evaluation.is_correct
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                      : "border-amber-300/30 bg-amber-300/10 text-amber-200"
                  }`}
                >
                  <Check className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {evaluation.is_correct
                      ? "Correct"
                      : "Not quite"}
                    {question.kind !== "mcq" &&
                      ` - ${Math.round(evaluation.score)}%`}
                  </p>
                  {evaluation.feedback && (
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      <RichText text={evaluation.feedback} />
                    </p>
                  )}
                  {!evaluation.is_correct &&
                    question.explanation &&
                    !evaluation.feedback && (
                      <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                        <RichText text={question.explanation} />
                      </p>
                    )}
                </div>
              </div>
            )}

            {alert && <div className="mt-5">{alert}</div>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
              <button
                type="button"
                onClick={goBack}
                disabled={index === 0}
                className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-[#cf9eff]/45 hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>

              <div className="flex flex-wrap gap-2">
                {!evaluation && (
                  <button
                    type="button"
                    onClick={skip}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/55 transition-colors hover:border-[#cf9eff]/45 hover:text-white"
                  >
                    Skip
                  </button>
                )}
                {evaluation ? (
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#05050a] transition-shadow hover:shadow-[0_0_40px_rgba(157,180,255,0.4)]"
                  >
                    {index >= attempts.length - 1 ? "See results" : "Next question"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitAnswer()}
                    disabled={evaluating || !canSubmit(question, answer)}
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#05050a] transition-shadow hover:shadow-[0_0_40px_rgba(157,180,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Checking
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Check answer
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      )}

      {phase === "done" && (
        <>
          {alert && <div className="mb-5">{alert}</div>}
          {unlocked.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3.5 shadow-[0_0_28px_-8px_rgba(251,191,36,0.4)]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-400/40 bg-amber-400/10">
                <Trophy className="size-4.5 text-amber-300" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  Achievement{unlocked.length > 1 ? "s" : ""} unlocked
                </p>
                <p className="truncate text-xs text-white/50">
                  {unlocked
                    .map((code) => ACHIEVEMENT_TITLES[code] ?? code)
                    .join(" · ")}
                </p>
              </div>
            </motion.div>
          )}
          <QuizResults
            summary={summary}
            attempts={attempts}
            topic={topic}
            onRetry={retake}
            onNewQuiz={startOver}
          />
        </>
      )}
    </div>
  );
}
