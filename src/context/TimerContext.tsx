import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useCourses } from "../hooks/useCourses";
import {
  elapsedMs,
  loadTimerState,
  pauseTimer,
  requestTimerNotificationPermission,
  resetTimer,
  saveTimerState,
  setTargetMinutes,
  showTimerNotification,
  startTimer,
  subscribeTimer,
} from "../lib/timer";
import type { TimerState } from "../lib/timer";
import { commitFocus, flushFocus } from "../lib/db/focus";
import { notifyFocusChanged } from "../lib/db/events";
import { getGlobalFocusSeconds } from "../lib/db/profile";
import { getFocusSeconds } from "../lib/db/courses";
import type { Course } from "../lib/db/types";

export interface TimerContextValue {
  state: TimerState;
  /**
   * Lifetime focus seconds (profiles.total_focus_seconds + pending live
   * time). This is the hero HH:MM:SS counter - it never restarts from zero.
   */
  globalTotal: number;
  /** Same, scoped to the selected course (courses.total_focus_seconds). */
  courseTotal: number;
  /** Progress toward the current target, 0..1. */
  progress: number;
  /** Course the session belongs to (title shown as "Focusing on: ..."). */
  activeCourse: Course | null;
  flash: string | null;
  /** Bumped after every commit - lets lists refetch session history. */
  historyVersion: number;
  /** Start when idle, resume when paused, pause when running. */
  toggle: () => void;
  /** Commit: flush counters + log the session + reset to idle. */
  stop: (message?: string) => void;
  setTarget: (minutes: number) => void;
  /** Pre-select a course while idle or paused (locked during a run). */
  selectCourse: (courseId: number | null) => void;
  /** Set a target and start immediately. */
  startQuick: (minutes: number) => void;
  /** Bottom-right "Session Complete!" card (8s auto-hide, dismissible). */
  showCompletionCard: boolean;
  dismissCompletionCard: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error("useTimer must be used within <TimerProvider>");
  return value;
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(() => loadTimerState());
  const [globalBase, setGlobalBase] = useState(0);
  const [courseBase, setCourseBase] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [tick, setTick] = useState(0);
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const { courses } = useCourses();

  // Actions always read/mutate this synchronously, so double-clicks or an
  // auto-complete racing a manual stop can never flush the same delta twice.
  const stateRef = useRef(state);
  const flashTimerRef = useRef<number | null>(null);
  const completionCardTimerRef = useRef<number | null>(null);

  const applyState = useCallback((next: TimerState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const reloadBases = useCallback(async (courseId: number | null) => {
    const [globalSeconds, courseSeconds] = await Promise.all([
      getGlobalFocusSeconds(),
      getFocusSeconds(courseId),
    ]);
    setGlobalBase(globalSeconds);
    setCourseBase(courseSeconds);
  }, []);

  // Persist every transition (route changes keep the timer alive via this).
  useEffect(() => {
    saveTimerState(state);
  }, [state]);

  // Cross-tab: adopt state written by another tab of the same app.
  useEffect(
    () =>
      subscribeTimer(() => {
        const next = loadTimerState();
        if (next !== stateRef.current) {
          stateRef.current = next;
          setState(next);
        }
      }),
    [],
  );

  // Read the cumulative counters from the database whenever the target
  // course changes (fresh bases for the count-up display).
  const courseId = state.courseId;
  useEffect(() => {
    void reloadBases(courseId);
  }, [courseId, reloadBases]);

  // Single 1Hz tick for every consumer while the timer runs.
  useEffect(() => {
    if (state.mode !== "running") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.mode]);

  const showFlash = useCallback((message: string) => {
    setFlash(message);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (completionCardTimerRef.current)
        window.clearTimeout(completionCardTimerRef.current);
    },
    [],
  );

  const toggle = useCallback(() => {
    const current = stateRef.current;
    if (current.mode === "running") {
      const elapsed = elapsedMs(current);
      const delta = Math.floor((elapsed - current.flushedMs) / 1000);
      // Optimistic bump keeps the hero counter continuous while the
      // queued write lands; reloadBases reconciles it with the database.
      if (delta > 0) {
        setGlobalBase((value) => value + delta);
        if (current.courseId != null) setCourseBase((value) => value + delta);
      }
      applyState({ ...pauseTimer(current), flushedMs: elapsed });
      void flushFocus(current)
        .then(() => {
          reloadBases(current.courseId);
          // The flushed counter lives in courses.total_focus_seconds - tell
          // every mounted view (focus chips, dashboard) to re-read it.
          notifyFocusChanged();
        })
        .catch((err) => {
          console.error("Focus save failed", err);
        });
      return;
    }
    if (current.mode === "idle") {
      requestTimerNotificationPermission();
      void reloadBases(current.courseId);
    }
    applyState(startTimer(current));
  }, [applyState, reloadBases]);

  const stop = useCallback(
    (message?: string) => {
      const current = stateRef.current;
      if (current.mode === "idle") return;

      const elapsed = elapsedMs(current);
      const delta = Math.floor((elapsed - current.flushedMs) / 1000);
      if (delta > 0) {
        setGlobalBase((value) => value + delta);
        if (current.courseId != null) setCourseBase((value) => value + delta);
      }
      applyState(resetTimer(current));

      void commitFocus(current)
        .then((session) => {
          setHistoryVersion((version) => version + 1);
          notifyFocusChanged();
          showFlash(
            message ??
              (session
                ? `Session logged: ${session.minutes} minutes.`
                : "Stopped - focus still counts toward your total."),
          );
        })
        .catch((err) => {
          console.error("Focus save failed", err);
        });
    },
    [applyState, showFlash],
  );

  const setTarget = useCallback(
    (minutes: number) => {
      if (stateRef.current.mode !== "idle") return;
      applyState(setTargetMinutes(stateRef.current, minutes));
    },
    [applyState],
  );

  const selectCourse = useCallback(
    (nextCourseId: number | null) => {
      const current = stateRef.current;
      if (current.mode === "running" || current.courseId === nextCourseId) return;
      applyState({ ...current, courseId: nextCourseId });
    },
    [applyState],
  );

  const startQuick = useCallback(
    (minutes: number) => {
      const current = stateRef.current;
      if (current.mode !== "idle") return;
      requestTimerNotificationPermission();
      applyState(startTimer(setTargetMinutes(current, minutes)));
      void reloadBases(current.courseId);
    },
    [applyState, reloadBases],
  );

  const dismissCompletionCard = useCallback(() => {
    setShowCompletionCard(false);
    if (completionCardTimerRef.current) {
      window.clearTimeout(completionCardTimerRef.current);
      completionCardTimerRef.current = null;
    }
  }, []);

  // Auto-complete when the target is reached (single owner for every view).
  // `tick` is a dep so the check re-runs every second while running - `state`
  // alone never changes between start and target.
  const stopRef = useRef(stop);
  stopRef.current = stop;
  // One-shot: the completion card shows exactly once per session (guards
  // StrictMode double-mounts and a page opened past the target).
  const completionNotifiedRef = useRef(false);
  useEffect(() => {
    if (state.mode !== "running") completionNotifiedRef.current = false;
  }, [state.mode]);
  useEffect(() => {
    if (state.mode !== "running") return;
    if (elapsedMs(state) >= state.targetMin * 60_000) {
      if (!completionNotifiedRef.current) {
        completionNotifiedRef.current = true;
        // Native browser notification (permission requested on start) and
        // the in-app bottom-right card as a fallback.
        showTimerNotification(state.targetMin);
        setShowCompletionCard(true);
        if (completionCardTimerRef.current)
          window.clearTimeout(completionCardTimerRef.current);
        completionCardTimerRef.current = window.setTimeout(() => {
          setShowCompletionCard(false);
          completionCardTimerRef.current = null;
        }, 8000);
      }
      stopRef.current("Target reached - session logged.");
    }
  }, [state, tick]);

  const activeCourse = useMemo(
    () => courses.find((course) => course.id === state.courseId) ?? null,
    [courses, state.courseId],
  );

  const value: TimerContextValue = useMemo(() => {
    const elapsed = elapsedMs(state);
    const pending = Math.max(0, elapsed - state.flushedMs) / 1000;
    return {
      state,
      globalTotal: globalBase + pending,
      courseTotal: state.courseId != null ? courseBase + pending : 0,
      progress: Math.min(1, elapsed / (state.targetMin * 60_000)),
      activeCourse,
      flash,
      historyVersion,
      toggle,
      stop,
      setTarget,
      selectCourse,
      startQuick,
      showCompletionCard,
      dismissCompletionCard,
    };
  }, [
    state,
    tick,
    globalBase,
    courseBase,
    activeCourse,
    flash,
    historyVersion,
    toggle,
    stop,
    setTarget,
    selectCourse,
    startQuick,
    showCompletionCard,
    dismissCompletionCard,
  ]);

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}
