import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Button } from "../components/ui/Button";
import { AuthModeToggle } from "../components/ui/AuthModeToggle";
import { EASE } from "../lib/motion";
import {
  normalizeEmail,
  resolveSession,
  sendEmailOtp,
  signIn,
  signOut,
  signUp,
  type AuthResult,
} from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";
import { CurtainLink } from "../components/PageCurtain";
import { doubleCurtainNavigate } from "../components/DoubleCurtain";

type NoticeTone = "error" | "success" | "info";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

interface Notice {
  tone: NoticeTone;
  text: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Big monitors render a lot more shader pixels, so the pillar gets a calmer,
 * cheaper configuration there (dimmed, slower, lower quality). Small screens
 * keep the original look.
 */
type PillarTier = "default" | "large" | "xl";

function readPillarTier(): PillarTier {
  if (typeof window === "undefined") return "default";
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  if (width >= 2560 || width * dpr >= 4000) return "xl";
  if (width >= 1920 || width * dpr >= 2600) return "large";
  return "default";
}

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const message = searchParams.get("message");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(() => {
    if (mode !== "login") return null;
    const incoming = (location.state as { notice?: Notice } | null)?.notice;
    if (incoming) return incoming;
    return message ? { tone: "success", text: message } : null;
  });
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const prevMode = useRef(mode);
  const [pillarTier, setPillarTier] = useState<PillarTier>(() =>
    readPillarTier(),
  );

  useEffect(() => {
    const update = () => setPillarTier(readPillarTier());
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

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

  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    setPassword("");
    setShowPw(false);
    setErrors({});
    setNotice(null);
  }, [mode]);

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

    if (isSignup) {
      if (name.trim().length < 2) {
        next.name = "Tell us what to call you.";
      }
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        next.email = "Enter a valid email address.";
      }
      if (password.length < 8) {
        next.password = "Use at least 8 characters.";
      }
    } else {
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        next.email = "Enter a valid email address.";
      }
      if (password.length === 0) {
        next.password = "Enter your password.";
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setNotice(null);

    try {
      if (isSignup) {
        let result = await signUp(name.trim(), normalizedEmail, password);
        if (result.error) {
          setNotice({ tone: "error", text: result.error });
          return;
        }

        result = await sendEmailOtp(normalizedEmail);
        if (result.error) {
          setNotice({ tone: "error", text: result.error });
          return;
        }

        await signOut("local").catch(() => undefined);

        navigate(
          `/verify-otp?email=${encodeURIComponent(normalizedEmail)}&mode=signup`,
        );
        return;
      }

      let result: AuthResult;

      try {
        result = await signIn(normalizedEmail, password);
      } catch {
        result = {
          error: "Something went wrong. Check your connection and try again.",
        };
      }

      if (result.error) {
        setNotice({ tone: "error", text: result.error });
        return;
      }

      finish();
    } catch {
      setNotice({
        tone: "error",
        text: "Something went wrong. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void px-6 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <LightPillar
          topColor="#5227FF"
          bottomColor="#FF9FFC"
          intensity={
            pillarTier === "xl" ? 0.45 : pillarTier === "large" ? 0.55 : 1
          }
          rotationSpeed={
            pillarTier === "xl" ? 0.12 : pillarTier === "large" ? 0.16 : 0.3
          }
          glowAmount={
            pillarTier === "xl"
              ? 0.001
              : pillarTier === "large"
                ? 0.0012
                : 0.002
          }
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={
            pillarTier === "xl" ? 0.35 : pillarTier === "large" ? 0.4 : 0.5
          }
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality={pillarTier === "default" ? "high" : "medium"}
        />
        {pillarTier !== "default" && (
          <div
            className={`pointer-events-none absolute inset-0 ${
              pillarTier === "xl" ? "bg-void/35" : "bg-void/25"
            }`}
          />
        )}
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
              {isSignup ? "Claim your map." : "Welcome back."}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {isSignup
                ? "Set up your learning OS in under a minute."
                : "Pick up where the streak left off."}
            </p>
          </div>

          <AuthModeToggle mode={mode} />

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

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {isSignup && (
              <Field
                label="Full name"
                htmlFor="auth-name"
                icon={<User className="size-4" />}
                filled={name.length > 0}
                error={errors.name}
              >
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  autoComplete="name"
                  aria-invalid={errors.name ? true : undefined}
                  className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                />
              </Field>
            )}

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
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
              />
            </Field>

            {!isSignup && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-white/45 transition-colors hover:text-star"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            <Button type="submit" className="w-full py-3.5" disabled={busy}>
              {busy
                ? isSignup
                  ? "Creating account..."
                  : "Signing in..."
                : isSignup
                  ? "Sign Up"
                  : "Log in"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/45">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Link
              to={isSignup ? "/login" : "/signup"}
              className="font-medium text-star transition-colors hover:text-white hover:underline"
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
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
