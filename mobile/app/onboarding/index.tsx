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
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const CARDS = [
  {
    icon: "target" as const,
    title: "Your Learning Path",
    description:
      "AI-powered roadmaps that adapt to your pace. Track XP, streaks, and mastery.",
  },
  {
    icon: "auto-awesome" as const,
    title: "Smart Quizzes",
    description:
      "Generate quizzes from your notes. Instant feedback with detailed explanations.",
  },
  {
    icon: "wifi-off" as const,
    title: "Works Offline",
    description:
      "Write notes and track focus sessions — even without internet.",
  },
  {
    icon: "menu-book" as const,
    title: "Everything in One Place",
    description:
      "Notes, roadmaps, quizzes, and progress — synced across all devices.",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
        renderItem={({ item }) => (
          <View
            className="flex-1 items-center justify-center px-10"
            style={{ width }}
          >
            <View className="mb-8 h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
              <MaterialIcons name={item.icon} size={40} color="#818cf8" />
            </View>
            <Text className="text-center text-2xl font-bold text-text">
              {item.title}
            </Text>
            <Text className="mt-4 text-center text-base leading-relaxed text-white/60">
              {item.description}
            </Text>
          </View>
        )}
      />

      <View className="flex-row items-center justify-center gap-2 pb-8">
        {CARDS.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${
              i === index ? "w-6 bg-primary" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </View>

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
            <Text className="text-sm text-white/50">Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
