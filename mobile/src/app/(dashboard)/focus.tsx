import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Pause, Play, RotateCcw } from "lucide-react-native";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Focus() {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void Notifications.requestPermissionsAsync();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          void sendNotification();
          const nextIsBreak = !isBreak;
          setIsBreak(nextIsBreak);
          return (nextIsBreak ? BREAK_MINUTES : FOCUS_MINUTES) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, isBreak]);

  const sendNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isBreak ? "Break is over!" : "Focus session done!",
        body: isBreak
          ? "Time to get back to learning."
          : "Take a well-deserved break.",
      },
      trigger: null,
    });
  };

  const reset = () => {
    setRunning(false);
    setIsBreak(false);
    setSecondsLeft(FOCUS_MINUTES * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const total = (isBreak ? BREAK_MINUTES : FOCUS_MINUTES) * 60;
  const progress = ((total - secondsLeft) / total) * 100;

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text className="text-sm font-medium uppercase tracking-widest text-text-muted">
        {isBreak ? "Break Time" : "Focus Session"}
      </Text>

      {/* Timer Circle */}
      <View className="my-10 h-64 w-64 items-center justify-center rounded-full border-4 border-border">
        <Text className="text-6xl font-bold text-text">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </Text>
        <Text className="mt-2 text-sm text-text-muted">
          {Math.round(progress)}% complete
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row items-center gap-6">
        <Pressable
          onPress={reset}
          className="grid h-14 w-14 items-center justify-center rounded-full border border-border bg-surface active:opacity-80"
        >
          <RotateCcw size={22} stroke="#a1a1aa" />
        </Pressable>
        <Pressable
          onPress={() => setRunning(!running)}
          className="grid h-20 w-20 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          {running ? (
            <Pause size={32} stroke="#fff" />
          ) : (
            <Play size={32} stroke="#fff" />
          )}
        </Pressable>
        <View className="h-14 w-14" />
      </View>

      <Text className="mt-8 text-sm text-text-muted">
        {running
          ? "Stay focused..."
          : isBreak
            ? "Ready for a break?"
            : "Press play to start focusing"}
      </Text>
    </View>
  );
}
