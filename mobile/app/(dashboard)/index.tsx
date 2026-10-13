import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";

export default function DashboardHome() {
  const { session } = useAuth();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!session) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("xp, streak")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setXp(data.xp ?? 0);
        setStreak(data.streak ?? 0);
      }
    } catch {
      // offline
    }
  };

  useEffect(() => {
    void loadStats();
  }, [session?.user.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadStats()}
          tintColor="#6366f1"
        />
      }
    >
      <View className="flex-row items-center justify-between px-6 pt-14 pb-6">
        <View>
          <Text className="text-sm text-white/50">Welcome back</Text>
          <Text className="mt-1 text-2xl font-bold text-text">
            {session?.user.email?.split("@")[0] ?? "Learner"}
          </Text>
        </View>
        <Pressable
          onPress={() => void handleLogout()}
          className="flex-row items-center gap-1 rounded-full border border-white/10 bg-surface px-3 py-2"
        >
          <MaterialIcons name="logout" size={16} color="#a1a1aa" />
          <Text className="text-xs text-white/50">Logout</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-4 px-6">
        <View className="flex-1 rounded-2xl border border-white/10 bg-surface p-5">
          <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MaterialIcons name="star" size={20} color="#818cf8" />
          </View>
          <Text className="text-2xl font-bold text-text">{xp}</Text>
          <Text className="mt-1 text-sm text-white/50">Total XP</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-white/10 bg-surface p-5">
          <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <MaterialIcons name="whatshot" size={20} color="#f97316" />
          </View>
          <Text className="text-2xl font-bold text-text">{streak}</Text>
          <Text className="mt-1 text-sm text-white/50">Day Streak</Text>
        </View>
      </View>

      <View className="mt-8 px-6">
        <Text className="mb-4 text-lg font-semibold text-text">
          Quick Actions
        </Text>
        <Pressable
          onPress={() => router.push("/(dashboard)/notes")}
          className="flex-row items-center gap-4 rounded-2xl border border-white/10 bg-surface p-4 active:opacity-80"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MaterialIcons name="edit" size={20} color="#818cf8" />
          </View>
          <Text className="flex-1 text-base font-medium text-text">
            Write a Note
          </Text>
          <Text className="text-white/40">→</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
