import { AI_BASE_URL } from "./ai";
import { supabase } from "./supabase";

/**
 * Thin client for the FastAPI gamification endpoints. Every call falls back
 * to the matching Supabase RPC when the AI service is unreachable, so the
 * product keeps working with the backend offline.
 */

const TIMEOUT_MS = 15_000;

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/** Returns the parsed JSON body, or null on network/timeout failure. */
async function postJson<T>(
  path: string,
  body: unknown,
): Promise<T | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${AI_BASE_URL}${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Surface structured backend errors to the caller; only hard network
      // failures return null (which triggers the RPC fallback).
      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
      } | null;
      return {
        ok: false,
        error: payload?.detail ?? `Request failed (${response.status}).`,
      } as T;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface ApiResult {
  ok: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/** Runs the server-side achievement engine; returns newly unlocked codes. */
export async function apiCheckAchievements(): Promise<string[] | null> {
  const result = await postJson<ApiResult>("/api/achievements/check", {});
  if (!result || result.ok === false) return null;
  const unlocked = result.unlocked;
  return Array.isArray(unlocked) ? (unlocked as string[]) : [];
}

/** Validates and stores a DiceBear avatar URL on the profile. */
export async function apiSelectAvatar(
  avatarUrl: string | null,
): Promise<ApiResult | null> {
  return postJson<ApiResult>("/api/avatar/select", { avatar_url: avatarUrl });
}

/** Accepts or declines a squad join request / invite. */
export async function apiRespondSquadRequest(
  requestId: number,
  accept: boolean,
): Promise<ApiResult | null> {
  return postJson<ApiResult>("/api/squads/requests/respond", {
    request_id: requestId,
    accept,
  });
}

/** Creates a squad server-side (used by the FastAPI surface; the app also
 *  has a direct RPC path). */
export async function apiCreateSquad(name: string): Promise<ApiResult | null> {
  return postJson<ApiResult>("/api/squads", { name });
}

/** Files a join request server-side. */
export async function apiJoinSquad(
  squadId: number,
): Promise<ApiResult | null> {
  return postJson<ApiResult>("/api/squads/join", { squad_id: squadId });
}
