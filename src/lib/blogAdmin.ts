import { supabase } from "./supabase";

/**
 * Admin client for the AutoBlog API. Every call carries the signed-in
 * Supabase access token; the FastAPI dependency validates it against
 * Supabase and checks `profiles.role === 'admin'` server-side. The secret
 * admin key never reaches the browser.
 */

export type PipelineRunStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type PipelineStepStatus =
  | "started"
  | "completed"
  | "failed"
  | "skipped";

export interface PipelineRun {
  id: string;
  trigger: "cron" | "admin" | "manual" | "retry";
  status: PipelineRunStatus;
  current_stage: string | null;
  topic_id: string | null;
  post_id: string | null;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  word_count: number | null;
  error: string | null;
  provider_summary: Record<string, unknown>;
  created_at: string;
}

export interface PipelineStep {
  id: number;
  run_id: string;
  stage: string;
  status: PipelineStepStatus;
  attempt: number;
  provider: string | null;
  model: string | null;
  duration_ms: number | null;
  detail: Record<string, unknown>;
  error: string | null;
  created_at: string;
}

export interface AdminPostPreview {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  keywords: string[];
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seo_score: number | null;
  word_count: number | null;
  gate_report: unknown;
  content_images: unknown;
}

export interface PipelineRunDetail {
  run: PipelineRun;
  steps: PipelineStep[];
  gate_report: unknown;
  post: AdminPostPreview | null;
}

export interface DeployResult {
  triggered: boolean;
  error?: string;
  status_code?: number;
  [key: string]: unknown;
}

export interface TriggerResult {
  run_id: string;
  status: string;
  trigger: string;
}

const API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_AI_API_URL as string | undefined) ??
  ""
).replace(/\/+$/, "");

function apiBase(): string {
  if (!API_BASE) {
    throw new Error(
      "Admin API URL is not configured. Set VITE_API_URL or VITE_AI_API_URL.",
    );
  }
  return API_BASE;
}

interface ApiErrorBody {
  detail?: unknown;
}

function errorDetail(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as ApiErrorBody).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const message = (item as { msg?: unknown }).msg;
        return typeof message === "string" && message ? [message] : [];
      });
      if (messages.length) return messages.join(" ");
    }
  }
  return `Request failed with HTTP ${status}.`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Admin session expired. Sign in again.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorDetail(body, response.status));
  }
  return body as T;
}

export function fetchPipelineStatus(): Promise<{ run: PipelineRun | null }> {
  return request<{ run: PipelineRun | null }>("/api/blog/pipeline/status");
}

export function fetchPipelineRuns(
  limit = 20,
): Promise<{ items: PipelineRun[]; count: number }> {
  return request<{ items: PipelineRun[]; count: number }>(
    `/api/blog/pipeline/runs?limit=${encodeURIComponent(String(limit))}`,
  );
}

export function fetchPipelineRun(runId: string): Promise<PipelineRunDetail> {
  return request<PipelineRunDetail>(
    `/api/blog/pipeline/runs/${encodeURIComponent(runId)}`,
  );
}

export function triggerPipeline(
  trigger: "cron" | "admin" | "manual" | "retry" = "admin",
): Promise<TriggerResult> {
  return request<TriggerResult>(
    `/api/blog/pipeline/run?trigger=${encodeURIComponent(trigger)}`,
    { method: "POST" },
  );
}

export function fetchPostPreview(postId: string): Promise<AdminPostPreview> {
  return request<AdminPostPreview>(
    `/api/blog/admin/posts/${encodeURIComponent(postId)}/preview`,
  );
}

export function publishPost(
  postId: string,
): Promise<{ published: boolean; post_id: string; deploy: DeployResult }> {
  return request<{
    published: boolean;
    post_id: string;
    deploy: DeployResult;
  }>(`/api/blog/admin/posts/${encodeURIComponent(postId)}/publish`, {
    method: "POST",
  });
}

export function unpublishPost(
  postId: string,
): Promise<{ published: boolean; post_id: string; deploy: DeployResult }> {
  return request<{
    published: boolean;
    post_id: string;
    deploy: DeployResult;
  }>(`/api/blog/admin/posts/${encodeURIComponent(postId)}/unpublish`, {
    method: "POST",
  });
}

export function rebuildSite(): Promise<DeployResult> {
  return request<DeployResult>("/api/blog/admin/deploy", { method: "POST" });
}
