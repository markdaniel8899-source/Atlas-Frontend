export type CourseStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed";

export const XP_PER_LEVEL = 200;

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  streak: number;
  xp: number;
  level: number;
  avatar_url: string | null;
  last_active_date: string | null;
}

export interface HeatmapDay {
  day: string;
  total_seconds: number;
  session_count: number;
}

export interface FocusTopic {
  id: number;
  title: string;
  position: number;
  status: CourseStatus;
}

export interface FocusCourse {
  id: number;
  title: string;
  accent: string;
  progress_percentage: number;
  status: CourseStatus;
  topics: FocusTopic[];
}

export interface CourseTopic extends FocusTopic {
  summary: string;
  progress_percentage: number;
  completed_at: string | null;
}

export interface Course extends FocusCourse {
  description: string;
  position: number;
  topics: CourseTopic[];
  /** Lifetime focused seconds for this course (courses.total_focus_seconds). */
  total_focus_seconds: number;
}

export interface LevelProgress {
  level: number;
  into: number;
  need: number;
  percent: number;
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const into = safeXp % XP_PER_LEVEL;
  return {
    level,
    into,
    need: XP_PER_LEVEL,
    percent: (into / XP_PER_LEVEL) * 100,
  };
}
