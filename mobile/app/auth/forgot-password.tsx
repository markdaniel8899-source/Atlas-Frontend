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
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setSent(true);
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
          <Text className="text-3xl font-bold text-text">Reset password</Text>
          <Text className="mt-2 text-base text-white/60">
            {sent
              ? "Check your email for a reset link."
              : "Enter your email to get a reset link."}
          </Text>
        </View>

        {!sent ? (
          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-medium text-white/50">
                Email
              </Text>
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

            <Pressable
              onPress={() => void handleReset()}
              disabled={loading}
              className="mt-2 items-center rounded-2xl bg-primary py-4 active:opacity-80"
            >
              <Text className="text-base font-semibold text-white">
                {loading ? "Sending..." : "Send Reset Link"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.back()}
            className="items-center rounded-2xl bg-primary py-4 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">
              Back to Sign In
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
