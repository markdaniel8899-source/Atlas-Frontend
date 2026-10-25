// IMPORTANT: In Supabase Dashboard > Authentication > Providers > Email,
// set "Confirm email" to OFF. Signup uses OTP only (no confirmation links).
// The Magic Link email template must render {{ .Token }}, not {{ .ConfirmationURL }}.

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { AuthModeToggle } from "../components/ui/AuthModeToggle";
import { EASE } from "../lib/motion";
import {
  normalizeEmail,
  resolveSession,
  sendEmailOtp,
  signOut,
  signUp,
  type AuthResult,
} from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";
import { CurtainLink } from "../components/PageCurtain";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

interface Notice {
  tone: "error";
  text: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const normalizedEmail = normalizeEmail(email);

  useEffect(() => {
    let active = true;
    resolveSession().then((user) => {
      if (active && user) navigate("/app", { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};

    if (name.trim().length < 2) {
      next.name = "Tell us what to call you.";
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      next.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      next.password = "Use at least 8 characters.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setNotice(null);

    let result: AuthResult;

    try {
      result = await signUp(name.trim(), normalizedEmail, password);
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
    } catch {
      setNotice({
        tone: "error",
        text: "Something went wrong. Check your connection and try again.",
      });
      return;
    } finally {
      setBusy(false);
    }

    navigate(
      `/verify-otp?email=${encodeURIComponent(normalizedEmail)}&mode=signup`,
    );
  };

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
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          className="glass card-sheen relative w-full max-w-md rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-10 3xl:max-w-sm"
        >
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
              ATLAS
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
              Claim your map.
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Set up your learning OS in under a minute.
            </p>
          </div>

          <AuthModeToggle mode="signup" />

          {notice && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/[0.07] px-4 py-3 text-xs leading-relaxed text-red-200"
            >
              <p>{notice.text}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field
              label="Full name"
              htmlFor="signup-name"
              icon={<User className="size-4" />}
              filled={name.length > 0}
              error={errors.name}
            >
              <input
                id="signup-name"
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

            <Field
              label="Email"
              htmlFor="signup-email"
              icon={<Mail className="size-4" />}
              filled={email.length > 0}
              error={errors.email}
            >
              <input
                id="signup-email"
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
              htmlFor="signup-password"
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
                id="signup-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errors.password ? true : undefined}
                autoComplete="new-password"
                className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
              />
            </Field>

            <Button type="submit" className="w-full py-3.5" disabled={busy}>
              {busy ? "Creating account..." : "Sign Up"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/45">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-star transition-colors hover:text-white hover:underline"
            >
              Log in
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
