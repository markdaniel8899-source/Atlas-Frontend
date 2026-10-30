import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";
import { safeGetItem, safeSetItem, safeRemoveItem, CACHE_PREFIX } from "./cache";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  error?: string;
}

export const CONFIG_ERROR =
  "Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.";

const CACHE_KEY = `${CACHE_PREFIX}user`;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Synchronous read of the cached user, safe for render-time use. */
export function getUser(): AuthUser | null {
  return safeGetItem<AuthUser>(CACHE_KEY);
}

export function clearSession(): void {
  safeRemoveItem(CACHE_KEY);
}

function writeCache(user: AuthUser | null): void {
  if (user) safeSetItem(CACHE_KEY, user);
  else safeRemoveItem(CACHE_KEY);
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
  if (m.includes("user not found") || m.includes("signups not allowed")) {
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
 * Creates an account without sending a confirmation link.
 *
 * IMPORTANT: In Supabase Dashboard > Authentication > Providers > Email,
 * set "Confirm email" to OFF. OTP delivery is handled separately by
 * sendEmailOtp(), and the Magic Link email template must render
 * {{ .Token }} instead of {{ .ConfirmationURL }}.
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { full_name: name.trim() },
    },
  });

  if (error) return { error: readableError(error.message) };

  // Supabase returns an obfuscated user with no identities when the address
  // is already registered and email enumeration protection is on.
  if (
    data.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    return { error: "An account with this email already exists." };
  }

  // With email confirmation disabled Supabase signs the user in immediately;
  // drop that local session so verification always goes through the OTP step.
  if (data.session) await supabase.auth.signOut({ scope: "local" });

  return {};
}

/** Sends a 6-digit email OTP without ever creating a new account. */
export async function sendEmailOtp(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) return { error: readableError(error.message) };
  return {};
}

/** Verifies a 6-digit email OTP for signup or password recovery. */
export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
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
  return {};
}

/** Default login: email + password, no OTP. */
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

  if (error) return { error: readableError(error.message) };

  if (data.user) writeCache(toAuthUser(data.user));
  return {};
}

export async function signOut(
  scope: "global" | "local" = "global",
): Promise<void> {
  writeCache(null);
  if (isSupabaseConfigured) await supabase.auth.signOut({ scope });
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

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    clearSession();
    return null;
  }

  const user = toAuthUser(session.user);
  writeCache(user);
  return user;
}
