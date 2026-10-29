import { getUser } from "../auth";
import { supabase } from "../supabase";

export interface IncomingFriendRequest {
  friendshipId: number;
  requesterId: string;
  createdAt: string | null;
}

export interface AcceptedInvite {
  friendshipId: number;
  peerId: string;
  updatedAt: string | null;
}

export interface SharedNote {
  id: number;
  title: string;
  sharedBy: string;
  sharedAt: string | null;
}

export async function fetchIncomingFriendRequests(): Promise<
  IncomingFriendRequest[]
> {
  const me = getUser();
  if (!me) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, created_at")
    .eq("addressee_id", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !Array.isArray(data)) return [];

  return (
    data as unknown as {
      id: number;
      requester_id: string;
      created_at: string | null;
    }[]
  )
    .filter((row) => typeof row.requester_id === "string")
    .map((row) => ({
      friendshipId: row.id,
      requesterId: row.requester_id,
      createdAt: row.created_at,
    }));
}

/** Requests I sent that were accepted recently (newest first). */
export async function fetchAcceptedInvites(
  limit = 8,
): Promise<AcceptedInvite[]> {
  const me = getUser();
  if (!me) return [];

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("friendships")
    .select("id, addressee_id, updated_at")
    .eq("requester_id", me.id)
    .eq("status", "accepted")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];

  return (
    data as unknown as {
      id: number;
      addressee_id: string | null;
      updated_at: string | null;
    }[]
  )
    .filter((row) => typeof row.addressee_id === "string")
    .map((row) => ({
      friendshipId: row.id,
      peerId: row.addressee_id as string,
      updatedAt: row.updated_at,
    }));
}

/** Notes shared into my account, newest first, limited to a recent window. */
export async function fetchSharedNotes(limit = 8): Promise<SharedNote[]> {
  const me = getUser();
  if (!me) return [];

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, shared_by, shared_at")
    .eq("user_id", me.id)
    .not("shared_by", "is", null)
    .gte("shared_at", since)
    .order("shared_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];

  return (
    data as unknown as {
      id: number;
      title: string | null;
      shared_by: string | null;
      shared_at: string | null;
    }[]
  )
    .filter((row) => typeof row.shared_by === "string")
    .map((row) => ({
      id: row.id,
      title: row.title ?? "",
      sharedBy: row.shared_by as string,
      sharedAt: row.shared_at,
    }));
}

/** Resolve user ids to display names / handles for notification copy. */
export async function fetchDisplayNames(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const names = new Map<string, string>();
  if (unique.length === 0) return names;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", unique);

  if (error || !Array.isArray(data)) return names;

  for (const row of data as unknown as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[]) {
    const name = (row.display_name ?? "").trim() || row.username || "";
    if (name) names.set(row.id, name);
  }

  return names;
}