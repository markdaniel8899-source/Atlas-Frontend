import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Award,
  Flame,
  LogOut,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

interface Stats {
  xp: number;
  streak: number;
  quizzes: number;
  courses: number;
}

export default function DashboardHome() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    xp: 0,
    streak: 0,
    quizzes: 0,
    courses: 0,
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
        setStats({
          xp: data.xp ?? 0,
          streak: data.streak ?? 0,
          quizzes: data.quizzes_taken ?? 0,
          courses: 0,
        });
      }
    } catch {
      // offline or error — keep defaults
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
          <Text className="text-sm text-text-muted">Welcome back</Text>
          <Text className="mt-1 text-2xl font-bold text-text">
            {session?.user.email?.split("@")[0] ?? "Learner"}
          </Text>
        </View>
        <Pressable
          onPress={() => void handleLogout()}
          className="flex-row items-center gap-1 rounded-full border border-border bg-surface px-3 py-2"
        >
          <LogOut size={16} stroke="#a1a1aa" />
          <Text className="text-xs text-text-muted">Logout</Text>
        </Pressable>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap gap-4 px-6">
        <StatCard
          icon={Sparkles}
          label="Total XP"
          value={stats.xp}
          color="#818cf8"
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={stats.streak}
          color="#f97316"
        />
        <StatCard
          icon={Target}
          label="Quizzes"
          value={stats.quizzes}
          color="#22c55e"
        />
        <StatCard
          icon={TrendingUp}
          label="Courses"
          value={stats.courses}
          color="#a855f7"
        />
      </View>

      {/* Quick Actions */}
      <View className="mt-8 px-6">
        <Text className="mb-4 text-lg font-semibold text-text">
          Quick Actions
        </Text>
        <View className="gap-3">
          <ActionButton
            icon={Target}
            label="Start a Quiz"
            onPress={() => router.push("/(dashboard)/quiz")}
          />
          <ActionButton
            icon={Award}
            label="Write a Note"
            onPress={() => router.push("/(dashboard)/notes")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-1 min-w-[45%] rounded-2xl border border-border bg-surface p-5">
      <View
        className="mb-3 grid h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} stroke={color} />
      </View>
      <Text className="text-2xl font-bold text-text">{value}</Text>
      <Text className="mt-1 text-sm text-text-muted">{label}</Text>
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Target;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-4 active:opacity-80"
    >
      <View className="grid h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon size={20} stroke="#818cf8" />
      </View>
      <Text className="flex-1 text-base font-medium text-text">{label}</Text>
      <Text className="text-text-muted">→</Text>
    </Pressable>
  );
}
