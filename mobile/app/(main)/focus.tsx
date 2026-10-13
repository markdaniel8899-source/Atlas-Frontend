import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { scheduleSessionEndNotification } from "../../lib/notify";

const FOCUS_MINUTES = 25;

export default function FocusScreen() {
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
          scheduleSessionEndNotification(0);
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

  return (
    <View className="flex-1 bg-background px-6">
      <Text className="text-2xl font-bold text-text text-center mt-16">
        Focus Session
      </Text>
      <Text className="text-gray-400 text-center mt-2">
        Stay focused, earn XP
      </Text>

      {/* Timer Display */}
      <View className="items-center mt-12">
        <View className="w-64 h-64 rounded-full border-8 border-gray-800 items-center justify-center bg-surface">
          <Text className="text-6xl font-bold text-primary">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </Text>
          <Text className="text-gray-400 mt-2 text-sm">25 min focus</Text>
        </View>
      </View>

      {/* Controls */}
      <Pressable
        onPress={() => setRunning(!running)}
        className="bg-primary py-4 rounded-xl mt-8 active:opacity-80"
      >
        <Text className="text-white text-center font-bold text-base">
          {running ? "⏸ Pause" : "▶ Start Focus"}
        </Text>
      </Pressable>

      <Pressable
        onPress={reset}
        className="bg-surface border border-primary py-4 rounded-xl mt-4 active:opacity-80"
      >
        <Text className="text-primary text-center font-bold text-base">
          🔄 Take a Break
        </Text>
      </Pressable>

      {/* Info */}
      <View className="bg-surface rounded-xl p-4 mt-8 border border-gray-800">
        <Text className="text-gray-400 text-center text-sm">
          Complete focus sessions to earn XP and maintain your streak!
        </Text>
      </View>
    </View>
  );
}
