import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Compass,
  Loader2,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Skull,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { RoadmapBuilder } from "../../components/roadmap/RoadmapBuilder";
import type { RoadmapRequestInput } from "../../components/roadmap/RoadmapBuilder";
import { BossConfetti } from "../../components/roadmap/BossConfetti";
import { RoadmapMap } from "../../components/roadmap/RoadmapMap";
import { RoadmapDetail } from "../../components/roadmap/RoadmapDetail";
import {
  AiError,
  generateRoadmapOutline,
  generateRoadmapPhase,
} from "../../lib/ai";
import { useCourses } from "../../hooks/useCourses";
import { fetchCourses } from "../../lib/db/courses";
import { ROADMAPS_CHANGED_EVENT } from "../../lib/db/events";
import {
  appendRoadmapPhase,
  awardLevelXp,
  deleteRoadmap,
  fetchLatestRoadmap,
  saveRoadmapSkeleton,
  syncRoadmapProgressToCourse,
  updateNodeStatuses,
} from "../../lib/db/roadmaps";
import type { GraphNode, NodeStatus, RoadmapGraph } from "../../lib/roadmapGraph";
import {
  currentPhaseNumber,
  deriveEdges,
  graphNodesFromPhase,
  orderedNodes,
  phaseProgress,
  progressOf,
  roadmapDisplayTitle,
  withDerivedStatuses,
  xpFor,
  xpProgressOf,
} from "../../lib/roadmapGraph";
import { EASE } from "../../lib/motion";

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface SwitcherItem {
  id: number | null;
  title: string;
  icon: typeof Compass;
}

function CourseSwitcher({
  courses,
  value,
  onChange,
}: {
  courses: { id: number; title: string }[];
  value: number | null;
  onChange: (courseId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items: SwitcherItem[] = [
    { id: null, title: "All roadmaps", icon: Compass },
    ...courses.map((course) => ({
      id: course.id,
      title: course.title,
      icon: BookOpen,
    })),
  ];
  const selected =
    items.find((item) => item.id === value) ??
    (value != null
      ? { id: value, title: `Roadmap #${value}`, icon: MapIcon }
      : items[0]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch roadmap by course"
        title="Switch between course roadmaps"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex max-w-56 items-center gap-2 rounded-full border px-4 py-2.5 text-sm backdrop-blur-[40px] transition-colors ${
          open
            ? "border-[#cf9eff]/50 bg-[#cf9eff]/[0.08] text-white"
            : "border-white/[0.08] bg-white/[0.03] text-white/75 hover:border-[#cf9eff]/45 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <MapIcon
          className={`size-4 shrink-0 ${open ? "text-[#cf9eff]" : "text-[#cf9eff]/70"}`}
        />
        <span className="truncate">{selected.title}</span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-[#cf9eff]" : "text-white/35"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Course roadmaps"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute top-[calc(100%+8px)] right-0 z-40 w-64 rounded-2xl border border-white/10 bg-[#0a0a12]/95 p-1.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.id === value;
              return (
                <button
                  key={item.id ?? "all"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star ${
                    active ? "bg-[#cf9eff]/12" : "hover:bg-white/[0.07]"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                      active
                        ? "border-[#cf9eff]/40 bg-[#cf9eff]/15 text-[#cf9eff]"
                        : "border-white/10 bg-white/[0.05] text-white/45"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      active ? "font-medium text-white" : "text-white/75"
                    }`}
                  >
                    {item.title}
                  </span>
                  {active && (
                    <Check className="size-4 shrink-0 text-[#cf9eff]" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RoadmapPage() {
  const [graph, setGraph] = useState<RoadmapGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nodeBusy, setNodeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [confetti, setConfetti] = useState(0);
  /** Live chunked-generation status, e.g. "AI is designing Phase 2...". */
  const [generating, setGenerating] = useState<{
    number: number;
    message: string;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    courses,
    setCourses,
    loading: coursesLoading,
    reload: reloadCourses,
  } = useCourses();
  /** True while this page is writing roadmaps, so its own change
   *  notifications never trigger a refetch that would clobber local state. */
  const busyRef = useRef(false);

  // /app/roadmap?courseId=<id> opens the roadmap linked to that course.
  const roadmapCourseId = useMemo(() => {
    const raw = searchParams.get("courseId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const switchCourse = useCallback(
    (courseId: number | null) => {
      setSearchParams(courseId != null ? { courseId: String(courseId) } : {});
    },
    [setSearchParams],
  );

  // A course deleted on another page: once the refreshed list proves it is
  // gone, drop ?courseId= so the switcher and fetch fall back to the
  // remaining roadmaps (also covers deletions made while busyRef skipped
  // the ROADMAPS listener below).
  useEffect(() => {
    if (coursesLoading) return;
    if (
      roadmapCourseId != null &&
      !courses.some((course) => course.id === roadmapCourseId)
    ) {
      setSearchParams({}, { replace: true });
    }
  }, [coursesLoading, courses, roadmapCourseId, setSearchParams]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchLatestRoadmap(roadmapCourseId)
      .then((result) => {
        if (alive) setGraph(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [roadmapCourseId]);

  // Pages stay mounted after first visit, so deleting a course on the
  // Courses/Settings tab would leave this hidden view showing the deleted
  // roadmap. Re-read it whenever roadmaps change elsewhere; our own write
  // notifications are skipped while busy so an in-flight generation or node
  // toggle is never overwritten by a stale fetch.
  useEffect(() => {
    const refresh = () => {
      if (busyRef.current) return;
      void (async () => {
        try {
          const rows = await fetchCourses();
          setCourses(rows);
          const courseGone =
            roadmapCourseId != null &&
            !rows.some((course) => course.id === roadmapCourseId);
          if (courseGone) {
            // The scoped course no longer exists: drop ?courseId= so the
            // switcher and the fetch effect fall back to remaining roadmaps.
            setSearchParams({}, { replace: true });
            return;
          }
          const next = await fetchLatestRoadmap(roadmapCourseId);
          setGraph(next);
        } catch {
          // Transient network error - keep the current view.
        }
      })();
    };
    // Course/topic rows themselves are refreshed by every useCourses
    // instance on COURSES_CHANGED - this listener only re-reads the graph.
    window.addEventListener(ROADMAPS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ROADMAPS_CHANGED_EVENT, refresh);
  }, [roadmapCourseId, setSearchParams, setCourses]);

  const generate = useCallback(
    async (input: RoadmapRequestInput) => {
      setBusy(true);
      busyRef.current = true;
      setError(null);
      setGenerating(null);
      try {
        // Step 1: outline only - small and fast, phase titles show at once.
        const outline = await generateRoadmapOutline(
          input.goal,
          input.hours,
          input.level,
        );

        const skeleton = await saveRoadmapSkeleton({
          goal: input.goal,
          title: outline.title,
          summary: outline.summary,
          model: outline.model,
          courseId: input.courseId,
          courseTitle: input.courseTitle,
          phases: outline.phases.map((phase) => ({
            number: phase.number,
            title: phase.title,
            objective: phase.objective,
            durationWeeks: 0,
            hours: 0,
            milestones: [],
          })),
        });

        if (!skeleton?.id) {
          setError(
            "The outline is ready, but saving it failed. Check your connection and try again.",
          );
          return;
        }
        setGraph(skeleton);

        // Step 2+: one phase chunk at a time - each is small, fast and
        // saved to Supabase the moment it arrives.
        let current: RoadmapGraph = skeleton;
        const idMap = new Map<string, string>();
        const takenKeys = new Set(skeleton.nodes.map((node) => node.key));
        let previousLastKey: string | null = null;
        let saveFailed = false;

        for (let index = 0; index < outline.phases.length; index += 1) {
          const meta = outline.phases[index];
          setGenerating({
            number: meta.number,
            message: `AI is designing Phase ${meta.number} of ${outline.phases.length}: ${meta.title}...`,
          });

          const chunk = await generateRoadmapPhase({
            goal: input.goal,
            hours: input.hours,
            level: input.level,
            outline: outline.phases,
            phaseNumber: meta.number,
            doneTitles: current.nodes.map((node) => node.title),
          });

          const newNodes = graphNodesFromPhase(chunk.phase, takenKeys);
          const base: RoadmapGraph = {
            ...current,
            nodes: [...current.nodes, ...newNodes],
          };
          const merged = withDerivedStatuses({
            ...base,
            edges: deriveEdges(base),
          });

          const savedNodes = await appendRoadmapPhase(
            skeleton.id,
            idMap,
            newNodes,
            previousLastKey,
          );
          if (savedNodes) {
            const byKey = new Map(savedNodes.map((node) => [node.key, node]));
            current = withDerivedStatuses({
              ...merged,
              nodes: merged.nodes.map((node) => byKey.get(node.key) ?? node),
            });
          } else {
            saveFailed = true;
            current = merged;
          }

          const ordered = orderedNodes(current.nodes);
          previousLastKey =
            ordered.length > 0 ? ordered[ordered.length - 1].key : null;
          setGraph(current);
          setGenerating(null);
        }

        if (saveFailed) {
          setError(
            "Some phases could not be saved to your account. Check your connection and try again.",
          );
        } else if (current.courseId == null) {
          setError(
            "Roadmap generated, but its course row could not be created. Check your connection and try again.",
          );
        }

        if (current.courseId != null) {
          await syncRoadmapProgressToCourse(
            current.courseId,
            current.nodes,
          ).catch(() => false);
          if (roadmapCourseId != null && current.courseId !== roadmapCourseId) {
            setSearchParams({ courseId: String(current.courseId) });
          }
        }

        setSelected(null);
        setShowBuilder(false);
      } catch (err) {
        // Phases generated before the failure stay on screen and in the DB.
        if (err instanceof AiError) {
          const unreachable = err.status === 0 || err.status === 503;
          setError(
            unreachable
              ? null
              : err.status === 408
                ? "The AI timed out mid-generation. Your saved progress is kept - try again."
                : err.message,
          );
        } else {
          setError("Roadmap generation failed. Saved progress is kept.");
        }
      } finally {
        setGenerating(null);
        await reloadCourses();
        busyRef.current = false;
        setBusy(false);
      }
    },
    [roadmapCourseId, reloadCourses, setSearchParams],
  );

  const toggleNode = useCallback(
    async (node: GraphNode) => {
      if (!graph) return;

      const completing = node.status !== "completed";
      const stamp = completing ? new Date().toISOString() : null;
      const previous = graph.nodes;

      if (completing) {
        void awardLevelXp(xpFor(node));
        if (node.type === "boss") {
          setConfetti((value) => value + 1);
          window.setTimeout(() => setConfetti(0), 2400);
        }
      }

      const applied = previous.map((item) =>
        item.key === node.key
          ? {
              ...item,
              status: (completing ? "completed" : "locked") as NodeStatus,
              completedAt: stamp,
            }
          : item,
      );

      const next = withDerivedStatuses({ ...graph, nodes: applied });
      setGraph(next);

      const previousByKey = new Map(previous.map((item) => [item.key, item]));
      const updates: {
        id: string;
        status: NodeStatus;
        completedAt: string | null;
      }[] = [];

      for (const item of next.nodes) {
        if (!item.id) continue;
        const before = previousByKey.get(item.key);
        if (before && before.status === item.status) continue;
        updates.push({
          id: item.id,
          status: item.status,
          completedAt: item.completedAt,
        });
      }

      if (updates.length > 0) {
        setNodeBusy(true);
        busyRef.current = true;
        await updateNodeStatuses(updates).catch(() => false);
        if (graph.courseId) {
          await syncRoadmapProgressToCourse(graph.courseId, next.nodes).catch(
            () => false,
          );
        }
        busyRef.current = false;
        setNodeBusy(false);
      }
    },
    [graph],
  );

  const removeRoadmap = useCallback(async () => {
    if (!graph?.id || busy || nodeBusy) return;
    const confirmed = window.confirm(
      `Delete this roadmap permanently? This cannot be undone.\n\n"${roadmapDisplayTitle(graph)}"`,
    );
    if (!confirmed) return;
    setError(null);
    // Suppress the change event fired by our own delete; state is cleared
    // directly below so the hidden sibling views don't refetch mid-removal.
    busyRef.current = true;
    const removed = await deleteRoadmap(graph.id).catch(() => false);
    busyRef.current = false;
    if (!removed) {
      setError("Could not delete the roadmap. Check your connection.");
      return;
    }
    setSelected(null);
    setShowBuilder(false);
    setGraph(null);
  }, [graph, busy, nodeBusy]);

  const progress = useMemo(
    () => (graph ? progressOf(graph) : null),
    [graph],
  );

  const xp = useMemo(() => (graph ? xpProgressOf(graph) : null), [graph]);

  const currentPhase = graph ? currentPhaseNumber(graph) : null;
  const currentPhaseTitle =
    graph && currentPhase != null
      ? graph.phases.find((phase) => phase.number === currentPhase)?.title
      : undefined;

  const selectedNode = selected && graph ? selected : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-white/40">
        <Loader2 className="size-4 animate-spin" />
        Loading roadmap…
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
              Path map
            </p>
            <RevealText
              as="h1"
              text="Roadmap"
              className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
            />
          </div>
          <div className="flex items-center gap-3">
            <CourseSwitcher
              courses={courses}
              value={roadmapCourseId}
              onChange={switchCourse}
            />
            {roadmapCourseId != null && (
              <Link
                to={`/app/notes?courseId=${roadmapCourseId}`}
                className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
                title="Open notes for the selected course"
              >
                <BookOpen className="size-4" />
                Notes
              </Link>
            )}
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="glass card-sheen relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-10"
        >
          <div className="relative mx-auto flex max-w-xl flex-col items-center">
            <span className="relative grid size-20 place-items-center rounded-3xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff] shadow-[0_0_60px_-18px_rgba(207,158,255,0.85)]">
              <Compass className="size-9" />
              <span
                aria-hidden="true"
                className="absolute -inset-3.5 rounded-[30px] border border-dashed border-[#cf9eff]/25"
              />
            </span>
            <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
              No roadmap yet
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Your learning journey starts here
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/45">
              Tell us what you want to master, and AI will create a personalized
              roadmap with milestones, resources, and progress tracking.
            </p>
          </div>
        </motion.section>

        <RoadmapBuilder
          busy={busy}
          error={error}
          defaultCourseId={roadmapCourseId}
          onGenerate={(input) => void generate(input)}
        />
      </div>
    );
  }

  const offset = RING_CIRCUMFERENCE - (progress ? progress.percent : 0) / 100 * RING_CIRCUMFERENCE;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Path map
          </p>
          <RevealText
            as="h1"
            text="Roadmap"
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <CourseSwitcher
            courses={courses}
            value={roadmapCourseId}
            onChange={switchCourse}
          />
          {(graph.courseId ?? roadmapCourseId) != null && (
            <Link
              to={`/app/notes?courseId=${graph.courseId ?? roadmapCourseId}`}
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
              title="Open notes for this course"
            >
              <BookOpen className="size-4" />
              Notes
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowBuilder((value) => !value)}
            className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
          >
            {showBuilder ? <X className="size-4" /> : <Sparkles className="size-4" />}
            {showBuilder ? "Cancel" : "New roadmap"}
          </button>
          <button
            type="button"
            onClick={() => void removeRoadmap()}
            disabled={busy || nodeBusy}
            className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/[0.08] px-5 py-2.5 text-sm text-rose-200 transition-colors hover:border-rose-400/55 hover:bg-rose-500/[0.14] disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            Delete roadmap
          </button>
        </div>
      </div>

      {showBuilder && (
        <RoadmapBuilder
          busy={busy}
          error={error}
          defaultCourseId={graph.courseId}
          onGenerate={(input) => void generate(input)}
        />
      )}

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="glass card-sheen relative overflow-hidden rounded-2xl p-6"
      >
        <div
          aria-hidden="true"
          className="atlas-glow pointer-events-none absolute inset-0"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
              {graph.courseTitle ? "Course roadmap" : "Learning path"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
              {roadmapDisplayTitle(graph)}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {graph.phases.map((phase) => {
                const counts = phaseProgress(graph, phase.number);
                const active = generating?.number === phase.number;
                const complete =
                  counts.total > 0 && counts.completed >= counts.total;
                return (
                  <span
                    key={phase.number}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-[#cf9eff]/55 bg-[#cf9eff]/12 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    }`}
                  >
                    {active ? (
                      <Loader2 className="size-3 animate-spin text-[#cf9eff]" />
                    ) : (
                      <span
                        className={complete ? "text-violet-300" : "text-star/80"}
                      >
                        {phase.number}
                      </span>
                    )}
                    {phase.title}
                    {counts.total > 0 && (
                      <span className="text-white/35">
                        {" "}
                        · {counts.completed}/{counts.total}
                      </span>
                    )}
                    {active && (
                      <span className="text-[#cf9eff]/85">· designing…</span>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="mt-5 max-w-xl">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                <span className="tabular-nums text-white/75">
                  {progress?.completed ?? 0} / {progress?.total ?? 0} levels
                </span>
                <span className="tabular-nums">
                  Current phase {currentPhase ?? 1} of{" "}
                  {Math.max(graph.phases.length, currentPhase ?? 1)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a855f7] via-[#818cf8] to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.7)] transition-[width] duration-700"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cf9eff]/30 bg-[#cf9eff]/10 px-3 py-1 text-xs font-semibold text-[#f0e2ff]">
                  <Sparkles className="size-3.5" />
                  {xp?.earned ?? 0} / {xp?.total ?? 0} XP
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/65">
                  <MapIcon className="size-3.5 text-cyan-300" />
                  {currentPhaseTitle
                    ? `Phase ${currentPhase}: ${currentPhaseTitle}`
                    : "Journey"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative size-24 shrink-0">
              <svg
                className="size-24 -rotate-90"
                viewBox="0 0 84 84"
                aria-hidden="true"
              >
                <circle
                  cx="42"
                  cy="42"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="6"
                />
                <circle
                  cx="42"
                  cy="42"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#cf9eff"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={offset}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums text-white">
                {Math.round(progress?.percent ?? 0)}%
              </span>
            </div>
            <div className="text-sm text-white/45">
              <p className="tabular-nums text-white">
                {progress?.completed ?? 0} / {progress?.total ?? 0}
              </p>
              <p className="text-xs">levels completed</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-white/40">
        <span className="flex items-center gap-1.5">
          <Lock className="size-3.5" />
          Locked
        </span>
        <span className="flex items-center gap-1.5">
          <Circle className="size-3.5 fill-[#a855f7] text-[#a855f7]" />
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-violet-300" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <Skull className="size-3.5 text-rose-400" />
          Boss level · +200 XP
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <RotateCcw className="size-3.5" />
          Follow the path: each level unlocks the next (+50 XP)
        </span>
      </div>

      <RoadmapMap
        graph={graph}
        selectedKey={selectedNode}
        onSelect={(key) => setSelected(key)}
      />

      <AnimatePresence>
        {generating && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#cf9eff]/25 bg-[#cf9eff]/[0.07] px-5 py-3.5 backdrop-blur-xl"
          >
            <Loader2 className="size-4 animate-spin text-[#cf9eff]" />
            <span className="text-sm text-white/80">{generating.message}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] tracking-wide text-white/45">
              Generating next levels…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNode && (
          <RoadmapDetail
            key={selectedNode}
            graph={graph}
            nodeKey={selectedNode}
            busy={nodeBusy}
            onClose={() => setSelected(null)}
            onToggle={(node) => void toggleNode(node)}
          />
        )}
      </AnimatePresence>

      {confetti > 0 && <BossConfetti key={confetti} />}
    </div>
  );
}
