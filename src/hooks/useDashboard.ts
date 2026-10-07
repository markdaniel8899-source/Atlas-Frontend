import { useCallback, useEffect, useState } from "react";
import { getUser } from "../lib/auth";
import { fetchHeatmap } from "../lib/db/activity";
import { fetchFocusCourse } from "../lib/db/courses";
import {
  COURSES_CHANGED_EVENT,
  FOCUS_CHANGED_EVENT,
} from "../lib/db/events";
import { PROFILE_CHANGED_EVENT, fetchProfile } from "../lib/db/profile";
import type { FocusCourse, HeatmapDay, Profile } from "../lib/db/types";

export interface DashboardData {
  profile: Profile | null;
  heatmap: HeatmapDay[];
  focus: FocusCourse | null;
}

export interface DashboardState extends DashboardData {
  loading: boolean;
  reload: () => void;
}

const EMPTY: DashboardData = { profile: null, heatmap: [], focus: null };

export function useDashboard(): DashboardState {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    const user = getUser();

    if (!user) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    void Promise.all([
      fetchProfile(user.id),
      fetchHeatmap(365),
      fetchFocusCourse(),
    ])
      .then(([profile, heatmap, focus]) => {
        setData({ profile, heatmap, focus });
      })
      .catch(() => {
        setData(EMPTY);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Pages stay mounted, so re-read profile / focus course / heatmap whenever
  // a session, course, topic or XP change happens anywhere in the app.
  useEffect(() => {
    const refresh = () => reload();
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    window.addEventListener(COURSES_CHANGED_EVENT, refresh);
    window.addEventListener(FOCUS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
      window.removeEventListener(COURSES_CHANGED_EVENT, refresh);
      window.removeEventListener(FOCUS_CHANGED_EVENT, refresh);
    };
  }, [reload]);

  return { ...data, loading, reload };
}
