import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "../landing/Footer";

export function SecondaryPage({
  children,
  wide = false,
  glow,
}: {
  children: ReactNode;
  wide?: boolean;
  glow?: "contact";
}) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#030305] text-left">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_15%_10%,rgba(207,158,255,0.14),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_88%_40%,rgba(64,68,204,0.16),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(85%_55%_at_50%_110%,rgba(122,92,255,0.13),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_40%_at_50%_-10%,rgba(207,158,255,0.10),transparent_70%)]" />
        {glow === "contact" && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_35%_35%,rgba(207,158,255,0.15),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_85%_80%,rgba(64,68,204,0.18),transparent_70%)]" />
          </>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,3,5,0)_0%,rgba(3,3,5,0.30)_72%,#030305_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <Navbar />
        <main
          className={`mx-auto w-full flex-1 px-6 pt-32 pb-24 sm:px-10 sm:pt-36 ${
            wide ? "max-w-5xl" : "max-w-3xl"
          }`}
        >
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export const PAGE_H1 =
  "text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl";

export const PAGE_LEAD = "mt-6 text-lg leading-relaxed text-white/60";

export const PAGE_H2 =
  "mt-12 text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl";

export const PAGE_H3 =
  "mt-8 text-base font-semibold tracking-[0.01em] text-white/85";

export const PAGE_P = "mt-4 text-base leading-[1.85] text-white/60";

export const PAGE_DATE =
  "mt-4 text-sm uppercase tracking-[0.18em] text-white/40";

export const PAGE_LIST =
  "mt-5 list-disc space-y-2.5 pl-6 text-base leading-[1.85] text-white/60 marker:text-[#cf9eff]/60";

export const FIELD_LABEL =
  "text-xs font-medium tracking-[0.1em] text-white/45 uppercase";

/** Theme CTA button (gradient + white text + lilac glow), shared by site pages. */
export const PAGE_BUTTON =
  "rounded-full bg-linear-to-r from-[#7c5cff] to-[#5b47d4] text-white uppercase shadow-[0_0_34px_-8px_rgba(207,158,255,0.6)] transition-all hover:from-[#8f77ff] hover:to-[#6a55e0] hover:shadow-[0_0_44px_-6px_rgba(207,158,255,0.85)]";

export const FIELD_INPUT =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-[border-color,background-color] placeholder:text-white/30 focus:border-[#cf9eff]/60 focus:bg-white/[0.05]";
