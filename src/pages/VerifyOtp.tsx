import { useEffect, useRef, useState } from "react";
import type {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
} from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import {
  normalizeEmail,
  sendEmailOtp,
  signOut,
  verifyEmailOtp,
} from "../lib/auth";
import LightPillar from "../components/effects/LightPillar";
import { CurtainLink } from "../components/PageCurtain";

type Mode = "signup" | "forgot";

interface Notice {
  tone: "error" | "success" | "info";
  text: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = normalizeEmail(searchParams.get("email") ?? "");
  const rawMode = searchParams.get("mode");
  const mode: Mode | null =
    rawMode === "signup" || rawMode === "forgot" ? rawMode : null;

  const [otp, setOtp] = useState<string[]>(() =>
    Array(OTP_LENGTH).fill(""),
  );
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const otpValue = otp.join("");

  useEffect(() => {
    if (!EMAIL_PATTERN.test(email) || !mode) {
      navigate(mode === "forgot" ? "/forgot-password" : "/login", {
        replace: true,
      });
    }
  }, [email, mode, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => otpRefs.current[0]?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const clearOtp = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    otpRefs.current[0]?.focus();
  };

  const setOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (notice) setNotice(null);
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const onOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        setOtp((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        e.preventDefault();
        setOtp((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  const onOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!digits) return;

    const next = Array(OTP_LENGTH).fill("");
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });

    setOtp(next);
    setNotice(null);
    otpRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!/^[0-9]{6}$/.test(otpValue)) {
      setNotice({ tone: "error", text: "Enter the 6-digit code." });
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const result = await verifyEmailOtp(email, otpValue);

      if (result.error) {
        setNotice({ tone: "error", text: result.error });
        clearOtp();
        return;
      }

      if (mode === "signup") {
        await signOut("local").catch(() => undefined);
        navigate(
          `/login?message=${encodeURIComponent(
            "Account created successfully. Please login.",
          )}`,
          { replace: true },
        );
      } else {
        navigate(`/update-password?email=${encodeURIComponent(email)}`, {
          replace: true,
        });
      }
    } catch {
      setNotice({
        tone: "error",
        text: "Something went wrong. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (busy || resending || cooldown > 0) return;

    setResending(true);
    setNotice(null);

    try {
      const result = await sendEmailOtp(email);
      if (result.error) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setNotice({
        tone: "success",
        text: "A new 6-digit code is on its way.",
      });
      setCooldown(RESEND_COOLDOWN);
      clearOtp();
    } catch {
      setNotice({
        tone: "error",
        text: "Something went wrong. Check your connection and try again.",
      });
    } finally {
      setResending(false);
    }
  };

  if (!EMAIL_PATTERN.test(email) || !mode) return null;

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
          to={mode === "forgot" ? "/forgot-password" : "/login"}
          className="group inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span>
            Back to {mode === "forgot" ? "forgot password" : "login"}
          </span>
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
              Check your inbox.
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Enter the 6-digit code sent to your email.
            </p>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/[0.06] px-4 py-3 text-left">
            <Mail className="mt-0.5 size-4 shrink-0 text-[#cf9eff]" />
            <p className="text-xs leading-relaxed break-all text-white/70">
              {email}
            </p>
          </div>

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

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => setOtpDigit(index, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(index, e)}
                  onPaste={onOtpPaste}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={`Digit ${index + 1}`}
                  className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] text-center text-lg font-medium text-white transition-[border-color,box-shadow] duration-200 focus:border-[#cf9eff]/60 focus:shadow-[0_0_0_1px_rgba(207,158,255,0.28),0_0_20px_rgba(207,158,255,0.42)] focus:outline-none sm:h-12"
                />
              ))}
            </div>

            <Button type="submit" className="w-full py-3.5" disabled={busy}>
              {busy ? "Verifying..." : "Verify"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-3 text-xs text-white/45">
            <button
              type="button"
              onClick={onResend}
              disabled={busy || resending || cooldown > 0}
              className="transition-colors hover:text-star disabled:opacity-50"
            >
              {resending
                ? "Sending new code..."
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Resend code"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
