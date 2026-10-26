import { getUser } from "../auth";
import { supabase } from "../supabase";
import { sanitizeHtml } from "../notes";
import type { Note } from "../notes";

interface NoteRow {
  id: number;
  title: string;
  content: string;
  updated_at: string;
  course_id: number | null;
  topic_id: number | null;
  sort_order?: number | null;
  shared_by: string | null;
  shared_at: string | null;
}

const NOTE_COLUMNS = "id, title, content, updated_at, course_id, topic_id, shared_by, shared_at";

function toNote(row: NoteRow): Note {
  return {
    id: String(row.id),
    title: row.title,
    html: row.content,
    updatedAt: Number.isNaN(Date.parse(row.updated_at))
      ? Date.now()
      : Date.parse(row.updated_at),
    courseId: typeof row.course_id === "number" ? row.course_id : null,
    topicId: typeof row.topic_id === "number" ? row.topic_id : null,
    courseTitle: null,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
    sharedBy: row.shared_by ?? null,
    sharedByName: null,
    sharedAt:
      row.shared_at && !Number.isNaN(Date.parse(row.shared_at))
        ? Date.parse(row.shared_at)
        : null,
  };
}

function toId(id: string): number | null {
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Map each note id to its owning course's title - directly via
 * notes.course_id, or through notes.topic_id -> course_topics.course_id.
 * Two extra queries only when the fetched notes are actually linked.
 */
async function loadCourseTitles(rows: NoteRow[]): Promise<Map<number, string>> {
  const byNote = new Map<number, string>();
  const courseIds = new Set<number>(
    rows
      .map((row) => row.course_id)
      .filter((id): id is number => typeof id === "number"),
  );
  const topicIds = [
    ...new Set(
      rows
        .map((row) => row.topic_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  let topicCourse = new Map<number, number>();
  if (topicIds.length > 0) {
    const { data: topics } = await supabase
      .from("course_topics")
      .select("id, course_id")
      .in("id", topicIds);
    if (Array.isArray(topics)) {
      for (const row of topics as { id: number; course_id: number | null }[]) {
        if (row.course_id == null) continue;
        topicCourse.set(row.id, row.course_id);
        courseIds.add(row.course_id);
      }
    }
  }
  if (courseIds.size === 0) return byNote;

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .in("id", [...courseIds]);
  if (!Array.isArray(courses)) return byNote;

  const titleByCourse = new Map<number, string>();
  for (const row of courses as { id: number; title: string }[]) {
    titleByCourse.set(row.id, row.title);
  }
  for (const row of rows) {
    const courseId =
      row.course_id ?? (row.topic_id != null ? topicCourse.get(row.topic_id) : undefined);
    if (courseId == null) continue;
    const title = titleByCourse.get(courseId);
    if (title) byNote.set(row.id, title);
  }
  return byNote;
}

/**
 * Map each note id to its sender's display name or username.
 * Fetches from profiles table using shared_by (user_id).
 */
async function loadSenderNames(rows: NoteRow[]): Promise<Map<number, string>> {
  const byNote = new Map<number, string>();
  const senderIds = new Set<string>(
    rows
      .map((row) => row.shared_by)
      .filter((id): id is string => typeof id === "string"),
  );
  if (senderIds.size === 0) return byNote;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", [...senderIds]);
  if (!Array.isArray(profiles)) return byNote;

  const nameById = new Map<string, string>();
  for (const profile of profiles as { id: string; display_name: string; username: string }[]) {
    nameById.set(profile.id, profile.display_name || profile.username);
  }
  for (const row of rows) {
    if (row.shared_by) {
      const name = nameById.get(row.shared_by);
      if (name) byNote.set(row.id, name);
    }
  }
  return byNote;
}

export interface NotesScope {
  /** Only notes of this course (notes.course_id) - the "course selected" view. */
  courseId?: number;
  /**
   * Only notes attached to these course topics. Without `courseId` this is
   * an exact topic filter; an empty array means no topics, so no notes.
   */
  topicIds?: number[];
}

export async function fetchNotes(scope?: NotesScope): Promise<Note[]> {
  const user = getUser();
  if (!user) return [];

  if (scope?.courseId == null && scope?.topicIds && scope.topicIds.length === 0) {
    return [];
  }

  const run = async (withSortOrder: boolean) => {
    let query = supabase
      .from("notes")
      .select(
        withSortOrder ? `${NOTE_COLUMNS}, sort_order` : NOTE_COLUMNS,
      )
      .eq("user_id", user.id);

    if (scope?.courseId != null) {
      if (scope.topicIds && scope.topicIds.length > 0) {
        // Course view: everything linked to the course directly OR through a
        // topic (covers rows written before course_id existed).
        query = query.or(
          `course_id.eq.${scope.courseId},topic_id.in.(${scope.topicIds.join(",")})`,
        );
      } else {
        query = query.eq("course_id", scope.courseId);
      }
    } else if (scope?.topicIds) {
      query = query.in("topic_id", scope.topicIds);
    }

    return withSortOrder
      ? query
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("updated_at", { ascending: false })
      : query.order("updated_at", { ascending: false });
  };

  let { data, error } = await run(true);
  if (error) {
    ({ data, error } = await run(false));
  }
  if (error || !Array.isArray(data)) return [];

  const rows = data as unknown as NoteRow[];
  const courseByNote = await loadCourseTitles(rows);
  const senderByNote = await loadSenderNames(rows);
  return rows.map((row) => {
    const note = toNote(row);
    note.courseTitle = courseByNote.get(row.id) ?? null;
    note.sharedByName = senderByNote.get(row.id) ?? null;
    return note;
  });
}

export async function createNote(
  options?: { courseId?: number | null; topicId?: number | null },
): Promise<Note | null> {
  const user = getUser();
  if (!user) return null;

  const payload: Record<string, unknown> = {
    user_id: user.id,
    title: "Untitled note",
    content: "",
  };
  if (typeof options?.courseId === "number") {
    payload.course_id = options.courseId;
  }
  if (typeof options?.topicId === "number") {
    payload.topic_id = options.topicId;
  }

  const { data, error } = await supabase
    .from("notes")
    .insert(payload)
    .select(NOTE_COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  const note = toNote(data as unknown as NoteRow);
  note.courseId = typeof options?.courseId === "number" ? options.courseId : null;
  note.topicId = typeof options?.topicId === "number" ? options.topicId : null;
  return note;
}

export async function updateNote(
  id: string,
  patch: Partial<Omit<Note, "id">>,
): Promise<void> {
  const parsed = toId(id);
  if (parsed === null) return;

  const values: Record<string, unknown> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.html !== undefined) values.content = sanitizeHtml(patch.html);
  if (patch.sortOrder !== undefined) values.sort_order = patch.sortOrder;
  if (Object.keys(values).length === 0) return;

  await supabase.from("notes").update(values).eq("id", parsed);
}

export async function deleteNote(id: string): Promise<void> {
  const parsed = toId(id);
  if (parsed === null) return;
  await supabase.from("notes").delete().eq("id", parsed);
}

export async function updateNoteOrder(ids: string[]): Promise<void> {
  const user = getUser();
  if (!user) return;
  await Promise.all(
    ids.map(async (id, index) => {
      const parsed = toId(id);
      if (parsed === null) return;
      await supabase
        .from("notes")
        .update({ sort_order: index })
        .eq("id", parsed)
        .eq("user_id", user.id);
    }),
  );
}

/**
 * Fetch multiple notes by their IDs for bulk operations.
 * Returns notes that the current user owns.
 */
export async function fetchNotesByIds(noteIds: string[]): Promise<Note[]> {
  const user = getUser();
  if (!user || noteIds.length === 0) return [];

  const numericIds = noteIds
    .map(toId)
    .filter((id): id is number => id !== null);

  if (numericIds.length === 0) return [];

  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS + ", sort_order")
    .eq("user_id", user.id)
    .in("id", numericIds);

  if (error || !Array.isArray(data)) return [];

  const rows = data as unknown as NoteRow[];
  const courseByNote = await loadCourseTitles(rows);
  const senderByNote = await loadSenderNames(rows);
  return rows.map((row) => {
    const note = toNote(row);
    note.courseTitle = courseByNote.get(row.id) ?? null;
    note.sharedByName = senderByNote.get(row.id) ?? null;
    return note;
  });
}

/**
 * Bulk download: fetch notes and return as a ZIP-compatible structure.
 * Returns an array of note objects with metadata for client-side ZIP creation.
 */
export interface BulkDownloadNote {
  id: string;
  title: string;
  html: string;
  updatedAt: number;
  courseTitle: string | null;
}

export async function bulkDownloadNotes(
  noteIds: string[],
): Promise<BulkDownloadNote[]> {
  const notes = await fetchNotesByIds(noteIds);
  return notes.map((note) => ({
    id: note.id,
    title: note.title,
    html: note.html,
    updatedAt: note.updatedAt,
    courseTitle: note.courseTitle,
  }));
}
