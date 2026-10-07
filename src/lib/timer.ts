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

export function elapsedMs(state: TimerState, now = Date.now()): number {
  const running =
    state.mode === "running" && state.startedAt !== null
      ? now - state.startedAt
      : 0;
  return state.accumulatedMs + running;
}

export function startTimer(state: TimerState): TimerState {
  if (state.mode === "running") return state;
  return { ...state, mode: "running", startedAt: Date.now() };
}

export function pauseTimer(state: TimerState): TimerState {
  if (state.mode !== "running" || state.startedAt === null) return state;
  const accrued = Date.now() - state.startedAt;
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
  const ms = elapsedMs(state);
  if (ms < 60_000) return null;
  const endedAt = Date.now();
  const session: StudySession = {
    id: makeId(),
    startedAt: endedAt - ms,
    endedAt,
    minutes: Math.floor(ms / 60_000),
  };
  saveSessions([...loadSessions(), session]);
  return session;
}
