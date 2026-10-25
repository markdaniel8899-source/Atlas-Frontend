import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const item =
  "relative z-10 flex-1 rounded-full py-2 text-center text-sm font-medium transition-colors duration-300";

const glassActive =
  "absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full border border-white/15 bg-transparent";

export function AuthModeToggle({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";

  return (
    <nav
      aria-label="Authentication mode"
      className="relative mt-7 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.04] p-1"
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: isLogin ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.7 }}
        className={glassActive}
      />
      <Link
        to="/login"
        aria-current={isLogin ? "page" : undefined}
        className={`${item} ${isLogin ? "text-white" : "text-white/45 hover:text-white/80"}`}
      >
        Log in
      </Link>
      <Link
        to="/signup"
        aria-current={!isLogin ? "page" : undefined}
        className={`${item} ${!isLogin ? "text-white" : "text-white/45 hover:text-white/80"}`}
      >
        Sign up
      </Link>
    </nav>
  );
}
