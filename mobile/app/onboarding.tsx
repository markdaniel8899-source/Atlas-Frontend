import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";

export default function Onboarding() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-6 pt-20 pb-8">
          <Text className="text-4xl font-bold text-text text-center">
            ATLAS
          </Text>
          <Text className="text-xl text-gray-400 text-center mt-2">
            Learning OS
          </Text>
          <Text className="text-base text-gray-500 text-center mt-4">
            AI-Powered Learning Platform
          </Text>
        </View>

        <View className="px-6 mt-8">
          <View className="bg-surface rounded-2xl p-6 mb-4 border border-gray-800">
            <Text className="text-2xl mb-2">🤖</Text>
            <Text className="text-lg font-bold text-text">AI Quizzes</Text>
            <Text className="text-gray-400 mt-2">
              Generate smart quizzes instantly from your notes and courses
            </Text>
          </View>

          <View className="bg-surface rounded-2xl p-6 mb-4 border border-gray-800">
            <Text className="text-2xl mb-2">🏆</Text>
            <Text className="text-lg font-bold text-text">Gamification</Text>
            <Text className="text-gray-400 mt-2">
              Earn XP, streaks, and badges as you learn
            </Text>
          </View>

          <View className="bg-surface rounded-2xl p-6 mb-4 border border-gray-800">
            <Text className="text-2xl mb-2">📱</Text>
            <Text className="text-lg font-bold text-text">Learn Anywhere</Text>
            <Text className="text-gray-400 mt-2">
              Offline notes & mobile learning on the go
            </Text>
          </View>
        </View>

        <View className="flex-1" />

        <Pressable
          onPress={() => router.push("/auth/login")}
          className="bg-primary py-4 rounded-xl mx-4 mb-8 mt-8 active:opacity-80"
        >
          <Text className="text-white text-center font-bold text-base">
            Get Started
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
