import { Bot, NotebookPen, Target } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const TOOLS = [
  {
    icon: Target,
    title: "AI Quizzes.",
    body: "Practice with MCQs and coding tests made just for you.",
  },
  {
    icon: Bot,
    title: "AI Helper.",
    body: "Chat with an AI that knows what you are studying.",
  },
  {
    icon: NotebookPen,
    title: "Smart Notes.",
    body: "Write notes that automatically save and organize themselves.",
  },
];

export function SmartAiToolsSection() {
  return (
    <section
      id="smart-tools"
      className="relative z-[2] w-full overflow-hidden bg-[#04040a] shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.75)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(120,80,255,0.1),transparent_70%)]"
      />

      <div className="relative flex w-full flex-col justify-center gap-10 px-6 py-24 sm:px-10 sm:py-28 lg:px-16">
        <ScrollReveal className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
            Smart AI tools
          </p>
          <h2 className="mt-4 text-6xl font-extrabold leading-[0.95] tracking-tighter text-white sm:text-7xl">
            Smart Tools to Help You Learn.
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TOOLS.map((tool, i) => (
            <ScrollReveal
              key={tool.title}
              from={i * 0.27}
              to={i * 0.27 + 0.45}
              className="glass card-sheen rounded-2xl p-5 sm:p-6"
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-star sm:size-11">
                <tool.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-white">
                {tool.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                {tool.body}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
