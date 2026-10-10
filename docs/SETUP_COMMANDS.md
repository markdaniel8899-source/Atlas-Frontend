# Learning Tracker - Setup Commands
# Format: har pair = aik dependency (npm install) + uska agent skill (npx skills add)
# Skills .agents/skills/ mein install hoti hain (opencode access ke liye)
# --agent opencode -y = non-interactive install, koi prompt nahi aata

# ==================== ANIMATION & 3D ====================

# [Pair 1] Motion (Framer Motion) - React component animations ke liye
# Skill: framer-motion-animator - agent ko React animation patterns sikhata hai
npm install motion
npx skills add https://github.com/patricio0312rev/skills --skill framer-motion-animator --agent opencode -y

# [Pair 2] React Three Drei - R3F ke ready-made helpers (controls, loaders, effects)
# Skill: react-three-fiber-drei - Drei helpers use karne ka tareeqa sikhata hai
npm install @react-three/drei
npx skills add https://github.com/avnehsbhatia/ultraui --skill react-three-fiber-drei --agent opencode -y

# [Pair 3] Three.js + React Three Fiber - 3D graphics ke liye
# Skill: react-three-fiber - R3F scene/component patterns sikhata hai
npm install three @types/three @react-three/fiber
npx skills add https://github.com/freshtechbro/claudedesignskills --skill react-three-fiber --agent opencode -y

# [Pair 4] GSAP - professional web animation engine (timeline, scroll, tweens)
# Skill: gsap-core - OFFICIAL GreenSock repo, GSAP usage best practices
npm install gsap
npx skills add https://github.com/greensock/gsap-skills --skill gsap-core --agent opencode -y

# ==================== UI & STYLING ====================

# [Pair 5] Radix UI Themes - accessible, unstyled UI components
# Skill: migrate-radix-to-base - Radix se Base UI migration mein help karta hai
npm install @radix-ui/themes
npx skills add https://github.com/shadcn-ui/ui --skill migrate-radix-to-base --agent opencode -y

# [Pair 6] Lucide - lightweight icon library
# Skill: suggest-lucide-icons - context ke mutabiq sahi icon suggest karta hai
npm install lucide
npx skills add https://github.com/nweii/agent-stuff --skill suggest-lucide-icons --agent opencode -y

# [Pair 7] Geist - Vercel ki modern font family
# Skill: create-remotion-geist - Remotion projects mein Geist font setup karta hai
npm i geist
npx skills add https://github.com/vercel-labs/skill-remotion-geist --skill create-remotion-geist --agent opencode -y

# [Pair 8] Tailwind CSS v4 - utility-first CSS framework
# Skill: tailwind-v4 - official Mastra repo, Tailwind v4 best practices
npm install -D tailwindcss postcss autoprefixer
npx skills add https://github.com/mastra-ai/mastra --skill tailwind-v4 --agent opencode -y

# ==================== DATA & VALIDATION ====================

# [Pair 9] Zod - TypeScript schema validation
# Skill: zod - validation schemas banane ke patterns sikhata hai
npm install zod
npx skills add https://github.com/pproenca/dot-skills --skill zod --agent opencode -y

# [Pair 10] Supabase - backend/database JS client
# Skill: supabase-postgres-best-practices - Postgres schema/queries ke best practices
npm install @supabase/supabase-js
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices --agent opencode -y

# [Dependency only] DOMPurify - HTML sanitizer (XSS protection ke liye), koi agent skill nahi
npm install dompurify
