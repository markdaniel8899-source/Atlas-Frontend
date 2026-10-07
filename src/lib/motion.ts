export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const routeVariants = {
  landing: {
    initial: { opacity: 0 },
    enter: {
      opacity: 1,
      transition: { duration: 0.75, ease: EASE },
    },
    exit: {
      opacity: 0,
      // Leaves from home play under the curtain (DoubleCurtain), so this only
      // sets how long the cover is held before the reveal: keep it short.
      transition: { duration: 0.35, ease: EASE },
    },
  },
  auth: {
    initial: { opacity: 0 },
    enter: {
      opacity: 1,
      transition: { duration: 0.55, ease: EASE },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.35, ease: EASE },
    },
  },
  app: {
    initial: { opacity: 0 },
    enter: {
      opacity: 1,
      transition: { duration: 0.45, ease: EASE },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3, ease: EASE },
    },
  },
} as const;

export const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.35, ease: EASE } },
  exit: {
    opacity: 0,
    transition: { duration: 0.22, ease: EASE },
  },
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.85, ease: EASE },
} as const;

/** Rich entrance: slide + blur + slight scale-in. */
export const fadeBlur = {
  initial: { opacity: 0, y: 28, filter: "blur(12px)", scale: 0.97 },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: EASE },
} as const;

/** Pop-in: scale with fade, no travel. */
export const fadeScale = {
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.7, ease: EASE },
} as const;

/** Container: stagger children as it enters the viewport. */
export const staggerGroup = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.25 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09 } },
  },
} as const;

/** Child for `staggerGroup` (pair with a motion element's own variants). */
export const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
} as const;
