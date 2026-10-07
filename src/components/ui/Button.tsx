import { motion } from "framer-motion";
import type { MouseEventHandler, ReactNode } from "react";

interface ButtonProps {
  variant?: "primary" | "ghost" | "outline";
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

const styles: Record<string, string> = {
  primary:
    "bg-white text-[#05050a] hover:shadow-[0_0_36px_rgba(157,180,255,0.4)]",
  ghost: "glass text-white hover:border-[#cf9eff]/45 hover:bg-white/[0.06]",
  // Kept neutral: this variant is the landing page's secondary CTA and the
  // landing is locked. App surfaces style their own borders inline instead.
  outline:
    "border border-white/15 bg-white/[0.02] text-white backdrop-blur-md hover:border-white/45 hover:bg-white/[0.07]",
};

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-[border-color,background-color,box-shadow] duration-300 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
