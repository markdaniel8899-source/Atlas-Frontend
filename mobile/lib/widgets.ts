/**
 * Widgets Setup
 *
 * Future home screen widgets will be configured here.
 * When Expo supports widgets (expo-widgets or native modules),
 * define widget configs below.
 */

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  refreshIntervalMinutes: number;
}

export const WIDGETS: WidgetConfig[] = [
  {
    id: "streak",
    name: "Streak Widget",
    description: "Shows current learning streak on home screen",
    refreshIntervalMinutes: 60,
  },
  {
    id: "focus-timer",
    name: "Focus Timer Widget",
    description: "Quick start focus session from home screen",
    refreshIntervalMinutes: 15,
  },
];

export function isWidgetSupported(): boolean {
  // TODO: Check when Expo releases widget support
  return false;
}
