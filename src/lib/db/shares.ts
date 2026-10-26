import { supabase } from "../supabase";

export interface ShareResult {
  ok: boolean;
  message: string;
}

export interface BulkShareResult {
  ok: boolean;
  message: string;
  sharedCount: number;
  failedCount: number;
}

/** Positive safe-integer id (numeric bigint once the note is persisted). */
export function toShareableId(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Copies one of my notes into an accepted friend's Notes (server-side RPC).
 * The recipient can then edit or delete their own copy like any other note.
 */
export async function shareNote(
  noteId: string,
  recipientId: string,
): Promise<ShareResult> {
  const parsed = toShareableId(noteId);
  if (parsed === null) {
    return {
      ok: false,
      message: "Wait for this note to sync before sharing it.",
    };
  }
  if (!recipientId) {
    return { ok: false, message: "Pick a friend to share with." };
  }

  try {
    const { data, error } = await supabase.rpc("share_note", {
      p_note_id: parsed,
      p_recipient_id: recipientId,
    });
    if (error) return { ok: false, message: error.message };

    const payload = data as { ok?: boolean; message?: string } | null;
    if (!payload || typeof payload.ok !== "boolean") {
      return { ok: false, message: "The note could not be shared." };
    }
    return {
      ok: payload.ok,
      message: payload.message ?? (payload.ok ? "Note sent." : "Failed."),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

/**
 * Bulk share multiple notes to multiple recipients.
 * Uses the existing share_note RPC for each note-recipient pair.
 */
export async function bulkShareNotes(
  noteIds: string[],
  recipientIds: string[],
): Promise<BulkShareResult> {
  const currentUser = (await supabase.auth.getUser()).data.user;
  if (!currentUser) {
    return {
      ok: false,
      message: "Not authenticated.",
      sharedCount: 0,
      failedCount: noteIds.length * recipientIds.length,
    };
  }

  const validNoteIds = noteIds
    .map(toShareableId)
    .filter((id): id is number => id !== null);

  if (validNoteIds.length === 0 || recipientIds.length === 0) {
    return {
      ok: false,
      message: "No valid notes or recipients selected.",
      sharedCount: 0,
      failedCount: 0,
    };
  }

  let sharedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Share each note to each recipient
  for (const noteId of validNoteIds) {
    for (const recipientId of recipientIds) {
      try {
        const { data, error } = await supabase.rpc("share_note", {
          p_note_id: noteId,
          p_recipient_id: recipientId,
        });
        if (error) {
          failedCount++;
          errors.push(`${noteId} -> ${recipientId}: ${error.message}`);
          continue;
        }

        const payload = data as { ok?: boolean; message?: string } | null;
        if (!payload || typeof payload.ok !== "boolean" || !payload.ok) {
          failedCount++;
          errors.push(
            `${noteId} -> ${recipientId}: ${payload?.message ?? "Failed"}`,
          );
          continue;
        }

        sharedCount++;
      } catch (err) {
        failedCount++;
        errors.push(
          `${noteId} -> ${recipientId}: ${
            err instanceof Error ? err.message : "Network error"
          }`,
        );
      }
    }
  }

  const total = validNoteIds.length * recipientIds.length;
  const ok = sharedCount > 0;

  return {
    ok,
    message:
      ok
        ? `Shared ${sharedCount} of ${total} note${total > 1 ? "s" : ""}.`
        : `Failed to share any notes. ${errors.slice(0, 3).join("; ")}`,
    sharedCount,
    failedCount,
  };
}
