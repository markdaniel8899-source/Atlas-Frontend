import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { CurtainTransition } from "../../components/CurtainTransition";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    // Double Curtain Transition
    setShowCurtain(true);
  };

  const onCurtainComplete = () => {
    router.replace("/(main)/dashboard");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CurtainTransition visible={showCurtain} onComplete={onCurtainComplete} />

      <View className="flex-1 justify-center px-8">
        <Pressable
          onPress={() => router.back()}
          className="absolute top-12 left-8 flex-row items-center gap-1"
        >
          <MaterialIcons name="arrow-back" size={20} color="#a1a1aa" />
          <Text className="text-sm text-white/50">Back</Text>
        </Pressable>

        <View className="mb-10">
          <Text className="text-3xl font-bold text-text">Welcome back</Text>
          <Text className="mt-2 text-base text-white/60">
            Sign in to continue learning
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-medium text-white/50">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-2xl border border-gray-800 bg-surface px-4 py-4 text-base text-text"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-white/50">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              className="rounded-2xl border border-gray-800 bg-surface px-4 py-4 text-base text-text"
            />
          </View>

          <Link href="/auth/forgot-password" asChild>
            <Pressable className="self-end py-1">
              <Text className="text-sm text-primary">Forgot password?</Text>
            </Pressable>
          </Link>

          <Pressable
            onPress={() => void handleLogin()}
            disabled={loading}
            className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-sm text-white/50">Don't have an account?</Text>
            <Link href="/auth/signup" asChild>
              <Pressable>
                <Text className="text-sm font-medium text-primary"> Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
