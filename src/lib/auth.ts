import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  error?: string;
  /** Sign up succeeded but the address still needs verifying with an OTP. */
  needsOtp?: boolean;
  /** OTP verified successfully and a session was created. */
  otpVerified?: boolean;
  /** Sign in failed because the address has not been verified yet. */
  needsVerification?: boolean;
}

export const CONFIG_ERROR =
  "Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.";

const CACHE_KEY = "atlas.user";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Synchronous read of the cached user, safe for render-time use. */
export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(CACHE_KEY);
}

function writeCache(user: AuthUser | null): void {
  if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  else localStorage.removeItem(CACHE_KEY);
}

export function toAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const given =
    typeof meta.name === "string"
      ? meta.name.trim()
      : typeof meta.full_name === "string"
        ? meta.full_name.trim()
        : "";
  const fallback = (user.email ?? "").split("@")[0].replace(/[._-]+/g, " ");
  return {
    id: user.id,
    email: user.email ?? "",
    name: given || fallback || "Explorer",
  };
}

function readableError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Invalid credentials.";
  }
  if (m.includes("user not found")) {
    return "Email does not exist.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (m.includes("at least") && m.includes("password")) {
    return "Password must be at least 8 characters.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Give it a moment and try again.";
  }
  return message;
}

/**
 * The public `profiles` table has no email column (emails live in
 * `auth.users`) and its RLS only allows authenticated reads, so the
 * existence check runs through a SECURITY DEFINER RPC instead.
 * Returns null when the RPC is unavailable so callers can degrade safely.
 */
export async function emailExists(email: string): Promise<boolean | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc("email_exists", {
    p_email: normalizeEmail(email),
  });

  if (error) return null;
  return data === true;
}

/**
 * Sends a 6-digit email OTP for a new account via `signInWithOtp`.
 * The password is applied after `verifyOtp` succeeds (see Auth.tsx) so
 * password sign-in keeps working without Supabase sending a magic link first.
 */
export async function sendSignupOtp(
  name: string,
  email: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const normalized = normalizeEmail(email);
  const exists = await emailExists(normalized);
  if (exists === true) {
    return { error: "An account with this email already exists." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      data: { name: name.trim() },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) return { error: readableError(error.message) };
  return { needsOtp: true };
}

/** Sends a sign-in OTP to an existing, unverified account. */
export async function sendLoginOtp(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) return { error: readableError(error.message) };
  return { needsOtp: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const normalized = normalizeEmail(email);
  const exists = await emailExists(normalized);

  if (exists === false) return { error: "Email does not exist." };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("email not confirmed")) {
      const sent = await sendLoginOtp(normalized);
      if (sent.error) return { error: sent.error };
      return {
        error:
          "That email isn't verified yet. Enter the 6-digit code we just sent you.",
        needsVerification: true,
      };
    }
    if (message.includes("invalid login credentials")) {
      return { error: "Invalid credentials." };
    }
    return { error: readableError(error.message) };
  }

  if (data.user) writeCache(toAuthUser(data.user));
  return {};
}

export async function verifyOtp(
  email: string,
  token: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const normalized = normalizeEmail(email);
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: token.trim(),
    type: "email",
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("expired") ||
      message.includes("invalid") ||
      message.includes("token")
    ) {
      return {
        error: "That code is invalid or has expired. Resend a new code.",
      };
    }
    return { error: readableError(error.message) };
  }

  if (!data.user || !data.session) {
    return { error: "We couldn't verify that code. Try again." };
  }

  writeCache(toAuthUser(data.user));
  return { otpVerified: true };
}

export async function resendSignupOtp(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) return { error: readableError(error.message) };
  return { needsOtp: true };
}

export async function signOut(
  scope: "global" | "local" = "global",
): Promise<void> {
  writeCache(null);
  if (isSupabaseConfigured) await supabase.auth.signOut({ scope });
}

/** Sends a Supabase password-recovery email for the given address. */
export async function resetPassword(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizeEmail(email),
    {
      redirectTo: `${window.location.origin}/update-password`,
    },
  );

  if (error) return { error: readableError(error.message) };

  return {};
}

/** Updates the user's password. */
export async function updatePassword(
  newPassword: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) return { error: readableError(error.message) };

  return {};
}

/** Restores the persisted session on load and refreshes the cached user. */
export async function resolveSession(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured) {
    clearSession();
    return null;
  }

  const { data } = await supabase.auth.getSession();
  const sessionUser = data.session?.user;

  if (!sessionUser) {
    clearSession();
    return null;
  }

  const user = toAuthUser(sessionUser);
  writeCache(user);
  return user;
}
