import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  Code,
  Coffee,
  Compass,
  Database,
  Flame,
  Gauge,
  Globe,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
  Sprout,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SelectMenu } from "../ui/SelectMenu";
import type { SelectOption } from "../ui/SelectMenu";
import { useCourses } from "../../hooks/useCourses";
import { EASE } from "../../lib/motion";

export interface RoadmapRequestInput {
  goal: string;
  hours: number;
  level: string;
  /** Course this roadmap is generated for (null = standalone). */
  courseId: number | null;
  courseTitle: string | null;
}

interface RoadmapBuilderProps {
  busy: boolean;
  error: string | null;
  onGenerate: (input: RoadmapRequestInput) => void;
  defaultCourseId?: number | null;
}

const LEVELS: SelectOption<string>[] = [
  {
    value: "beginner",
    label: "Beginner",
    hint: "New to this topic",
    icon: Sprout,
  },
  {
    value: "intermediate",
    label: "Intermediate",
    hint: "Some hands-on experience",
    icon: TrendingUp,
  },
  {
    value: "advanced",
    label: "Advanced",
    hint: "Confident and building already",
    icon: Rocket,
  },
];

const COMMITMENTS: (SelectOption<string> & { hours: number })[] = [
  { value: "casual", label: "Casual", hint: "2-3 hours / week", icon: Coffee, hours: 3 },
  { value: "serious", label: "Serious", hint: "5-10 hours / week", icon: Flame, hours: 8 },
  { value: "intensive", label: "Intensive", hint: "15+ hours / week", icon: Zap, hours: 16 },
];

const TEMPLATES: { label: string; icon: LucideIcon; goal: string }[] = [
  {
    label: "Python Programming",
    icon: Code,
    goal:
      "Learn Python from scratch to an advanced level: core syntax, data structures, functions and object-oriented design, file and error handling, the standard library, virtual environments and packaging, then finish with a capstone command-line project.",
  },
  {
    label: "Data Science",
    icon: Database,
    goal:
      "Go from zero to a working data scientist: Python and pandas fundamentals, NumPy and data wrangling, statistics and probability, data visualization, exploratory analysis, scikit-learn for classical machine learning, and an end-to-end project on a real dataset.",
  },
  {
    label: "Web Development",
    icon: Globe,
    goal:
      "Build and ship full-stack web apps: HTML, CSS and responsive layout, modern JavaScript and the DOM, a frontend framework, REST APIs and databases, authentication, testing, deployment, and one deployed portfolio project.",
  },
  {
    label: "Machine Learning",
    icon: Brain,
    goal:
      "Master machine learning from foundations to practice: linear algebra and probability refresh, core ML models and model evaluation, scikit-learn workflows, feature engineering, neural networks with PyTorch, and a deployed model project.",
  },
];

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-star/45 focus:outline-none";

const LABEL =
  "mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40";

export function RoadmapBuilder({
  busy,
  error,
  onGenerate,
  defaultCourseId = null,
}: RoadmapBuilderProps) {
  const { courses } = useCourses();
  // Always starts blank: a fresh generation never inherits the last prompt.
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("beginner");
  const [commitment, setCommitment] = useState<string>("serious");
  const [courseValue, setCourseValue] = useState(
    defaultCourseId !== null ? String(defaultCourseId) : "",
  );
  // Only a real interaction with the picker counts as an explicit choice;
  // an untouched builder with no default course falls through to the
  // save flow, which creates/reuses a course from the goal's title.
  const [courseTouched, setCourseTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const courseOptions: SelectOption<string>[] = [
    {
      value: "",
      label: "Not linked",
      hint: "Standalone roadmap",
      icon: Compass,
    },
    ...courses.map((course) => ({
      value: String(course.id),
      label: course.title,
      hint: "Roadmap for this course",
      icon: BookOpen,
    })),
  ];

  /**
   * Explicit pick wins. A pre-selected course (builder opened for
   * /app/roadmap?courseId=N) is an explicit choice too: the picker visibly
   * shows it, so silently dropping the link would orphan the roadmap and it
   * would outlive its course on delete. Only a bare standalone builder
   * (no default, untouched picker) falls through to the title-based
   * reuse/create flow at save time.
   */
  const resolveCourse = (): {
    courseId: number | null;
    courseTitle: string | null;
  } => {
    if (courseTouched) {
      const picked = courses.find(
        (course) => String(course.id) === courseValue,
      );
      return picked
        ? { courseId: picked.id, courseTitle: picked.title }
        : { courseId: null, courseTitle: null };
    }
    if (defaultCourseId != null) {
      const preset = courses.find((course) => course.id === defaultCourseId);
      return { courseId: defaultCourseId, courseTitle: preset?.title ?? null };
    }
    return { courseId: null, courseTitle: null };
  };

  const run = () => {
    const trimmed = goal.trim();
    if (trimmed.length < 3) {
      setLocalError("Describe the goal in at least 3 characters.");
      return;
    }
    if (trimmed.length > 400) {
      setLocalError("Keep the goal under 400 characters.");
      return;
    }
    setLocalError(null);
    const option =
      COMMITMENTS.find((item) => item.value === commitment) ?? COMMITMENTS[1];
    onGenerate({
      goal: trimmed,
      hours: option.hours,
      level,
      ...resolveCourse(),
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run();
  };

  const applyTemplate = (value: string) => {
    setGoal(value);
    setLocalError(null);
  };

  const message = localError ?? error;

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="glass relative overflow-hidden rounded-3xl p-6 shadow-[0_0_90px_-48px_rgba(207,158,255,0.95)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="atlas-glow pointer-events-none absolute inset-0"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff]">
            <Compass className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
              AI syllabus
            </p>
            <p className="text-sm font-medium text-white">
              Tell ATLAS what you want to learn
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-5">
        <div>
          <label htmlFor="roadmap-goal" className={LABEL}>
            <Target className="size-3" />
            Goal
          </label>
          <textarea
            id="roadmap-goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            rows={3}
            maxLength={400}
            placeholder="e.g., Learn Python from basics to advanced, Master Calculus, Build a full-stack web app"
            className={`${FIELD} resize-none leading-relaxed`}
          />
          <p className="mt-2 text-xs leading-relaxed text-white/35">
            Be specific about what you want to learn and your end goal
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectMenu
            label="Current level"
            labelIcon={Gauge}
            value={level}
            options={LEVELS}
            onChange={setLevel}
          />

          <SelectMenu
            label="Time commitment"
            labelIcon={Timer}
            value={commitment}
            options={COMMITMENTS}
            onChange={setCommitment}
          />
        </div>

        <SelectMenu
          label="Link to course"
          labelIcon={BookOpen}
          value={courseValue}
          options={courseOptions}
          onChange={(value) => {
            setCourseValue(value);
            setCourseTouched(true);
          }}
        />

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
            Or start from a template
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => applyTemplate(template.goal)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/60 transition-colors hover:border-[#cf9eff]/40 hover:bg-[#cf9eff]/10 hover:text-white"
              >
                <template.icon className="size-3.5 shrink-0 text-star/70 transition-colors group-hover:text-[#cf9eff]" />
                {template.label}
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
              type="button"
              onClick={run}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#cf9eff]/35 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="size-3" />
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
          <p className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-white/35">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-star/70" />
            The timeline is sized automatically from your goal and commitment.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#05050a] transition-shadow hover:shadow-[0_0_40px_rgba(157,180,255,0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Researching the path…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate roadmap
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
