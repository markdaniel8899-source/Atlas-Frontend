import { useEffect } from "react";
import { getUser } from "../lib/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  pushNotification,
  setFriendRequestCount,
  setNotificationOwner,
} from "../lib/notifications";
import {
  fetchDisplayNames,
  fetchIncomingFriendRequests,
} from "../lib/db/notifications";
import { syncAllNotifications } from "../lib/liveNotifications";
import {
  notifyCoursesChanged,
  notifyFocusChanged,
  notifyLeaderboardChanged,
  notifyNotesChanged,
  notifyRoadmapsChanged,
  notifySquadChanged,
} from "../lib/db/events";
import { notifyProfileChanged } from "../lib/db/profile";

/** Fallback cadence when Realtime is not enabled for a table. */
const POLL_MS = 20_000;

function rowOf(payload: { new: unknown }): Record<string, unknown> {
  return (payload.new ?? {}) as Record<string, unknown>;
}

function debounce(fn: () => void, ms: number): () => void {
  let handle: number | null = null;
  return () => {
    if (handle !== null) window.clearTimeout(handle);
    handle = window.setTimeout(() => {
      handle = null;
      fn();
    }, ms);
  };
}

/**
 * One global subscription for the signed-in learner:
 *
 * - friend requests / accepts notify instantly and keep the badge live
 * - shared notes notify and refresh the Notes page
 * - profile / course / roadmap / session changes refresh every mounted view
 *   so nothing needs a manual page reload
 *
 * A light poll runs as a fallback for Supabase projects where Realtime is not
 * enabled for a table yet.
 */
export function useLiveNotifications(): void {
  useEffect(() => {
    const me = getUser();
    setNotificationOwner(me?.id ?? null);
    if (!me || !isSupabaseConfigured) return;

    let alive = true;

    const syncSquad = debounce(() => {
      notifySquadChanged();
      void fetchIncomingFriendRequests().then((requests) => {
        if (!alive) return;
        setFriendRequestCount(requests.length);
      });
    }, 250);

    const syncProfileViews = debounce(() => {
      notifyProfileChanged();
      notifyLeaderboardChanged();
      notifySquadChanged();
    }, 900);

    const syncCourseViews = debounce(() => notifyCoursesChanged(), 900);
    const syncRoadmapViews = debounce(() => notifyRoadmapsChanged(), 900);
    const syncFocusViews = debounce(() => notifyFocusChanged(), 900);

    void syncAllNotifications();

    const refreshOnVisible = () => {
      if (document.visibilityState !== "visible") return;
      void syncAllNotifications();
      // Returning to the tab should never require a manual reload, even
      // when Realtime is disabled for the project.
      notifyProfileChanged();
      notifyCoursesChanged();
      notifyRoadmapsChanged();
      notifyFocusChanged();
      notifyLeaderboardChanged();
    };

    window.addEventListener("focus", refreshOnVisible);
    document.addEventListener("visibilitychange", refreshOnVisible);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncAllNotifications();
        // Keep peer XP/rank changes live even when Realtime is disabled.
        notifyProfileChanged();
        notifyLeaderboardChanged();
        notifyFocusChanged();
      }
    }, POLL_MS);

    const channel = supabase
      .channel(`atlas-live:${me.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${me.id}`,
        },
        (payload) => {
          syncSquad();
          if (
            payload.eventType === "INSERT" &&
            rowOf(payload).status === "pending"
          ) {
            void syncAllNotifications();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${me.id}`,
        },
        (payload) => {
          syncSquad();
          if (
            payload.eventType === "UPDATE" &&
            rowOf(payload).status === "accepted"
          ) {
            const friendshipId = String(rowOf(payload).id ?? "");
            const addresseeId = String(rowOf(payload).addressee_id ?? "");
            void fetchDisplayNames([addresseeId]).then((names) => {
              if (!alive || getUser()?.id !== me.id) return;
              pushNotification({
                id: `friend-accepted:${friendshipId}`,
                kind: "friend_accepted",
                message: `${names.get(addresseeId) ?? "Your friend"} accepted your friend request`,
                detail: "They are now in your Friends list.",
                href: "/app/squad",
              });
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${me.id}`,
        },
        (payload) => {
          notifyNotesChanged();
          if (
            payload.eventType === "INSERT" &&
            typeof rowOf(payload).shared_by === "string"
          ) {
            void syncAllNotifications();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        syncProfileViews,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `user_id=eq.${me.id}`,
        },
        syncCourseViews,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_topics",
          filter: `user_id=eq.${me.id}`,
        },
        syncCourseViews,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learning_sessions",
          filter: `user_id=eq.${me.id}`,
        },
        syncFocusViews,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roadmaps",
          filter: `user_id=eq.${me.id}`,
        },
        syncRoadmapViews,
      )
      .subscribe();

    return () => {
      alive = false;
      window.removeEventListener("focus", refreshOnVisible);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, []);
}