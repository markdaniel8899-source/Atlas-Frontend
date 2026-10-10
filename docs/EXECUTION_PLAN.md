# ATLAS - STEP-BY-STEP EXECUTION PLAN

**CRITICAL RULE:** Do not build the entire application in one prompt. Follow this plan strictly, step by step. Wait for my confirmation after each step.

### STEP 1: Project Setup & Skill Loading
- Initialize Vite + React + TS.
- Install ONLY required dependencies: `framer-motion`, `lenis`, `gsap`, `@react-three/fiber`, `@react-three/drei`, `lucide-react`, `tailwindcss`.
- Setup basic folder structure: `src/components`, `src/pages`, `src/lib`, `src/hooks`.
- Create the global CSS file with the noise texture, mesh gradient background, and base typography.

### STEP 2: Landing Page Base & Z-Axis Scroll
- Create the `LandingPage` component.
- Implement the 4 full-screen sections (Hero, Problem/Solution, Features, CTA).
- Apply the CSS `sticky top-0` and `z-index` logic to create the Z-axis overlapping scroll effect.
- Integrate `Lenis` for buttery smooth scrolling.

### STEP 3: Typography & Micro-3D Integration
- Add Framer Motion scroll-linked animations to the text (blur, fade, slide).
- Create the `Micro3DScene` component (single fixed Canvas).
- Add 10-15 small floating geometries. Link their movement to mouse and scroll.
- Ensure the 3D scene is lightweight and doesn't block the HTML interactions.

### STEP 4: Horizontal Friends Section
- Implement the 4th section (Social Teaser) with GSAP ScrollTrigger to create a smooth horizontal scroll effect for friend profile cards.

### STEP 5: Auth Transition & Forms
- Create the `AuthPage` (Login/Signup).
- Implement the smooth transition from the Landing Page CTA button to the Auth Page using Framer Motion `AnimatePresence`.
- Design the Auth form with glassmorphism and minimal inputs.

### STEP 6: Core App Layout (Post-Login)
- Create the `DashboardLayout` (Sidebar + Main Content).
- Apply the glassmorphism sidebar with hover effects.
- Implement smooth page transitions between Dashboard, Courses, Notes, etc.

### STEP 7: Core Features Implementation
- Build the Learning Timer (with server-side timestamp logic).
- Build the Rich Text Notes editor.
- Build the GitHub-style Learning Calendar.
- Build the Friends/Progress tracking UI.

---

## HOW TO START
Acknowledge this file by replying: 
"MASTER RULES LOADED. DESIGN SYSTEM UNDERSTOOD. EXECUTION PLAN LOCKED. I am ready to start with STEP 1. Please confirm to proceed."