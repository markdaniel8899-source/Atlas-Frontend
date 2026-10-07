import { motion } from "framer-motion";
import { Compass, Play, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EASE } from "../../lib/motion";
import { nextTopic } from "../../lib/db/courses";
import type { FocusCourse } from "../../lib/db/types";

interface TodayFocusProps {
  focus: FocusCourse | null;
  loading: boolean;
}

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
      {children}
    </p>
  );
}

export function TodayFocus({ focus, loading }: TodayFocusProps) {
  if (loading) {
    return (
      <Card className="p-6 sm:p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-28 rounded bg-white/[0.06]" />
          <div className="h-7 w-72 max-w-full rounded bg-white/[0.06]" />
          <div className="h-2.5 w-full rounded-full bg-white/[0.05]" />
        </div>
      </Card>
    );
  }

  if (!focus) {
    return (
      <Card className="relative overflow-hidden p-6 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-[#9db4ff]/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Compass className="size-5 text-white/40" />
            </span>
            <div>
              <Eyebrow>Today's focus</Eyebrow>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">
                No course queued yet
              </h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/45">
                Add a course and pick a topic - it will show up here as your
                single focus for the day.
              </p>
            </div>
          </div>
          <Link to="/app/courses">
            <Button variant="ghost" className="px-5 py-2.5 text-xs">
              <Target className="size-3.5" />
              Add a course
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const topic = nextTopic(focus);
  const progress = Math.max(0, Math.min(100, focus.progress_percentage));

  return (
    <Card className="relative overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/3 size-64 rounded-full bg-[#cf9eff]/12 blur-3xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <Eyebrow>Today's focus</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
            {focus.title}
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Next up:{" "}
            <span className="text-white/75">
              {topic ? topic.title : "Add your first topic"}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link to="/app/timer">
            <Button variant="ghost" className="px-5 py-2.5 text-xs">
              <Play className="size-3.5" />
              Start session
            </Button>
          </Link>
          <Link to="/app/roadmap">
            <Button variant="outline" className="px-5 py-2.5 text-xs">
              Roadmap
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative mt-7">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: EASE, delay: 0.2 }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${focus.accent}aa, ${focus.accent})`,
              boxShadow: `0 0 18px ${focus.accent}80`,
            }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-white/35">
          <span>{Math.round(progress)}% complete</span>
          <span className="text-white/50">
            {topic
              ? `${courseStatusLabel(focus.status)} - ${topic.title}`
              : courseStatusLabel(focus.status)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function courseStatusLabel(status: FocusCourse["status"]): string {
  switch (status) {
    case "completed":
      return "Course complete";
    case "in_progress":
      return "In progress";
    case "paused":
      return "Paused";
    default:
      return "Not started";
  }
}
