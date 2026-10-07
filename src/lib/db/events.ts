/**
 * Shared dashboard events. Kept in a leaf module so both courses.ts and
 * roadmaps.ts can fire them without importing each other.
 */
export const ROADMAPS_CHANGED_EVENT = "atlas:roadmaps-changed";

/** Tell listening views (e.g. the Courses page) to re-read roadmap progress. */
export function notifyRoadmapsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ROADMAPS_CHANGED_EVENT));
  }
}

export const FOCUS_CHANGED_EVENT = "atlas:focus-changed";

/** Tell listening views to re-read cumulative focus counters. */
export function notifyFocusChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOCUS_CHANGED_EVENT));
  }
}

export const COURSES_CHANGED_EVENT = "atlas:courses-changed";

/** Tell listening views (Notes/Roadmap course switchers) to re-read courses. */
export function notifyCoursesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COURSES_CHANGED_EVENT));
  }
}
