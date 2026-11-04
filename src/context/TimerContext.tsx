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
import { getUser } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  defaultTimerState,
  loadTimerState,
  pauseTimer,
  requestTimerNotificationPermission,
  resetTimer,
  saveTimerState,
  sessionElapsedMs,
  setTargetMinutes,
  showTimerNotification,
  startTimer,
  subscribeTimer,
} from "../lib/timer";
import type { TimerState } from "../lib/timer";
import {
  cachedDeviceId,
  decideTimerSync,
  ensureDeviceId,
  loadTimerSyncMeta,
  markTimerDirty,
  markTimerSynced,
  pushTimerState,
  saveTimerSyncMeta,
} from "../lib/timerSync";
import type { RemoteTimer } from "../lib/timerSync";
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
  /**
   * Change the course the session is credited to. While running, the time
   * already spent is flushed to the previous course first.
   */
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
  const userId = getUser()?.id ?? null;
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
  // A mid-run course switch reloads the bases after flushing the old course,
  // so the automatic courseId effect must not race it with a stale read.
  const skipBaseReloadRef = useRef(false);

  const applyState = useCallback((next: TimerState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const syncBusyRef = useRef(false);
  const syncVersionRef = useRef(0);
  const syncReadyRef = useRef(false);
  const adoptedRef = useRef<TimerState | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  /** Mirror a timer started on the mobile app / another browser. */
  const adoptRemote = useCallback(
    (remote: RemoteTimer) => {
      if (!userId || userIdRef.current !== userId) return;
      syncVersionRef.current += 1;
      adoptedRef.current = remote.state;
      applyState(remote.state);
      saveTimerState(remote.state);
      const meta = loadTimerSyncMeta(userId);
      saveTimerSyncMeta(userId, {
        ...meta,
        dirty: false,
        remoteUpdatedAt: remote.updatedAt,
        deviceId: ensureDeviceId(),
      });
    },
    [applyState, userId],
  );

  /** Push a transition to the server. Offline failures stay marked dirty. */
  const pushSync = useCallback(
    (current: TimerState) => {
      if (!userId) return;
      const ownerId = userId;
      const version = ++syncVersionRef.current;
      const deviceId = ensureDeviceId();
      markTimerDirty(ownerId, deviceId);
      void pushTimerState(ownerId, current, deviceId).then((updatedAt) => {
        if (!updatedAt || userIdRef.current !== ownerId) return;
        if (version !== syncVersionRef.current) return;
        markTimerSynced(ownerId, updatedAt, deviceId);
      });
    },
    [userId],
  );

  /** Decide local vs remote (dirty local wins, otherwise newest row wins). */
  const syncNow = useCallback(async () => {
    if (!userId || syncBusyRef.current) return;
    const ownerId = userId;
    syncBusyRef.current = true;
    try {
      const local = stateRef.current;
      const decision = await decideTimerSync(ownerId, local);
      if (userIdRef.current !== ownerId) return;
      // A local action landed while the row was loading: never adopt over it.
      if (stateRef.current !== local) {
        pushSync(stateRef.current);
        return;
      }
      if (decision.type === "adopt") adoptRemote(decision.remote);
      else if (decision.type === "push") pushSync(decision.state);
    } catch {
      // Offline: the local timer keeps running.
    } finally {
      syncBusyRef.current = false;
      syncReadyRef.current = true;
    }
  }, [adoptRemote, pushSync, userId]);

  const reloadBases = useCallback(async (courseId: number | null) => {
    const [globalSeconds, courseSeconds] = await Promise.all([
      getGlobalFocusSeconds(),
      getFocusSeconds(courseId),
    ]);
    setGlobalBase(globalSeconds);
    setCourseBase(courseSeconds);
  }, []);

  // Persist every transition (route changes keep the timer alive via this)
  // and mirror it to the account's server row for the mobile app.
  useEffect(() => {
    if (userId) {
      let owner: string | null = null;
      try {
        owner = window.localStorage.getItem("atlas.timer.owner");
      } catch {
        owner = userId;
      }
      // Another account still owns the stored timer; the reset effect below
      // replaces it before anything is saved or pushed.
      if (owner && owner !== userId) return;
    }
    // Never persist a stale render after an owner switch / adoption.
    const current = stateRef.current;
    if (current !== state) return;
    saveTimerState(current);
    if (!userId || !syncReadyRef.current) return;
    if (adoptedRef.current === current) {
      adoptedRef.current = null;
      return;
    }
    adoptedRef.current = null;
    pushSync(current);
  }, [state, userId, pushSync]);

  // The website timer lives in localStorage, so reset it when a different
  // account signs in on this browser instead of leaking one user's session.
  useEffect(() => {
    if (!userId) return;
    const key = "atlas.timer.owner";
    let owner: string | null = null;
    try {
      owner = window.localStorage.getItem(key);
      if (!owner) window.localStorage.setItem(key, userId);
    } catch {
      return;
    }
    if (!owner || owner === userId) return;
    applyState(defaultTimerState());
    try {
      window.localStorage.setItem(key, userId);
    } catch {
      // Ignore storage failures; the remote row still wins.
    }
  }, [userId, applyState]);

  // First load: the app may already have a running timer for this account.
  useEffect(() => {
    if (!userId) return;
    syncReadyRef.current = false;
    let cancelled = false;
    void syncNow().finally(() => {
      if (!cancelled) syncReadyRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [userId, syncNow]);

  // Another device (mobile app / second browser) changed the timer row.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`atlas-timer:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "focus_timers",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload as { new?: { device_id?: string } }).new;
          if (row?.device_id && row.device_id === cachedDeviceId()) return;
          void syncNow();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, syncNow]);

  // Returning to the tab / reconnecting re-checks the authoritative timer.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      setTick((value) => value + 1);
      void syncNow();
    };
    const onOnline = () => void syncNow();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [syncNow]);

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
    if (skipBaseReloadRef.current) {
      skipBaseReloadRef.current = false;
      return;
    }
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
      const elapsed = sessionElapsedMs(current);
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

      const elapsed = sessionElapsedMs(current);
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
      if (current.courseId === nextCourseId) return;

      if (current.mode === "running") {
        // Credit the time already spent to the old course, then let the rest
        // of the session continue on the new one.
        const elapsed = sessionElapsedMs(current);
        const delta = Math.floor((elapsed - current.flushedMs) / 1000);
        if (delta > 0) setGlobalBase((value) => value + delta);

        skipBaseReloadRef.current = true;
        applyState({ ...current, courseId: nextCourseId, flushedMs: elapsed });
        void getFocusSeconds(nextCourseId).then(setCourseBase);

        void flushFocus(current)
          .then(() => {
            notifyFocusChanged();
            return reloadBases(nextCourseId);
          })
          .catch((err) => {
            console.error("Focus save failed", err);
          });
        return;
      }

      applyState({ ...current, courseId: nextCourseId });
    },
    [applyState, reloadBases],
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
    if (state.mode === "idle") return;
    if (
      state.targetMin > 0 &&
      sessionElapsedMs(state) >= state.targetMin * 60_000
    ) {
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
    const elapsed = sessionElapsedMs(state);
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
