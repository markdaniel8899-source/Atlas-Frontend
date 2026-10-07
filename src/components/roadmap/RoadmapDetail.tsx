import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  GraduationCap,
  Lock,
  Newspaper,
  Play,
  Skull,
  Star,
  Target,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import type { GraphNode, RoadmapGraph } from "../../lib/roadmapGraph";
import { objectivesFor, xpFor } from "../../lib/roadmapGraph";
import { EASE } from "../../lib/motion";

interface RoadmapDetailProps {
  graph: RoadmapGraph;
  nodeKey: string;
  busy: boolean;
  onClose: () => void;
  onToggle: (node: GraphNode) => void;
}

const STATUS_LABEL: Record<GraphNode["status"], string> = {
  completed: "Completed",
  active: "Active",
  locked: "Locked",
};

const RESOURCE_ICON: Record<string, typeof BookOpen> = {
  docs: BookOpen,
  video: Play,
  article: Newspaper,
  book: BookOpen,
  course: GraduationCap,
  practice: Target,
};

function resourceIcon(type: string): typeof BookOpen {
  return RESOURCE_ICON[type] ?? ArrowUpRight;
}

export function RoadmapDetail({
  graph,
  nodeKey,
  busy,
  onClose,
  onToggle,
}: RoadmapDetailProps) {
  const navigate = useNavigate();
  const node = graph.nodes.find((item) => item.key === nodeKey) ?? null;
  const phase = graph.phases.find((item) => item.number === node?.phaseNumber);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!node) return null;

  const prerequisites = node.prerequisites
    .map((key) => graph.nodes.find((item) => item.key === key))
    .filter((item): item is GraphNode => Boolean(item));

  const completed = node.status === "completed";
  const locked = node.status === "locked";
  const boss = node.type === "boss";
  const objectives = objectivesFor(node, phase);
  const xp = xpFor(node);
  const previousLevel = node.levelNumber - 1;

  const startLearning = () => {
    onClose();
    navigate(
      graph.courseId != null
        ? `/app/timer?courseId=${graph.courseId}`
        : "/app/timer",
    );
  };

  const takeBossBattle = () => {
    onClose();
    navigate("/app/quiz");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={node.title}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: EASE }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#07070f]/95 backdrop-blur-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
          <div className="min-w-0">
            <p
              className={`text-[10px] font-medium uppercase tracking-[0.3em] ${
                boss ? "text-rose-400/90" : "text-star/70"
              }`}
            >
              {boss ? "Boss Battle" : `Level ${node.levelNumber}`}
              {` · ${graph.nodes.length} total`}
              {!boss && phase ? ` · ${phase.title}` : ""}
            </p>
            <h2 className="mt-1.5 flex items-center gap-2 text-xl font-semibold leading-snug tracking-[-0.03em] text-white">
              {boss && <Skull className="size-5 shrink-0 text-rose-400" />}
              <span className="min-w-0">
                {boss
                  ? node.title.replace(/^boss battle:\s*/i, "") || node.title
                  : node.title}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close level details"
            className="shrink-0 rounded-lg p-2 text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/60">
              {completed ? (
                <Check className="size-3 text-violet-300" />
              ) : node.status === "active" ? (
                boss ? (
                  <Skull className="size-3 text-rose-400" />
                ) : (
                  <Star className="size-3 text-[#cf9eff]" />
                )
              ) : (
                <Lock className="size-3" />
              )}
              {STATUS_LABEL[node.status]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/60">
              <Clock className="size-3" />
              {node.estimatedDays} day{node.estimatedDays === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-star/25 bg-star/10 px-3 py-1 text-[11px] text-star">
              <Trophy className="size-3" />+{xp} XP
            </span>
          </div>

          {boss && (
            <section className="rounded-xl border border-rose-400/25 bg-rose-500/[0.07] px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <Skull className="size-4" />
                Boss Level
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-rose-200/70">
                Complete this quiz to unlock the next phase. You need at least
                80% to pass. Everything before this level is fair game.
              </p>
            </section>
          )}

          {node.description && (
            <p className="text-sm leading-relaxed text-white/60">
              {node.description}
            </p>
          )}

          <section>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
              Learning objectives
            </h3>
            <ul className="mt-2 space-y-2">
              {objectives.map((objective, index) => (
                <li
                  key={`${objective}-${index}`}
                  className="flex gap-2.5 text-sm leading-relaxed text-white/65"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#cf9eff]/80" />
                  {objective}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
              {boss ? "Study material before the battle" : "Resources"}
            </h3>
            {node.resources.length === 0 ? (
              <p className="mt-2 text-sm text-white/45">
                No links for this level: use your own notes.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {node.resources.map((resource, index) => {
                  const Icon = resourceIcon(resource.type);
                  return (
                    <li key={`${resource.url}-${index}`}>
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-white/65 transition-colors hover:border-star/40 hover:text-white"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0 text-star/70" />
                            <span className="min-w-0 truncate">
                              {resource.title}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/35">
                            {resource.type}
                            <ArrowUpRight className="size-3" />
                          </span>
                        </a>
                      ) : (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-white/50">
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0 text-white/30" />
                            <span className="min-w-0 truncate">
                              {resource.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/30">
                            {resource.type}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
              <Lock className="size-3" />
              Unlocks after
            </h3>
            {prerequisites.length === 0 ? (
              <p className="mt-2 text-sm text-white/45">
                Entry level: nothing to finish first.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {prerequisites.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    {item.status === "completed" ? (
                      <Check className="size-3.5 shrink-0 text-violet-300" />
                    ) : (
                      <Lock className="size-3.5 shrink-0 text-white/30" />
                    )}
                    <span className="text-white/60">
                      Level {item.levelNumber} · {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {phase && phase.milestones.length > 0 && (
            <section>
              <h3 className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
                <Flag className="size-3" />
                Phase {phase.number} milestones
              </h3>
              <ul className="mt-2 space-y-2">
                {phase.milestones.map((milestone, index) => (
                  <li
                    key={`${milestone}-${index}`}
                    className="flex gap-2.5 text-sm leading-relaxed text-white/55"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-star/70" />
                    {milestone}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="space-y-2 border-t border-white/[0.07] px-6 py-4">
          {locked ? (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/40"
            >
              <Lock className="mr-2 inline size-4" />
              Complete Level {previousLevel} to unlock
            </button>
          ) : (
            <>
              {boss ? (
                <button
                  type="button"
                  onClick={takeBossBattle}
                  disabled={busy}
                  className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white transition-shadow hover:shadow-[0_0_36px_rgba(244,63,94,0.5)] disabled:opacity-50"
                >
                  <Skull className="mr-2 inline size-4" />
                  Take Boss Battle · 80% to pass
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startLearning}
                  disabled={busy}
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#05050a] transition-shadow hover:shadow-[0_0_36px_rgba(157,180,255,0.4)] disabled:opacity-50"
                >
                  <Timer className="mr-2 inline size-4" />
                  Start Learning
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggle(node)}
                className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  completed
                    ? "border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.09]"
                    : "border border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.07]"
                }`}
              >
                {completed
                  ? "Mark as not completed"
                  : boss
                    ? "I passed, mark battle won"
                    : "Mark level completed"}
              </button>
            </>
          )}
        </footer>
      </motion.aside>
    </>
  );
}
