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
import { ArrowLeft, Loader2 } from "lucide-react-native";
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
          <ArrowLeft size={20} stroke="#a1a1aa" />
          <Text className="text-sm text-text-muted">Back</Text>
        </Pressable>

        <View className="mb-10">
          <Text className="text-3xl font-bold text-text">Reset password</Text>
          <Text className="mt-2 text-base text-text-muted">
            {sent
              ? "Check your email for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </Text>
        </View>

        {!sent ? (
          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-medium text-text-muted">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                keyboardType="email-address"
                className="rounded-2xl border border-border bg-surface px-4 py-4 text-base text-text"
              />
            </View>

            <Pressable
              onPress={() => void handleReset()}
              disabled={loading}
              className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 active:opacity-80"
            >
              {loading && <Loader2 size={20} stroke="#fff" />}
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
