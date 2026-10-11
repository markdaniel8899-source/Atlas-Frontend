# ATLAS Learning OS - Final Audit Report

> Read-only audit of `src/` (React 19 + Vite + Tailwind v4), `backend/` (FastAPI), `supabase/migrations/` (14 SQL files), `index.html`, and build/SEO config. No code was modified. All line references were verified by reading the files.

---

## 🚨 Critical Issues (Must Fix)

- [ ] **File:** `src/pages/dashboard/SettingsPage.tsx:35,80-103` | **Issue:** Infinite fetch/re-render loop. `const user = getUser()` (`src/lib/auth.ts:22-32`) does `JSON.parse(localStorage)` and returns a **new object identity on every render**, so the effect dependency `[user]` changes every render; the effect then calls `setProfile(loaded)` with a fresh object (never `Object.is`-equal) → re-render → new `user` → effect re-runs → `fetchProfile` again. The Settings page loops network requests and re-renders for as long as it is mounted. | **Fix:** Depend on the primitive id instead: `const userId = getUser()?.id` and use `useEffect(..., [userId])` — the pattern already used in `src/layouts/DashboardLayout.tsx:302`.

- [ ] **File:** `src/pages/dashboard/DashboardHome.tsx:21,27-40` | **Issue:** Same fresh-object `[user]` dependency. Every re-render (each `useDashboard` refresh) tears down and re-schedules the idle callback, firing `runAchievementChecks()` (a multi-RPC network sweep) once per render. | **Fix:** `useEffect` keyed on `user?.id`; cancel the idle callback with `cancelIdleCallback` on cleanup.

- [ ] **File:** `backend/app/roadmap_graph.py:405-414` | **Issue:** Infinite loop inside an `async` endpoint that hangs the whole server. `key` is truncated to 70 chars (line 406), then on collision `candidate = f"{key}-{suffix}"[:70]` (line 413). When `len(key) >= 69` the suffix is truncated away, so `candidate` stops changing and `while candidate in seen` (line 411) spins forever — pure CPU, no timeout can interrupt it. Triggered by any duplicate roadmap node title normalizing to a ≥69-char key. (The frontend equivalent slices at 80 and terminates: `src/lib/roadmapGraph.ts:397`.) | **Fix:** Untruncate the candidate (e.g. `key[:60] + "-" + str(suffix)`) or bound the loop with a max-attempts fallback.

- [ ] **File:** `supabase/migrations/0001_core_schema.sql:164-167` + `supabase/migrations/0014_admin.sql:18-19` | **Issue:** Privilege escalation — any authenticated user can set `profiles.role = 'admin'` from the client. `profiles_update_own` restricts only the row id, not columns; `role text not null default 'user'` was added with **no CHECK constraint**; the shield trigger `protect_gamification_columns()` (`0011_gamification.sql:100-118`) pins `xp, streak, level, weekly_xp, weekly_xp_week_start` but **not `role`**. A tampered client can `PATCH /rest/v1/profiles?id=eq.<me> {"role":"admin"}`, then call `admin_list_users()` (all user emails, `0014:72-99`) and `admin_delete_user()` (`0014:106-124`). The "DB is the authority" claim (`0014_admin.sql:9-10`, `src/lib/admin.ts:4-11`) does not hold. | **Fix:** Freeze `role` (and `total_focus_seconds`) in a `BEFORE UPDATE` trigger unless `current_user in ('postgres','service_role')`, mirroring `protect_gamification_columns()`; add `check (role in ('user','admin'))`; audit existing rows for self-promoted admins.

- [ ] **File:** `backend/app/main.py:176-210` | **Issue:** `POST /api/blog/generate` is **unauthenticated** and writes/publishes directly to the public `blog_posts` table using the **service-role** client (`backend/app/services/auto_blog.py:874-900`), bypassing RLS. Anyone who finds the URL can force AI-generated content onto the site (spam/defacement), and a TOCTOU race lets two simultaneous POSTs both return `202 {"status":"success"}` (`main.py:193-197`). There is also **no frontend caller** for this route. | **Fix:** Require a shared secret / admin JWT; check-and-set the run lock atomically; add a job-status endpoint instead of fire-and-forget.

- [ ] **File:** `backend/app/routers/chat.py:11`, `quizzes.py:52,59,183`, `roadmaps.py:76,114` | **Issue:** All AI endpoints (`/api/chat`, `/api/quizzes/generate`, `/api/quizzes/evaluate`, `/api/roadmaps/*`) are **anonymous with no rate limiting**. The `Authorization` header sent by the frontend (`src/lib/ai.ts:204,333`) is only used to scope a course fetch (`quizzes.py:56,144`). Anyone with the URL can drain the Groq/Gemini quota. | **Fix:** Verify the Supabase JWT on every request (`get_user`), reject anonymous calls, add per-IP/user rate limits.

- [ ] **File:** `supabase/migrations/0011_gamification.sql:36-93,297-346` | **Issue:** `record_activity(p_xp)` and `record_quiz_session(p_correct, p_total, p_xp)` trust client-supplied XP/scores (only `greatest(...,0)` clamping at line 51). Any user can `rpc("record_activity", {p_xp: 999999})` or insert fabricated `quiz_sessions` rows (`quiz_sessions_insert_own`, `0011:200-203`) to mint achievements via `check_user_achievements`. The leaderboard (`src/lib/db/leaderboard.ts:63-68`) is fully client-cheatable. Client call sites: `src/lib/db/sessions.ts:36-38`, `src/lib/db/roadmaps.ts:473-478`, `src/lib/db/quizSessions.ts:42-45`. | **Fix:** Derive XP server-side (compute from minutes/score inside the function, drop the `p_xp` argument) or route scoring through the authenticated FastAPI backend with the service role.

- [ ] **File:** `supabase/migrations/` (missing migration) | **Issue:** The `site_traffic` table named in the audit scope **does not exist anywhere in the 14 migrations** and has zero references in `src/` or `backend/` (only a comment at `backend/app/config.py:61`). If it exists on the live project it was hand-created in the SQL editor — tables created outside migrations default to **RLS disabled**, so anon/authenticated could have full read/write, and it is completely unaudited. | **Fix:** Verify live (`select relname, relrowsecurity from pg_class where relname='site_traffic'`), enable RLS + policies, and codify it in a `0015` migration.

- [ ] **File:** `src/context/TimerContext.tsx:149-154,174-183` | **Issue:** Unhandled promise rejections on the core timer actions: `void flushFocus(current).then(...)` and `void commitFocus(current).then(...)` have no `.catch`. Both call network writes (`src/lib/db/focus.ts:37-40`) that can reject — the rejection is unhandled **and** the follow-up `reloadBases`/`notifyFocusChanged`/`showFlash` never run, silently losing focus data with no user feedback. | **Fix:** Add `.catch(...)` that toasts "Couldn't save focus time" and still calls `reloadBases`/`notifyFocusChanged`.

- [ ] **File:** `src/hooks/useCourses.ts:23-32`, `src/hooks/useDashboard.ts:38-52`, `src/pages/dashboard/RoadmapPage.tsx:269-287`, `src/pages/dashboard/SquadPage.tsx:242-257` | **Issue:** Race conditions — all four fetch-then-`setState` paths have **no cancellation/`alive` flag**, so overlapping calls (e.g. `CoursesPage.tsx:321-322` triggers two `reload()`s back-to-back; mount load + `PROFILE_CHANGED_EVENT` refresh in SquadPage) let a stale response win last-write-wins and display outdated data. | **Fix:** Add a `cancelled` flag (pattern already used correctly in `src/pages/dashboard/NotesPage.tsx:218-242`) or `AbortController`.

- [ ] **File:** `src/pages/dashboard/SquadPage.tsx:273-284` | **Issue:** `respond()` awaits `acceptInvite`/`declineInvite` with no try/catch/finally. A rejection skips `setBusyId(null)` (accept/decline button stuck busy forever) and the `void respond(...)` caller (`:470,471,500`) produces an unhandled rejection. | **Fix:** Wrap in `try { ... } finally { setBusyId(null); }` and surface the error in the existing error banner (`:394-405`).

- [ ] **File:** `src/lib/ai.ts:4-6` | **Issue:** AI backend base URL falls back to `http://localhost:8000` when `VITE_API_URL`/`VITE_AI_API_URL` is unset, and root `.env` contains **only** the two Supabase vars. If the Vercel project has no `VITE_AI_API_URL` configured, every AI feature (chat, quizzes, roadmaps) fails in production. | **Fix:** Set `VITE_AI_API_URL` in the deployment environment; fail fast with a visible "AI offline" banner instead of silently calling localhost.

- [ ] **File:** `backend/app/routers/gamification.py:53,66,89,118-120` | **Issue:** Synchronous Supabase calls (`client.auth.get_user`, `.rpc(...).execute()`, `.table(...).update(...).execute()`) run directly inside `async def` endpoints, blocking the event loop for the duration of each HTTP call — and a brand-new Supabase client (new connection pool) is built per request (`:28-40`). Under load this stalls every other request. | **Fix:** Use `supabase-py`'s async client or wrap in `asyncio.to_thread`; hoist one shared client; set timeouts.

- [ ] **File:** `backend/app/course_context.py:184-185` → `backend/app/quiz_service.py:296-298` | **Issue:** `fetch_course_bundle` swallows **every** exception (returns `None`), which the caller turns into HTTP 404 `"Course not found"`. A Supabase outage, RLS denial, invalid JWT, or network error is reported to the user as a nonexistent course. | **Fix:** Distinguish "no rows" from "query failed" and map failures to a 502/503 with a real message.

---

## ⚠️ UI/UX & Broken States

- [ ] **Component:** `CoursesPage` (`src/pages/dashboard/CoursesPage.tsx:436,523-572`) | **Issue:** Missing loading state. `const empty = !loading && courses.length === 0` forces `empty=false` while loading, so the branch renders the card grid (line 561) mapped over an empty array → **blank area** under the header; the "Loading your courses… / Reading from Supabase." copy (lines 539-544) sits inside the `empty` branch and is therefore unreachable dead code. | **Fix:** Branch `loading ? <SkeletonGrid/> : empty ? <EmptyCard/> : <Grid/>` and delete the unreachable strings.

- [ ] **Component:** `SettingsPage` (`src/pages/dashboard/SettingsPage.tsx:80-103,305-335`) | **Issue:** No skeleton while `fetchProfile` runs — Display name / Username inputs render as empty fields with placeholders; only the avatar and Save buttons are disabled, so the form looks broken/filled-in-by-user. | **Fix:** Render pulsing skeleton bars for the two fields while `loading` (style exists in `PlayerStats.tsx:48-59`).

- [ ] **Component:** `TimerPage` (`src/pages/dashboard/TimerPage.tsx:43,106-115`) | **Issue:** Destructures `useCourses()` without `loading`; while courses load the select only shows "No course", indistinguishable from an account with no courses. | **Fix:** Pass `loading` through and show a disabled "Loading courses…" option in `SelectMenu`.

- [ ] **Component:** `ActivityHeatmap` (`src/components/dashboard/ActivityHeatmap.tsx:121,140-144`, mounted by `DashboardHome.tsx:68`) | **Issue:** No `loading` prop — during load it receives `days=[]` and renders the full "Last 53 weeks" card with "0 active days / 0 hours focused", flashing wrong data before real data arrives. Zero-data state also gives no guidance. | **Fix:** Accept a `loading` flag → pulsing grid placeholder; when `activeDays === 0` show "No focus sessions yet — start the timer" hint.

- [ ] **Component:** `CalendarPage` (`src/pages/dashboard/CalendarPage.tsx:36,60-76,111-187`) | **Issue:** Missing empty state — an account with no sessions renders 53 weeks of empty tiles plus "0h / 0 days / 0 active days" with no friendly message. | **Fix:** When `stats.activeDays === 0`, show an empty-state card above the heatmap.

- [ ] **Component:** `useCourses` consumers (`src/hooks/useCourses.ts:27` → `CoursesPage:523`, `QuizSetup`, `TimerPage`) | **Issue:** Error state masquerades as empty state — `catch { setCourses([]) }` turns any network failure into "No courses yet / Create your first course". | **Fix:** Expose `error` from the hook and render an error card with retry.

- [ ] **Component:** `useDashboard` (`src/hooks/useDashboard.ts:46`) | **Issue:** `.catch(() => setData(EMPTY))` zeroes profile/heatmap/focus on failure; DashboardHome then shows 0-value stats and "No course queued yet" with no error. | **Fix:** Expose `error`; show a retry banner on `/app`.

- [ ] **Component:** `RoadmapPage` (`src/pages/dashboard/RoadmapPage.tsx:252,546-613`) | **Issue:** `.catch(() => undefined)` on `fetchLatestRoadmap` — a failed load drops the user into the "No roadmap yet" **builder view** instead of the unused `error` state (line 196). | **Fix:** `.catch(() => setError("Couldn't load your roadmap…"))` and surface it in the empty branch.

- [ ] **Component:** `NotesPage` (`src/pages/dashboard/NotesPage.tsx:235,425-431`) | **Issue:** `.catch(() => undefined)` on `fetchNotes` — failure renders "No notes yet. Write the first one." | **Fix:** Set an `error` state; show retry message in the list pane.

- [ ] **Component:** `SquadPage` (`src/pages/dashboard/SquadPage.tsx:245,427-437`) | **Issue:** `catch { setMembers([]) }` — failure shows "No friends yet / 0 friends" instead of the error banner that already exists at lines 394-405. | **Fix:** `setError("Couldn't load your squad.")` into the existing banner.

- [ ] **Component:** `LeaderboardPage` (`src/pages/dashboard/LeaderboardPage.tsx:230,289-299`) | **Issue:** `.catch(() => setEntries([]))` — failure shows "Nobody on the board yet". | **Fix:** Add an `error` state and reuse the empty-state slot for error + retry.

- [ ] **Component:** `RankProgressionModal` (`src/components/gamification/RankProgressionModal.tsx:110,128`) | **Issue:** `grid grid-cols-4` badges inside a `max-w-md` modal at 375px → ~72px cells holding a 44px badge + label; tight, near-overflow. | **Fix:** `grid-cols-3 sm:grid-cols-4`.

- [ ] **Component:** `CalendarPage` (`src/pages/dashboard/CalendarPage.tsx:91`) | **Issue:** `grid grid-cols-3 gap-4` stat tiles with no responsive breakpoint — at 375px each tile is ~106px wide with `p-4`, so labels like "Longest streak" wrap awkwardly under `text-xl` values. | **Fix:** `grid-cols-1 min-[400px]:grid-cols-3` (or `gap-2 p-3` on base).

---

## 🧹 Code Cleanup & Security

### Debug output left in production

- [ ] **File:** `src/pages/admin/AdminLogin.tsx:101-102` | **Issue:** `console.log("Admin Login - User Role:", profile?.role)` with a literal `// 3. Debug: inspect the role in the browser console` comment. | **Fix:** Remove both comment and statement.
- [ ] **File:** `src/lib/db/roadmaps.ts:443` | **Issue:** `console.warn("roadmap connections not saved:", …)` fires in production on write failure. | **Fix:** Remove or route through a silent error-channel/telemetry hook.
- [ ] **File:** `src/components/effects/Ferrofluid.tsx:372` | **Issue:** `console.error(e)` in the WebGL failure path. | **Fix:** Remove; rely on the `WebGLErrorBoundary`/fallback UI.
- [ ] **File:** `src/lib/webglDebug.ts:12,14,20,22` | **Issue:** `console.log`/`console.error` diagnostics intentionally kept in production (white-screen bug only reproduces on deployed devices). | **Fix:** Low priority — gate behind `import.meta.env.DEV` or a `?debug` query flag once the issue is resolved.
- [ ] **File:** `backend/app/ai_service.py:258,274-310` | **Issue:** Prints the first 500 chars of **every raw AI response** (`RAW AI RESPONSE FOR PARSING:`) plus full responses on parse failure — verbose, leaks user content into logs. | **Fix:** Use `logging` with levels; log only on failure and truncate.
- [ ] **File:** `backend/app/ai_service.py:45-48` | **Issue:** Prints the first 5 chars of every configured API key + provider base URL at import time. | **Fix:** Remove; log only provider names.
- [ ] **File:** `backend/app/**` (whole tree) | **Issue:** No `logging` module anywhere — ~40 `print()` calls (`auto_blog.py` has ~40, `main.py:71-74,109-115`, `quiz_service.py:682`, `roadmap_graph.py:161-164`) with stdout reconfigured at `main.py:23-28`. Failed pipeline steps return `None` with only a `print` (`auto_blog.py:1011,1033,1055,1080,1116`), so a dead run is invisible to the client that already got `202`. | **Fix:** Adopt `logging` with proper levels; persist blog-run status and expose a status endpoint.

### Dead code

- [ ] **Files (never imported anywhere):** `src/components/landing/LearningPathSection.tsx`, `src/components/landing/SmartAiToolsSection.tsx`, `src/components/landing/SquadSection.tsx`, `src/components/landing/SectionErrorBoundary.tsx`, `src/components/gamification/RankBadge3D.tsx`, `src/components/gamification/RankBadgeVector.tsx`, `src/components/profile/AchievementsPanel.tsx` | **Issue:** Seven complete components have zero imports — dead bundle weight. | **Fix:** Delete, or wire into the landing page if still intended.
- [ ] **File:** `src/lib/db/leaderboard.ts:91` (`fetchMyWeeklyRank`), `src/lib/timer.ts:112` (`invalidateTimer`), `src/lib/db/sessions.ts:12,14` (`XP_PER_MINUTE`, `sessionXp`), `src/components/site/SecondaryPage.tsx:67,74` (`FIELD_LABEL`, `FIELD_INPUT`) | **Issue:** Unused exports. | **Fix:** Remove.
- [ ] **File:** 18+ files (`DitherVeil.tsx`, `LaserFlow.tsx`, `LightPillar.tsx`, `MoltenMetal.tsx`, `InfiniteSpiral.tsx`, `PatternWaves.tsx`, `ShinyText.tsx`, `TextType.tsx`, `TimerContext.tsx`, `useCourses.ts`, `useDashboard.ts`, `gamification.ts`, `db/courses.ts`, `NotesPage.tsx`, `db/profile.ts`, `db/quizSessions.ts`, `db/roadmaps.ts`, `db/sessions.ts`) | **Issue:** Props types / state types exported but never imported elsewhere (over-exported). | **Fix:** Cosmetic — drop `export` keywords.
- [ ] **File:** `int.md` (root) | **Issue:** Empty 0-byte stray file. | **Fix:** Delete.

### Hardcoded URLs / config

- [ ] **File:** `src/lib/ai.ts:4-6` | **Issue:** `http://localhost:8000` production fallback (see Critical Issues). | **Fix:** Require `VITE_AI_API_URL`.
- [ ] **File:** `backend/app/main.py:33` | **Issue:** Production frontend origin `https://atlas-frontend-pearl.vercel.app` hardcoded inside `REQUIRED_ORIGINS`. | **Fix:** Move to env/config only.
- [ ] **File:** `src/seo/config.json:3` + `index.html:20,30,46,56` | **Issue:** `https://atlas.example.com` placeholder is baked into canonical/OG/JSON-LD/sitemap/`llms.txt`, and `.env` does **not** define `VITE_SITE_URL`, so a default build ships wrong URLs. | **Fix:** Set `VITE_SITE_URL` in every environment (see SEO section).
- [ ] **File:** `src/components/effects/DitherVeil.tsx:59` | **Issue:** External Unsplash image URL baked into source. | **Fix:** Move to an asset or env-configured constant.
- [ ] **File:** `backend/.env:1-19` | **Issue:** Live secrets in plaintext on disk: `GEMINI_API_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY`, `GOOGLE_API_KEY`, `NVIDIA_API_KEY`, `PIXABAY_API_KEY`, Supabase anon **and `SUPABASE_SERVICE_ROLE_KEY`**. Currently safe from git (`backend/` is untracked, `.env` ignored by both `.gitignore`s) but one `git add -f` or a repo-wide backup leak exposes the RLS-bypassing key. | **Fix:** Rotate keys, move to a secret store / deployment env vars, keep `.env` out of the repo directory.
- [ ] **File:** `src/seo/metadata.ts:4,8` | **Issue:** Corrupted comment encoding (`�% 60 characters`). | **Fix:** Fix file encoding to UTF-8.

### Security (frontend + Supabase)

- [ ] **File:** `supabase/migrations/0003_squad.sql:5-63` | **Issue:** `invite_friend` (SECURITY DEFINER) is an **email-enumeration oracle**: distinct messages for "No ATLAS account uses that email yet" (lines 30-33) vs "Invite sent." (line 61). Any signed-in user can enumerate registered emails via `src/lib/db/squad.ts:180-204`. | **Fix:** Always return a uniform "If that email exists, an invite was sent."
- [ ] **File:** `supabase/migrations/0001_core_schema.sql:265-268` | **Issue:** `friendships_update_parties` lets either party rewrite `requester_id`/`addressee_id`/`status` as long as they remain one endpoint — including self-accepting a request or re-pointing it at a third user. Frontend only sends `{status:'accepted'}` (`src/lib/db/squad.ts:169-174`), so this is tamper-only. | **Fix:** Constrain `WITH CHECK` to `status` transitions only (`new.requester_id = old.requester_id and new.addressee_id = old.addressee_id`).
- [ ] **File:** `supabase/migrations/0001_core_schema.sql:190-192,207-209,224-226` + `0007_notes_course_id.sql:5-6` | **Issue:** Child-table INSERT policies check only `user_id = auth.uid()`, not that `course_id`/`topic_id` belongs to the caller — users can write rows pointing at another user's course/topic ids (integrity pollution; reads stay user-scoped so no disclosure). | **Fix:** Add parent-ownership `WITH CHECK` subqueries (pattern already used correctly in `roadmap_nodes` policies, `0004:94-134`).
- [ ] **File:** `supabase/migrations/0001_core_schema.sql:156-158` + `0014_admin.sql:18` | **Issue:** `profiles_select_authenticated … using (true)` is intentional for the leaderboard, but after 0014 it exposes `role` (revealing who is admin) to every authenticated user. No PII columns, anon has no SELECT. | **Fix:** Acceptable, or drop `role` from the default select path via a restricted view/column-level grant.
- [ ] **File:** `backend/app/prompts.py:121,146-151,247-254` + `quiz_service.py:472,491-495` | **Issue:** Prompt-injection surfaces — `user_name`, `goal`, `topic` (injected into the *system* prompt via `str.replace`), `question`, notes text, PDF text and full chat history are interpolated with no neutralization. | **Fix:** Delimit untrusted content, keep instructions in a separate system message, sanitize/escape substituted values.
- [ ] **File:** `backend/app/config.py:48-54` + `main.py:131-139` | **Issue:** `ALLOWED_ORIGINS` is passed through unvalidated into CORS with `allow_credentials=True`; setting it to `*` makes Starlette reflect any origin with credentials. | **Fix:** Hard-reject `*` when credentials are enabled; validate origin format at startup.
- [ ] **File:** `backend/app/routers/quizzes.py:81-91` | **Issue:** The PDF upload is read fully into RAM (`await file.read()`) **before** the 10 MB check — a multi-GB body is buffered first (memory-DoS). | **Fix:** Enforce the size limit while streaming (or check `Content-Length` first) before buffering.
- [ ] **File:** `backend/app/ai_service.py:194,312` → `main.py:150-153`, `auto_blog.py:296-299,361-363` → `main.py:159-162` | **Issue:** Raw provider/model error text (including response bodies) is returned to API clients. | **Fix:** Return generic messages; log details server-side.
- [ ] **File:** `backend/app/ai_service.py:113-122`, `auto_blog.py:873-882,1135-1138` | **Issue:** `lru_cache`d `AsyncOpenAI`/Supabase clients are never closed and the cached Supabase client is shared between the scheduler thread's `asyncio.run` loop and the request loop — contradicting the module's own "never shared across loops" rule (`auto_blog.py:48-51`). | **Fix:** Add a lifespan shutdown hook; create the client per loop or use a thread-safe pool.
- [ ] **File:** `backend/app/config.py:68` + `ai_service.py:121` vs `src/lib/ai.ts:10,14` | **Issue:** Timeout mismatch — server allows 180 s × 3 retries while the client aborts at 90 s (120 s PDF): the client shows a timeout while the server keeps burning tokens for minutes. | **Fix:** Align budgets (client ≥ server) and cancel upstream requests when the client disconnects.
- [ ] **File:** `src/lib/quiz.ts:80-82` + `src/lib/ai.ts:299-301` | **Issue:** Frontend sends `context` and `subject` in the quiz payload; the backend accepts them (`schemas.py:126,131`) but never reads them (`quiz_service.py:6-7,286-288`) — dead contract fields. | **Fix:** Remove from one side.
- [ ] **File:** `backend/app/prompts.py:128` | **Issue:** `*history[-12:]` silently drops the frontend's first message (learner-context system block) whenever history is full (`src/lib/assistant.ts:81,85` sends 13 entries), losing name/level/course/focus context mid-conversation. | **Fix:** Slice to `history[1:13]` (preserve the system entry) or account for it explicitly.
- [ ] **File:** `backend/app/main.py:176` (no frontend caller) | **Issue:** Orphan public endpoint — `/api/blog/generate` is reachable but unused by `src/`. | **Fix:** Remove or protect (see Critical Issues).
- [ ] **File:** `src/pages/dashboard/RoadmapPage.tsx:450` | **Issue:** `window.setTimeout(() => setConfetti(0), 2400)` never cleared — setState after unmount if the user navigates within 2.4 s. | **Fix:** Store the id and clear it in the effect cleanup.
- [ ] **File:** `src/components/TextType.tsx:101-111` | **Issue:** Infinite (`repeat: -1`) gsap cursor-blink tween created in an effect with no cleanup — tween keeps running after unmount (leak). | **Fix:** `return () => { tween.kill(); }`.
- [ ] **File:** `src/pages/admin/AdminLayout.tsx:65-67` | **Issue:** Active-link effect depends on global `window.location.pathname` instead of react-router `useLocation()` — client-side navigations can leave stale active state. | **Fix:** Use `useLocation().pathname` as the dependency.
- [ ] **File:** `src/components/ProtectedRoute.tsx:21`, `src/pages/Auth.tsx:43`, `src/components/admin/AdminRoute.tsx:35-47`, `src/layouts/DashboardLayout.tsx:310`, `src/pages/dashboard/QuizPage.tsx:161`, `src/pages/dashboard/NotesPage.tsx:271,293` | **Issue:** Fire-and-forget promises without `.catch` (`resolveSession().then(...)`, `void isAdmin().then(...)`, `void goNext()`, `void flush()`) — rejections surface as unhandled promise rejections; in NotesPage a failed flush loop can drop unsaved edits silently. | **Fix:** Append `.catch(...)` with user-visible feedback on the paths that matter (Notes flush, Quiz save).

### IDOR review

- [ ] **File:** `src/lib/db/profile.ts:8-17` | **Issue:** `fetchProfile(anyUserId)` returns any user's row — but this is **by policy design** (`profiles_select_authenticated using (true)`, no PII columns), not a bug. All other user-scoped tables (`courses`, `notes`, `roadmaps`, `roadmap_nodes`, `learning_sessions`, `quiz_sessions`, `user_achievements`, `friendships`) verified as correctly scoped via `(select auth.uid())` — **no cross-user read/update IDOR found**. The real escalation path is the `role` column write (Critical Issues) and the `invite_friend` oracle above. | **Fix:** Covered by the role-freeze and enumeration fixes.

---

## SEO & Performance

- [ ] **Issue:** Sitemap is missing almost every public page — `src/seo/config.json` declares only `/` and `/login`, so `/about`, `/contact`, `/blog`, `/privacy`, `/terms` and **every blog post** are absent from `sitemap.xml` (generated in `vite.config.ts:38-56`). | **Fix:** Add all public routes from `src/seo/metadata.ts` to `config.json` and inject published post slugs at build/runtime.
- [ ] **Issue:** No `og:image` / Twitter card image anywhere — `index.html` has no `og:image` tag and `src/seo/Seo.tsx` (which otherwise manages title/description/canonical/robots/OG/Twitter correctly) never sets one, so social shares render text-only (`twitter:card=summary`, not `summary_large_image`). | **Fix:** Add an `og:image` asset and upsert it in `Seo.tsx`.
- [ ] **Issue:** Canonical/OG/JSON-LD/`llms.txt`/sitemap all point to the placeholder `https://atlas.example.com` (`index.html:20,30,46,56`, `src/seo/config.json:3`, `public/llms.txt`) because `VITE_SITE_URL` is not set in `.env` — while `backend/app/main.py:33` reveals the real origin is `atlas-frontend-pearl.vercel.app`. Every indexed URL would carry the wrong canonical. | **Fix:** Set `VITE_SITE_URL` in `.env` and in the Vercel project env; keep index.html's static tags in sync.
- [ ] **Issue:** `robots.txt` allows `/wp-admin/` (only `/app/` and `/api/` are disallowed, `vite.config.ts:30-31`) — the admin panel relies solely on the runtime `noindex` meta (`src/seo/Seo.tsx:52`). | **Fix:** Add `Disallow: /wp-admin/` to the generated robots.txt.
- [ ] **Issue:** Render-blocking third-party stylesheet — `index.html:11-14` loads Google Fonts (Outfit) as a blocking `<link rel="stylesheet">`, and `src/main.tsx:3` additionally loads a second full font family (@fontsource-variable/syne). Two variable families on first paint. | **Fix:** Self-host Outfit (like Syne), or load it with `media="print" onload="this.media='all'"`/`preload` + `font-display: swap`.
- [ ] **Issue:** `src/assets/dither-problem.jpg` is a **357 KB unoptimized JPEG** bundled into the landing chunk (`src/components/landing/ProblemSection.tsx:10`) — the largest image by far on the landing page. | **Fix:** Convert to WebP/AVIF at ≤80 KB with `loading="lazy"`/`srcset`.
- [ ] **Issue:** KaTeX ships heavy font fallbacks — `dist/assets/` contains ~250 KB of TTFs (`KaTeX_Main-Regular.ttf` 53 KB, `KaTeX_AMS-Regular.ttf` 63 KB, …) alongside WOFF2, loaded when the quiz/results code renders math. | **Fix:** Ensure the WOFF2-only `katex.min.css` is used; drop TTF sources.
- [ ] **Issue:** `Suspense fallback={null}` in `src/App.tsx:116` — a route chunk that fails to warm shows a blank frame (mitigated by `DoubleCurtain`, but a network error has no visible recovery). | **Fix:** Add a minimal fallback/spinner behind the curtain.
- [ ] **Issue (minor):** Single 173 KB CSS file (`dist/assets/index-*.css`) is render-blocking and not split per route. | **Fix:** Acceptable at current size; revisit if it grows past ~200 KB.

---

## ✅ Passed Checks

**Security / Database**
- RLS is enabled on **all 15 tables created by the migrations** (`profiles`, `courses`, `course_topics`, `learning_sessions`, `notes`, `quizzes`, `quiz_attempts`, `friendships`, `roadmaps`, `roadmap_nodes`, `roadmap_connections`, `blog_posts`, `achievements`, `user_achievements`, `quiz_sessions`) — verified line-by-line (`0001:147-154`, `0004:73-75`, `0009:41`, `0011:151-152,193`). Only `site_traffic` is unaccounted for (flagged above).
- Every RLS policy uses the optimized `(select auth.uid())` form — no broken/missing auth comparisons found.
- `blog_posts` RLS model is correct: anon+authenticated can SELECT only published-and-past posts (`0009:43-46`); drafts require `is_admin()` (`0014:53-56`); writes are service-role only; deletes admin-gated.
- `roadmap_nodes`/`roadmap_connections` policies correctly scope through the parent roadmap's ownership (`0004:94-161`) — the right pattern the child-table policies should copy.
- All SECURITY DEFINER functions pin `set search_path` (`handle_new_user`, `record_activity`, `invite_friend`, `check_user_achievements`, `record_quiz_session`, `is_admin`, `admin_list_users`, `admin_delete_user`).
- Admin RPCs validate in-database via `is_admin()` (`0014:97,113-115`) and block self-delete (`0014:117-119`); emails are exposed only through `admin_list_users()`, never stored on `profiles`.
- `check_user_achievements`'s service-role fallback relies on the signed `auth.role()` claim — not client-spoofable.
- Function grants are properly revoked from `public, anon` and granted to `authenticated, service_role` (`0002:141-144`, `0003:65-66`, `0011:728-745`); no `GRANT` on tables bypasses RLS.
- No SSRF surface in the backend (no client-supplied URLs are fetched); DiceBear avatar URLs are regex allow-listed (`gamification.py:125-136`).
- **No secrets in tracked source:** `.env` is gitignored and untracked (`git ls-files` shows zero `.env`/backend files), `backend/` is entirely untracked, and grep found no `sk-`/`gsk_`/`eyJhbGci`/`nvapi-`/`tvly-` literals in any `.py`/`.ts`/`.tsx` file. The frontend `VITE_SUPABASE_ANON_KEY` is public-by-design and guarded by RLS; `supabase.ts:10-11` placeholder fallbacks are inert.
- CORS uses an explicit origin list with credentials, not a wildcard (`main.py:30-34`).

**Code quality / robustness**
- Route-level code splitting with lazy imports, idle-time prefetch of every chunk (`App.tsx:288-309`) and careful vendor `manualChunks` (supabase/katex/ogl/three/gsap/motion/react split — `vite.config.ts:102-123`), so the landing page never pays for the dashboard's vendor chain.
- The only `setInterval` in the app (`TimerContext.tsx:120-121`) is correctly cleared; no `while (true)`/`for(;;)` loops exist in `src/`.
- All WebGL effect components (`Ferrofluid`, `SideRays`, `DitherVeil`, `LightPillar`, `Beams`, `MoltenMetal`, `LaserFlow`) plus `InfiniteSpiral`, `PatternWaves`, `RoadmapMap`, `Micro3DScene`, `RankProgressionModal`, `CourseEditorModal` correctly cancel animation frames/observers/tweens on unmount.
- `DashboardLayout.tsx:281-316`, `NotesPage.tsx:218-242` and `TimerContext` flash-timer cleanup (`:130-135`) show correct cancellation discipline — good patterns to copy into the flagged hooks.
- Backend timeouts are correctly set on the OpenAI client (`ai_service.py:120`), course-fetch httpx (`course_context.py:22,92`), Pixabay and outbound POSTs; long sync work is wrapped in `asyncio.to_thread` throughout the blog pipeline; all pipeline sleeps use `asyncio.sleep`.
- `main.tsx:13-15` force-redirects HTTP→HTTPS before React mounts (local hosts exempt).
- `.gitignore` covers `.env*`, `venv/`, `__pycache__/`, `dist/`, `.tsbuildinfo`.

**UI/UX**
- Loading spinners verified: `RoadmapPage:537-543`, `QuizPage:240-257,398-402`, `SquadPage:422-426`, `LeaderboardPage:284-288`, `NotesPage:421-424,523-525`, `SettingsPage:421-425`, blog skeletons (`BlogPage:63-68`, `BlogPostPage:60-72`), admin `SkeletonRows` (`Users:76`, `Posts:69`, `Overview:46-52`), `AdminLogin:118`, `Auth:276-284`, and `animate-pulse` skeletons in `PlayerStats:48-59` / `TodayFocus:24-33`.
- Empty states verified: `TodayFocus:36-67`, `RoadmapPage:546-613`, `CoursesPage:523-559`, `NotesPage:425-439,520-535`, `TimerPage:254-258`, `SquadPage:427-437,459-462,488-491`, `LeaderboardPage:289-299`, `ChatThread:45-88` (with suggestion chips), `SettingsPage:426-429`, `BlogPage:69-84`, `BlogPostPage:113-133`, admin `Users:78-80`/`Posts:71-73`.
- Error states with retry verified: `QuizPage:189-210`, `AiAssistantPage:124-138`, `SettingsPage:343-354`, `BlogPage:70-76` ("Offline" state), `BlogPostPage:113-133` (404), and all three admin pages use a proper status machine with `ErrorState onRetry` (`Users:31-34`, `Posts:25-28`, `Overview:25-28`).
- Mobile layout guards verified: `index.css:317,378` (`overflow-x: clip` on body/#root), no `min-width` rules, mobile typography block (`index.css:423-447`), admin tables use `hidden md:table` desktop tables with dedicated mobile card lists (`Users:85,163`, `Posts:78,140`), heatmap has `overflow-x-auto` (`CalendarPage:117`), roadmap map has `overflow-auto` + scale transform (`RoadmapMap:177-206`), code blocks scroll (`CodeBlock:31`); all `whitespace-nowrap` hits are intentional/contained.

**SEO**
- `src/seo/Seo.tsx` correctly manages per-route `title`, `description`, self-referencing canonical, `robots` (`noindex,nofollow` for `/app` and `/wp-admin`), OG and Twitter tags — no helmet dependency.
- `index.html` ships a solid baseline: title, meta description, OG/Twitter set, theme-color, favicon, plus JSON-LD `WebSite` + `SoftwareApplication` structured data.
- Build-time `robots.txt` + `sitemap.xml` plugin (`vite.config.ts:18-87`) generated from one route list; `public/llms.txt` for AI engines; per-post SEO is applied after the row loads (`App.tsx:169-171`).
- Auth-gated routes are correctly excluded from indexing (`App.tsx:198-199,231-235`).
- SPA rewrites configured correctly in `vercel.json` (filesystem files like `robots.txt`/`sitemap.xml` still win over the rewrite).

---

*Audit performed read-only; only this file was created. Priority order: the 12 Critical items → UI loading/empty states → cleanup/security → SEO.*
