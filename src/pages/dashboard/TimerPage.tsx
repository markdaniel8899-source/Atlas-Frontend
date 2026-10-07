import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { RevealText } from "../../components/RevealText";
import { useTimer } from "../../context/TimerContext";
import { loadSessions } from "../../lib/timer";
import type { StudySession } from "../../lib/timer";
import { useCourses } from "../../hooks/useCourses";
import { EASE } from "../../lib/motion";

const PRESETS = [25, 50, 90];

/** HH:MM:SS for the cumulative focus counter. */
function formatHMS(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDay(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TimerPage() {
  const timer = useTimer();
  const { state, globalTotal, courseTotal, progress, activeCourse } = timer;
  const { courses } = useCourses();
  const [params] = useSearchParams();
  const [sessions, setSessions] = useState<StudySession[]>([]);

  // Pre-select a course coming from the Courses page ("Start Focus") or the
  // shared ?courseId= param. Each param value is consumed at most once, so
  // background courses refreshes never stomp a manual course selection, and
  // a deleted course (not in the list yet or anymore) is never selected.
  const selectCourse = timer.selectCourse;
  const consumedParamRef = useRef<string | null>(null);
  useEffect(() => {
    const raw = params.get("courseId");
    if (!raw) return;
    if (consumedParamRef.current === raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    // Re-runs when the list arrives: a valid id selects after load, a
    // deleted one never does.
    if (courses.some((course) => course.id === id)) {
      consumedParamRef.current = raw;
      selectCourse(id);
    }
  }, [params, selectCourse, courses]);

  // Session History list - refreshed after every commit.
  useEffect(() => {
    setSessions(loadSessions());
  }, [timer.historyVersion]);

  const hint =
    state.mode === "running"
      ? "Counting up live - pauses and stops are saved."
      : state.mode === "paused"
        ? "Paused - resume to keep counting from here."
        : "Resumes from this total next time you press Start.";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Deep work
          </p>
          <RevealText
            as="h1"
            text="Focus timer."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
        </div>

        <label className="flex max-w-full items-center gap-2.5 text-xs text-white/40">
          Course
          <select
            value={state.courseId ?? ""}
            onChange={(event) =>
              timer.selectCourse(event.target.value ? Number(event.target.value) : null)
            }
            disabled={state.mode !== "idle"}
            className="max-w-48 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#cf9eff]/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" className="bg-[#0a0a12]">
              No course
            </option>
            {courses.map((course) => (
              <option
                key={course.id}
                value={course.id}
                className="bg-[#0a0a12]"
              >
                {course.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* HERO: lifetime focus counter - the main element of this page. */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="glass relative overflow-hidden rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-10"
      >
        <div
          aria-hidden="true"
          className="atlas-glow pointer-events-none absolute inset-0"
        />

        <div className="relative flex flex-col items-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
            Total Focus Time
          </p>
          <span className="mt-5 block font-mono text-4xl tabular-nums tracking-tight text-white drop-shadow-[0_0_44px_rgba(207,158,255,0.55)] sm:text-7xl">
            {formatHMS(globalTotal)}
          </span>

          <p className="mt-5 text-sm text-white/60">
            Focusing on:{" "}
            <span className="text-white">
              {activeCourse ? activeCourse.title : "No course selected"}
            </span>
          </p>
          {activeCourse && (
            <p className="mt-1.5 font-mono text-xs tabular-nums text-white/40">
              {formatHMS(courseTotal)} this course
            </p>
          )}

          <div className="mt-7 w-full max-w-md">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#9db4ff] via-[#cf9eff] to-[#cf9eff]"
                initial={false}
                animate={{ width: `${Math.min(100, progress * 100)}%` }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-white/40">
              <span className="rounded-full border border-star/30 bg-star/[0.06] px-2.5 py-0.5 text-star">
                {state.targetMin} min target
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5">
                {state.mode === "running"
                  ? "In session"
                  : state.mode === "paused"
                    ? "Paused"
                    : "Idle"}
              </span>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <Button
              onClick={timer.toggle}
              className="min-w-36"
              aria-label={state.mode === "running" ? "Pause session" : "Start session"}
            >
              {state.mode === "running" ? (
                <>
                  <Pause className="size-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="size-4" />{" "}
                  {state.mode === "paused" ? "Resume" : "Start"}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => timer.stop()}
              disabled={state.mode === "idle"}
              aria-label="Stop and log session"
            >
              <RotateCcw className="size-4" />
              {state.mode === "idle" ? "Reset" : "Finish"}
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-white/35">Target</span>
            {PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => timer.setTarget(min)}
                disabled={state.mode !== "idle"}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  state.targetMin === min
                    ? "border-star/50 bg-star/10 text-star"
                    : "border-white/10 bg-white/[0.03] text-white/45 hover:border-[#cf9eff]/45 hover:text-white/80"
                }`}
              >
                {min}m
              </button>
            ))}
          </div>

          {timer.flash && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 flex items-center gap-2 text-sm text-emerald-300/90"
            >
              <Check className="size-4" />
              {timer.flash}
            </motion.p>
          )}

          <p className="mt-5 max-w-sm text-center text-[11px] leading-relaxed text-white/30">
            {hint} Elapsed time is derived from timestamps, not tick counts.
          </p>
        </div>
      </motion.section>

      {/* Session history - deliberately small and at the bottom. */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        className="glass card-sheen rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-6"
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/45">
            Session History
          </p>
          <p className="text-[11px] text-white/30">
            {sessions.length} logged
          </p>
        </div>

        {sessions.length === 0 ? (
          <p className="mt-3 text-xs text-white/30">
            No sessions yet - finish a minute or more of focus and it lands
            here.
          </p>
        ) : (
          <ul className="mt-3 max-h-56 overflow-y-auto">
            {[...sessions].reverse().map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-2 text-xs last:border-b-0"
              >
                <span className="min-w-0 truncate text-white/45">
                  {formatDay(session.startedAt)}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-white/35">
                  {formatClock(session.startedAt)} - {formatClock(session.endedAt)}
                </span>
                <span className="shrink-0 font-medium text-star/80">
                  {session.minutes} min
                </span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
