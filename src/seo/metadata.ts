export interface PageMeta {
  /** Clean, lowercase, hyphenated route path. */
  path: string;
  /** ≤ 60 characters, primary keyword first, brand last. */
  title: string;
  /** ≤ 160 characters, keyword-rich with a call to action. */
  description: string;
  /** `false` renders `noindex, nofollow` (auth-gated / private routes). */
  index: boolean;
}

export const PAGES = {
  home: {
    path: "/",
    title: "ATLAS | AI Learning OS",
    description:
      "ATLAS turns one goal into a step-by-step AI learning plan: roadmaps, quizzes, notes, focus timer and progress tracking. Free while in beta.",
    index: true,
  },
  login: {
    path: "/login",
    title: "Sign in | ATLAS Learning OS",
    description:
      "Create a free ATLAS account or sign in to keep your roadmap, notes, quizzes and focus sessions together in one place.",
    index: true,
  },
  app: {
    path: "/app",
    title: "Dashboard | ATLAS",
    description: "",
    index: false,
  },
  about: {
    path: "/about",
    title: "About | ATLAS Learning OS",
    description:
      "Why ATLAS exists and who built it: an AI-powered learning OS that keeps your plan, notes, practice and progress on one surface.",
    index: true,
  },
  contact: {
    path: "/contact",
    title: "Contact | ATLAS Learning OS",
    description:
      "Get in touch with ATLAS: email, location and a short contact form for questions, feedback and bug reports.",
    index: true,
  },
  blog: {
    path: "/blog",
    title: "Blog | ATLAS Learning OS",
    description:
      "Notes on learning, focus and craft from the ATLAS team. New posts coming soon.",
    index: true,
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy | ATLAS",
    description:
      "How ATLAS collects and protects your data: notes, quiz progress, uploaded PDFs, cookies and your rights.",
    index: true,
  },
  terms: {
    path: "/terms",
    title: "Terms & Conditions | ATLAS",
    description:
      "The terms governing your use of ATLAS: acceptance, personal learning use, intellectual property and liability.",
    index: true,
  },
} satisfies Record<string, PageMeta>;
