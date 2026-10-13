import { Redirect, Tabs } from "expo-router";
import { BookOpen, Home, StickyNote, Timer } from "lucide-react-native";
import { useAuth } from "../../lib/auth";

export default function DashboardLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#18181b",
          borderTopColor: "#27272a",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#52525b",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Home size={22} stroke={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color }) => (
            <StickyNote size={22} stroke={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: "Focus",
          tabBarIcon: ({ color }) => (
            <Timer size={22} stroke={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: "Quiz",
          tabBarIcon: ({ color }) => (
            <BookOpen size={22} stroke={color} />
          ),
        }}
      />
    </Tabs>
  );
}
