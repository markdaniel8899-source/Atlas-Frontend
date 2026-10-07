import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { EASE } from "../../lib/motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  eyebrow = "Coming soon",
}: EmptyStateProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="glass card-sheen flex flex-col items-center rounded-3xl px-8 py-16 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff] shadow-[0_0_36px_-10px_rgba(207,158,255,0.8)]">
        <Icon className="size-6" />
      </span>
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
        {description}
      </p>
    </motion.section>
  );
}
