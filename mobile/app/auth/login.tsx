import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    router.replace("/(main)/dashboard");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 px-6">
        <View className="mt-16">
          <Text className="text-3xl font-bold text-text text-center">
            Welcome Back
          </Text>
          <Text className="text-gray-400 text-center mt-3">
            Sign in to continue learning
          </Text>
        </View>

        <View className="mt-10 gap-4">
          <View>
            <Text className="text-gray-400 text-sm mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-surface border border-gray-700 rounded-xl p-4 text-text"
            />
          </View>

          <View>
            <Text className="text-gray-400 text-sm mb-2">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#52525b"
              secureTextEntry
              className="bg-surface border border-gray-700 rounded-xl p-4 text-text"
            />
          </View>

          <Pressable
            onPress={() => void handleLogin()}
            disabled={loading}
            className="bg-primary py-4 rounded-xl mt-4 active:opacity-80"
          >
            <Text className="text-white text-center font-bold text-base">
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/auth/forgot-password")}
            className="mt-4"
          >
            <Text className="text-primary text-center text-sm">
              Forgot Password?
            </Text>
          </Pressable>
        </View>

        <View className="flex-1" />

        <Pressable
          onPress={() => router.push("/auth/signup")}
          className="mb-8"
        >
          <Text className="text-gray-400 text-center">
            Don't have an account?{" "}
            <Text className="text-primary font-medium">Sign Up</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
