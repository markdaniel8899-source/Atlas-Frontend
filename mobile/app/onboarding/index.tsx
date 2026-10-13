import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { router } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { BookOpen, Sparkles, Target, WifiOff } from "lucide-react-native";

const { width } = Dimensions.get("window");

const CARDS = [
  {
    icon: Target,
    title: "Your Learning Path",
    description:
      "AI-powered roadmaps that adapt to your pace. Track XP, streaks, and mastery across every topic.",
  },
  {
    icon: Sparkles,
    title: "Smart Quizzes",
    description:
      "Generate quizzes from your notes and courses. Instant feedback with detailed explanations.",
  },
  {
    icon: WifiOff,
    title: "Works Offline",
    description:
      "Write notes, review flashcards, and track focus sessions — even without internet.",
  },
  {
    icon: BookOpen,
    title: "Everything in One Place",
    description:
      "Notes, roadmaps, quizzes, and progress — all synced across web and mobile.",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const opacity = useSharedValue(1);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setIndex(viewableItems[0].index);
      }
    },
  );

  const isLast = index === CARDS.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.push("/auth/login");
    } else {
      flatListRef.current?.scrollToIndex({ index: index + 1 });
    }
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        ref={flatListRef}
        data={CARDS}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View
              className="flex-1 items-center justify-center px-10"
              style={{ width }}
            >
              <View className="mb-8 grid h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
                <Icon size={40} stroke="#818cf8" />
              </View>
              <Text className="text-center text-2xl font-bold text-text">
                {item.title}
              </Text>
              <Text className="mt-4 text-center text-base leading-relaxed text-text-muted">
                {item.description}
              </Text>
            </View>
          );
        }}
      />

      {/* Dots */}
      <View className="flex-row items-center justify-center gap-2 pb-8">
        {CARDS.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-primary" : "w-2 bg-border"
            }`}
          />
        ))}
      </View>

      {/* Button */}
      <View className="px-8 pb-12">
        <Pressable
          onPress={handleNext}
          className="items-center rounded-2xl bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
        {!isLast && (
          <Pressable
            onPress={() => router.push("/auth/login")}
            className="mt-3 items-center py-2"
          >
            <Text className="text-sm text-text-muted">Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
