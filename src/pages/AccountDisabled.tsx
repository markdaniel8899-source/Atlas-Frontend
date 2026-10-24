import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { EASE } from "../lib/motion";
import LightPillar from "../components/effects/LightPillar";

export default function AccountDisabled() {
  const [notice, setNotice] = useState<{ tone: "error" | "info" | "success"; text: string } | null>(null);

  const contactSupport = () => {
    setNotice({
      tone: "info",
      text: "Opening your email client to contact support@atlas.app...",
    });
    window.location.href = "mailto:support@atlas.app?subject=Account%20Disabled%20-%20Need%20Help&body=Hi%20ATLAS%20Team%2C%0A%0AMy%20account%20has%20been%20disabled.%20Could%20you%20please%20help%20me%20regain%20access%3F%0A%0AThanks.";
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
            <div className="mt-3 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/[0.07]">
                <ShieldAlert className="size-5 text-red-400" />
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                Account disabled
              </h1>
            </div>
            <p className="mt-2 text-sm text-white/45 text-center">
              Your account has been disabled by an administrator. You cannot sign in or access your dashboard until this is resolved.
            </p>
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

          <div className="mt-7 space-y-3">
            <Button
              onClick={contactSupport}
              className="w-full py-3.5"
            >
              <Mail className="size-4 mr-2" />
              Contact support
            </Button>

            <a
              href="/login"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white/45 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to login
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}