import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import { resolveSession, signIn, signUp } from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";
import { CurtainLink } from "../components/PageCurtain";
import { doubleCurtainNavigate } from "../components/DoubleCurtain";
type Mode = "login" | "signup";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

interface Notice {
  tone: "error" | "info";
  text: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/app";

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    resolveSession().then((user) => {
      if (active && user) navigate(from, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [from, navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setNotice(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};
    if (mode === "signup" && name.trim().length < 2) {
      next.name = "Tell us what to call you.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address.";
    }
    if (password.length < 6) {
      next.password = "Use at least 6 characters.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setNotice(null);

    const result =
      mode === "signup"
        ? await signUp(name.trim(), email.trim(), password)
        : await signIn(email.trim(), password);

    setBusy(false);

    if (result.error) {
      setNotice({ tone: "error", text: result.error });
      return;
    }

    if (result.needsConfirmation) {
      setNotice({
        tone: "info",
        text: `We sent a confirmation link to ${email.trim()}. Confirm it, then sign in.`,
      });
      setMode("login");
      return;
    }

    // Login success: fade the form up first, then the double curtain
    // closes and parts to carry the swap to the dashboard.
    setLeaving(true);
    window.setTimeout(
      () => doubleCurtainNavigate(navigate, from, { replace: true }),
      300,
    );
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void px-6 py-16">
      {/* Ambient light pillar backdrop (LightPillar). */}
      <div
        aria-hidden="true"
            className="pointer-events-none absolute inset-0"
      >
        <LightPillar
          topColor="#5227FF"
          bottomColor="#FF9FFC"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        className="absolute top-6 left-6 sm:top-8 sm:left-10"
      >
        <CurtainLink
          to="/"
          className="group inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </CurtainLink>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={
          leaving
            ? { opacity: 0, y: -20, scale: 1 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={
          leaving
            ? { duration: 0.3, ease: EASE }
            : { duration: 0.6, delay: 0.05, ease: EASE }
        }
        className="glass card-sheen relative w-full max-w-md rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-10"
      >
        <div className="flex flex-col items-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
            ATLAS
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            {mode === "login" ? "Welcome back." : "Claim your map."}
          </h1>
          <p className="mt-2 text-sm text-white/45">
            {mode === "login"
              ? "Pick up where the streak left off."
              : "Set up your learning OS in under a minute."}
          </p>
        </div>

        <div className="relative mt-8 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                mode === m ? "text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.07]"
                  transition={{ type: "spring", stiffness: 480, damping: 34 }}
                />
              )}
              <span className="relative z-10">
                {m === "login" ? "Log in" : "Sign up"}
              </span>
            </button>
          ))}
        </div>

        {notice && (
          <p
            className={`mt-6 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              notice.tone === "error"
                ? "border-red-400/30 bg-red-400/[0.07] text-red-200"
                : "border-[#cf9eff]/30 bg-[#cf9eff]/[0.08] text-[#e9dcff]"
            }`}
          >
            {notice.text}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          {mode === "signup" && (
            <Field label="Name" htmlFor="auth-name" error={errors.name}>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
              />
            </Field>
          )}

          <Field
            label="Email"
            htmlFor="auth-email"
            icon={<Mail className="size-4" />}
            error={errors.email}
          >
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              autoComplete="email"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="auth-password"
            icon={<Lock className="size-4" />}
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-white/35 transition-colors hover:text-white/70"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
          >
            <input
              id="auth-password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={errors.password ? true : undefined}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="w-full bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
            />
          </Field>

          <Button type="submit" className="w-full py-3.5" disabled={busy}>
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Enter the dashboard"
                : "Create account"}
            {!busy && <ArrowRight className="size-4" />}
          </Button>
        </form>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={leaving ? { opacity: 0, y: -12 } : { opacity: 1, y: 0 }}
        transition={
          leaving
            ? { duration: 0.3, ease: EASE }
            : { duration: 0.5, delay: 0.35, ease: EASE }
        }
        type="button"
        onClick={() =>
          switchMode(mode === "login" ? "signup" : "login")
        }
        className="relative mt-6 text-sm text-white/45 transition-colors hover:text-white"
      >
        {mode === "login" ? (
          <>
            New here? <span className="text-star">Create an account</span>
          </>
        ) : (
          <>
            Already climbing? <span className="text-star">Log in</span>
          </>
        )}
      </motion.button>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  icon,
  error,
  trailing,
  children,
}: {
  label: string;
  htmlFor?: string;
  icon?: ReactNode;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.2em] text-white/40"
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-3 transition-colors ${
          error
            ? "border-red-400/50"
            : "border-white/10 focus-within:border-star/45"
        }`}
      >
        {icon && (
          <span className={error ? "text-red-300/70" : "text-white/30"}>
            {icon}
          </span>
        )}
        {children}
        {trailing}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-300/80">{error}</p>}
    </div>
  );
}
