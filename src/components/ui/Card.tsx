import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={`glass card-sheen rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-[border-color,box-shadow] duration-300 hover:border-[#cf9eff]/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3),0_8px_32px_0_rgba(0,0,0,0.37)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
