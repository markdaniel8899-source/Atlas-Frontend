import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Pause,
  Play,
  Square,
  Timer,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useTimer } from "../../context/TimerContext";
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

export function FocusTimerWidget() {
  const timer = useTimer();
  const { state, globalTotal, progress, activeCourse, flash } = timer;
  const [quickOpen, setQuickOpen] = useState(false);
  const [preset, setPreset] = useState(state.targetMin);
  const active = state.mode !== "idle";

  useEffect(() => {
    if (!quickOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQuickOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [quickOpen]);

  const openQuick = () => {
    setPreset(state.targetMin);
    setQuickOpen(true);
  };

  const startQuick = () => {
    timer.startQuick(preset);
    setQuickOpen(false);
  };

  return (
    <>
      <Card className="relative overflow-hidden p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-star">
              <Timer className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-white">Focus timer</h2>
              <p className="text-xs text-white/40">
                {state.mode === "running"
                  ? "Session in progress"
                  : state.mode === "paused"
                    ? "Session paused"
                    : "No session running"}
              </p>
            </div>
          </div>
          <Link
            to="/app/timer"
            className="inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-white"
          >
            Open timer
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {/* HERO: lifetime focus counter, same number as the timer page. */}
        <div className="mt-6 flex flex-col items-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
            Total Focus Time
          </p>
          <span className="mt-2.5 block font-mono text-4xl tabular-nums tracking-tight text-white drop-shadow-[0_0_36px_rgba(207,158,255,0.5)] sm:text-6xl">
            {formatHMS(globalTotal)}
          </span>
          <p className="mt-2.5 text-xs text-white/50">
            Focusing on:{" "}
            <span className="text-white/80">
              {activeCourse ? activeCourse.title : "No course selected"}
            </span>
          </p>

          <div className="relative mt-5 w-full max-w-sm">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#9db4ff] via-[#cf9eff] to-[#cf9eff]"
                initial={false}
                animate={{ width: `${Math.min(100, progress * 100)}%` }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-white/40">
              <span className="rounded-full border border-star/30 bg-star/[0.06] px-2.5 py-0.5 text-star">
                {state.targetMin} min target
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5">
                {active ? `${Math.round(progress * 100)}%` : "Idle"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {active ? (
            <>
              <Button
                onClick={timer.toggle}
                className="px-5 py-2.5"
                aria-label={
                  state.mode === "running" ? "Pause session" : "Resume session"
                }
              >
                {state.mode === "running" ? (
                  <>
                    <Pause className="size-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> Resume
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => timer.stop()}
                className="px-5 py-2.5"
                aria-label="Stop and log session"
              >
                <Square className="size-3.5" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <p className="mr-2 hidden text-xs leading-relaxed text-white/40 sm:block">
                Run a Pomodoro block straight from the dashboard.
              </p>
              <Button onClick={openQuick} className="px-5 py-2.5">
                <Play className="size-4" />
                Quick start
              </Button>
            </>
          )}
        </div>

        {flash && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-300/90"
          >
            <Check className="size-3.5" />
            {flash}
          </motion.p>
        )}
      </Card>

      {createPortal(
        <AnimatePresence>
          {quickOpen && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button
                type="button"
                aria-label="Close quick start"
                onClick={() => setQuickOpen(false)}
                className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Quick start a focus session"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="glass card-sheen relative w-full max-w-sm rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-star/70">
                      Quick start
                    </p>
                    <h3 className="mt-1.5 text-lg font-semibold text-white">
                      Pick a session length
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickOpen(false)}
                    aria-label="Close"
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:border-[#cf9eff]/45 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {PRESETS.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setPreset(min)}
                      aria-pressed={preset === min}
                      className={`rounded-2xl border px-3 py-4 text-center transition-colors ${
                        preset === min
                          ? "border-star/50 bg-star/10 text-star"
                          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-[#cf9eff]/45 hover:text-white"
                      }`}
                    >
                      <span className="block font-mono text-2xl tabular-nums">
                        {min}
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em]">
                        min
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex gap-2">
                  <Button onClick={startQuick} className="flex-1">
                    <Play className="size-4" />
                    Start session
                  </Button>
                  <Button variant="ghost" onClick={() => setQuickOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
