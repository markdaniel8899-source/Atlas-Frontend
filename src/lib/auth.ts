import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  error?: string;
  /** Sign up succeeded but the address still needs confirming by email. */
  needsConfirmation?: boolean;
}

export const CONFIG_ERROR =
  "Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.";

const CACHE_KEY = "atlas.user";

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
  if (m.includes("invalid login")) {
    return "That email and password combination didn't work.";
  }
  if (m.includes("already registered")) {
    return "An account with this email already exists.";
  }
  if (m.includes("at least") && m.includes("password")) {
    return "Passwords must be at least 6 characters long.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Give it a moment and try again.";
  }
  return message;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) return { error: readableError(error.message) };

  if (data.session && data.user) {
    writeCache(toAuthUser(data.user));
    return {};
  }

  return { needsConfirmation: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { error: CONFIG_ERROR };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: readableError(error.message) };

  if (data.user) writeCache(toAuthUser(data.user));
  return {};
}

export async function signOut(): Promise<void> {
  writeCache(null);
  if (isSupabaseConfigured) await supabase.auth.signOut();
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
