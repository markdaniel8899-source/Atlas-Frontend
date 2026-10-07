import { Quote, Rocket } from "lucide-react";
import {
  SecondaryPage,
  PAGE_BUTTON,
} from "../../components/site/SecondaryPage";
import { CurtainLink } from "../../components/PageCurtain";
import { Reveal } from "../../components/site/Reveal";

const PERKS = [
  {
    title: "AI Roadmaps",
    body: "Give ATLAS one goal and it builds a roadmap of levels and topics. Every topic is a small step you can finish in one sitting.",
  },
  {
    title: "Courses and Notes",
    body: "Notes live inside the courses and topics they belong to, so your study material never floats away from its subject.",
  },
  {
    title: "Smart Quizzes",
    body: "Pick a topic or upload a syllabus PDF, choose 5, 10 or 15 questions and a difficulty, and ATLAS writes the quiz for you.",
  },
  {
    title: "Focus Timer",
    body: "Start a session, stay on one task and let the timer log every hour you put in. Sessions earn XP on your roadmap.",
  },
  {
    title: "Progress Tracking",
    body: "XP, streaks, quiz results and timer hours all feed one profile, so you always know what you covered and what is next.",
  },
  {
    title: "Squads and Friends",
    body: "Invite friends, compare streaks and keep each other accountable. Learning is easier when someone is climbing with you.",
  },
];

const REASONS = [
  "One tab instead of ten. Your plan, notes, quizzes and timer live on the same surface, so you start learning instead of organising tools.",
  "Built for recall, not cramming. Quizzes reach you while the material is still fresh, and visible progress keeps you coming back.",
  "Free while in beta. No credit card and no trial countdown. Open ATLAS, set a goal and start the climb today.",
];

export default function AboutPage() {
  return (
    <SecondaryPage wide>
      <Reveal className="pt-6 font-outfit">
        <p className="text-xs font-semibold tracking-[0.42em] text-white/55 uppercase sm:text-sm">
          Learning OS
        </p>
        <h1 className="mt-5 text-[clamp(2.75rem,9vw,6rem)] leading-[0.92] font-extrabold tracking-[-0.02em] text-white uppercase">
          About <span className="font-light text-white/75">ATLAS</span>
        </h1>
        <CurtainLink
          to="/login"
          className={`${PAGE_BUTTON} mt-8 inline-flex items-center gap-2 px-7 py-3.5 text-xs font-bold tracking-[0.2em]`}
        >
          <Rocket className="size-4" />
          Start free
        </CurtainLink>
      </Reveal>

      <section className="mt-28 grid items-start gap-12 font-outfit lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.32em] text-[#cf9eff] uppercase">
            About Atlas
          </p>
          <h2 className="mt-5 text-5xl leading-[1.05] sm:text-6xl">
            <span className="block font-light text-white/85">All the</span>
            <span className="block font-extrabold text-white">Perks</span>
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/55">
            Everything you need to plan, practice and progress, kept on one
            surface so nothing gets lost between apps.
          </p>
        </Reveal>

        <Reveal className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_70px_-25px_rgba(207,158,255,0.55)] sm:p-8">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <div key={perk.title}>
                <h3 className="text-lg font-bold text-white">{perk.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-white/50">
                  {perk.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mt-32 text-center font-outfit">
        <Reveal>
          <h2 className="text-xl font-bold tracking-[0.3em] text-[#cf9eff] uppercase sm:text-2xl">
            Our Story
          </h2>
        </Reveal>
        <Reveal className="mx-auto mt-8 max-w-3xl space-y-6 text-base leading-[1.9] text-white/55">
          <p>
            ATLAS started with a simple frustration. Learning had become a
            browser problem. The plan lived in one app, notes in another,
            flashcards somewhere else and videos in a fourth. Every session
            began with ten minutes of switching tabs and ended with no clear
            idea of what actually got done.
          </p>
          <p>
            So we built one surface. Give ATLAS a goal and it turns that goal
            into a roadmap of levels and topics. Notes stay attached to the
            courses they belong to. Quizzes test you while the material is
            still fresh, and a focus timer turns every session into hours, XP
            and streaks you can see.
          </p>
          <p>
            ATLAS is built by HM. Zain, an IT student in Lahore, as the tool
            he wanted for himself: simple, fast and honest about progress. It
            is free while in beta, and it stays built for one thing, helping
            you climb.
          </p>
        </Reveal>
      </section>

      <section className="mt-32 text-center font-outfit">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.42em] text-[#cf9eff] uppercase">
            Happy Learners
          </p>
          <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
            <span className="font-light text-white/85">Why </span>
            <span className="font-extrabold text-white">Choose ATLAS</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 text-left md:grid-cols-3">
          {REASONS.map((reason) => (
            <article
              key={reason}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 shadow-[0_0_50px_-18px_rgba(207,158,255,0.45)] transition-shadow duration-500 hover:border-white/20 hover:shadow-[0_0_60px_-14px_rgba(207,158,255,0.65)] sm:p-8"
            >
              <Quote className="size-7 text-white/25" />
              <p className="mt-5 text-base leading-relaxed text-white/60">
                {reason}
              </p>
            </article>
          ))}
        </div>
      </section>

      <Reveal className="mt-24 flex justify-center">
        <CurtainLink
          to="/login"
          className={`${PAGE_BUTTON} inline-flex items-center px-8 py-4 text-xs font-bold tracking-[0.22em]`}
        >
          Open ATLAS and start climbing
        </CurtainLink>
      </Reveal>
    </SecondaryPage>
  );
}
