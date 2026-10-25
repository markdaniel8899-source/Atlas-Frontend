import { Link } from "react-router-dom";

const item =
  "flex-1 rounded-full py-2 text-center text-sm font-medium transition-[background-color,color,box-shadow] duration-300";

const active =
  "bg-gradient-to-r from-[#4044cc] to-[#7c3aed] text-white shadow-[0_0_22px_-6px_rgba(124,58,237,0.9)]";

const inactive = "text-white/50 hover:text-white";

export function AuthModeToggle({ mode }: { mode: "signin" | "signup" }) {
  return (
    <nav
      aria-label="Authentication mode"
      className="mt-7 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
    >
      <Link
        to="/login"
        aria-current={mode === "signin" ? "page" : undefined}
        className={`${item} ${mode === "signin" ? active : inactive}`}
      >
        Sign In
      </Link>
      <Link
        to="/signup"
        aria-current={mode === "signup" ? "page" : undefined}
        className={`${item} ${mode === "signup" ? active : inactive}`}
      >
        Sign Up
      </Link>
    </nav>
  );
}
