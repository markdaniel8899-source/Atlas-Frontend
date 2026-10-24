import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import { resolveSession, signOut, updatePassword } from "../lib/auth";
import { supabase } from "../lib/supabase";
import LightPillar from "../components/effects/LightPillar";

type Status = "checking" | "ready" | "invalid";

interface Errors {
  password?: string;
  confirmPassword?: string;
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (search.get("error") || hash.get("error")) {
      setStatus("invalid");
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setStatus("ready");
      }
    });

    const tokenHash = search.get("token_hash");
    if (tokenHash) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (!active) return;
          setStatus(error ? "invalid" : "ready");
        })
        .catch(() => {
          if (active) setStatus("invalid");
        });
    } else {
      resolveSession()
        .then((user) => {
          if (!active) return;
          if (user) setStatus("ready");
        })
        .catch(() => {
          if (active) setStatus("invalid");
        });
    }

    const timer = window.setTimeout(() => {
      if (!active) return;
      setStatus((prev) => (prev === "checking" ? "invalid" : prev));
    }, 2500);

    return () => {
      active = false;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

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
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);

    try {
      const result = await updatePassword(password);
      if (result.error) {
        setFormError(result.error);
        return;
      }

      await signOut("local").catch(() => undefined);
      navigate("/login", {
        replace: true,
        state: {
          notice: {
            tone: "success",
            text: "Password updated! Sign in with your new password.",
          },
        },
      });
    } catch {
      setFormError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "checking") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#cf9eff]" />
          <p className="text-sm text-white/45">Verifying reset link...</p>
        </div>
      </Shell>
    );
  }

  if (status === "invalid") {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
            ATLAS
          </span>
          <div className="mt-4 flex size-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/[0.07]">
            <AlertCircle className="size-5 text-red-400" />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Invalid or expired link
          </h1>
          <p className="mt-2 text-sm text-white/45">
            This password reset link is invalid or has expired. Request a new
            one to continue.
          </p>
        </div>
        <div className="mt-7 space-y-3">
          <Button
            onClick={() => navigate("/forgot-password")}
            className="w-full py-3.5"
          >
            Request new link
          </Button>
          <Button
            onClick={() => navigate("/login")}
            className="w-full py-3.5"
            variant="outline"
          >
            <ArrowLeft className="size-4" />
            Back to Login
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
          ATLAS
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Set new password
        </h1>
        <p className="mt-2 text-sm text-white/45">
          Choose a strong password for your account.
        </p>
      </div>

      {formError && (
        <p
          role="status"
          aria-live="polite"
          className="mt-6 rounded-xl border border-red-400/30 bg-red-400/[0.07] px-4 py-3 text-xs leading-relaxed text-red-200"
        >
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <div>
          <div
            className={`group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] ${
              errors.password ? "border-red-400/50" : "border-white/10"
            }`}
          >
            <span className="text-white/30">
              <Lock className="size-4" />
            </span>
            <div className="relative min-w-0 flex-1">
              <input
                id="new-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                autoComplete="new-password"
                aria-invalid={errors.password ? true : undefined}
                className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
              />
              <label
                htmlFor="new-password"
                className={`pointer-events-none absolute left-0 leading-none transition-all duration-200 ease-out group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-[10px] group-focus-within:font-medium group-focus-within:text-star/80 ${
                  password.length > 0
                    ? "top-0 translate-y-0 text-[10px] font-medium text-white/45"
                    : "top-1/2 -translate-y-1/2 text-sm text-white/30"
                }`}
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
        </div>

        <div>
          <div
            className={`group flex items-center gap-3 rounded-xl border bg-white/[0.04] px-4 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[#cf9eff]/60 focus-within:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] ${
              errors.confirmPassword ? "border-red-400/50" : "border-white/10"
            }`}
          >
            <span className="text-white/30">
              <Lock className="size-4" />
            </span>
            <div className="relative min-w-0 flex-1">
              <input
                id="confirm-password"
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                }}
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? true : undefined}
                className="w-full bg-transparent pt-3 pb-1 text-sm text-white focus:outline-none"
              />
              <label
                htmlFor="confirm-password"
                className={`pointer-events-none absolute left-0 leading-none transition-all duration-200 ease-out group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-[10px] group-focus-within:font-medium group-focus-within:text-star/80 ${
                  confirmPassword.length > 0
                    ? "top-0 translate-y-0 text-[10px] font-medium text-white/45"
                    : "top-1/2 -translate-y-1/2 text-sm text-white/30"
                }`}
              >
                Confirm password
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
            <p className="mt-1.5 text-xs text-red-300/80">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full py-3.5" disabled={busy}>
          {busy ? "Updating password..." : "Update password"}
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
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
          {children}
        </motion.div>
      </div>
    </div>
  );
}
