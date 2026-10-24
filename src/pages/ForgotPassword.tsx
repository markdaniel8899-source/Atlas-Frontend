import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import { resetPassword } from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";

interface Errors {
  email?: string;
}

type Step = "email" | "success";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const sendResetLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrors((prev) => ({ ...prev, email: "Enter a valid email address." }));
      return;
    }
    setBusy(true);
    setErrors({});
    const result = await resetPassword(trimmed);
    setBusy(false);
    if (result.error) {
      setErrors((prev) => ({ ...prev, email: result.error }));
      return;
    }
    setStep("success");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();

    const next: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      next.email = "Enter a valid email address.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await sendResetLink();
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void px-6 py-16">
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
        <a
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </a>
      </motion.div>

      <div className="flex w-full flex-col items-center justify-center origin-center transition-transform duration-300 2xl:scale-90 3xl:scale-75">
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
                ? "Enter your email and we&apos;ll send you a password reset link."
                : "We&apos;ve sent a password reset link to your email. Follow the link to set a new password."}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
              <div
                className="group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] border-white/10"
              >
                <span className="text-white/30">
                  <Mail className="size-4" />
                </span>
                <div className="relative min-w-0 flex-1">
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                  />
                  <label
                    htmlFor="forgot-email"
                    className="pointer-events-none absolute left-0 leading-none transition-all duration-200 ease-out group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-[10px] group-focus-within:font-medium group-focus-within:text-star/80"
                  >
                    Enter your email
                  </label>
                </div>
              </div>

              {errors.email && (
                <p className="mt-1.5 text-xs text-red-300/80">{errors.email}</p>
              )}

              <Button type="submit" className="w-full py-3.5" disabled={busy}>
                {busy ? "Sending link..." : "Send reset link"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="mt-7 space-y-4">
              <div className="flex items-center justify-center gap-3 rounded-xl border border-green-400/30 bg-green-400/[0.07] px-4 py-4 text-green-200">
                <CheckCircle2 className="size-5 flex-shrink-0" />
                <p className="text-sm font-medium">Reset link sent! Check your inbox.</p>
              </div>
              <Button
                onClick={handleBackToLogin}
                className="w-full py-3.5"
                variant="outline"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Login
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}