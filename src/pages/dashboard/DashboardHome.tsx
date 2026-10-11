import { useEffect } from "react";
import { ActivityHeatmap } from "../../components/dashboard/ActivityHeatmap";
import { FocusTimerWidget } from "../../components/dashboard/FocusTimerWidget";
import { PlayerStats } from "../../components/dashboard/PlayerStats";
import { TodayFocus } from "../../components/dashboard/TodayFocus";
import { RevealText } from "../../components/RevealText";
import { useDashboard } from "../../hooks/useDashboard";
import { getUser } from "../../lib/auth";
import { runAchievementChecks } from "../../lib/db/achievements";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const { profile, heatmap, focus, loading } = useDashboard();
  const user = getUser();

  const fullName = profile?.display_name || user?.name || "";
  const firstName = fullName.split(" ")[0]?.trim() || "Explorer";

  // Daily-login achievement sweep (streaks, night owl, quiz wizard...).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const hasIdle = "requestIdleCallback" in window;
    const schedule = (cb: () => void): number =>
      hasIdle
        ? window.requestIdleCallback(cb, { timeout: 4000 })
        : window.setTimeout(cb, 1500);
    const handle = schedule(() => {
      if (!cancelled) void runAchievementChecks().catch(() => undefined);
    });
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
    // Deps on the primitive id: getUser() returns a fresh object every
    // render, so [user] would re-schedule this sweep on every render.
  }, [user?.id]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-star/70">
          {greeting()}
        </p>
        <RevealText
          as="h1"
          text={`${firstName}, here's your terrain.`}
          className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
        />
      </header>

      <section>
        <PlayerStats profile={profile} loading={loading} />
      </section>

      <section>
        <FocusTimerWidget />
      </section>

      <section>
        <TodayFocus focus={focus} loading={loading} />
      </section>

      <section>
        <ActivityHeatmap days={heatmap} />
      </section>
    </div>
  );
}
