import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import { normalizeEmail, resetPassword } from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";

type Step = "email" | "success";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const normalized = normalizeEmail(email);

    if (!EMAIL_PATTERN.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await resetPassword(normalized);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("success");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
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
        <Link
          to="/login"
          className="group inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Login</span>
        </Link>
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
              {step === "email" ? "Forgot password?" : "Check your inbox"}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {step === "email"
                ? "Enter your email and we'll send you a reset link."
                : "Follow the link in the email to set a new password."}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
              <div
                className={`group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] ${
                  error ? "border-red-400/50" : "border-white/10"
                }`}
              >
                <span className={error ? "text-red-300/70" : "text-white/30"}>
                  <Mail className="size-4" />
                </span>
                <div className="relative min-w-0 flex-1">
                  <input
                    id="forgot-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.toLowerCase());
                      if (error) setError(null);
                    }}
                    autoComplete="email"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "forgot-error" : undefined}
                    className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                  />
                  <label
                    htmlFor="forgot-email"
                    className="pointer-events-none absolute left-0 top-0 translate-y-0 text-[10px] font-medium leading-none text-white/45 transition-all duration-200 ease-out group-focus-within:text-star/80"
                  >
                    Email
                  </label>
                </div>
              </div>

              {error && (
                <p
                  id="forgot-error"
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-red-400/30 bg-red-400/[0.07] px-4 py-3 text-xs leading-relaxed text-red-200"
                >
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full py-3.5" disabled={busy}>
                {busy ? "Sending link..." : "Send reset link"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="mt-7 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-green-400/30 bg-green-400/[0.07] px-4 py-4 text-green-200">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                <p className="text-sm font-medium">
                  Reset link sent! Check your email.
                </p>
              </div>
              <Button
                onClick={() => navigate("/login")}
                className="w-full py-3.5"
                variant="outline"
              >
                <ArrowLeft className="size-4" />
                Back to Login
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
