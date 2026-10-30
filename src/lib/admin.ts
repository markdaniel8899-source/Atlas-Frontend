import { supabase } from "./supabase";

/**
 * Admin data access for /wp-admin.
 *
 * Every sensitive capability is enforced in the database (see
 * supabase/migrations/0014_admin.sql): `is_admin()` gates RLS policies and
 * the SECURITY DEFINER RPCs below, so a tampered client that skips the
 * role check still gets nothing back. The client-side role check in
 * AdminRoute is a UX guard only.
 */

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminPost {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  metaTitle: string | null;
  seoScore: number | null;
  wordCount: number | null;
  pipelineRunId: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalQuizzes: number;
}

/**
 * The signed-in user's role from profiles. Null when signed out or the
 * profile row is missing.
 *
 * IMPORTANT: must filter by the current user id. profiles is readable by all
 * authenticated users (RLS), so an unfiltered `.single()` would try to collapse
 * every row into one, error with "multiple rows returned", and return null —
 * which made every admin look like a non-admin.
 */
export async function fetchMyRole(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const role = await fetchMyRole();
  return role === "admin";
}

/** All users (with email from auth.users). Empty array for non-admins. */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    username: String(r.username ?? ""),
    displayName: String(r.display_name ?? ""),
    avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
    email: String(r.email ?? ""),
    role: String(r.role ?? "user"),
    createdAt: String(r.created_at ?? ""),
  }));
}

/** Deletes the auth user; cascades to profiles + all user-owned rows. */
export async function deleteAdminUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_user", {
    target: userId,
  });
  if (error) throw new Error(error.message);
}

/**
 * All blog posts (drafts included for admins, via RLS). Ordered newest first.
 */
export async function fetchAdminPosts(): Promise<AdminPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, tags, created_at, updated_at, published_at, meta_title, seo_score, word_count, pipeline_run_id",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    slug: String(r.slug ?? ""),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    createdAt: String(r.created_at ?? ""),
    updatedAt: r.updated_at ? String(r.updated_at) : null,
    publishedAt: r.published_at ? String(r.published_at) : null,
    metaTitle: r.meta_title ? String(r.meta_title) : null,
    seoScore: r.seo_score == null ? null : Number(r.seo_score),
    wordCount: r.word_count == null ? null : Number(r.word_count),
    pipelineRunId: r.pipeline_run_id ? String(r.pipeline_run_id) : null,
  }));
}

export async function deleteAdminPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", postId);
  if (error) throw new Error(error.message);
}

/**
 * Platform-wide counts. Users/posts come from head-count queries; the quiz
 * count uses quiz_attempts (admin SELECT policy in 0014). Falls back to 0 on
 * error so one missing policy never blanks the whole overview.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [users, posts, quizzes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true }),
  ]);
  return {
    totalUsers: users.count ?? 0,
    totalPosts: posts.count ?? 0,
    totalQuizzes: quizzes.count ?? 0,
  };
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Contact-form inbox, newest first (admin SELECT policy in 0017).
 */
export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, is_read, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    subject: String(r.subject ?? ""),
    message: String(r.message ?? ""),
    isRead: Boolean(r.is_read),
    createdAt: String(r.created_at ?? ""),
  }));
}

export async function markContactMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: true })
    .eq("id", messageId);
  if (error) throw new Error(error.message);
}

export async function deleteContactMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", messageId);
  if (error) throw new Error(error.message);
}

/** Unread count for the sidebar badge; 0 when the inbox is unavailable. */
export async function fetchUnreadMessageCount(): Promise<number> {
  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

export interface UsageStats {
  totalQuizzes: number;
  totalUsers: number;
  totalPosts: number;
  totalFocusSeconds: number;
}

export interface RecentAttempt {
  id: string;
  quizId: string;
  score: number;
  isCorrect: boolean;
  createdAt: string;
}

/**
 * Usage & Analytics numbers. Counts reuse fetchAdminStats-style head queries;
 * focus time sums learning_sessions.total_seconds platform-wide (admin SELECT
 * policy in 0017). Each source falls back to 0 on error so one missing policy
 * never blanks the page.
 */
export async function fetchUsageStats(): Promise<UsageStats> {
  const [users, posts, quizzes, focus] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    supabase.from("learning_sessions").select("total_seconds"),
  ]);
  const rows = (focus.data ?? []) as Array<{ total_seconds?: unknown }>;
  return {
    totalUsers: users.count ?? 0,
    totalPosts: posts.count ?? 0,
    totalQuizzes: quizzes.count ?? 0,
    totalFocusSeconds: focus.error
      ? 0
      : rows.reduce((sum, r) => sum + (Number(r.total_seconds) || 0), 0),
  };
}

/** Newest quiz attempts for the Recent Activity list. */
export async function fetchRecentAttempts(
  limit = 5,
): Promise<RecentAttempt[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, score, is_correct, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    quizId: String(r.quiz_id ?? ""),
    score: Number(r.score) || 0,
    isCorrect: Boolean(r.is_correct),
    createdAt: String(r.created_at ?? ""),
  }));
}
