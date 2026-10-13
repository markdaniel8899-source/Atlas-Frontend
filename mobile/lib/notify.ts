import { Alert } from "react-native";

export const scheduleSessionEndNotification = (minutes: number) => {
  console.log(`Notification scheduled for ${minutes} minutes.`);
  setTimeout(() => {
    Alert.alert("Session Complete!", "Focus Session Completed! Great job.");
  }, minutes * 60 * 1000);
};
