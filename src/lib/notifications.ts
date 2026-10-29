/**
 * In-app notification centre. Friend requests and shared notes are pushed
 * here by the realtime listener (see hooks/useLiveNotifications); the bell in
 * the dashboard header renders the list and the sidebar shows live badges.
 *
 * The store is deliberately framework-light (module state + subscriber set)
 * so it can be written to from Supabase callbacks without a provider.
 */
import { useSyncExternalStore } from "react";
import { toast } from "./toast";

export type NotificationKind =
  | "friend_request"
  | "friend_accepted"
  | "note_shared";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  message: string;
  detail?: string;
  href: string;
  createdAt: number;
  read: boolean;
}

interface NotificationState {
  items: AppNotification[];
  /** Pending incoming friend requests (not unread notifications). */
  friendRequests: number;
}

const MAX_ITEMS = 30;
const STORAGE_PREFIX = "atlas:notifications:";

let owner: string | null = null;
let state: NotificationState = { items: [], friendRequests: 0 };
const listeners = new Set<() => void>();

function storageKey(): string | null {
  return owner ? `${STORAGE_PREFIX}${owner}` : null;
}

function isNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.message === "string" &&
    typeof item.href === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.read === "boolean" &&
    (item.kind === "friend_request" ||
      item.kind === "friend_accepted" ||
      item.kind === "note_shared")
  );
}

function loadItems(): AppNotification[] {
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? parsed.filter(isNotification).slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function persist(): void {
  const key = storageKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state.items));
  } catch {
    // Storage may be full or blocked - notifications still work in-session.
  }
}

function emit(): void {
  persist();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): NotificationState {
  return state;
}

/** Switch the store to the signed-in user's own persistent list. */
export function setNotificationOwner(userId: string | null): void {
  if (owner === userId) return;
  owner = userId;
  state = { items: userId ? loadItems() : [], friendRequests: 0 };
  emit();
}

export function hasNotification(id: string): boolean {
  return state.items.some((entry) => entry.id === id);
}

export function pushNotification(item: {
  id: string;
  kind: NotificationKind;
  message: string;
  detail?: string;
  href: string;
  /** Skip the toast for older items discovered on first sync. */
  silent?: boolean;
}): boolean {
  if (state.items.some((entry) => entry.id === item.id)) return false;

  const next: AppNotification = {
    id: item.id,
    kind: item.kind,
    message: item.message,
    detail: item.detail,
    href: item.href,
    createdAt: Date.now(),
    read: false,
  };

  state = {
    ...state,
    items: [next, ...state.items].slice(0, MAX_ITEMS),
  };
  emit();
  if (!item.silent) toast.info(item.message);
  return true;
}

export function setFriendRequestCount(count: number): void {
  const next = Math.max(0, Math.floor(count));
  if (state.friendRequests === next) return;
  state = { ...state, friendRequests: next };
  emit();
}

export function markNotificationRead(id: string): void {
  if (!state.items.some((item) => item.id === id && !item.read)) return;
  state = {
    ...state,
    items: state.items.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    ),
  };
  emit();
}

export function markNotificationsOfKindRead(kind: NotificationKind): void {
  if (
    !state.items.some((item) => item.kind === kind && !item.read)
  ) {
    return;
  }
  state = {
    ...state,
    items: state.items.map((item) =>
      item.kind === kind && !item.read ? { ...item, read: true } : item,
    ),
  };
  emit();
}

export function markAllNotificationsRead(): void {
  if (!state.items.some((item) => !item.read)) return;
  state = {
    ...state,
    items: state.items.map((item) => ({ ...item, read: true })),
  };
  emit();
}

export function useNotifications(): NotificationState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export interface NotificationBadges {
  /** Pending incoming friend requests. */
  friends: number;
  /** Unread shared-note notifications. */
  notes: number;
  /** Every unread notification (bell badge). */
  unread: number;
}

export function useNotificationBadges(): NotificationBadges {
  const current = useNotifications();
  let notes = 0;
  let unread = 0;
  for (const item of current.items) {
    if (item.read) continue;
    unread += 1;
    if (item.kind === "note_shared") notes += 1;
  }
  return { friends: current.friendRequests, notes, unread };
}