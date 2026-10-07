import { useCallback, useRef, useState } from "react";
import { Preloader } from "../components/Preloader";
import { Navbar } from "../components/site/Navbar";
import MoltenMetal from "../components/effects/MoltenMetal";
import Beams from "../components/effects/Beams";
import { Hero } from "../components/landing/Hero";
import { ProblemSection } from "../components/landing/ProblemSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { CoverLayer } from "../components/landing/StickySection";
import { CompleteJourneySection } from "../components/landing/CompleteJourneySection";
import { CtaSection } from "../components/landing/CtaSection";
import { Footer } from "../components/landing/Footer";

export default function LandingPage() {
  const [intro, setIntro] = useState(false);
  const handleReveal = useCallback(() => setIntro(true), []);
  const featuresRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full">
      <Preloader onReveal={handleReveal} />
      <Navbar />

      {/*
        The hero still scrolls away in plain flow. Below it, the Problem and
        Features sections form a Z-axis stacking pair: Problem sticks to the
        top while Features slides up from the bottom and physically covers it
        (curtain scroll). The pair shares a relative wrapper so Problem only
        sticks while Features is passing over it.
      */}
      <Hero intro={intro} />

      <div className="relative">
        {/* ─────────────── 2ND · STUCK LAYER (gets covered) ───────────────
            Sticky only from lg up: on phones/tablets the section scrolls in
            normal flow so it can finish before the next one arrives. */}
        <section
          id="problem"
          className="relative z-[1] flex min-h-screen w-full flex-col justify-center overflow-hidden bg-[#030308] pb-14 pt-16 sm:pb-40 sm:pt-20 lg:pb-24 lg:pt-16 lg:sticky lg:top-0"
        >
          {/* Clearance for the hero widget that straddles the boundary above. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <MoltenMetal
              color1="#160C46"
              color2="#4044CC"
              color3="#CF9EFF"
              speed={0.22}
              scale={3.6}
              detail={3}
              glow={1.5}
              coreSize={0.1}
              swirl={1}
              fold={-0.2}
              blackPoint={0.07}
              brightness={1.15}
              colorMode="molten"
              grain
              grainIntensity={0.05}
              mouseInteraction={false}
              opacity={0.7}
            />
          </div>
          {/* Depth cue: scales down + dims + blurs as the next layer covers it. */}
          <CoverLayer targetRef={featuresRef}>
            <ProblemSection />
          </CoverLayer>
        </section>

        {/* ─────────────── 3RD · INCOMING LAYER (slides over) ─────────────── */}
        <div
          id="features"
          ref={featuresRef}
          className="relative w-full overflow-hidden shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.75)] lg:z-10"
          style={{ background: "rgba(4,4,10,0.97)" }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <Beams
              beamWidth={3}
              beamHeight={30}
              beamNumber={20}
              lightColor="#CF9EFF"
              speed={2}
              noiseIntensity={1.75}
              scale={0.2}
              rotation={30}
              beamColor="#000000"
              backgroundColor="#04040a"
            />
          </div>
          <FeaturesSection />
        </div>
      </div>

      {/* ─────────────── 4TH · THE COMPLETE JOURNEY (merged cinematic path) ─────────────── */}
      <CompleteJourneySection />

      <section className="w-full overflow-hidden">
        <CtaSection />
      </section>

      <Footer />
    </div>
  );
}
