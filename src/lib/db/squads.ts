import { getUser } from "../auth";
import { supabase } from "../supabase";
import { apiRespondSquadRequest } from "../gamificationApi";
import { levelProgress } from "./types";

export type SquadStatus = "studying" | "online" | "offline";

export interface Squad {
  id: number;
  name: string;
  leaderId: string;
  createdAt: string;
}

export interface SquadAction {
  ok: boolean;
  message: string;
}

export interface Squadmate {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  avatarGradient: string;
  avatarUrl: string | null;
  status: SquadStatus;
  streak: number;
  level: number;
  weeklyXp: number;
  totalXp: number;
  progressPercent: number;
  isLeader: boolean;
  isYou: boolean;
  joinedAt: string;
}

export interface LeaderboardRow {
  position: number;
  member: Squadmate;
}

export interface BrowseSquad {
  id: number;
  name: string;
  leaderName: string;
  memberCount: number;
  isMember: boolean;
  requested: boolean;
}

export interface SquadNotification {
  id: number;
  kind: "request" | "invite";
  squadId: number;
  squadName: string;
  userId: string;
  displayName: string;
  username: string;
  initials: string;
  avatarGradient: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface MySquad {
  squad: Squad | null;
  members: Squadmate[];
  /** Join requests waiting on me (leader only). */
  pendingRequests: SquadNotification[];
  /** Invites waiting on me (non-leader). */
  pendingInvites: SquadNotification[];
}

const GRADIENTS = [
  "from-[#3d4f9e] to-[#7b8ee8]",
  "from-[#2f6f6a] to-[#5fbdb2]",
  "from-[#6b3fa0] to-[#a982e0]",
  "from-[#a0593f] to-[#e0975f]",
  "from-[#28617e] to-[#5aa7cd]",
  "from-[#7e3f5c] to-[#cd6f95]",
];

const PROFILE_COLUMNS =
  "id, display_name, username, streak, xp, level, weekly_xp, total_xp, avatar_url, last_active_date";

interface ProfileRow {
  id: string;
  display_name: string;
  username: string;
  streak: number;
  xp: number;
  level: number;
  weekly_xp: number;
  total_xp: number;
  avatar_url: string | null;
  last_active_date: string | null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hashOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function gradientFor(id: string): string {
  return GRADIENTS[hashOf(id) % GRADIENTS.length];
}

function daysAgo(date: string | null): number | null {
  if (!date) return null;
  const parsed = Date.parse(`${date}T00:00:00`);
  if (Number.isNaN(parsed)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - parsed) / 86_400_000);
}

function statusFrom(lastActive: string | null): SquadStatus {
  const gap = daysAgo(lastActive);
  if (gap !== null && gap <= 0) return "studying";
  if (gap !== null && gap === 1) return "online";
  return "offline";
}

function toSquadmate(
  profile: ProfileRow,
  leaderId: string,
  meId: string,
  joinedAt: string,
): Squadmate {
  const displayName = profile.display_name.trim() || profile.username;
  const progress = levelProgress(profile.xp);
  return {
    id: profile.id,
    displayName,
    username: profile.username,
    initials: initialsOf(displayName),
    avatarGradient: gradientFor(profile.id),
    avatarUrl: profile.avatar_url,
    status: statusFrom(profile.last_active_date),
    streak: profile.streak,
    level: profile.level,
    weeklyXp: profile.weekly_xp ?? 0,
    totalXp: profile.total_xp ?? profile.xp,
    progressPercent: Math.round(progress.percent),
    isLeader: profile.id === leaderId,
    isYou: profile.id === meId,
    joinedAt,
  };
}

async function fetchProfiles(
  ids: string[],
): Promise<Map<string, ProfileRow>> {
  const byId = new Map<string, ProfileRow>();
  if (ids.length === 0) return byId;
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", ids);
  for (const row of (data ?? []) as ProfileRow[]) {
    byId.set(row.id, row);
  }
  return byId;
}

async function squadNameMap(
  ids: number[],
): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  if (ids.length === 0) return names;
  const { data } = await supabase
    .from("squads")
    .select("id, name")
    .in("id", ids);
  for (const row of (data ?? []) as { id: number; name: string }[]) {
    names.set(row.id, row.name);
  }
  return names;
}

/** The signed-in user's squad (or null) with the full roster. */
export async function fetchMySquad(): Promise<MySquad> {
  const me = getUser();
  if (!me) return { squad: null, members: [], pendingRequests: [], pendingInvites: [] };

  const { data: membership } = await supabase
    .from("squad_members")
    .select("squad_id, joined_at")
    .eq("user_id", me.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      squad: null,
      members: [],
      pendingRequests: [],
      pendingInvites: await fetchInvitesForMe(me.id),
    };
  }

  const squadId = (membership as { squad_id: number }).squad_id;

  const [{ data: squadRow }, { data: memberRows }] = await Promise.all([
    supabase
      .from("squads")
      .select("id, name, leader_id, created_at")
      .eq("id", squadId)
      .maybeSingle(),
    supabase
      .from("squad_members")
      .select("user_id, joined_at")
      .eq("squad_id", squadId)
      .order("joined_at"),
  ]);

  if (!squadRow) {
    return { squad: null, members: [], pendingRequests: [], pendingInvites: [] };
  }

  const squad: Squad = {
    id: (squadRow as { id: number }).id,
    name: (squadRow as { name: string }).name,
    leaderId: (squadRow as { leader_id: string }).leader_id,
    createdAt: (squadRow as { created_at: string }).created_at,
  };

  const rows = (memberRows ?? []) as { user_id: string; joined_at: string }[];
  const profiles = await fetchProfiles(rows.map((row) => row.user_id));
  const members: Squadmate[] = [];
  for (const row of rows) {
    const profile = profiles.get(row.user_id);
    if (!profile) continue;
    members.push(toSquadmate(profile, squad.leaderId, me.id, row.joined_at));
  }

  const pendingRequests = squad.leaderId === me.id
    ? await fetchJoinRequestsForSquad(squadId, squad.name, me.id)
    : [];

  return {
    squad,
    members,
    pendingRequests,
    pendingInvites: await fetchInvitesForMe(me.id),
  };
}

async function fetchJoinRequestsForSquad(
  squadId: number,
  squadName: string,
  _leaderId: string,
): Promise<SquadNotification[]> {
  const { data } = await supabase
    .from("squad_requests")
    .select("id, squad_id, user_id, invited_by, created_at")
    .eq("squad_id", squadId)
    .eq("status", "pending")
    .is("invited_by", null)
    .order("created_at");

  const rows = (data ?? []) as {
    id: number;
    squad_id: number;
    user_id: string;
    invited_by: string | null;
    created_at: string;
  }[];
  const profiles = await fetchProfiles(rows.map((row) => row.user_id));

  const out: SquadNotification[] = [];
  for (const row of rows) {
    const profile = profiles.get(row.user_id);
    if (!profile) continue;
    const displayName = profile.display_name.trim() || profile.username;
    out.push({
      id: row.id,
      kind: "request",
      squadId: row.squad_id,
      squadName,
      userId: row.user_id,
      displayName,
      username: profile.username,
      initials: initialsOf(displayName),
      avatarGradient: gradientFor(row.user_id),
      avatarUrl: profile.avatar_url,
      createdAt: row.created_at,
    });
  }
  return out;
}

async function fetchInvitesForMe(meId: string): Promise<SquadNotification[]> {
  const { data } = await supabase
    .from("squad_requests")
    .select("id, squad_id, user_id, invited_by, created_at")
    .eq("status", "pending")
    .eq("user_id", meId)
    .not("invited_by", "is", null)
    .order("created_at");

  const rows = (data ?? []) as {
    id: number;
    squad_id: number;
    user_id: string;
    invited_by: string | null;
    created_at: string;
  }[];
  const names = await squadNameMap(rows.map((row) => row.squad_id));

  const out: SquadNotification[] = [];
  for (const row of rows) {
    out.push({
      id: row.id,
      kind: "invite",
      squadId: row.squad_id,
      squadName: names.get(row.squad_id) ?? "A squad",
      userId: row.user_id,
      displayName: "",
      username: "",
      initials: "",
      avatarGradient: gradientFor(String(row.squad_id)),
      avatarUrl: null,
      createdAt: row.created_at,
    });
  }
  return out;
}

/** Weekly squad leaderboard - my squad sorted by weekly XP. */
export async function fetchSquadLeaderboard(): Promise<LeaderboardRow[]> {
  const { squad, members } = await fetchMySquad();
  if (!squad) return [];
  return [...members]
    .sort((a, b) => b.weeklyXp - a.weeklyXp || b.totalXp - a.totalXp)
    .map((member, index) => ({ position: index + 1, member }));
}

/** Open squads to browse and request joining. */
export async function fetchBrowseSquads(): Promise<BrowseSquad[]> {
  const me = getUser();
  if (!me) return [];

  const [{ data: squadRows }, { data: memberRows }, { data: requestRows }] =
    await Promise.all([
      supabase
        .from("squads")
        .select("id, name, leader_id, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("squad_members").select("squad_id, user_id"),
      supabase
        .from("squad_requests")
        .select("squad_id")
        .eq("user_id", me.id)
        .eq("status", "pending"),
    ]);

  const squads = (squadRows ?? []) as {
    id: number;
    name: string;
    leader_id: string;
    created_at: string;
  }[];
  const members = (memberRows ?? []) as { squad_id: number; user_id: string }[];
  const requested = new Set(
    ((requestRows ?? []) as { squad_id: number }[]).map((row) => row.squad_id),
  );

  const counts = new Map<number, number>();
  const mine = new Set<number>();
  for (const row of members) {
    counts.set(row.squad_id, (counts.get(row.squad_id) ?? 0) + 1);
    if (row.user_id === me.id) mine.add(row.squad_id);
  }

  const profiles = await fetchProfiles(
    Array.from(new Set(squads.map((squad) => squad.leader_id))),
  );

  return squads.map((squad) => {
    const leader = profiles.get(squad.leader_id);
    return {
      id: squad.id,
      name: squad.name,
      leaderName: leader
        ? (leader.display_name.trim() || leader.username)
        : "Leader",
      memberCount: counts.get(squad.id) ?? 0,
      isMember: mine.has(squad.id),
      requested: requested.has(squad.id),
    };
  });
}

export async function createSquad(name: string): Promise<SquadAction> {
  const { data, error } = await supabase.rpc("create_squad", {
    p_name: name.trim(),
  });
  if (error) return { ok: false, message: error.message };
  const payload = data as { ok?: boolean; message?: string } | null;
  return {
    ok: payload?.ok === true,
    message: payload?.message ?? "Squad created.",
  };
}

export async function requestJoinSquad(squadId: number): Promise<SquadAction> {
  const { data, error } = await supabase.rpc("request_join_squad", {
    p_squad_id: squadId,
  });
  if (error) return { ok: false, message: error.message };
  const payload = data as { ok?: boolean; message?: string } | null;
  return {
    ok: payload?.ok === true,
    message: payload?.message ?? "Request sent.",
  };
}

export async function inviteByEmail(email: string): Promise<SquadAction> {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, message: "That email doesn't look right." };
  }
  const { data, error } = await supabase.rpc("invite_to_squad", {
    p_email: trimmed,
  });
  if (error) return { ok: false, message: error.message };
  const payload = data as { ok?: boolean; message?: string } | null;
  return {
    ok: payload?.ok === true,
    message: payload?.message ?? "Invite sent.",
  };
}

/** Accept/decline - FastAPI endpoint first, direct RPC as the fallback. */
export async function respondToRequest(
  requestId: number,
  accept: boolean,
): Promise<SquadAction> {
  const viaApi = await apiRespondSquadRequest(requestId, accept);
  if (viaApi) {
    return {
      ok: viaApi.ok === true,
      message:
        (viaApi.message as string | undefined) ??
        (accept ? "Member joined the squad." : "Request declined."),
    };
  }

  const { data, error } = await supabase.rpc("respond_squad_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) return { ok: false, message: error.message };
  const payload = data as { ok?: boolean; message?: string } | null;
  return {
    ok: payload?.ok === true,
    message: payload?.message ?? "Done.",
  };
}

export async function leaveSquad(): Promise<SquadAction> {
  const { data, error } = await supabase.rpc("leave_squad");
  if (error) return { ok: false, message: error.message };
  const payload = data as { ok?: boolean; message?: string } | null;
  return {
    ok: payload?.ok === true,
    message: payload?.message ?? "You left the squad.",
  };
}
