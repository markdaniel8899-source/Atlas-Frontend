import * as Notifications from "expo-notifications";

export async function scheduleSessionEndNotification(
  secondsFromNow: number,
  title = "Focus session done!",
  body = "Take a well-deserved break.",
) {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
    },
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
