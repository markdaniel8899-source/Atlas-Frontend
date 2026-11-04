export type TimerMode = "idle" | "running" | "paused";

export interface TimerState {
  mode: TimerMode;
  startedAt: number | null;
  accumulatedMs: number;
  targetMin: number;
  /** Course the current focus time belongs to (focus counter target). */
  courseId: number | null;
  /** Milliseconds of the current session already written to the DB. */
  flushedMs: number;
}

export interface StudySession {
  id: string;
  startedAt: number;
  endedAt: number;
  minutes: number;
}

const STATE_KEY = "atlas.timer";
const SESSIONS_KEY = "atlas.sessions";

export function defaultTimerState(targetMin = 25): TimerState {
  return {
    mode: "idle",
    startedAt: null,
    accumulatedMs: 0,
    targetMin,
    courseId: null,
    flushedMs: 0,
  };
}

/**
 * Ask for the browser notification permission. Only call this from a user
 * gesture (starting the timer); browsers ignore other requests.
 */
export function requestTimerNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission === "default") {
    void window.Notification.requestPermission().catch(() => undefined);
  }
}

/** Native browser notification shown when the focus target is reached. */
export function showTimerNotification(minutes: number): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  try {
    const notification = new window.Notification("Focus session complete", {
      body: `Your ${minutes}-minute focus session has ended. Great job!`,
      icon: "/formicon.png",
      tag: "atlas-focus-timer",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Constructor unsupported (e.g. iOS Safari) - the in-app card still shows.
  }
}

export function elapsedMs(state: TimerState, now = Date.now()): number {
  const running =
    state.mode === "running" && state.startedAt !== null
      ? now - state.startedAt
      : 0;
  return state.accumulatedMs + running;
}

/** Target length of the current session in milliseconds (0 = no cap). */
export function targetMs(state: TimerState): number {
  return Math.max(0, state.targetMin) * 60_000;
}

/**
 * Elapsed time that can count toward the session. The target is a hard stop,
 * so wall-clock time after it (closed tab, sleeping laptop) never inflates the
 * session - the old bug that logged a 31-hour timer.
 */
export function sessionElapsedMs(
  state: TimerState,
  now = Date.now(),
): number {
  const elapsed = elapsedMs(state, now);
  const target = targetMs(state);
  return target > 0 ? Math.min(elapsed, target) : elapsed;
}

/**
 * Wall-clock moment the session ended. If the target passed while the tab was
 * asleep, the session ended at the target - not when the tab woke up.
 */
export function sessionEndedAt(
  state: TimerState,
  now = Date.now(),
): number {
  const target = targetMs(state);
  if (
    target > 0 &&
    state.mode === "running" &&
    state.startedAt !== null &&
    elapsedMs(state, now) >= target
  ) {
    return state.startedAt + Math.max(0, target - state.accumulatedMs);
  }
  return now;
}

export function startTimer(state: TimerState): TimerState {
  if (state.mode === "running") return state;
  return { ...state, mode: "running", startedAt: Date.now() };
}

export function pauseTimer(state: TimerState): TimerState {
  if (state.mode !== "running" || state.startedAt === null) return state;
  const target = targetMs(state);
  const raw = Math.max(0, Date.now() - state.startedAt);
  const room = target > 0 ? Math.max(0, target - state.accumulatedMs) : raw;
  const accrued = Math.min(raw, room);
  return {
    ...state,
    mode: "paused",
    startedAt: null,
    accumulatedMs: state.accumulatedMs + accrued,
  };
}

export function resetTimer(state: TimerState): TimerState {
  return {
    ...state,
    mode: "idle",
    startedAt: null,
    accumulatedMs: 0,
    flushedMs: 0,
  };
}

export function setTargetMinutes(state: TimerState, min: number): TimerState {
  return resetTimer({ ...state, targetMin: min });
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ---------------------------------------------------------------
   SHARED STORE: lets every consumer (Timer page, dashboard widget)
   observe the same TimerState without re-parsing localStorage.
--------------------------------------------------------------- */
type TimerListener = () => void;

const listeners = new Set<TimerListener>();
let cache: TimerState | null = null;
let unwatch: (() => void) | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STATE_KEY) return;
  cache = null;
  emit();
}

export function subscribeTimer(listener: TimerListener): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    unwatch = () => window.removeEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unwatch) {
      unwatch();
      unwatch = null;
    }
  };
}

export function invalidateTimer(): void {
  cache = null;
  emit();
}

function readTimerState(): TimerState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultTimerState();
    const parsed = JSON.parse(raw) as TimerState;
    if (typeof parsed?.targetMin !== "number") return defaultTimerState();
    if (parsed.mode === "running" && parsed.startedAt === null) {
      return defaultTimerState(parsed.targetMin);
    }
    if (parsed.mode === "running" && parsed.startedAt !== null) {
      const age = Date.now() - parsed.startedAt;
      if (age > 24 * 60 * 60 * 1000) return defaultTimerState(parsed.targetMin);
    }
    if (parsed.mode === "idle") {
      // Idle never carries elapsed or flushed time over.
      return {
        ...defaultTimerState(parsed.targetMin),
        courseId: typeof parsed.courseId === "number" ? parsed.courseId : null,
      };
    }
    return {
      ...parsed,
      courseId: typeof parsed.courseId === "number" ? parsed.courseId : null,
      flushedMs:
        typeof parsed.flushedMs === "number" && parsed.flushedMs >= 0
          ? parsed.flushedMs
          : 0,
    };
  } catch {
    return defaultTimerState();
  }
}

export function loadTimerState(): TimerState {
  if (cache) return cache;
  cache = readTimerState();
  return cache;
}

export function saveTimerState(state: TimerState) {
  cache = state;
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  emit();
}

export function loadSessions(): StudySession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudySession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: StudySession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function commitSession(state: TimerState): StudySession | null {
  const ms = sessionElapsedMs(state);
  if (ms < 60_000) return null;
  const endedAt = sessionEndedAt(state);
  const session: StudySession = {
    id: makeId(),
    startedAt: endedAt - ms,
    endedAt,
    minutes: Math.floor(ms / 60_000),
  };
  saveSessions([...loadSessions(), session]);
  return session;
}
