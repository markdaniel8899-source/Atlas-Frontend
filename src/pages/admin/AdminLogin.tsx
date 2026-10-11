import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resolveSession } from "../../lib/auth";
import { isAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";
import { toast } from "../../lib/toast";
import { EASE } from "../../lib/motion";

/** Human-readable auth errors (mirrors lib/auth readableError). */
function readableAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) {
    return "That email and password combination didn't work.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Give it a moment and try again.";
  }
  return message;
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/wp-admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  // Already an admin? Skip the form. Anyone else (guest OR logged-in
  // non-admin) sees the form so they can try another account — the
  // "Access Denied" toast only fires after a login attempt, never on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const user = await resolveSession();
      if (!active || !user) {
        setBooting(false);
        return;
      }
      const admin = await isAdmin();
      if (!active) return;
      if (admin) {
        navigate("/wp-admin", { replace: true });
        return;
      }
      setBooting(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // 1. Sign in with Supabase directly.
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setIsLoading(false);
      setError(
        signInError
          ? readableAuthError(signInError.message)
          : "Sign in failed. Please try again.",
      );
      return;
    }

    // 2. Immediately fetch this user's role by id (profile may not be cached yet).
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setIsLoading(false);

    // 3. Gate on the freshly fetched role.
    if (profile?.role === "admin") {
      navigate(from, { replace: true });
    } else {
      toast.error("Access Denied - Admins only");
      navigate("/app", { replace: true });
    }
  };

  if (booting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#09090b]">
        <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#cf9eff]" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#09090b] px-4">
      {/* Accent mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_20%_0%,rgba(64,68,204,0.18),transparent_60%),radial-gradient(45%_40%_at_85%_15%,rgba(207,158,255,0.12),transparent_60%)]"
      />

      <motion.a
        href="/"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white"
      >
        <ArrowLeft className="size-3.5" />
        Back to site
      </motion.a>

      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-md"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-[#cf9eff]/30 bg-gradient-to-br from-[#4044cc]/40 to-[#cf9eff]/25">
            <ShieldCheck className="size-5 text-[#cf9eff]" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            ATLAS Admin
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Restricted area. Authorised personnel only.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1.5 block text-xs font-medium text-gray-400"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@atlas.app"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#cf9eff]/50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-xs font-medium text-gray-400"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                id="admin-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-10 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#cf9eff]/50"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-white/35 transition-colors hover:text-white"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-300/90">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 w-full rounded-lg bg-gradient-to-r from-[#4044cc] to-[#cf9eff] py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-4 block text-center text-sm text-gray-400 transition-colors hover:text-white"
        >
          Forgot Password? Reset here.
        </Link>
      </motion.div>
    </div>
  );
}
