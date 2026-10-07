import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  Map as MapIcon,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { RevealText } from "../../components/RevealText";
import { CourseEditorModal } from "../../components/courses/CourseEditorModal";
import { useCourses } from "../../hooks/useCourses";
import {
  createCourse,
  createTopic,
  deleteCourse,
  nextTopic,
  setTopicStatus,
  topicCounts,
} from "../../lib/db/courses";
import type { Course, CourseStatus, CourseTopic } from "../../lib/db/types";
import {
  fetchRoadmapProgressByCourse,
  type RoadmapCourseProgress,
} from "../../lib/db/roadmaps";
import {
  FOCUS_CHANGED_EVENT,
  ROADMAPS_CHANGED_EVENT,
} from "../../lib/db/events";
import { EASE } from "../../lib/motion";

const STATUS_TEXT: Record<CourseStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Complete",
};

/** Compact lifetime focus label, e.g. "3h 05m" / "12m". */
function formatFocus(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

interface CardActions {
  topicFormFor: number | null;
  topicTitle: string;
  setTopicTitle: (value: string) => void;
  onOpenTopicForm: (courseId: number) => void;
  onCloseTopicForm: () => void;
  onSubmitTopic: (event: FormEvent, courseId: number) => void;
  onToggleTopic: (course: Course, topic: CourseTopic) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

function CourseCard({
  course,
  index,
  roadmap,
  actions,
}: {
  course: Course;
  index: number;
  roadmap: RoadmapCourseProgress | null;
  actions: CardActions;
}) {
  const { total, done } = topicCounts(course);
  // A linked roadmap is the source of truth for the ring: 3/10 levels → 30%.
  const progress = Math.max(
    0,
    Math.min(100, roadmap ? roadmap.percent : course.progress_percentage),
  );
  const next = nextTopic(course);
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (progress / 100) * circumference;
  const formOpen = actions.topicFormFor === course.id;

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
    >
      <Card className="relative h-full overflow-hidden p-6">
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${course.accent}, transparent)`,
          }}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
              {course.description || "Self-paced"}
            </p>
            <h2 className="mt-2 text-base font-medium leading-snug tracking-tight text-white">
              {course.title}
            </h2>
          </div>
          <svg
            className="size-16 shrink-0 -rotate-90"
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke={course.accent}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {roadmap && (
            <Link
              to={`/app/roadmap?courseId=${course.id}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#a855f7]/35 bg-[#a855f7]/10 px-3 py-1.5 text-[11px] text-[#c4b5fd] transition-colors hover:border-[#a855f7]/60 hover:text-white"
              title={`View roadmap for ${course.title}`}
            >
              <MapIcon className="size-3 shrink-0" />
              <span className="truncate">View Roadmap</span>
              <span className="shrink-0 text-white/40">
                {roadmap.completed}/{roadmap.total}
              </span>
            </Link>
          )}
          <Link
            to={`/app/notes?courseId=${course.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:border-[#cf9eff]/45 hover:bg-[#cf9eff]/10 hover:text-white"
            title={`Open notes for ${course.title}`}
          >
            <BookOpen className="size-3 shrink-0" />
            Notes
          </Link>
          <Link
            to={`/app/timer?courseId=${course.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-star/35 bg-star/[0.08] px-3 py-1.5 text-[11px] text-star transition-colors hover:border-star/60 hover:bg-star/[0.14] hover:text-white"
            title={`Start a focus session for ${course.title}`}
          >
            <Play className="size-3 shrink-0" />
            Start Focus
          </Link>
        </div>

        <p className="mt-4 text-xs text-white/40">
          {roadmap
            ? `${roadmap.completed}/${roadmap.total} levels · ${Math.round(progress)}%`
            : `${done}/${total} topics · ${Math.round(progress)}%`}
          <span className="text-white/30">
            {" · "}
            {formatFocus(course.total_focus_seconds)} focused
          </span>
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {course.topics.length === 0 ? (
            <span className="text-[11px] text-white/30">
              No topics yet - add the first one below.
            </span>
          ) : (
            course.topics.map((topic) => {
              const complete = topic.status === "completed";
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => actions.onToggleTopic(course, topic)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    complete
                      ? "border-[#cf9eff]/35 bg-[#cf9eff]/12 text-[#cf9eff]"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:border-[#cf9eff]/45 hover:text-white/85"
                  }`}
                  title={complete ? "Mark as not started" : "Mark as complete"}
                >
                  {complete && <Check className="size-3" />}
                  <span className="max-w-40 truncate">{topic.title}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <span className="truncate text-xs text-white/45">
            {next ? next.title : "Add a topic to begin"}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {course.status === "completed" ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-300/80">
                <CheckCircle2 className="size-3.5" />
                Complete
              </span>
            ) : (
              <span className="text-xs" style={{ color: course.accent }}>
                {STATUS_TEXT[course.status]}
              </span>
            )}
            <span className="h-4 w-px bg-white/[0.08]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => actions.onEdit(course)}
              aria-label={`Edit ${course.title}`}
              title="Edit course"
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-white/45 transition-colors hover:border-[#cf9eff]/45 hover:text-white"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => actions.onDelete(course)}
              aria-label={`Delete ${course.title}`}
              title="Delete course and roadmap"
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-white/45 transition-colors hover:border-rose-400/50 hover:text-rose-300"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          {formOpen ? (
            <form
              onSubmit={(event) => actions.onSubmitTopic(event, course.id)}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                type="text"
                value={actions.topicTitle}
                onChange={(event) => actions.setTopicTitle(event.target.value)}
                placeholder="Topic title"
                maxLength={160}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-star/45 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white transition-colors hover:bg-white/[0.1]"
              >
                Add
              </button>
              <button
                type="button"
                onClick={actions.onCloseTopicForm}
                aria-label="Cancel adding a topic"
                className="rounded-lg p-2 text-white/40 transition-colors hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => actions.onOpenTopicForm(course.id)}
              className="flex items-center gap-1.5 text-[11px] text-white/35 transition-colors hover:text-star"
            >
              <Plus className="size-3.5" />
              Add topic
            </button>
          )}
        </div>
      </Card>
    </motion.article>
  );
}

export default function CoursesPage() {
  const { courses, setCourses, loading, reload } = useCourses();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicFor, setTopicFor] = useState<number | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Course | null>(null);
  const [roadmaps, setRoadmaps] = useState<
    Map<number, RoadmapCourseProgress>
  >(() => new Map());

  const loadRoadmaps = useCallback(async () => {
    try {
      setRoadmaps(await fetchRoadmapProgressByCourse());
    } catch {
      setRoadmaps(new Map());
    }
  }, []);

  // Roadmap saves can auto-create a course, so refresh both lists together.
  // Course/topic rows themselves are refreshed by every useCourses instance
  // on COURSES_CHANGED, so this listener only covers roadmap progress and
  // focus counters.
  const refresh = useCallback(() => {
    void loadRoadmaps();
    void reload();
  }, [loadRoadmaps, reload]);

  useEffect(() => {
    void refresh();
    window.addEventListener(ROADMAPS_CHANGED_EVENT, refresh);
    window.addEventListener(FOCUS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(ROADMAPS_CHANGED_EVENT, refresh);
      window.removeEventListener(FOCUS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  const submitCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!title.trim()) {
      setError("Give the course a title.");
      return;
    }
    setBusy(true);
    setError(null);
    const created = await createCourse(title, description);
    if (!created) {
      setError("Could not create the course. Check your connection.");
    }
    setTitle("");
    setDescription("");
    setShowForm(false);
    setBusy(false);
    await reload();
  };

  const submitTopic = async (event: FormEvent, courseId: number) => {
    event.preventDefault();
    if (busy || !topicTitle.trim()) return;
    setBusy(true);
    await createTopic(courseId, topicTitle);
    setTopicTitle("");
    setTopicFor(null);
    setBusy(false);
    await reload();
  };

  const toggleTopic = async (course: Course, topic: CourseTopic) => {
    const next: CourseStatus =
      topic.status === "completed" ? "not_started" : "completed";

    setCourses((prev) =>
      prev.map((row) =>
        row.id !== course.id
          ? row
          : {
              ...row,
              topics: row.topics.map((item) =>
                item.id === topic.id
                  ? {
                      ...item,
                      status: next,
                      completed_at:
                        next === "completed"
                          ? new Date().toISOString()
                          : null,
                    }
                  : item,
              ),
            },
      ),
    );

    await setTopicStatus(course.id, topic.id, next);
    await reload();
  };

  const deleteCourseWithConfirm = async (course: Course) => {
    if (busy) return;

    const confirmed = window.confirm(
      `Are you sure? Deleting this course will also permanently delete its associated roadmap, progress and notes.\n\n"${course.title}"`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    const removed = await deleteCourse(course.id);
    setBusy(false);

    if (!removed) {
      setError("Could not delete the course. Check your connection.");
      return;
    }
    setEditing((current) => (current?.id === course.id ? null : current));
    await reload();
    await loadRoadmaps();
  };

  const actions: CardActions = {
    topicFormFor: topicFor,
    topicTitle,
    setTopicTitle,
    onOpenTopicForm: (courseId) => {
      setTopicFor(courseId);
      setTopicTitle("");
    },
    onCloseTopicForm: () => {
      setTopicFor(null);
      setTopicTitle("");
    },
    onSubmitTopic: submitTopic,
    onToggleTopic: toggleTopic,
    onEdit: (course) => setEditing(course),
    onDelete: (course) => void deleteCourseWithConfirm(course),
  };

  const empty = !loading && courses.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Syllabus
          </p>
          <RevealText
            as="h1"
            text="Courses on the wall."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
          <p className="mt-3 max-w-lg text-sm text-white/45">
            {courses.length === 0
              ? "Build a course, break it into topics, then tick them off as you climb."
              : `${courses.length} course${courses.length === 1 ? "" : "s"} tracked. Progress follows your focus sessions.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancel" : "New course"}
        </button>
      </div>

      {error && <p className="text-xs text-red-300/85">{error}</p>}

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onSubmit={submitCourse}
          className="glass card-sheen grid gap-3 rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label
              htmlFor="course-title"
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/40"
            >
              Title
            </label>
            <input
              id="course-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Systems Design Primer"
              maxLength={160}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-star/45 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="course-description"
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/40"
            >
              Source
            </label>
            <input
              id="course-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="ByteGrad"
              maxLength={160}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-star/45 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="h-[46px] w-full rounded-xl bg-white px-6 text-sm font-medium text-[#05050a] transition-shadow hover:shadow-[0_0_36px_rgba(157,180,255,0.4)] disabled:opacity-60 sm:w-auto"
            >
              {busy ? "Saving…" : "Create"}
            </button>
          </div>
        </motion.form>
      )}

      {empty ? (
        <Card className="relative overflow-hidden p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-[#cf9eff]/12 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Compass className="size-5 text-white/40" />
              </span>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
                  Empty syllabus
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">
                  {loading ? "Loading your courses…" : "No courses yet"}
                </h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/45">
                  {loading
                    ? "Reading from Supabase."
                    : "Create your first course and it will show up on Today's Focus immediately."}
                </p>
              </div>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
              >
                <Plus className="size-4" />
                New course
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              roadmap={roadmaps.get(course.id) ?? null}
              actions={actions}
            />
          ))}
        </div>
      )}

      <CourseEditorModal
        course={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          void reload();
          void loadRoadmaps();
        }}
      />
    </div>
  );
}
