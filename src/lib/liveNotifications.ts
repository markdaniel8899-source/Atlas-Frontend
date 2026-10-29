import {
  hasNotification,
  pushNotification,
  setFriendRequestCount,
} from "./notifications";
import {
  fetchAcceptedInvites,
  fetchDisplayNames,
  fetchIncomingFriendRequests,
  fetchSharedNotes,
} from "./db/notifications";
import { notifyNotesChanged, notifySquadChanged } from "./db/events";

function personName(names: Map<string, string>, id: string): string {
  return names.get(id) ?? "A friend";
}

/** Old items found on first sync land in the bell without a toast storm. */
function isRecent(iso: string | null, windowMs = 10 * 60_000): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return Number.isFinite(time) && Date.now() - time <= windowMs;
}

/** Re-count pending requests and surface a notification for each new one. */
export async function syncFriendRequestNotifications(): Promise<void> {
  const requests = await fetchIncomingFriendRequests();
  setFriendRequestCount(requests.length);
  notifySquadChanged();
  if (requests.length === 0) return;

  const fresh = requests.filter(
    (request) => !hasNotification(`friend-request:${request.friendshipId}`),
  );
  if (fresh.length === 0) return;

  const names = await fetchDisplayNames(
    fresh.map((request) => request.requesterId),
  );

  for (const request of fresh) {
    pushNotification({
      id: `friend-request:${request.friendshipId}`,
      kind: "friend_request",
      message: `${personName(names, request.requesterId)} sent you a friend request`,
      detail: "Open Friends to accept or decline.",
      href: "/app/squad",
      silent: !isRecent(request.createdAt),
    });
  }
}

/** Surface requests of mine that a friend accepted recently. */
export async function syncFriendAcceptNotifications(): Promise<void> {
  const accepted = await fetchAcceptedInvites();
  if (accepted.length === 0) return;

  const fresh = accepted.filter(
    (invite) => !hasNotification(`friend-accepted:${invite.friendshipId}`),
  );
  if (fresh.length === 0) return;

  const names = await fetchDisplayNames(fresh.map((invite) => invite.peerId));

  for (const invite of fresh) {
    pushNotification({
      id: `friend-accepted:${invite.friendshipId}`,
      kind: "friend_accepted",
      message: `${personName(names, invite.peerId)} accepted your friend request`,
      detail: "They are now in your Friends list.",
      href: "/app/squad",
      silent: !isRecent(invite.updatedAt),
    });
  }
}

/** Surface freshly shared notes (the row is copied into the recipient). */
export async function syncSharedNoteNotifications(): Promise<void> {
  const notes = await fetchSharedNotes();
  if (notes.length === 0) return;

  const fresh = notes.filter(
    (note) => !hasNotification(`note-shared:${note.id}`),
  );
  if (fresh.length === 0) return;

  const names = await fetchDisplayNames(fresh.map((note) => note.sharedBy));

  fresh.forEach((note, index) => {
    pushNotification({
      id: `note-shared:${note.id}`,
      kind: "note_shared",
      message: `${personName(names, note.sharedBy)} shared a note with you`,
      detail: note.title.trim() || "Untitled note",
      href: "/app/notes",
      // One toast per batch; the bell still lists every new note.
      silent: index > 0 || !isRecent(note.sharedAt),
    });
  });
  notifyNotesChanged();
}

export async function syncAllNotifications(): Promise<void> {
  await Promise.allSettled([
    syncFriendRequestNotifications(),
    syncFriendAcceptNotifications(),
    syncSharedNoteNotifications(),
  ]);
}