import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import {
  normalizeEmail,
  resendSignupOtp,
  resolveSession,
  signIn,
  signUp,
  verifyOtp,
  type AuthResult,
} from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";
import { CurtainLink } from "../components/PageCurtain";
import { doubleCurtainNavigate } from "../components/DoubleCurtain";

type Mode = "login" | "signup" | "otp";
type NoticeTone = "error" | "success" | "info";

interface Errors {
  email?: string;
  password?: string;
  otp?: string;
}

interface Notice {
  tone: NoticeTone;
  text: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(() => {
    const incoming = (location.state as { notice?: Notice } | null)?.notice;
    return incoming ?? null;
  });
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const normalizedEmail = normalizeEmail(email);

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
    if (busy) return;
    setMode(next);
    setErrors({});
    setNotice(null);
    if (next !== "otp") setOtp("");
  };

  const finish = () => {
    setLeaving(true);
    window.setTimeout(
      () => doubleCurtainNavigate(navigate, from, { replace: true }),
      300,
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      next.email = "Enter a valid email address.";
    }

    if (mode === "otp") {
      if (!/^[0-9]{8}$/.test(otp)) {
        next.otp = "Enter the 8-digit code.";
      }
    } else if (mode === "signup") {
      if (password.length < 8) {
        next.password = "Use at least 8 characters.";
      }
    } else if (password.length === 0) {
      next.password = "Enter your password.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setNotice(null);

    let result: AuthResult;

    try {
      if (mode === "signup") {
        result = await signUp(normalizedEmail, password);
      } else if (mode === "otp") {
        result = await verifyOtp(normalizedEmail, otp);
      } else {
        result = await signIn(normalizedEmail, password);
      }
    } catch {
      result = {
        error: "Something went wrong. Check your connection and try again.",
      };
    } finally {
      setBusy(false);
    }

    if (result.error) {
      setNotice({ tone: "error", text: result.error });
      if (result.needsVerification) {
        setMode("otp");
        setOtp("");
      }
      return;
    }

    if (result.needsOtp) {
      setMode("otp");
      setOtp("");
      return;
    }

    finish();
  };

  const onResend = async () => {
    if (busy || resending) return;
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setNotice({ tone: "error", text: "Enter a valid email address." });
      return;
    }

    setResending(true);
    setNotice(null);

    try {
      const result = await resendSignupOtp(normalizedEmail);
      if (result.error) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setNotice({
        tone: "success",
        text: "A new 8-digit code is on its way.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Something went wrong. Check your connection and try again.",
      });
    } finally {
      setResending(false);
    }
  };

  const heading =
    mode === "login"
      ? "Welcome back."
      : mode === "signup"
        ? "Claim your map."
        : "Check your inbox.";

  const subheading =
    mode === "login"
      ? "Pick up where the streak left off."
      : mode === "signup"
        ? "Set up your learning OS in under a minute."
        : "Enter the 8-digit code to verify your account.";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void px-6 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
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

      <div className="flex w-full origin-center flex-col items-center justify-center transition-transform duration-300 2xl:scale-90 3xl:scale-75">
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
          className="glass card-sheen relative w-full max-w-md rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-10 3xl:max-w-sm"
        >
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
              ATLAS
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
              {heading}
            </h1>
            <p className="mt-2 text-sm text-white/45">{subheading}</p>
          </div>

          {mode === "otp" && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/[0.06] px-4 py-3 text-left">
              <Mail className="mt-0.5 size-4 shrink-0 text-[#cf9eff]" />
              <p className="text-xs leading-relaxed text-white/70">
                We sent an 8-digit code to{" "}
                <span className="font-medium text-white">
                  {normalizedEmail}
                </span>
                .
              </p>
            </div>
          )}

          {notice && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                notice.tone === "error"
                  ? "border-red-400/30 bg-red-400/[0.07] text-red-200"
                  : notice.tone === "success"
                    ? "border-green-400/30 bg-green-400/[0.07] text-green-200"
                    : "border-[#cf9eff]/30 bg-[#cf9eff]/[0.08] text-[#e9dcff]"
              }`}
            >
              {notice.tone === "success" && (
                <CheckCircle2 className="mt-px size-4 shrink-0 text-green-300" />
              )}
              <p>{notice.text}</p>
            </div>
          )}

          {mode !== "otp" && (
            <div className="relative mt-8 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                    mode === m
                      ? "text-white"
                      : "text-white/45 hover:text-white/80"
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
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            {mode !== "otp" && (
              <>
                <Field
                  label="Email"
                  htmlFor="auth-email"
                  icon={<Mail className="size-4" />}
                  filled={email.length > 0}
                  error={errors.email}
                >
                  <input
                    id="auth-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    autoComplete="email"
                    aria-invalid={errors.email ? true : undefined}
                    className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                  />
                </Field>

                <Field
                  label="Password"
                  htmlFor="auth-password"
                  icon={<Lock className="size-4" />}
                  filled={password.length > 0}
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
                    aria-invalid={errors.password ? true : undefined}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                  />
                </Field>
              </>
            )}

            {mode === "otp" && (
              <Field
                label="8-digit code"
                htmlFor="auth-otp"
                icon={<Key className="size-4" />}
                filled={otp.length > 0}
                error={errors.otp}
              >
                <input
                  id="auth-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  aria-invalid={errors.otp ? true : undefined}
                  className="w-full bg-transparent pt-3 pb-1 text-center text-sm tracking-[0.4em] text-white focus:outline-none"
                />
              </Field>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  disabled={busy}
                  className="text-xs text-white/45 transition-colors hover:text-star disabled:opacity-50"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full py-3.5" disabled={busy}>
              {busy
                ? mode === "login"
                  ? "Signing in..."
                  : mode === "otp"
                    ? "Verifying code..."
                    : "Creating account..."
                : mode === "login"
                  ? "Log in"
                  : mode === "otp"
                    ? "Verify code"
                    : "Create account"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          {mode === "otp" && (
            <div className="mt-5 flex flex-col items-center gap-3 text-xs text-white/45">
              <button
                type="button"
                onClick={onResend}
                disabled={busy || resending}
                className="transition-colors hover:text-star disabled:opacity-50"
              >
                {resending ? "Sending new code..." : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                disabled={busy}
                className="transition-colors hover:text-white disabled:opacity-50"
              >
                Back to Login
              </button>
            </div>
          )}

          {mode !== "otp" && (
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="mt-6 w-full text-center text-sm text-white/45 transition-colors hover:text-white"
            >
              {mode === "login" ? (
                <>
                  New here? <span className="text-star">Create Account</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="text-star">Log in</span>
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  icon,
  error,
  trailing,
  filled,
  children,
}: {
  label: string;
  htmlFor?: string;
  icon?: ReactNode;
  error?: string;
  trailing?: ReactNode;
  filled: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        className={`group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] ${
          error ? "border-red-400/50" : "border-white/10"
        }`}
      >
        {icon && (
          <span className={error ? "text-red-300/70" : "text-white/30"}>
            {icon}
          </span>
        )}
        <div className="relative min-w-0 flex-1">
          {children}
          <label
            htmlFor={htmlFor}
            className={`pointer-events-none absolute left-0 leading-none transition-all duration-200 ease-out group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-[10px] group-focus-within:font-medium group-focus-within:text-star/80 ${
              filled
                ? "top-0 translate-y-0 text-[10px] font-medium text-white/45"
                : "top-1/2 -translate-y-1/2 text-sm text-white/30"
            }`}
          >
            {label}
          </label>
        </div>
        {trailing}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-300/80">{error}</p>}
    </div>
  );
}
