# ATLAS - DESIGN SYSTEM & INTERACTION RULES

## 1. VISUAL THEME & BACKGROUND
- **Base:** Deep dark theme. Background is NOT solid black. It is a minimal, slow-moving CSS mesh gradient (Deep Black `#030305` -> Dark Indigo `#0a0a1a` -> Midnight Blue).
- **Texture:** Apply a subtle, fixed SVG noise/grain overlay over the entire app to give a cinematic film feel.
- **Glassmorphism:** Cards and modals use `bg-white/[0.03]`, `backdrop-blur-2xl`, `border border-white/[0.08]`.

## 2. TYPOGRAPHY & TEXT ANIMATIONS
- **Font:** Geist or Inter. 
- **Headings:** Massive, bold, `tracking-tighter`.
- **Scroll Typography:** Text must not just sit there. Use Framer Motion/GSAP to split text into words/chars. On scroll, text should smoothly blur in/out, slide up, or change opacity. 

## 3. THE "Z-AXIS OVERLAPPING" SCROLL (CRITICAL)
The landing page must NOT scroll normally. It must use a "Sticky Stacking" or "Curtain" effect.
- **Mechanism:** Each section is `h-screen` and `sticky top-0`. 
- **Behavior:** As the user scrolls, Section 1 stays fixed. Section 2 slides up from the bottom and physically covers Section 1. Section 3 covers Section 2.
- **Depth:** Add a subtle drop-shadow to the top of the incoming sections to create a deep 3D layering effect.
- **Scale/Blur:** As a section gets covered, use Framer Motion `useScroll` to slightly scale it down (e.g., to 0.95) and blur it, enhancing the depth.

## 4. MICRO-3D ELEMENTS (LIGHTWEIGHT)
- **Rule:** NO globes, NO heavy models.
- **Implementation:** Create ONE single `<Canvas>` fixed in the background (`z-index: 0`, `pointer-events: none`).
- **Elements:** Inside the canvas, place 15-20 small, lightweight geometries (tiny cubes, glowing rings, small icosahedrons, abstract wireframes).
- **Behavior:** 
  1. Idle: Slowly float and rotate using R3F `<Float>`.
  2. Mouse: Slight parallax shift based on mouse position.
  3. Scroll: Move slightly faster than the scroll speed to create parallax depth between the 3D layer and the HTML content.

## 5. PAGE & SECTION TRANSITIONS
- **Routing:** Use Framer Motion `AnimatePresence` and `layoutId`.
- **Landing to Auth:** When clicking "Sign Up", the background smoothly morphs, and the Auth form slides in elegantly from the right or scales up from the center. No hard page reloads.
- **Horizontal Scroll:** The "Friends/Squad" section on the landing page must use a horizontal scroll pinned to the vertical scroll (GSAP ScrollTrigger pin).

## 6. HOVER & MICRO-INTERACTIONS
- **Buttons:** `whileHover={{ scale: 1.05 }}`, `whileTap={{ scale: 0.95 }}`. Subtle glow on hover.
- **Cards:** `whileHover={{ y: -5, borderColor: "rgba(255,255,255,0.2)" }}`.
- **Links:** Underline slides in from left to right on hover.