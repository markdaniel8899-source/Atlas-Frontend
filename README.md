<div align="center">

# 🎓 ATLAS Learning OS

### An AI-Powered, Gamified Learning Platform — built for the future.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)

**🌐 [Frontend](https://atlas-frontend-pearl.vercel.app) · ⚙️ [Backend API](#-live-demo--links) · 🔐 [Admin Panel](#-live-demo--links)**

</div>

---

## 🌐 Live Demo & Links

| | Link |
| --- | --- |
| 🌐 **Frontend** | [https://atlas-frontend-pearl.vercel.app](https://atlas-frontend-pearl.vercel.app) |
| ⚙️ **Backend API** | [https://api.atlas.kz.ci](https://api.atlas.kz.ci) (direct TLS via Caddy reverse proxy) |
| 🔐 **Admin Panel** | `https://.../wp-admin` *(placeholder)* |

---

## ✨ Key Features

- **🤖 AI-Powered Quiz & Chat** — Context-aware quiz generation from custom topics, uploaded PDFs, or specific course notes — with **strict subject isolation**: a custom topic never sees a single byte of course data, and every quiz stays inside its own subject boundary.
- **🎮 Gamification Engine** — Dynamic XP, streaks, ranks, and badges that turn consistent learning into a habit.
- **📝 Auto-Blog with SEO Gate** — A lightweight, **zero-RAM SEO checker** ensures only articles scoring **80+** get published — quality over quantity, enforced automatically.
- **📊 Admin Command Center** — Real-time analytics, API usage tracking, and full user/message management from a single dashboard.
- **🚀 Awwwards-Level Performance** — Auto DPR clamping, **LRU caching (5-min TTL)**, and lightweight UI fallbacks for a seamless experience even on low-end devices.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **🎨 Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion / GSAP |
| **⚙️ Backend** | Python, FastAPI (async), Pydantic |
| **🗄️ Database & Auth** | Supabase (PostgreSQL), Row Level Security (RLS), JWT Authentication |
| **🏗️ Infrastructure** | Vercel (frontend CDN), Oracle Cloud Free Tier (1 GB RAM backend), Caddy reverse proxy (TLS), Uvicorn bound to `0.0.0.0:8000` |

---

## 🔒 Security & Architecture Highlights

- **🔒 Strict Row Level Security (RLS)** — Every query runs behind Supabase RLS policies that prevent privilege escalation; users can only ever touch their own rows.
- **🧠 Zero Context Leakage in AI Prompts** — The backend is the single decision point: custom topics get **zero** course data, course quizzes only fetch notes scoped to the requested `course_id`, and client-supplied context never reaches the model.
- **🛡️ In-Memory LRU Caching (5-min TTL)** — A lightweight cache absorbs repeat work and protects the 1 GB RAM server from overload — no external cache service, no extra RAM bill.

---

## ⚙️ Local Setup

> The project lives in two repositories: **Atlas-Frontend** (React) and **Atlas-Backend** (FastAPI).

### 1️⃣ Clone

```bash
git clone https://github.com/markdaniel8899-source/Atlas-Frontend.git
git clone https://github.com/markdaniel8899-source/Atlas-Backend.git
```

### 2️⃣ Frontend

```bash
cd Atlas-Frontend
npm install
```

Create a `.env.local` in the frontend root:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:8000
VITE_AI_API_URL=http://localhost:8000
```

Run it:

```bash
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

### 3️⃣ Backend

```bash
cd Atlas-Backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-key          # quiz / chat AI
GOOGLE_API_KEY=your-google-key      # auto-blog AI
ADMIN_SECRET=your-admin-secret
```

> Full list of optional keys (blog models, Tavily, Pixabay, timeouts) lives in `backend/app/config.py`.

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

On the server, bind Uvicorn to all interfaces behind the reverse proxy:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 🗺️ Future Roadmap

- 📱 **Cross-platform Mobile App** — React Native + Expo.
- 🔔 **Real-time Push Notifications**.
- 🌍 **Multi-language UI support**.

---

<div align="center">

**⚡ ATLAS Learning OS** — learn smarter, stay consistent, level up.

</div>
