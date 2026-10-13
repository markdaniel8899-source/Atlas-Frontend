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
import { supabase } from "../../src/lib/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Signup failed", error.message);
      return;
    }
    if (data.session) {
      router.replace("/(dashboard)");
    } else {
      Alert.alert(
        "Check your email",
        "We sent you a verification link.",
      );
      router.replace("/auth/login");
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center px-8">
        <Pressable
          onPress={() => router.back()}
          className="absolute top-12 left-8 flex-row items-center gap-1"
        >
          <MaterialIcons name="arrow-back" size={20} color="#a1a1aa" />
          <Text className="text-sm text-white/50">Back</Text>
        </Pressable>

        <View className="mb-10">
          <Text className="text-3xl font-bold text-text">Create account</Text>
          <Text className="mt-2 text-base text-white/60">
            Start learning today
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
              className="rounded-2xl border border-white/10 bg-surface px-4 py-4 text-base text-text"
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
              className="rounded-2xl border border-white/10 bg-surface px-4 py-4 text-base text-text"
            />
          </View>

          <Pressable
            onPress={() => void handleSignup()}
            disabled={loading}
            className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">
              {loading ? "Creating account..." : "Sign Up"}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-sm text-white/50">
              Already have an account?
            </Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text className="text-sm font-medium text-primary"> Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
