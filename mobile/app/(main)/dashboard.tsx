import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

interface Stats {
  xp: number;
  streak: number;
  level: number;
  quizzes: number;
}

export default function Dashboard() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    xp: 0,
    streak: 0,
    level: 1,
    quizzes: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!session) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("xp, streak, quizzes_taken")
        .eq("id", session.user.id)
        .single();
      if (data) {
        const xp = data.xp ?? 0;
        setStats({
          xp,
          streak: data.streak ?? 0,
          level: Math.floor(xp / 100) + 1,
          quizzes: data.quizzes_taken ?? 0,
        });
      }
    } catch {
      // offline
    }
  };

  useEffect(() => {
    void loadStats();
  }, [session?.user.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

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
          onRefresh={() => void onRefresh()}
          tintColor="#6366f1"
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-6">
        <View>
          <Text className="text-sm text-white/50">Welcome back</Text>
          <Text className="mt-1 text-2xl font-bold text-text">
            {session?.user.email?.split("@")[0] ?? "Learner"}
          </Text>
        </View>
        <Pressable
          onPress={() => void handleLogout()}
          className="flex-row items-center gap-1.5 rounded-full border border-gray-800 bg-surface px-3 py-2"
        >
          <MaterialIcons name="logout" size={16} color="#a1a1aa" />
          <Text className="text-xs text-white/50">Logout</Text>
        </Pressable>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap gap-3 px-6">
        <StatCard
          icon="whatshot"
          label="Streak"
          value={`${stats.streak} days`}
          color="#f97316"
        />
        <StatCard
          icon="star"
          label="XP"
          value={stats.xp.toString()}
          color="#6366f1"
        />
        <StatCard
          icon="trending-up"
          label="Level"
          value={stats.level.toString()}
          color="#a855f7"
        />
        <StatCard
          icon="quiz"
          label="Quizzes"
          value={stats.quizzes.toString()}
          color="#22c55e"
        />
      </View>

      {/* Recent Activity */}
      <View className="mt-8 px-6">
        <Text className="mb-4 text-lg font-semibold text-text">
          Recent Activity
        </Text>
        <View className="gap-3">
          <ActivityItem
            icon="emoji-events"
            title="Achievement Unlocked"
            subtitle="First quiz completed"
            color="#eab308"
          />
          <ActivityItem
            icon="bolt"
            title="XP Earned"
            subtitle="+50 XP for completing a lesson"
            color="#6366f1"
          />
          <ActivityItem
            icon="whatshot"
            title="Streak Milestone"
            subtitle="3-day streak reached!"
            color="#f97316"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View className="mt-8 px-6">
        <Text className="mb-4 text-lg font-semibold text-text">
          Quick Actions
        </Text>
        <Pressable
          onPress={() => router.push("/(main)/notes")}
          className="flex-row items-center gap-4 rounded-2xl border border-gray-800 bg-surface p-4 active:opacity-80"
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

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="w-[47%] rounded-2xl border border-gray-800 bg-surface p-5">
      <View
        className="mb-3 h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text className="text-2xl font-bold text-text">{value}</Text>
      <Text className="mt-1 text-sm text-white/50">{label}</Text>
    </View>
  );
}

function ActivityItem({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-800 bg-surface p-4">
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-text">{title}</Text>
        <Text className="text-xs text-white/50">{subtitle}</Text>
      </View>
    </View>
  );
}
