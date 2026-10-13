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
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
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
        "We sent you a verification link. Please verify your email, then sign in.",
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
          <ArrowLeft size={20} stroke="#a1a1aa" />
          <Text className="text-sm text-text-muted">Back</Text>
        </Pressable>

        <View className="mb-10">
          <Text className="text-3xl font-bold text-text">Create account</Text>
          <Text className="mt-2 text-base text-text-muted">
            Start your learning journey today
          </Text>
        </View>

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

          <View>
            <Text className="mb-2 text-sm font-medium text-text-muted">
              Password
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#52525b"
                secureTextEntry={!showPassword}
                className="rounded-2xl border border-border bg-surface px-4 py-4 pr-12 text-base text-text"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                {showPassword ? (
                  <EyeOff size={20} stroke="#52525b" />
                ) : (
                  <Eye size={20} stroke="#52525b" />
                )}
              </Pressable>
            </View>
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-text-muted">
              Confirm Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry={!showPassword}
              className="rounded-2xl border border-border bg-surface px-4 py-4 text-base text-text"
            />
          </View>

          <Pressable
            onPress={() => void handleSignup()}
            disabled={loading}
            className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 active:opacity-80"
          >
            {loading && <Loader2 size={20} stroke="#fff" />}
            <Text className="text-base font-semibold text-white">
              {loading ? "Creating account..." : "Sign Up"}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-sm text-text-muted">
              Already have an account?
            </Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text className="text-sm font-medium text-primary-light">
                  {" "}Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
