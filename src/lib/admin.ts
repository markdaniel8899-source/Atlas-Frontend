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
  publishedAt: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalQuizzes: number;
}

/** The signed-in user's role from profiles. 'user' when unknown/missing. */
export async function fetchMyRole(): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
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
    .select("id, title, slug, tags, created_at, published_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    slug: String(r.slug ?? ""),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    createdAt: String(r.created_at ?? ""),
    publishedAt: r.published_at ? String(r.published_at) : null,
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
