import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { scheduleSessionEndNotification } from "../../lib/notify";

const FOCUS_MINUTES = 25;

export default function Focus() {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          // Schedule notification when session ends
          void scheduleSessionEndNotification(
            1,
            "Focus session done!",
            "Great job! Take a break.",
          );
          return FOCUS_MINUTES * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(FOCUS_MINUTES * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const total = FOCUS_MINUTES * 60;
  const progress = ((total - secondsLeft) / total) * 100;

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text className="text-sm font-medium uppercase tracking-widest text-white/50">
        Focus Session
      </Text>

      <View className="my-10 h-64 w-64 items-center justify-center rounded-full border-4 border-gray-800">
        <Text className="text-6xl font-bold text-text">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </Text>
        <Text className="mt-2 text-sm text-white/50">
          {Math.round(progress)}% complete
        </Text>
      </View>

      <View className="flex-row items-center gap-6">
        <Pressable
          onPress={reset}
          className="h-14 w-14 items-center justify-center rounded-full border border-gray-800 bg-surface active:opacity-80"
        >
          <MaterialIcons name="refresh" size={22} color="#a1a1aa" />
        </Pressable>
        <Pressable
          onPress={() => setRunning(!running)}
          className="h-20 w-20 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <MaterialIcons
            name={running ? "pause" : "play-arrow"}
            size={36}
            color="#fff"
          />
        </Pressable>
        <View className="h-14 w-14" />
      </View>

      <Text className="mt-8 text-sm text-white/50">
        {running ? "Stay focused..." : "Press play to start"}
      </Text>
    </View>
  );
}
