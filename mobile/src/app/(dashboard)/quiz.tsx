import { Pressable, Text, View } from "react-native";
import { BookOpen, Sparkles } from "lucide-react-native";

export default function Quiz() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="mb-6 grid h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
        <Sparkles size={40} stroke="#818cf8" />
      </View>
      <Text className="text-2xl font-bold text-text">Quiz Coming Soon</Text>
      <Text className="mt-3 text-center text-base leading-relaxed text-text-muted">
        AI-powered quizzes from your notes and courses will be available here
        soon.
      </Text>
      <Pressable className="mt-8 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3.5 active:opacity-80">
        <BookOpen size={18} stroke="#818cf8" />
        <Text className="text-sm font-medium text-primary-light">
          Explore on Web
        </Text>
      </Pressable>
    </View>
  );
}
