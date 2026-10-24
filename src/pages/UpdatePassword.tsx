import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import { updatePassword } from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";
import { doubleCurtainNavigate } from "../components/DoubleCurtain";

interface Errors {
  password?: string;
  confirmPassword?: string;
}

export default function UpdatePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};
    if (password.length < 8) {
      next.password = "Use at least 8 characters.";
    }
    if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const { error } = await updatePassword(password);
    if (error) {
      setErrors((prev) => ({ ...prev, password: error }));
      return;
    }

    setTimeout(
      () => doubleCurtainNavigate(navigate, "/login", { replace: true }),
      300,
    );
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
              Set new password
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Your new password must be different from previous ones.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <div
              className="group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] border-white/10"
            >
              <span className="text-white/30">
                <Lock className="size-4" />
              </span>
              <div className="relative min-w-0 flex-1">
                <input
                  id="update-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="New password"
                  className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                />
                <label
                  htmlFor="update-password"
                  className="pointer-events-none absolute left-0 leading-none transition-all duration-200 ease-out group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-[10px] group-focus-within:font-medium group-focus-within:text-star/80"
                >
                  New password
                </label>
              </div>
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
            </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-300/80">{errors.password}</p>
              )}

            <div
              className="group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] border-white/10"
            >
              <span className="text-white/30">
                <Lock className="size-4" />
              </span>
              <div className="relative min-w-0 flex-1">
                <input
                  id="confirm-password"
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
                />
                <label
                  htmlFor="confirm-password"
                  className="pointer-events-none absolute left-0 leading-none transition-all duration-200 ease-out group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-[10px] group-focus-within:font-medium group-focus-within:text-star/80"
                >
                  Confirm new password
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="text-white/35 transition-colors hover:text-white/70"
                aria-label={showConfirmPw ? "Hide password" : "Show password"}
              >
                {showConfirmPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-300/80">{errors.confirmPassword}</p>
              )}

            <Button type="submit" className="w-full py-3.5" disabled={busy}>
              {busy ? "Updating password..." : "Update password"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}