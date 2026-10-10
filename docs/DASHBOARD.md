# ATLAS - Dashboard: Capabilities, Data & API Behavior

Living reference for what the app does **right now**, how data flows through it,
and how the AI API behaves. Update this file whenever a feature ships.

Last updated: 2026-10-04

---

## 1. Status Snapshot

| Area | Status |
| --- | --- |
| Landing Page | Shipped and **locked** - do not modify |
| Auth (signup / login / logout) | Shipped, backed by Supabase |
| Supabase schema + RLS | Shipped, migrations `0001`–`0004` **applied** |
| App shell (sidebar / topbar / routing) | Shipped |
| Dashboard Home (stats + focus + heatmap) | Shipped |
| Timer → DB logging | Shipped |
| Courses → Supabase | Shipped - full CRUD + auto progress |
| Notes → Supabase | Shipped - CRUD + debounced write-back |
| Squad → Supabase | Shipped - friendships + invites + status |
| FastAPI AI service | Shipped - 5 endpoints, model routing |
| Roadmap (AI generate + node map) | Shipped - AI generated, persisted, node map live |
| AI Quiz Engine (4 types) | Shipped - `/app/quiz` in the sidebar, AI graded |
| AI Assistant (chat) | Shipped - `/app/assistant`, context-aware chat |
| Settings | Shipped - profile edit + avatar upload |
| Calendar | Shipped, but localStorage only and **not in the sidebar** |

---

## 2. What the user can do on the dashboard

### 2.1 Sign in / account (`/login`)
- Create an account with email + password (signup tab), or sign in.
- Session persists across refreshes (stored by supabase-js in `localStorage`).
- Sign out from the topbar avatar area.
- `/`, `/login`, and every `/app/*` route are protected: unauthenticated
  visitors are redirected to `/login` and returned to where they were going.
- `/auth` is a redirect alias to `/login` so landing-page buttons work without
  touching the locked landing components.
- On signup the `on_auth_user_created` trigger creates a `profiles` row
  automatically (username derived from email, uniqueness padded).

### 2.2 App shell
- Fixed sidebar: **Dashboard · Roadmap · Courses · Notes · Quiz · Timer ·
  Squad · Assistant · Settings**. Active item gets a purple glow.
- Mobile: hamburger opens an animated drawer with a scrim; tap to close.
- Topbar: page title left, name/email + avatar + logout right. The avatar is
  the uploaded profile photo when one exists, otherwise the initials
  monogram. It refreshes live via the `atlas:profile-changed` window event
  fired by Settings after a save.
- Deep-black `#04040a` canvas with a purple/blue mesh gradient overlay.
- Page transitions animate on every route change; scroll resets to top.

### 2.3 Dashboard Home (`/app`)
Four cards, top to bottom:

1. **Player stats** - streak with a flame icon, level in a hexagon badge,
   `into / need XP` readout plus "to level N+1", animated XP bar with a purple
   glow, `@username` bottom-right, skeleton while loading.
2. **Focus timer widget** - a compact mirror of `/app/timer`:
   - *Idle* → **Quick start** opens a portalled glass modal (outside the card,
     so `overflow` can never clip it) with **25 / 50 / 90** picks. Choosing one
     starts the shared timer and jumps straight into the session.
   - *Running / paused* → a 128 px SVG progress ring around a mono countdown,
     **Pause/Resume** + **Stop**, and **Open timer** for the full page.
   - Stopping a run of **≥ 60 s** calls `persistStudySession()`, the same
     helper `/app/timer` uses, so XP/streak/heatmap move identically.
   - Reaching the target auto-commits the session once (`completedRef`
     guard) and shows a "Focus session logged · +N XP" toast.
   - State lives in the shared timer store (`src/lib/timer.ts`), so the widget
     and the timer page always agree, including across tabs.
3. **Today's focus** - picks the most relevant course (`in_progress` →
   `paused` → `not_started`), shows the next incomplete topic, paints the
   progress bar in that course's accent color. CTAs: **Start session** →
   `/app/timer`, **Roadmap** → `/app/roadmap`. Empty state offers **Add a
   course** → `/app/courses`.
4. **Activity heatmap** - GitHub-style 53 weeks × 7 days, UTC bucketed to
   match the DB, purple intensity tiers (`<15m` `<30m` `<60m` `≥60m`, top tier
   glows), month labels, Mon/Wed/Fri row labels, hover tooltips. Header shows
   **active days** and **total hours focused**. Degrades to an empty grid if
   the RPC fails - never crashes.

### 2.4 Timer (`/app/timer`)
- Presets **25 / 50 / 90 minutes**, start, pause, reset.
- The running timer survives a page refresh (localStorage).
- When a session of **≥ 1 minute** is committed - automatically when the
  target is reached, or manually via **Reset** - it is written to
  `learning_sessions` and `record_activity(xp)` is called.
- That RPC is what moves the **streak**, **XP** and **level**, and it is what
  lights a heatmap cell. Without it nothing else on the dashboard changes.

### 2.5 Roadmap (`/app/roadmap`)
**Generate.** The form collects a **Goal**, a **Current level**
(beginner / intermediate / advanced) and one optional **Time commitment**
(Casual 2-3h/week · Serious 5-10h/week · Intensive 15+h/week), plus four
one-click templates (Python Programming, Data Science, Web Development,
Machine Learning). There is deliberately **no hours or duration field** - the
AI sizes the timeline itself from goal complexity and commitment. The request
goes `generateRoadmap()` → `POST /api/roadmaps/generate` and comes back as 4–6
phases × 3-4 nodes with prerequisites, hour estimates, resources and
milestones.

**Empty state / errors.** With no roadmap the page shows a compass hero
reading "Your learning journey starts here". If `/health` fails or reports
`ai_configured: false`, a gray-dot chip reads **AI Offline** in the header and
the form raises a styled alert with a **Retry** button instead of bare red
text. The model name is never shown in the UI.

**Map.** Phases become columns; even phases snake downward and odd phases
snake upward, so the bridge between two phases is a short horizontal hop.
Three node states:

| State | Look |
| --- | --- |
| `locked` | dim, dashed border, dotted dim connector in |
| `active` | purple glow ring + glowing border, marching dashed connector out |
| `completed` | teal fill, glowing, solid connector out |

Connectors are béziers drawn between node borders. Dependency edges
(prerequisites that are not the linear next step) render as thin periwinkle
dashes so the main trail stays legible.

**Progress.** A node unlocks only when **every** prerequisite is completed
(`deriveStatuses` runs to a fixed point). Clicking a node opens a drawer with
description, estimated hours, prerequisite status, resources, the phase's
milestones, and a complete / un-complete action.

**Persistence.** `saveRoadmap()` writes `roadmaps` → `roadmap_nodes` →
`roadmap_connections`. Regenerating replaces the previous roadmap. Refresh
reloads the same map from those three tables.

### 2.6 Courses (`/app/courses`)
- **New course** → creates a ring card at 0%, status `not_started`, accent
  auto-assigned round-robin from a 6-color palette, ordered by creation.
- **Add topic** (inline form on the card) → chip appears at 0%.
- Click a topic chip → toggles completed / not completed. That single action
  writes the topic row **and** then recomputes the parent course.
- The ring and the `1/3 topics · 33%` readout update immediately. Completing
  the first topic flips the card to *In progress*; completing all topics
  flips it to *Completed*.
- Empty state when there are no courses.

### 2.7 Notes (`/app/notes`)
- **New note** → a blank row is inserted immediately and selected; you can
  start typing right away.
- **Title** autosaves ~700 ms after you stop typing.
- **Body** autosaves in two hops: the editor debounces 600 ms into a local
  buffer, then the buffer flushes to the network after another 700 ms - so
  worst case ~1.3 s after you stop typing. A "Saved" indicator blips for 1.2 s.
- Patches are buffered **per note id**, so switching notes mid-edit is safe -
  the edit still flushes for the note it belongs to.
- Unmount (delete note, navigate away, close tab) flushes any buffered edits
  first.
- **Delete** drops the buffer entry, removes the note from the list, reselects
  the neighbour, and deletes the row.
- HTML in the body is sanitized on write, not on render.

### 2.8 Squad (`/app/squad`)
- Grid of friends with avatar, streak, level, XP progress bar and a status
  chip (**Active today** / **Active yesterday** / **Offline**). The avatar is
  `profiles.avatar_url` when the friend has uploaded one, otherwise a
  deterministic gradient monogram (hashed from the user id). The "That's you"
  card at the head of the grid uses **your** avatar.
- **Invite by email** → calls the `invite_friend()` RPC; success shows
  `Invite sent to …`, failures show the RPC's own message (unknown email,
  self-invite, already friends).
- Incoming requests render with **Accept** / **Decline** (decline deletes the
  row). Outgoing requests show a **Waiting on** chip.
- Everything refreshes after an accept/decline, but there is **no realtime
  push** - someone else's action appears only after you reload.

### 2.9 Calendar (`/app/calendar`)
Weekly grid derived from **localStorage** sessions only. It does not read the
database, so it disagrees with the Supabase-backed heatmap (see §3.6).
It is **not in the sidebar** - reachable only by typing the URL.

### 2.10 Quiz (`/app/quiz`)
Two-phase page driven by `src/lib/quiz.ts` (logic) + `src/components/quiz/*`
(UI).

**Setup** - **Course** (or *General*), **Topic** (the course's topics, or
*Custom topic* to type your own), **question type** (Mixed · MCQ · Code
generation · Debugging · Output prediction), **difficulty** (Easy / Medium /
Hard), **language** (Python, JavaScript, TypeScript, Java, C++) and **count**
(5 / 10 / 15). The topic must be 2–300 characters. An `AI Offline` chip mirrors
`/health`.

**Generate** - one `generateQuiz()` call per selected kind. `Mixed` fires four
calls in parallel with `Promise.allSettled`, shuffles the results and caps them
at the requested count, so a single failed kind still returns a usable quiz.

**Run** - a progress bar ("Question N of M"), one question at a time with
**Skip** and **Check answer**. Each type renders its own input:
| Type | Input |
| --- | --- |
| MCQ | four custom radio rows (keyboard reachable, purple active ring) |
| Code generation | monospace textarea seeded with `starter_code` |
| Debugging | read-only line-numbered code block + a line number + a fix box |
| Output prediction | read-only code block + a text answer |

**Grade** - MCQs are graded **locally** against `correct_index` (no network,
instant feedback, `explanation` is shown as the reason). Code / debug / output
answers go to `evaluateCode()` → `POST /api/quizzes/evaluate` for model
scoring.

**Results** - score ring, **+N XP** badge (`10 XP` per correct answer, awarded
through `record_activity()`, with an "offline - not saved" note when the RPC
fails), a per-question review list, then **Retake** / **New quiz**.

**Errors** - 0/503 → offline message + Retry, 408 → timeout message. Any
failure drops you back on the setup form with the alert intact.

### 2.11 AI Assistant (`/app/assistant`)
- Dark glass chat panel with a corner `atlas-glow` gradient, suggestion chips
  on first load, Enter to send / Shift+Enter for a newline, an 8000-char
  counter, and a typing indicator while the model streams back.
- `src/lib/assistant.ts` builds a **system turn** from the live dashboard
  state - display name, `Level N · XP · streak`, current course + %, and the
  first six active focus topics - so answers arrive already contextualised.
  The backend keeps its own tutor system prompt and then the last **12** turns,
  which is what `toHistory()` mirrors client-side.
- Failures are classified in one place (offline / timeout / model message) and
  shown in an inline error bar with **Dismiss** and a **Retry** control in the
  composer that re-sends the exact last message without duplicating it in
  history.
- The reply's model id is printed under each assistant bubble in 10 px mono.

### 2.12 Settings (`/app/settings`)
- **Profile card** - avatar preview (`size-20` ring) with a camera button, file
  picker, **Change photo** / **Remove**, plus **Display name** and **Username**
  fields. Username is normalised to lowercase and validated against
  `^[a-z0-9_]{3,24}$`; uniqueness errors come back as "That username is already
  taken."
- **Upload path** - `validateAvatar()` (must be `image/*`, ≤ 2 MB) →
  `uploadAvatar()` puts the file at `<user-id>/avatar-<ts>.<ext>` in the
  Supabase Storage bucket **`avatars`**, returns a cache-busted public URL, and
  the URL is written to `profiles.avatar_url` in the same save as the name.
- **Remove** sets `avatar_url` to `null`; the monogram comes back everywhere.
- A side panel documents the account email/id, level, XP, streak and progress
  bar, and an **Avatar storage** card explains the bucket requirement.
- Saving fires `atlas:profile-changed`, which the topbar and the Squad "you"
  card listen to, so the new photo appears without a reload.

### 2.13 Routes that are still empty
| Route | In sidebar | State |
| --- | --- | --- |
| `/app/friends` | no | Redirects to `/app/squad` |
| `/app/calendar` | no | Works, but localStorage-only (§2.9) |

---

## 3. Data Behavior

### 3.1 Where each kind of data lives

| Data | Store | Key / table | Survives refresh | Owner |
| --- | --- | --- | --- | --- |
| Auth session | `localStorage` (supabase-js) | `sb-<ref>-auth-token` | yes | device |
| Profile (streak, XP, level, name) | Supabase | `profiles` | yes | account |
| Avatar image | Supabase Storage | bucket `avatars` → URL in `profiles.avatar_url` | yes | account |
| Quiz attempts | React state only | not persisted | **no** | - |
| Assistant chat turns | React state only | not persisted | **no** | - |
| Running timer state | `localStorage` | `atlas.timer` | yes | device |
| Committed sessions (local copy) | `localStorage` | `atlas.sessions` | yes | device |
| Committed sessions (source of truth) | Supabase | `learning_sessions` | yes | account |
| Courses + topics | Supabase | `courses`, `course_topics` | yes | account |
| Notes | Supabase | `notes` | yes | account |
| Friendships + peer profiles | Supabase | `friendships`, `profiles` | yes | account |
| Roadmap graph | Supabase | `roadmaps`, `roadmap_nodes`, `roadmap_connections` | yes | account |
| Quiz rows | Supabase | `quizzes`, `quiz_attempts` | yes | account - **tables exist, nothing writes them yet** |
| Calendar grid | `localStorage` | `atlas.sessions` | yes | device |
| AI responses | **nowhere** | state only | **no** | - |
| Backend | stateless | no DB, no cache | - | - |

**Rule of thumb:** the timer's own tick, the notes draft and the calendar are
device-local; everything you would be upset to lose is in Supabase.

### 3.2 Write rules - when does a click reach the database

| Screen | Trigger | What is written | Latency | If it fails |
| --- | --- | --- | --- | --- |
| Timer | session ≥ 60 s, on target reached or **Reset** | `insert learning_sessions` then `rpc record_activity(xp)` | immediate | returns `false`, UI shows nothing logged; local session still saved |
| Courses | create course / add topic | `insert` with next `position` | immediate | returns `null`, list unchanged |
| Courses | toggle topic | `update course_topics` → **then** `recomputeCourseProgress()` reads all topics → `update courses` | 2 round trips | course progress silently stale |
| Notes | body typing | nothing yet - patched into `pendingRef` after a **600 ms** editor debounce | - | - |
| Notes | title typing | nothing yet - buffered immediately into `pendingRef` | - | - |
| Notes | 700 ms idle after a patch, or unmount | `update notes` for every buffered id (patches for the same id are merged, ids flushed sequentially) | debounced | silent; un-flushed ids stay buffered only until the next flush |
| Notes | **New note** | `insert` immediately | immediate | note not added |
| Notes | delete | `delete` immediately | immediate | row stays in list |
| Squad | invite | `rpc invite_friend(p_email)` | immediate | message from RPC shown in the form |
| Squad | accept | `update friendships set status='accepted'` | immediate | silent |
| Squad | decline | `delete friendships` | immediate | silent |
| Roadmap | generate | **no write** - result lives in React state | - | inline error line under the form |
| Roadmap | after a successful generate | `insert roadmaps` → `roadmap_nodes` → `roadmap_connections` (previous roadmap deleted when `replaceId` is set) | 3 round trips | falls back to rendering the in-memory draft; nothing persisted |
| Roadmap | complete / un-complete a node | `update roadmap_nodes status` - **only rows whose status actually changed** | immediate | silent |
| Quiz | finish a run | `rpc record_activity(10 × correct)` only - no quiz rows | immediate | XP badge reads "offline - not saved", quiz still shows |
| Assistant | send a message | **no write** - turns live in React state | - | inline error bar with Dismiss / Retry |
| Settings | **Save changes** (name / username) | `update profiles` returning the new row | immediate | green banner replaced by the error (unique-username handled) |
| Settings | **Save changes** with a staged photo | `storage.from('avatars').upload(...)` → `getPublicUrl` → `update profiles.avatar_url` in the same save | 2 round trips | upload error shown before any DB write; name is not saved either |
| Settings | **Remove** avatar | `update profiles.avatar_url = null` | immediate | error banner |

### 3.3 Read rules

- **One load per mount.** Every screen fetches once in a `useEffect` and sets
  a `loading` flag; there is no polling and no Supabase realtime subscription
  anywhere in the app.
- **Silent degradation.** Fetches are wrapped in `.catch(() => …)` so a failed
  RPC or a missing table yields an empty state rather than an error screen.
  This is deliberate for the heatmap and the roadmap loader.
- **Refresh is the sync mechanism.** Two tabs, or two people, will not see
  each other's changes until one of them reloads or navigates.
- **Optimistic where it matters.** Course topic toggles and roadmap node
  toggles update local state first and write in the background; Notes buffers
  rather than optimistically patching.
- **Ordering.** Courses and topics are ordered by their `position` column
  (computed as `max + 1` before insert). Notes are ordered by `updated_at
  desc`. Squad members are sorted client-side by display name.

### 3.4 Who can see what (RLS)

| Table | Select | Insert / Update / Delete |
| --- | --- | --- |
| `profiles` | **any authenticated user** (`using (true)`) | own row only |
| `courses`, `course_topics` | own rows | own rows |
| `learning_sessions` | own rows | own rows |
| `notes` | own rows | own rows |
| `quizzes`, `quiz_attempts` | own rows | own rows |
| `friendships` | rows where I am requester **or** addressee | same |
| `roadmaps` | `user_id = me` | `user_id = me` |
| `roadmap_nodes`, `roadmap_connections` | via `roadmap_id in (my roadmaps)` | same |

- `profiles` being world-readable-to-authenticated is **intentional**: it is
  how the Squad grid gets display names, XP and `last_active_date` for peers.
  `quizzes` has no update/delete policy - quiz rows are currently
  append-only/immutable.
- The roadmap child tables reach RLS through a subquery on `roadmaps`, which
  is why every FK on them is indexed.

### 3.5 Derived vs stored

| Value | Truth | Notes |
| --- | --- | --- |
| Level | **derived** - `level = 1 + floor(xp / 200)` | The dashboard computes it from XP (`levelProgress`) instead of trusting the stored `level` column, so it is right even if the RPC failed. The Squad grid **does** read the stored column. |
| Streak | stored | Only `record_activity()` writes it, and only across consecutive UTC days. |
| Heatmap | derived | `activity_heatmap(days)` RPC returns per-day `total_seconds` + `session_count`. |
| Course progress % | stored, recomputed by the client | `recomputeCourseProgress()` recounts topics after every toggle. No DB trigger maintains it. |
| Course status | stored, set by the client | `completed` when all topics done, `in_progress` when ≥ 1 done, otherwise left as-is. |
| Roadmap node status | stored **and** derived | The DB column is a cache. On every render `deriveStatuses()` recomputes it from the prerequisite graph, so a node can never stay unlocked by a stale row. |
| Roadmap node x/y | stored, **not used for rendering** | `saveRoadmap()` writes `position_x`/`position_y`, but `RoadmapMap` calls `layoutGraph()` on every load and recomputes the layout deterministically. |
| Squad "online" status | derived | `profiles.last_active_date` compared to today in the browser. Not a real presence channel. |

### 3.6 Known data inconsistencies

1. **Calendar vs heatmap** - Calendar reads `atlas.sessions` (localStorage),
   the heatmap reads `learning_sessions` (DB). A session logged on another
   device shows in the heatmap but not the calendar.
2. **`atlas.sessions` vs `learning_sessions`** - the local array is only a
   convenience copy for the Calendar; the DB is authoritative and nothing
   ever reconciles the two.
3. **Timezone** - heatmap cells and streaks are bucketed on **UTC** dates to
   match `started_at::date`. A session started at 23:30 local can land on the
   next day's cell.
4. **`profile.level`** can drift from `1 + floor(xp/200)` if anything writes
   XP without going through `record_activity()`.
5. **No realtime** - accepted invites, friend sessions and second-tab edits
   all require a manual reload.

---

## 4. API Behavior (FastAPI → NVIDIA)

`ai_service.py` routes by task - there is no single hardcoded model, and no
server-side database or cache.

### 4.1 Model routing

| Task | Primary | Fallback |
| --- | --- | --- |
| `ROADMAP` | `meta/llama-3.1-405b-instruct` | `meta/llama-3.1-70b-instruct` |
| `QUIZ` (generation) | `qwen/qwen-2.5-coder-32b-instruct` | `meta/llama-3.1-70b-instruct` |
| `CODE` (evaluation) | `qwen/qwen-2.5-coder-32b-instruct` | `meta/llama-3.1-70b-instruct` |
| `CHAT` | `meta/llama-3.1-70b-instruct` | `meta/llama-3.1-405b-instruct` |

### 4.2 Endpoints

| Method | Path | Body → Response |
| --- | --- | --- |
| GET | `/health` | - → `{status, ai_configured, routes}` |
| POST | `/api/chat` | `{message, history[]}` → `{reply, model}` |
| POST | `/api/roadmaps/generate` | `{goal, hours_per_week, current_level, topics[], duration_weeks?}` → `{roadmap, model}` |
| POST | `/api/quizzes/generate` | `{topic, kind, count, difficulty, language, context}` → `{questions[], model}` |
| POST | `/api/quizzes/evaluate` | `{kind, question, answer, code, reference_solution, …}` → `{is_correct, score, feedback, model}` |

`routes` in `/health` is a map of task → model actually selected, so it is the
quickest way to confirm routing without making a paid call.

### 4.3 Roadmap payload

Always normalised by `roadmap_graph.normalize_roadmap` before it leaves the
server:

```jsonc
{
  "title": "Calculus from scratch",
  "summary": "5 phases, ~76 hours.",
  "phases": [
    {
      "number": 1,
      "title": "Pre-Calculus",
      "objective": "...", "duration_weeks": 2, "hours": 22,
      "milestones": ["Solves 10 quadratics without hints"],
      "nodes": [
        {
          "key": "alg",                 // stable slug, unique across the roadmap
          "title": "Algebra foundations",
          "description": "...",
          "phase_number": 1,
          "estimated_hours": 8,
          "prerequisites": [],          // node keys, forward-only
          "resources": [{"type": "video", "title": "...", "url": "..."}]
        }
      ]
    }
  ],
  "connections": [{"source": "alg", "target": "fn"}]  // derived server-side
}
```

Normalisation guarantees, regardless of what the model returns:

- renamed keys are accepted (`phases`/`stages`, `nodes`/`topics`,
  `prerequisites`/`prereqs`/`depends_on`, `resources`/`links`) and types are
  coerced;
- prerequisites written as **titles** are resolved onto node keys;
- self-references, unknown keys and forward-only edges are dropped;
- the edge list is derived, phases are renumbered contiguously;
- bare-string resources become `{type, title, url}`.

Because output is 4–6 phases × 3–4 nodes with ≤2 resources per node, the
payload is sized to fit inside `MAX_TOKENS[ROADMAP] = 4096`.

The router retries **once** with a smaller-scope corrective message if the
shape is unusable (`RoadmapShapeError`); a second failure returns 502.

The response is re-keyed to database UUIDs by `saveRoadmap()` on the client -
the server never sees Supabase ids.

### 4.4 Quiz payloads

```jsonc
// mcq
{"kind":"mcq","prompt":"...","options":["a","b","c","d"],"correct_index":1,"explanation":"..."}
// code
{"kind":"code","prompt":"...","starter_code":"...","language":"python","reference_solution":"...","rubric":["..."],"explanation":"..."}
// debug
{"kind":"debug","prompt":"...","code":"...","buggy_line":7,"explanation":"..."}
// output
{"kind":"output","prompt":"...","code":"...","correct_output":"42","explanation":"..."}
```

- `kind` is one of `mcq | code | debug | output`.
- **MCQ grading happens locally** in the router - no API call, instant, free.
  Only `code` / `debug` / `output` submissions reach NVIDIA.

### 4.5 Failure modes

| Situation | HTTP | Body | Where the user sees it |
| --- | --- | --- | --- |
| Key not set - fresh clone, `backend/.env` never created | **503** | `{"detail":"NVIDIA_API_KEY is not configured on the server.","error":"ai_service_error"}` | Roadmap error line under the Generate button |
| Backend not running / wrong port | **0** (fetch rejected) | - | `AiError` with status `0`, generic message |
| NVIDIA call failed after retries | 502 | `{"detail":"AI request failed for task '…'","error":"ai_service_error"}` | Roadmap error line |
| Model returned unparseable JSON | 502 | `{"detail":"The model did not return parseable JSON."}` | Roadmap error line |
| Client-side timeout (90 s `AbortController`) | 408 | - | "The AI service timed out. Try again." |
| Bad request body (pydantic) | 422 | field errors | - (form validates first) |
| CORS blocked | network error | - | status `0` |

All AI errors surface as `{detail, error: "ai_service_error"}` with status
502/503, and `readErrorDetail()` copies `detail` into `AiError.message` so the
UI shows the real server message rather than a generic one.

Timeouts/retries are configured in `backend/.env`:
`AI_TIMEOUT_SECONDS` (default 60), `AI_MAX_RETRIES` (default 1).
CORS origins come from `ALLOWED_ORIGINS` (default `http://localhost:5173`).

### 4.6 Frontend client (`src/lib/ai.ts`)

Base URL from `VITE_AI_API_URL` (defaults to `http://localhost:8000`), 90 s
abort timeout, `AiError` carries the HTTP status.

```ts
getAiHealth(): Promise<AiHealth>
generateRoadmap(goal, hours, level, options?): Promise<RoadmapResult>  // {roadmap, model}
generateQuiz(topic, kind, count, options?): Promise<QuizResult>        // {questions, model}
evaluateCode(kind, question, answer, code?, options?): Promise<Evaluation>
chat(message, history?): Promise<ChatResult>                           // {reply, model}
```

Consumed today by Roadmap (`generateRoadmap` + `getAiHealth`). `generateQuiz`,
`evaluateCode` and `chat` are exported and typed but have no screen yet.

---

## 5. Setup Procedure

### Step 1 - Frontend environment
Project root `.env` (already filled in on this machine):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_AI_API_URL=http://localhost:8000     # optional, this is the default
```

`.env` is gitignored; it holds the real values on each machine.

### Step 2 - Database migrations
Run **in this order** in the Supabase SQL editor:

1. `supabase/migrations/0001_core_schema.sql` (68 statements)
2. `supabase/migrations/0002_triggers_functions.sql` (14 statements)
3. `supabase/migrations/0003_squad.sql` (3 statements - `invite_friend()`)
4. `supabase/migrations/0004_roadmaps.sql` (27 statements - roadmap graph)

If step 1 fails halfway and re-running reports
`42710: type "course_status" already exists`, clear the partial objects first:

```sql
drop table if exists public.quiz_attempts, public.quizzes, public.notes,
  public.learning_sessions, public.course_topics, public.courses,
  public.friendships, public.profiles,
  public.roadmap_connections, public.roadmap_nodes, public.roadmaps cascade;
drop type if exists public.quiz_difficulty, public.quiz_kind,
  public.node_status, public.course_status cascade;
```

**Verify:**

```sql
select tablename from pg_tables where schemaname = 'public';
-- expect 11 rows: profiles, courses, course_topics, learning_sessions,
--                 notes, quizzes, quiz_attempts, friendships,
--                 roadmaps, roadmap_nodes, roadmap_connections

select routine_name from information_schema.routines
 where routine_schema = 'public';
-- expect: set_updated_at, handle_new_user, record_activity,
--         activity_heatmap, invite_friend
-- (roadmaps_set_updated_at is a *trigger*, not a routine)

select username, streak, xp, level from public.profiles;
-- expect your row after signing up
```

### Step 2b - Storage bucket for avatars (one-time, dashboard only)

The avatar upload in **Settings** writes to a public bucket named `avatars`.
Create it once in the Supabase dashboard: **Storage → New bucket →**
name `avatars` → toggle **Public bucket** → **Create bucket**.

No migration covers this - bucket creation needs the service role, which the
browser never has. Without it, Settings still saves the name/username and
shows a card explaining exactly this fix instead of failing silently.

Verify from the Storage tab: the bucket lists `avatars` and reads *Public*.

### Step 3 - Frontend
```bash
npm install
npm run dev          # http://localhost:5173
```
```bash
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + vite build
```

### Step 4 - AI backend (required for Roadmap)

`backend/.env` already exists on this machine and holds the real
`NVIDIA_API_KEY`. On a fresh clone, create it manually first:

```bash
cd backend
#   create backend/.env (ONLY if it does not exist yet); it must contain:
#   NVIDIA_API_KEY=nvapi-...
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then check <http://localhost:8000/health> →
`{"status":"ok","ai_configured":true,"routes":{...}}`.

`ai_configured` must be `true` before Roadmap will generate. If it is
`false`, the variable name is wrong or uvicorn was started before the file
was saved - restart it. The key belongs in `backend/.env` only; never
commit it.

---

## 6. Test Procedure

Do these in order; each step names what you should see.

1. **Open `http://localhost:5173`** → landing page loads, hero works.
2. **Click the CTA** → lands on `/login` (via the `/auth` redirect).
3. **Sign up** with a new email → redirected to `/app`.
4. **SQL editor** → `select username, streak, xp, level from public.profiles;`
   → your row exists with `level = 1`, `xp = 0`.
5. **Dashboard Home** → `0` day streak, level `1`, `0 / 200 XP to level 2`,
   empty XP bar; Today's Focus shows "No course queued yet"; heatmap renders
   53 weeks of dim cells.
6. **Sidebar** → click every item; all routes resolve, active item glows.
7. **Timer** → start, wait **60 seconds**, press **Reset** → "Logged 1 minutes".
8. **Back to `/app`** → streak `1`, XP bar moved, one heatmap cell lit.
9. **Refresh** → still signed in; stats persist.
10. **Sign out** from the topbar → back at `/login`; visiting `/app` redirects.
11. **Courses** → **New course** "Systems Design Primer" → ring card at 0%.
    **Add topic** ×3 → click each chip → `1/3 topics · 33%` → ring fills, card
    turns *In progress*. Complete all three → *Completed*.
12. **Back to `/app`** → Today's Focus now shows that course and its next
    topic instead of the empty state.
13. **Notes** → **New note** → title + body → wait ~1 s → refresh → both
    persisted (`select * from public.notes;`).
14. **Squad** → invite a **second account's** email → `Invite sent to …` →
    sign in as that account → `/app/squad` shows an incoming request →
    **Accept** → both grids show each other.
15. **Squad status** → after a focus session, `profiles.last_active_date`
    moves to today and the card reads *Active today*.
16. **Roadmap** (backend must be running, `ai_configured: true`) →
    `/app/roadmap` → the empty state reads "Your learning journey starts
    here" → click the **Python Programming** template chip, the goal fills in
    → pick level + time commitment → **Generate roadmap** → spinner
    "Researching the path…" → map with 4–6 phase columns and a connected
    candy trail.
17. **Unlocking** → first node glows purple with a marching dashed connector,
    everything downstream dim/dashed. Click a locked node → drawer names the
    blocking prerequisite. Complete the first node → the next lights up.
18. **Persistence** → refresh `/app/roadmap` → same map reloads. Check
    `select count(*) from roadmap_nodes;` and
    `select count(*) from roadmap_connections;`
19. **Failure mode** → stop the backend and generate again → a gray-dot
    **AI Offline** chip appears in the header, and the form raises a styled
    alert reading "AI service is offline. Please start the backend server to
    generate roadmaps." with a **Retry** button - no crash, no bare red text.
20. **Focus timer widget** → on `/app` press **Quick start** → a glass modal
    (it renders outside the card, so the corners are never clipped) offers
    **25 / 50 / 90** → pick one → the 128 px ring and countdown appear.
    **Pause**/**Resume**/**Stop** work, **Open timer** lands on `/app/timer`
    with the same remaining time.
21. **Widget commit** → let a 25-minute session finish (or start a short one
    and stop it after 60 s) → "Focus session logged · +N XP" → the player
    stats, heatmap and `learning_sessions` all moved, exactly like §6 step 7.
22. **Quiz** → `/app/quiz` → pick a course + topic, **Mixed**, **5** →
    **Generate** → answer each question with **Check answer** → MCQs give
    instant pass/fail + explanation, code answers take ~1–3 s → finish → score
    ring, **+N XP** badge, per-question review → **Retake**.
23. **Quiz offline** → stop the backend, generate again → the alert reads
    "AI service is offline…" with **Retry**; the form is intact, no crash.
24. **Assistant** → `/app/assistant` → click a suggestion chip → a reply
    arrives and its model id prints under the bubble in small mono. Type your
    own message and press Enter; Shift+Enter inserts a newline.
25. **Assistant offline** → stop the backend, send a message → an inline
    error bar appears with **Dismiss**; the **Retry** arrow in the composer
    re-sends the same message once the backend is back.
26. **Settings → profile** → `/app/settings` → change **Display name** and
    **Username** → **Save changes** → green "Profile saved." banner, and the
    topbar now shows the new display name (no reload needed).
27. **Settings → avatar** → **Upload photo** → pick an image ≤ 2 MB →
    **Save changes** → the photo appears in the topbar and in the Squad
    "That's you" card, and in any friend's Squad grid who can see your row.
    *Requires the `avatars` Storage bucket (§5 Step 2b); without it the form
    explains the fix instead of failing silently.*
28. **Remove avatar** → **Remove** → **Save** → monogram returns everywhere.

---

## 7. Architecture Map

```
src/
├── App.tsx                       # routes: / , /login , /auth→/login , /app/*
├── pages/
│   ├── LandingPage.tsx           # LOCKED
│   ├── Auth.tsx                  # login + signup
│   └── dashboard/
│       ├── DashboardHome.tsx     # composition only
│       ├── QuizPage.tsx          # setup → running → results state machine
│       ├── RoadmapPage.tsx       # generate + map + node drawer
│       ├── CoursesPage.tsx       # full Supabase CRUD + ring cards
│       ├── NotesPage.tsx         # Supabase CRUD, debounced write-back
│       ├── TimerPage.tsx         # localStorage + Supabase write-through
│       ├── CalendarPage.tsx      # localStorage
│       ├── SquadPage.tsx         # friendships + profiles + invites
│       ├── AiAssistantPage.tsx   # chat orchestration (state + error handling)
│       └── SettingsPage.tsx      # profile edit + avatar upload
├── layouts/DashboardLayout.tsx   # sidebar + topbar + page transitions
├── components/
│   ├── dashboard/
│   │   ├── PlayerStats.tsx       # streak / level / XP bar
│   │   ├── FocusTimerWidget.tsx  # dashboard ring timer + quick-start modal
│   │   ├── TodayFocus.tsx        # focus card + empty state
│   │   └── ActivityHeatmap.tsx   # 53-week grid
│   ├── quiz/
│   │   ├── QuizSetup.tsx         # course/topic/kind/difficulty/count form
│   │   ├── QuestionInput.tsx     # mcq | code | debug | output renderers
│   │   ├── QuizResults.tsx       # score ring + XP badge + review
│   │   └── CodeBlock.tsx         # read-only line-numbered code figure
│   ├── assistant/
│   │   ├── ChatThread.tsx        # bubbles, typing dots, suggestion chips
│   │   └── ChatComposer.tsx      # textarea, char counter, send / retry
│   ├── roadmap/
│   │   ├── RoadmapBuilder.tsx    # goal / level / commitment form
│   │   ├── RoadmapMap.tsx        # phase bands, bézier connectors, node cards
│   │   └── RoadmapDetail.tsx     # node drawer + resources + milestones
│   ├── ui/                       # Button, Card, EmptyState, SelectMenu
│   ├── RevealText.tsx            # word-by-word heading reveal
│   └── ProtectedRoute.tsx        # session gate
├── hooks/
│   ├── useDashboard.ts           # loads profile + heatmap + focus
│   ├── useCourses.ts             # loads courses + mutations
│   └── useLenis.ts
└── lib/
    ├── supabase.ts               # client + isSupabaseConfigured
    ├── auth.ts                   # signUp / signIn / signOut / getUser
    ├── ai.ts                     # typed FastAPI/NVIDIA client
    ├── assistant.ts              # learner context, history, error classify
    ├── quiz.ts                   # request/canSubmit/evaluate/XP for quizzes
    ├── roadmapGraph.ts           # graph model, unlock rules, layout, edges
    ├── db/                       # ← Supabase data layer
    │   ├── types.ts              # Profile, Course, CourseTopic, levelProgress()
    │   ├── profile.ts            # fetch/update + PROFILE_CHANGED_EVENT
    │   ├── avatars.ts            # validateAvatar + Storage upload
    │   ├── activity.ts           # activity_heatmap RPC
    │   ├── courses.ts            # focus course + full course/topic CRUD
    │   ├── notes.ts              # notes CRUD (sanitised on write)
    │   ├── roadmaps.ts           # roadmap save/load + status writes
    │   ├── squad.ts              # friendships + profiles + invite_friend
    │   └── sessions.ts           # logSession / persistStudySession
    ├── timer.ts                  # shared timer store (widget + page + tabs)
    ├── calendar.ts / friends.ts
    ├── notes.ts                  # Note type + sanitizeHtml only
    └── motion.ts                 # EASE, variants

backend/
├── requirements.txt
└── app/
    ├── main.py                   # create_app(), CORS, /health, error handler
    ├── config.py                 # Settings (cached), ai_ready
    ├── ai_service.py             # Task enum + model routing + JSON parsing
    ├── prompts.py                # roadmap / quiz / evaluate / chat prompts
    ├── roadmap_graph.py          # lenient parser + DAG normaliser
    ├── schemas.py                # strict pydantic models
    └── routers/
        ├── chat.py
        ├── roadmaps.py
        └── quizzes.py

supabase/migrations/
├── 0001_core_schema.sql          # 8 tables, enums, indexes, RLS
├── 0002_triggers_functions.sql   # triggers, record_activity, activity_heatmap
├── 0003_squad.sql                # invite_friend(email) security definer
└── 0004_roadmaps.sql             # roadmaps, roadmap_nodes, roadmap_connections
```

---

## 8. Database Reference

**11 tables, RLS enabled on all, every foreign key indexed.**

| Table | Purpose |
| --- | --- |
| `profiles` | id (→ auth.users), username, display_name, streak, xp, level, avatar_url, last_active_date |
| `courses` | user_id, title, status, progress_percentage, accent, position |
| `course_topics` | course_id, title, position, status, progress_percentage, completed_at |
| `learning_sessions` | user_id, course_id, topic_id, started_at, ended_at, total_seconds, label |
| `notes` | user_id, topic_id, title, content, tags (GIN indexed) |
| `quizzes` | kind (`mcq`/`code`/`debug`/`output`), difficulty, prompt, code, options, correct_answer |
| `quiz_attempts` | quiz_id, answer, is_correct, score, feedback |
| `friendships` | requester_id, addressee_id, status (pending/accepted/blocked) |
| `roadmaps` | user_id, `course_id` (**bigint** → `courses.id`), goal, title, summary, model, `phases jsonb` |
| `roadmap_nodes` | roadmap_id, key, title, description, phase_number, `position` (order), x/y, status, estimated_hours, `prerequisites uuid[]` (GIN), `resources jsonb` |
| `roadmap_connections` | roadmap_id, from_node_id, to_node_id (unique pair, no self-links) |

**Enums:** `course_status`, `quiz_kind`, `quiz_difficulty`, `node_status`
(`locked`/`active`/`completed`)

> **Schema deviations worth knowing** (vs the original draft SQL):
> `roadmaps.course_id` is `bigint`, not UUID - `courses.id` is
> `bigint generated always as identity`. `roadmaps` also carries
> `title`/`summary`/`model`/`phases jsonb`; `roadmap_nodes` adds `position`
> plus defaults so a row is never partially null, and has
> `check (not (id = any(prerequisites)))` on `prerequisites`.
> The roadmap child tables reach RLS via
> `roadmap_id in (select id from roadmaps where user_id = auth.uid())`.

**Functions / triggers**

| Name | Type | What it does |
| --- | --- | --- |
| `handle_new_user()` | trigger on `auth.users` | creates the profile row on signup |
| `set_updated_at()` | trigger | maintains `updated_at` on profiles / courses / topics / notes / friendships / **roadmaps** |
| `record_activity(xp)` | RPC, security definer | streak (increments only across consecutive UTC days), `xp +=`, `level = 1 + xp/200` |
| `activity_heatmap(days)` | RPC, security invoker | per-day `total_seconds` + `session_count` for the caller |
| `invite_friend(email)` | RPC, security definer | resolves `auth.users` by email → inserts a pending `friendships` row; returns `{ok, message}` |
| `roadmaps_set_updated_at` | trigger | `updated_at` on `roadmaps` |

**Constants**
- `XP_PER_LEVEL = 200` → `level = 1 + floor(xp / 200)`
- Session XP = `max(1, round(seconds / 60))` → 1 XP per minute

---

## 9. Known Gaps

1. **`avatars` bucket is manual.** Storage bucket creation needs the service
   role, so it cannot ship as a migration. See §5 Step 2b. Until it exists,
   Settings explains the fix instead of uploading.
2. **`courses` starts empty.** Today's Focus only fills in after you create a
   course on `/app/courses` (no seeded data).
3. **Calendar disagrees with the heatmap** - localStorage vs Supabase (§3.6).
4. **`invite_friend()` reads `auth.users`.** It is `security definer` with
   `search_path = ''`. If the SQL editor reports a permission error, run
   `grant select on table auth.users to postgres;` then re-run the migration.
5. **No realtime anywhere.** Squad status is derived from
   `profiles.last_active_date`; accepted invites and second-tab edits need a
   reload.
6. **`quizzes` / `quiz_attempts` are unreachable.** RLS and tables exist but
   the Quiz page keeps attempts client-side and only awards XP through
   `record_activity()` - nothing reads or writes those tables yet.
7. **Roadmap has no `course_id` linkage.** The column exists but generation
   leaves it `null`.
8. **`MAX_TOKENS[ROADMAP] = 4096`.** Never raised because the vendor cap was
   not confirmed. If long roadmaps truncate, raise it in `ai_service.py`.
9. **Heatmap timezone is UTC** - a late-evening session can appear on the
   next day's cell.
10. **Bundle size** - `dist` JS is ~1.9 MB (three.js / framer-motion). Consider
    `React.lazy` route splitting before production.

---

## 10. Backlog (Phase 2 remaining)

- [x] Migrate `courses` + `course_topics` CRUD to Supabase
- [x] Migrate `notes` to Supabase
- [x] `src/lib/ai.ts` typed client for the FastAPI service
- [x] Squad from `friendships` + last-active status
- [x] Apply `0003_squad.sql` in the Supabase SQL editor
- [x] Apply `0004_roadmaps.sql` in the Supabase SQL editor
- [x] AI Roadmap: `generateRoadmap()` + Candy Crush node map (phase bands,
      snake layout, locked/active/completed states, connectors, node drawer
      with resources + milestones, persisted)
- [x] Add `backend/.env` with the real `NVIDIA_API_KEY`
- [x] UI polish pass - card elevation, purple hover borders, no pure-white
      borders, corner `atlas-glow` gradients instead of blurred discs
- [x] Dashboard **Focus Timer widget** (quick-start modal, ring, auto-commit)
- [x] AI Quiz Engine UI - MCQ, Code generation, Debugging, Output prediction
      (calls `generateQuiz()` / `evaluateCode()`)
- [x] Wire `chat()` into `/app/assistant` with a learner-context system turn
- [x] Settings (profile edit via `updateProfile` + avatar upload to Storage)
- [x] Show the avatar in the topbar and on the Squad cards
- [ ] Calendar → Supabase
- [ ] Code-split the route bundles
- [ ] Persist quiz attempts to `quizzes` / `quiz_attempts`
