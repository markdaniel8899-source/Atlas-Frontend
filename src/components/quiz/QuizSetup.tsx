import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { SelectMenu } from "../ui/SelectMenu";
import type { SelectOption } from "../ui/SelectMenu";
import type { Difficulty } from "../../lib/ai";
import type { Course } from "../../lib/db/types";
import { fetchNotes } from "../../lib/db/notes";
import { fetchLatestRoadmap } from "../../lib/db/roadmaps";
import { inferSubject, textMatchesTopic } from "../../lib/subjects";
import type { GenerateInput, KindChoice } from "../../lib/quiz";
import { KIND_HINT, KIND_LABEL, QUIZ_KINDS } from "../../lib/quiz";
import {
  CUSTOM_TOPIC_ICON,
  COURSE_ICON,
  DIFFICULTY_ICON,
  FIELD_ICON,
  GENERAL_COURSE_ICON,
  KIND_ICON,
  TOPIC_ICON,
} from "./icons";
import { EASE } from "../../lib/motion";

const CUSTOM = "__custom";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const DIFFICULTIES: SelectOption<string>[] = [
  { value: "easy", label: "Easy", hint: "Gentle warm-up", icon: DIFFICULTY_ICON.easy },
  { value: "medium", label: "Medium", hint: "Balanced challenge", icon: DIFFICULTY_ICON.medium },
  { value: "hard", label: "Hard", hint: "Push your limits", icon: DIFFICULTY_ICON.hard },
];

const COUNTS = [5, 10, 15];

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-star/45 focus:outline-none disabled:opacity-60";

const LABEL =
  "mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40";

/** Backend caps `context` at 4000 chars - stay under it. */
const CONTEXT_CAP = 3800;

function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr|\/td)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Course syllabus + roadmap progress + saved notes, so the AI can build the
 * quiz from what the learner actually studied. Notes are strictly scoped:
 * with a course, only that course's notes; without one, only notes that
 * match the custom topic's subject (foreign-subject notes never travel).
 * Never throws: a missing piece of context just drops out of the string.
 */
async function buildLearnerContext(
  course: Course | null,
  topic: string,
): Promise<string> {
  const parts: string[] = [];

  if (course) {
    parts.push(`Course: ${course.title}`);
    if (course.description.trim()) {
      parts.push(`Course description: ${course.description.trim()}`);
    }
    parts.push(`Course progress: ${Math.round(course.progress_percentage)}%`);
    if (course.topics.length > 0) {
      const done = course.topics.filter(
        (topic) => topic.status === "completed",
      ).length;
      parts.push(
        `Syllabus (${done}/${course.topics.length} completed): ` +
          course.topics
            .map((topic) => `${topic.title} [${topic.status}]`)
            .join("; "),
      );
    }
  }

  try {
    const roadmap = await fetchLatestRoadmap(course ? course.id : undefined);
    if (roadmap && roadmap.nodes.length > 0) {
      const completed = roadmap.nodes.filter(
        (node) => node.status === "completed",
      );
      const active = roadmap.nodes.filter((node) => node.status === "active");
      parts.push(`Roadmap: ${roadmap.title}`);
      parts.push(
        `Roadmap progress: ${completed.length}/${roadmap.nodes.length} levels completed`,
      );
      if (completed.length > 0) {
        parts.push(
          `Levels already studied: ${completed
            .slice(0, 12)
            .map((node) => node.title)
            .join("; ")}`,
        );
      }
      if (active.length > 0) {
        parts.push(
          `Current levels: ${active
            .slice(0, 6)
            .map((node) => node.title)
            .join("; ")}`,
        );
      }
    }
  } catch {
    // No roadmap - Rule D fallback covers this.
  }

  try {
    const notes = course
      ? await fetchNotes({
          courseId: course.id,
          topicIds: course.topics.map((t) => t.id),
        })
      : await fetchNotes();
    const excerpts = notes
      .map((note) => ({
        entry: `${note.title}: ${htmlToText(note.html)}`,
        subject: `${note.title} ${htmlToText(note.html)}`,
      }))
      .filter(({ entry }) => entry.length > 0)
      // No course: only same-subject notes may travel - an English quiz
      // never carries Python notes (backend re-checks this too).
      .filter(({ subject }) => course || textMatchesTopic(topic, subject))
      .slice(0, 4)
      .map(({ entry }) => entry.slice(0, 700));
    if (excerpts.length > 0) {
      parts.push(`Saved notes:\n${excerpts.join("\n---\n")}`);
    }
  } catch {
    // No notes available.
  }

  return parts.join("\n").slice(0, CONTEXT_CAP);
}

interface QuizSetupProps {
  courses: Course[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  onGenerate: (input: GenerateInput) => void;
}

export function QuizSetup({
  courses,
  loading,
  busy,
  error,
  onGenerate,
}: QuizSetupProps) {
  const [courseId, setCourseId] = useState("");
  const [topicChoice, setTopicChoice] = useState(CUSTOM);
  const [customTopic, setCustomTopic] = useState("");
  const [kind, setKind] = useState<KindChoice>("mixed");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const course = useMemo(
    () => courses.find((item) => String(item.id) === courseId) ?? null,
    [courses, courseId],
  );

  // §7: the Mixed set subtitle follows the domain the backend will use -
  // the course when one is selected, otherwise the typed topic. Unknown
  // domain keeps the original wording.
  const kindOptions = useMemo<SelectOption<string>[]>(() => {
    const domainText = course
      ? `${course.title} ${course.topics.map((topic) => topic.title).join(" ")}`
      : customTopic;
    const subject = inferSubject(domainText);
    const mixedHint =
      subject && subject !== "Programming"
        ? "Mixed styles (MCQ)"
        : "All four types, shuffled";
    return [
      {
        value: "mixed",
        label: KIND_LABEL.mixed,
        hint: mixedHint,
        icon: KIND_ICON.mixed,
      },
      ...QUIZ_KINDS.map((kind) => ({
        value: kind,
        label: KIND_LABEL[kind],
        hint: KIND_HINT[kind],
        icon: KIND_ICON[kind],
      })),
    ];
  }, [course, customTopic]);

  const courseOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "General", hint: "No course attached", icon: GENERAL_COURSE_ICON },
      ...courses.map((item) => ({
        value: String(item.id),
        label: item.title,
        icon: COURSE_ICON,
        hint:
          item.topics.length > 0
            ? `${item.topics.length} topics`
            : "No topics yet",
      })),
    ],
    [courses],
  );

  const topicOptions = useMemo<SelectOption<string>[]>(() => {
    const topics = (course?.topics ?? []).map((topic) => ({
      value: `t:${topic.id}`,
      label: topic.title,
      icon: TOPIC_ICON,
      hint: topic.status === "completed" ? "Completed" : "Open",
    }));
    return [
      ...topics,
      {
        value: CUSTOM,
        label: "Custom topic",
        hint: "Type your own",
        icon: CUSTOM_TOPIC_ICON,
      },
    ];
  }, [course]);

  // Keep a still-valid syllabus topic pick; otherwise fall back to the
  // custom box (empty focus -> the backend quizzes the whole course's
  // completed topics). Keyed on ids, NOT on the course object identity, so
  // background courses refreshes (useCourses auto-reload) never stomp the
  // user's pick.
  const topicChoiceKey = `${courseId}:${(course?.topics ?? [])
    .map((topic) => topic.id)
    .join(",")}`;
  useEffect(() => {
    setTopicChoice((choice) => {
      if (
        choice !== CUSTOM &&
        course?.topics.some((topic) => `t:${topic.id}` === choice)
      ) {
        return choice;
      }
      return CUSTOM;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see key above
  }, [topicChoiceKey]);

  // The selected course may have been deleted on another page: clear the
  // stale id once the refreshed list proves it is gone.
  useEffect(() => {
    if (loading) return;
    if (courseId !== "" && courses.every((item) => String(item.id) !== courseId)) {
      setCourseId("");
    }
  }, [courses, courseId, loading]);

  const pdfName = pdfFile ? pdfFile.name.replace(/\.pdf$/i, "") : "";

  const acceptPdf = (file: File | null | undefined) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setLocalError("The PDF must be 10 MB or smaller.");
      return;
    }
    setLocalError(null);
    setPdfFile(file);
  };

  const resolvedTopic = (() => {
    if (topicChoice !== CUSTOM) {
      const match = course?.topics.find(
        (topic) => `t:${topic.id}` === topicChoice,
      );
      if (match) return match.title;
    }
    // The PDF file name doubles as the topic only for a General quiz; with
    // a course it would turn into a bogus focus instruction (the backend
    // uses the PDF itself whenever one is uploaded).
    return (
      customTopic.trim() || (!course && pdfFile ? pdfName.slice(0, 300) : "")
    );
  })();

  const showTopicText = topicChoice === CUSTOM;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // A selected course is enough: the backend scopes the quiz to it even
    // when no focus text is typed.
    if (resolvedTopic.length < 2 && !course) {
      setLocalError(
        "Give the quiz a topic of at least 2 characters, or upload a PDF syllabus.",
      );
      return;
    }
    if (resolvedTopic.length > 300) {
      setLocalError("Keep the topic under 300 characters.");
      return;
    }
    setLocalError(null);
    // An empty focus box with a course stays empty: the backend then runs
    // mode `course` over the completed topics instead of treating the
    // course title as a focus instruction.
    const topic = resolvedTopic;
    const courseId = course ? Number(course.id) : null;
    // Without a course, name the topic's subject so the backend scopes the
    // notes to it (English quiz never receives Python notes).
    const subject = course ? "" : (inferSubject(topic) ?? "");
    setPreparing(true);
    try {
      const context = await buildLearnerContext(course, topic);
      onGenerate({
        topic,
        kind,
        count,
        difficulty: difficulty as Difficulty,
        context,
        courseId,
        subject,
        pdf: pdfFile,
      });
    } catch {
      onGenerate({
        topic,
        kind,
        count,
        difficulty: difficulty as Difficulty,
        context: course ? `Course: ${course.title}` : "",
        courseId,
        subject,
        pdf: pdfFile,
      });
    } finally {
      setPreparing(false);
    }
  };

  const message = localError ?? error;

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="glass relative overflow-hidden rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="atlas-glow pointer-events-none absolute inset-0"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff]">
            <BookOpen className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
              Assessment
            </p>
            <p className="text-sm font-medium text-white">
              Choose what you want to be tested on
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectMenu
            label="Course"
            labelIcon={FIELD_ICON.course}
            value={courseId}
            options={courseOptions}
            onChange={(next) => {
              setCourseId(next);
              setLocalError(null);
            }}
          />
          <SelectMenu
            label="Topic"
            labelIcon={FIELD_ICON.topic}
            value={topicChoice}
            options={topicOptions}
            onChange={(next) => {
              setTopicChoice(next);
              setLocalError(null);
            }}
          />
        </div>

        {showTopicText && (
          <div>
            <label htmlFor="quiz-topic" className={LABEL}>
              {course ? "Focus (optional)" : "Topic to quiz"}
            </label>
            <input
              id="quiz-topic"
              type="text"
              value={customTopic}
              onChange={(event) => setCustomTopic(event.target.value)}
              maxLength={300}
              placeholder={
                course
                  ? "e.g. loops and functions only"
                  : "e.g., Python list comprehensions, CSS grid, Big-O notation"
              }
              className={FIELD}
            />
            <p className="mt-2 text-xs leading-relaxed text-white/35">
              {loading
                ? "Loading your courses..."
                : "Pick a course above, or leave this empty and quiz from an uploaded PDF."}
            </p>
          </div>
        )}

        <div>
          <span className={LABEL}>
            <FileText className="size-3" />
            Syllabus PDF (optional)
          </span>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptPdf(event.dataTransfer.files?.[0]);
            }}
            className={`flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors ${
              dragging
                ? "border-[#cf9eff]/60 bg-[#cf9eff]/[0.07]"
                : "border-white/15 bg-white/[0.03]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                acceptPdf(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {pdfFile ? (
              <>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#cf9eff]/35 bg-[#cf9eff]/10 text-[#cf9eff]">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {pdfFile.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/40">
                    {(pdfFile.size / 1024 / 1024).toFixed(1)} MB - read once
                    for this quiz, then deleted. Never stored.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  aria-label="Remove uploaded PDF"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:border-red-400/40 hover:text-red-200"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-star/80">
                  <Upload className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-white/75">
                    Upload PDF / Syllabus
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/40">
                    Drag & drop or click - optional, up to 10 MB. The AI reads
                    it for this quiz only, then it is permanently deleted.
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectMenu
            label="Question type"
            labelIcon={FIELD_ICON.kind}
            value={kind}
            options={kindOptions}
            onChange={(next) => setKind(next as KindChoice)}
          />
          <SelectMenu
            label="Difficulty"
            labelIcon={FIELD_ICON.difficulty}
            value={difficulty}
            options={DIFFICULTIES}
            onChange={setDifficulty}
          />
        </div>

        <div>
          <span className={LABEL}>
            <FIELD_ICON.count className="size-3" />
            Questions
          </span>
          <div className="flex gap-2">
            {COUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCount(value)}
                aria-pressed={count === value}
                className={`flex-1 rounded-xl border px-3 py-3 font-mono text-sm tabular-nums transition-colors ${
                  count === value
                    ? "border-star/50 bg-star/10 text-star"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-[#cf9eff]/45 hover:text-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div
            role="alert"
            className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3.5"
          >
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border border-red-400/25 bg-red-400/10 text-red-200">
              <AlertTriangle className="size-3.5" />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-red-100/90">
              {message}
            </p>
            <button
              type="submit"
              disabled={busy || preparing}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="size-3" />
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
          <p className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-white/35">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-star/70" />
            {count} questions, {KIND_LABEL[kind].toLowerCase()} - the format
            auto-detects from your course, notes and PDF, graded with feedback
            after every answer.
          </p>
          <button
            type="submit"
            disabled={busy || preparing}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#05050a] transition-shadow hover:shadow-[0_0_40px_rgba(157,180,255,0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy || preparing ? (
              <>
                <Sparkles className="size-4 animate-spin" />
                {preparing && !busy
                  ? "Reading your notes..."
                  : "Writing your quiz..."}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate quiz
              </>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
