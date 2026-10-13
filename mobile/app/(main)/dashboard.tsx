import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";

export default function Dashboard() {
  const { session } = useAuth();
  const username = session?.user.email?.split("@")[0] ?? "Learner";

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-4 mt-12">
          <Text className="text-gray-400 text-sm">Welcome back</Text>
          <Text className="text-2xl font-bold text-text mt-1">
            Hello, {username}!
          </Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between mx-4 mt-6">
          <View className="bg-surface rounded-xl p-4 flex-1 mr-2 border border-gray-800">
            <Text className="text-2xl">🔥</Text>
            <Text className="text-2xl font-bold text-text mt-2">0</Text>
            <Text className="text-gray-400 text-xs mt-1">Streak</Text>
          </View>
          <View className="bg-surface rounded-xl p-4 flex-1 mx-1 border border-gray-800">
            <Text className="text-2xl">⭐</Text>
            <Text className="text-2xl font-bold text-text mt-2">0</Text>
            <Text className="text-gray-400 text-xs mt-1">XP</Text>
          </View>
          <View className="bg-surface rounded-xl p-4 flex-1 ml-2 border border-gray-800">
            <Text className="text-2xl">🏆</Text>
            <Text className="text-2xl font-bold text-text mt-2">1</Text>
            <Text className="text-gray-400 text-xs mt-1">Level</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <Text className="text-xl font-bold text-text mx-4 mt-8">
          Recent Activity
        </Text>
        <View className="bg-surface rounded-xl p-4 mx-4 mt-4 border border-gray-800">
          <Text className="text-gray-400 text-center">
            No activity yet. Start learning!
          </Text>
        </View>

        {/* Start Quiz Button */}
        <Pressable
          onPress={() => router.push("/(main)/focus")}
          className="bg-primary py-4 rounded-full mx-8 mt-8 shadow-lg active:opacity-80"
        >
          <Text className="text-white text-center font-bold text-base">
            🚀 Start Focus Session
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
