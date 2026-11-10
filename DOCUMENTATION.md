# 📘 ATLAS Learning OS — Complete Documentation (A to Z)

> **Version:** 1.0.0  
> **Status:** Production  
> **License:** MIT  
> **Frontend:** https://github.com/markdaniel8899-source/Atlas-Frontend  
> **Backend:** https://github.com/markdaniel8899-source/Atlas-Backend  

---

## 1. Project Overview

ATLAS Learning OS is an AI-powered, gamified learning platform built for students, educators, and self-learners. It combines adaptive quiz generation, course management, note-taking, focus timers, gamification (XP/streaks/badges/ranks), and an admin command center into a single unified operating system for learning.

### 1.1 Core Philosophy

| Principle | Description |
|-----------|-------------|
| **Subject Isolation** | Custom topics never see course data; quizzes stay inside their own subject boundary. Zero context leakage. |
| **Zero RAM SEO Gate** | Auto-blog only publishes articles scoring 80+ on a lightweight SEO checker. No external services, no RAM bills. |
| **Client-First Performance** | Auto DPR clamping, LRU caching (5-min TTL), lightweight UI fallbacks for low-end devices. |
| **Security by Default** | Supabase Row Level Security (RLS) on every table; users only touch their own rows. |

---

## 2. Tech Stack

### 2.1 Frontend (React + Vite + TypeScript)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.3.0 | UI library |
| Build Tool | Vite | 8.3.2 | Dev server + production build |
| Language | TypeScript | 7.0.2 | Type safety |
| Styling | Tailwind CSS | 4.3.3 | Utility-first CSS |
| Animations | Framer Motion | 13.5.0 | Page transitions, gestures |
| 3D Graphics | React Three Fiber | 9.8.1 | WebGL scenes |
| State | React Router DOM | 7.18.4 | Client-side routing |
| Auth/DB | Supabase JS | 2.117.2 | Auth, database, realtime |
| AI Integration | Groq / Google Gemini | — | Quiz generation, auto-blog |
| Icons | Lucide React | 1.50.0 | Icon library |
| Fonts | Geist (fontsource) | 1.7.2 | Typography |
| Math Rendering | KaTeX | 0.19.0 | LaTeX math in quizzes |
| PDF Handling | jszip | 3.10.2 | ZIP export/import |
| Smooth Scroll | Lenis | 1.3.26 | Smooth scrolling |
| Code Editor | Monaco Editor | 4.7.0 | In-browser code editing |
| Form Validation | Zod | 4.6.5 | Schema validation |
| Sanitization | DOMPurify | 3.4.16 | XSS prevention |

### 2.2 Backend (FastAPI + Python)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | FastAPI | Async web framework |
| Language | Python | 3.11 – 3.12 |
| Package Manager | uv | Fast Python installs |
| ASGI Server | Uvicorn | Production server |
| Database | Supabase (PostgreSQL) | Auth + data storage |
| AI Provider | Groq (Qwen 3.8, GPT-OSS-20B) | Quiz generation |
| AI Fallback | Google Gemini | Auto-blog content |
| Cache | In-memory LRU (5-min TTL) | Repeat request absorption |
| Reverse Proxy | Caddy | TLS termination |
| Container | Docker | Deployment |

### 2.3 Infrastructure

| Service | Provider | Role |
|---------|----------|------|
| Frontend Hosting | Vercel | CDN edge delivery |
| Backend Hosting | Oracle Cloud Free Tier | 1 GB RAM VM |
| Database/Auth | Supabase | PostgreSQL + Auth + RLS |
| Domain/DNS | Custom | atlas.kz.ci |
| SSL/TLS | Caddy | Automatic HTTPS |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐ │
│  │ Landing │  │ Dashboard│  │  Admin  │  │   Auth Pages  │ │
│  └─────────┘  └─────────┘  └─────────┘  └───────────────┘ │
│         │              │              │              │    │
│         └──────────────┴──────────────┴──────────────┘    │
│                         Supabase JS Client                  │
└─────────────────────────────────────────────────────────────┘
                                  │ HTTPS/JWT
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      CADDY REVERSE PROXY                      │
│              (TLS termination → port 8000)                    │
└─────────────────────────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│  │  Routers │  │ Services │  │   AI     │  │  Config   │   │
│  │  (API)   │  │ (Logic)  │  │ Service  │  │  (Env)    │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘   │
└─────────────────────────────────────────────────────────────┘
                                  │ JWT + Service Role
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                      │
│  Auth (JWT)  │  Tables (RLS)  │  Realtime  │  Storage (PDFs) │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Data Flow — Quiz Generation

1. Client sends `POST /api/quizzes/generate` with topic/course_id/PDF.
2. Backend validates JWT (401 if anonymous).
3. `build_plan()` determines domain, language, mode, coding language.
4. `build_system_prompt()` + `build_user_message()` assemble LLM prompts.
5. LLM (Groq Qwen 3.8) generates JSON quiz (max 3 attempts with retry nudges).
6. `sanitize_llm_json()` cleans the raw reply; `validate_quiz()` enforces rules.
7. Client receives `QuizGenerateResponse` with questions array.

### 3.2 Data Flow — Authentication

1. User signs up → Supabase `signUp()` → OTP sent via `sendEmailOtp()`.
2. User verifies OTP → `verifyEmailOtp()` → `is_verified = true` in profiles.
3. User logs in → `signIn()` → checks email existence → password login → RLS check.
4. Session cached in localStorage; restored on load via `resolveSession()`.

---

## 4. Directory Structure

### 4.1 Frontend (`Atlas-Frontend`)

```
Atlas-Frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config (v4, CSS-first)
├── vercel.json
├── .env.local
├── package.json
├── README.md
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── landing/          # Hero, Features, CTA, Footer, Problem, ScrollReveal
│   │   ├── dashboard/        # ActivityHeatmap, FocusTimerWidget, PlayerStats, TodayFocus
│   │   ├── quiz/             # QuizSetup, QuestionInput, QuizResults, CodeBlock, RichText
│   │   ├── notes/            # BulkShareModal, ShareNoteModal, InlineCodeBlock, InlineTableBlock
│   │   ├── courses/          # CourseEditorModal
│   │   ├── gamification/     # RankBadge, RankProgressionModal
│   │   ├── admin/            # AdminRoute
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── roadmap/
│   │   ├── site/
│   │   ├── ui/               # Base UI primitives
│   │   ├── effects/          # Preloader, PageCurtain, DoubleCurtain, InfiniteSpiral, PatternWaves
│   │   ├── SessionCompleteCard.tsx
│   │   ├── CustomCursor.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ...
│   ├── context/
│   │   └── TimerContext.tsx
│   ├── hooks/
│   │   ├── useCourses.ts
│   │   ├── useDashboard.ts
│   │   ├── useLenis.ts
│   │   ├── useLiveNotifications.ts
│   │   └── useMobileKeyboard.ts
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client singleton
│   │   ├── auth.ts           # Sign up, OTP, sign in, sign out, password reset
│   │   ├── cache.ts          # LRU cache (5-min TTL)
│   │   ├── ai.ts             # AI client wrappers
│   │   ├── quiz.ts           # Quiz API calls
│   │   ├── notes.ts          # Notes CRUD
│   │   ├── gamification.ts   # XP, streaks, ranks
│   │   ├── subjects.ts       # Subject isolation logic
│   │   ├── courses.ts        # Course API
│   │   ├── roadmap.ts        # Roadmap data
│   │   ├── blog.ts / blogAdmin.ts
│   │   ├── admin.ts          # Admin APIs
│   │   ├── notifications.ts
│   │   ├── focus.ts / timer.ts / timerSync.ts
│   │   ├── dicebear.ts       # Avatar generation
│   │   ├── mobile.ts         # Mobile keyboard handling
│   │   ├── monacoAssembly.ts / monacoSetup.ts
│   │   ├── repaint.ts
│   │   ├── scroll.ts
│   │   ├── toast.ts
│   │   └── webglDebug.ts
│   ├── lib/db/
│   │   ├── types.ts          # Shared TypeScript interfaces
│   │   ├── achievements.ts
│   │   ├── activity.ts
│   │   ├── courses.ts
│   │   ├── events.ts
│   │   ├── focus.ts
│   │   ├── leaderboard.ts
│   │   ├── notes.ts
│   │   ├── notifications.ts
│   │   ├── profile.ts
│   │   ├── quizSessions.ts
│   │   ├── roadmaps.ts
│   │   ├── sessions.ts
│   │   ├── shares.ts
│   │   └── squad.ts
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── Auth.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── VerifyOtp.tsx
│   │   ├── UpdatePassword.tsx
│   │   ├── AccountDisabled.tsx
│   │   ├── admin/
│   │   ├── dashboard/
│   │   └── site/
│   ├── assets/
│   ├── layouts/
│   └── seo/
```

### 4.2 Backend (`Atlas-Backend`)

```
Atlas-Backend/
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
├── QUIZ_AI.md
├── fix_pure_text.py
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI app entry, CORS, routers
│   ├── config.py             # Environment variable loading
│   ├── deps.py               # JWT auth dependency
│   ├── schemas.py            # Pydantic request/response models
│   ├── ai_service.py         # LLM routing, fallback chain
│   ├── cache.py              # In-memory LRU cache
│   ├── prompts.py            # System/user prompt templates
│   ├── quiz_service.py       # Quiz generation business logic
│   ├── quiz_service.py       # build_plan, build_system_prompt, validate_quiz
│   ├── course_context.py     # Course bundle fetching
│   ├── supabase_client.py    # Supabase service client
│   ├── roadmap_graph.py      # Roadmap topic graph
│   ├── scheduler.py          # Background jobs
│   ├── routers/
│   │   ├── quizzes.py        # /api/quizzes/* endpoints
│   │   └── ...               # notes, auth, blog, admin routes
│   ├── services/
│   │   └── ...               # Business logic services
│   ├── data/
│   │   └── ...               # Static data, seed files
│   ├── plugins/
│   │   └── ...               # FastAPI plugins
│   ├── scripts/
│   │   └── ...               # Setup/migration scripts
│   └── tests/
│       └── ...               # Pytest test suite
```

---

## 5. Environment Variables

### 5.1 Frontend (`.env.local`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
VITE_AI_API_URL=http://localhost:8000
```

### 5.2 Backend (`backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-google-key
ADMIN_SECRET=your-admin-secret
```

> Optional keys (blog models, Tavily, Pixabay, timeouts) are defined in `backend/app/config.py`.

---

## 6. Local Setup

### 6.1 Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18+ |
| npm | 10+ |
| Python | 3.11 – 3.12 |
| uv | Latest |
| Git | Latest |

### 6.2 Clone Repositories

```bash
git clone https://github.com/markdaniel8899-source/Atlas-Frontend.git
git clone https://github.com/markdaniel8899-source/Atlas-Backend.git
```

### 6.3 Frontend Setup

```bash
cd Atlas-Frontend
npm install
```

Create `.env.local` (see Section 5.1), then:

```bash
npm run dev        # http://localhost:5173
npm run build      # TypeScript check + production build
npm run preview    # Preview production build
npm run typecheck  # TypeScript type check only
```

### 6.4 Backend Setup

```bash
cd Atlas-Backend
pip install -r requirements.txt
```

Create `backend/.env` (see Section 5.2), then:

```bash
uvicorn app.main:app --reload --port 8000
```

For production on a server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6.5 Docker Deployment (Backend)

```bash
cp .env.example .env
# Edit .env with your keys
docker compose up -d
```

Maps ports: `3000 (frontend) / 5001 (backend)`.

---

## 7. Authentication System

### 7.1 Auth Flow

```
┌──────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User   │────▶│  Sign Up (OTP)   │────▶│  Email Verify   │
└──────────┘     └──────────────────┘     └─────────────────┘
       │                                       │
       ▼                                       ▼
┌──────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Login   │────▶│  Password Check  │────▶│  RLS Verified   │
└──────────┘     └──────────────────┘     └─────────────────┘
```

### 7.2 Key Auth Functions (`src/lib/auth.ts`)

| Function | Purpose |
|----------|---------|
| `signUp(name, email, password)` | Creates account, sends OTP, signs out local session |
| `sendEmailOtp(email)` | Sends 6-digit OTP without creating account |
| `verifyEmailOtp(email, token)` | Verifies OTP, sets `is_verified = true` |
| `signIn(email, password)` | Password login; requires verified email |
| `signOut(scope)` | Clears session (global or local) |
| `updatePassword(newPassword)` | Password reset |
| `resolveSession()` | Restores persisted session on app load |
| `emailExists(email)` | Checks if email is registered (via RPC) |

### 7.3 Security Rules

- **Email confirmation OFF** in Supabase Dashboard; OTP delivery is custom.
- **Magic Link email template** must render `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.
- `profiles` table has no email column; existence check uses `SECURITY DEFINER` RPC `email_exists`.
- Unverified users cannot access protected routes; they are redirected to OTP verification.

---

## 8. Quiz System

### 8.1 Quiz Modes

| Mode | Source Material | Description |
|------|----------------|-------------|
| `topic_only` | General knowledge | Typed topic only; no course data |
| `course` | Course notes + completed roadmap topics | Based on enrolled course |
| `course_focus` | Course notes + focus request | Focus wins over course subjects |
| `pdf` | Uploaded PDF text | PDF content capped at 8,000 chars |

### 8.2 Subject Domains

`math`, `english`, `science`, `humanities`, `programming`, `other`

### 8.3 Question Types

- **MCQ** — 4 options, 1 correct answer (local evaluation, no AI call)
- **Code** — Write code solution (AI evaluation)
- **Debug** — Find and fix buggy line (AI evaluation)
- **Output** — Predict code output (AI evaluation)

### 8.4 Quiz Generation Constraints

| Constraint | Value |
|------------|-------|
| Max questions per quiz | 20 |
| Max retry attempts | 3 |
| MCQ evaluation | Local (no LLM) |
| Code/Debug/Output evaluation | AI (Groq Qwen 3.8) |
| PDF text cap | 8,000 chars (route cap 30,000) |
| Notes cap | 8 notes / 6,000 chars |
| Temperature (quiz gen) | 0.3 |
| Temperature (domain classify) | 0.0 |

### 8.5 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/quizzes/generate` | POST | Required | Generate quiz from topic/course/PDF |
| `/api/quizzes/generate-pdf` | POST | Required | Generate quiz from uploaded PDF |
| `/api/quizzes/evaluate` | POST | Required | Evaluate quiz answers (MCQ local, code via AI) |

### 8.6 Subject Isolation (Critical)

- Custom topics get **zero** course data.
- Course quizzes only fetch notes scoped to `course_id`.
- Client-supplied `context` / `subject` fields never reach the AI model.
- Each course fetch uses the caller's JWT (RLS applies).

---

## 9. Gamification System

### 9.1 XP & Streaks

- **XP** awarded for: completing quizzes, writing notes, daily focus sessions, streak maintenance.
- **Streaks** tracked for consecutive days of activity.
- **Badges** unlocked at XP milestones and streak thresholds.

### 9.2 Ranks

Progressive rank system displayed via `RankBadge` and `RankProgressionModal`.

### 9.3 Leaderboard

Global and course-specific leaderboards stored in `lib/db/leaderboard.ts`.

### 9.4 Achievements

Stored in `lib/db/achievements.ts`; triggered by quiz completion, note creation, focus streaks.

---

## 10. Notes System

### 10.1 Features

- Rich text editor (Monaco Editor integration for code blocks).
- Inline code blocks, tables, and formatted text.
- Bulk share and individual note sharing.
- Course association for notes.
- Bulk download as ZIP.

### 10.2 Key Files

| File | Purpose |
|------|---------|
| `src/components/notes/` | Note UI components |
| `src/lib/notes.ts` | Notes API layer |
| `src/lib/db/notes.ts` | Database types and queries |
| `src/lib/db/shares.ts` | Note sharing logic |

---

## 11. Courses System

### 11.1 Course Structure

- Course title, description, domain, roadmap topics.
- Completed roadmap topics tracked per user.
- Notes scoped to course_id.
- Quiz generation scoped to course material.

### 11.2 Key Files

| File | Purpose |
|------|---------|
| `src/components/courses/CourseEditorModal.tsx` | Course creation/editing UI |
| `src/lib/courses.ts` | Course API calls |
| `src/lib/db/courses.ts` | Course database types |
| `src/lib/db/roadmaps.ts` | Roadmap topic graph |
| `src/lib/db/sessions.ts` | Focus session tracking |

---

## 12. Admin System

### 12.1 Admin Features

- Real-time analytics dashboard.
- API usage tracking.
- Full user and message management.
- Blog post moderation (SEO gate: 80+ score required).

### 12.2 Key Files

| File | Purpose |
|------|---------|
| `src/components/admin/AdminRoute.tsx` | Route protection for admin |
| `src/pages/admin/` | Admin pages |
| `src/lib/admin.ts` | Admin API calls |
| `src/lib/blogAdmin.ts` | Blog administration |

---

## 13. Focus Timer System

### 13.1 Features

- Pomodoro-style focus timer.
- Session tracking stored in Supabase.
- Sync across devices via `timerSync.ts`.
- Context provider via `TimerContext.tsx`.

### 13.2 Key Files

| File | Purpose |
|------|---------|
| `src/components/dashboard/FocusTimerWidget.tsx` | Timer UI |
| `src/lib/focus.ts` | Focus logic |
| `src/lib/timer.ts` / `timerSync.ts` | Timer state + sync |
| `src/context/TimerContext.tsx` | React context |
| `src/lib/db/sessions.ts` | Session DB types |

---

## 14. Dashboard

### 14.1 Widgets

| Widget | Purpose |
|--------|---------|
| `TodayFocus.tsx` | Today's focus goal |
| `PlayerStats.tsx` | XP, level, rank, streak |
| `ActivityHeatmap.tsx` | GitHub-style activity graph |
| `FocusTimerWidget.tsx` | Active focus timer |

### 14.2 Key Files

- `src/components/dashboard/`
- `src/lib/dashboard.ts`
- `src/hooks/useDashboard.ts`

---

## 15. Landing Page

### 15.1 Sections

| Section | Component | Purpose |
|---------|-----------|---------|
| Hero | `Hero.tsx` | App download CTA, animated intro |
| Problem | `ProblemSection.tsx` | Pain points ATLAS solves |
| Features | `FeaturesSection.tsx` | Feature grid |
| CTA | `CtaSection.tsx` | Final call to action |
| Footer | `Footer.tsx` | Links, copyright |
| ScrollReveal | `ScrollReveal.tsx` | Scroll-based animations |

### 15.2 Hero Download Link

Current APK link: `https://github.com/markdaniel8899-source/Atlas-app/releases/download/v1.0.0/ATLAS.apk`

---

## 16. Effects & Animations

| Component | Purpose |
|-----------|---------|
| `Preloader.tsx` | App preloader |
| `PageCurtain.tsx` | Page transition curtain |
| `DoubleCurtain.tsx` | Double curtain effect |
| `InfiniteSpiral.tsx` | Infinite spiral background |
| `PatternWaves.tsx` | Animated wave pattern |
| `CustomCursor.tsx` | Custom mouse cursor |
| `SessionCompleteCard.tsx` | Session completion notification |
| `RevealText.tsx` | Text reveal animation |
| `ScrollWords.tsx` | Scrolling text effect |
| `ScrollProgressIndicator.tsx` | Reading progress bar |
| `ShinyText.tsx` | Shiny text effect |
| `TextType.tsx` | Typewriter effect |
| `Micro3DScene.tsx` | Micro 3D scene |

---

## 17. Security & Privacy

### 17.1 Row Level Security (RLS)

Every Supabase table has RLS policies ensuring users can only access their own data. No cross-user data leakage is possible.

### 17.2 AI Prompt Security

- System prompt opens with **CRITICAL RULES**: context isolation, subject boundaries, question types, programming languages.
- Client `context` and `subject` never reach the LLM.
- Each course fetch is scoped to `course_id` with caller's JWT.
- PDFs live in request memory only; never persisted.

### 17.3 XSS Prevention

- DOMPurify sanitizes all user-generated HTML.
- KaTeX math rendering is sandboxed.
- No `dangerouslySetInnerHTML` without sanitization.

---

## 18. Deployment

### 18.1 Frontend (Vercel)

```bash
# Connect GitHub repo to Vercel
# Set environment variables in Vercel dashboard
# Deploy on push to main
```

Live: https://atlas-frontend-pearl.vercel.app

### 18.2 Backend (Oracle Cloud + Caddy)

- VM: Oracle Cloud Free Tier (1 GB RAM)
- Reverse proxy: Caddy (automatic HTTPS)
- App: Uvicorn bound to `0.0.0.0:8000`

Live: https://api.atlas.kz.ci

### 18.3 Docker

```bash
docker compose up -d
```

---

## 19. Future Roadmap

| Feature | Status |
|---------|--------|
| Cross-platform Mobile App (React Native + Expo) | Planned |
| Real-time Push Notifications | Planned |
| Multi-language UI support | Planned |
| AI Study Assistant (chat with notes) | Planned |
| Spaced Repetition System | Planned |

---

## 20. Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/name`).
3. Commit changes (`git commit -m "feat: description"`).
4. Push to branch (`git push origin feature/name`).
5. Open a Pull Request.

---

## 21. License

MIT License. See LICENSE file for details.

---

## 22. Support

- **Frontend Repo:** https://github.com/markdaniel8899-source/Atlas-Frontend
- **Backend Repo:** https://github.com/markdaniel8899-source/Atlas-Backend
- **Live Demo:** https://atlas-frontend-pearl.vercel.app
- **API:** https://api.atlas.kz.ci

---
