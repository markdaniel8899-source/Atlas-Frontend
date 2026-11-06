import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  FormEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Download,
  EllipsisVertical,
  GripVertical,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  Share2,
  StickyNote,
  Table,
  Trash2,
  Underline,
  Users,
} from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { ShareNoteModal } from "../../components/notes/ShareNoteModal";
import { BulkShareModal } from "../../components/notes/BulkShareModal";
import { InlineCodeBlock } from "../../components/notes/InlineCodeBlock";
import { InlineTableBlock } from "../../components/notes/InlineTableBlock";
import {
  buildNotesExportHtml,
  CODE_BLOCK_CSS,
  findCodeBlockElement,
  hydrateCodeBlocks,
  isLanguageReady,
  normalizeLanguageId,
  renderCodeBlockViewHtml,
  renderCodeBlockViewHtmlAsync,
} from "../../components/notes/codeBlock";
import {
  createDefaultTableRows,
  createTableId,
  findTableBlockElement,
  hydrateTableBlocks,
  normalizeTableRows,
  parseTabularText,
  readTableBlockRows,
  renderTableBlockViewHtml,
  renderTableClipboardHtml,
  TABLE_BLOCK_CSS,
  type TableBlockData,
} from "../../components/notes/tableBlock";
import {
  htmlToPlainText,
  normalizeInlineFormatting,
  sanitizeNoteHtml,
} from "../../lib/notes";
import type { Note } from "../../lib/notes";
import { supabase } from "../../lib/supabase";
import {
  bulkDownloadNotes,
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
  updateNoteOrder,
} from "../../lib/db/notes";
import { toShareableId } from "../../lib/db/shares";
import { useCourses } from "../../hooks/useCourses";
import { getUser } from "../../lib/auth";
import { EASE } from "../../lib/motion";
import { toast } from "../../lib/toast";

interface Tool {
  label: string;
  icon: typeof Bold;
  run: () => void;
  shortcut?: string;
}

interface NoteGroup {
  key: string;
  title: string;
  accent: string;
  notes: Note[];
}

const NOTE_ORDER_PREFIX = "atlas:note-order:";

/** Formatting tools that can run inside an inline table cell editor. */
const TABLE_CELL_TOOL_LABELS = new Set([
  "Bold",
  "Italic",
  "Underline",
  "Heading",
  "Quote",
  "Bullet list",
  "Numbered list",
]);

/** Neutral accent for notes that are not linked to a course. */
const GENERAL_ACCENT = "#8b90a3";

/** Course accents assigned when a course is created (mirrors db/courses.ts). */
const NOTE_ACCENTS = [
  "#9db4ff",
  "#5fbdb2",
  "#a982e0",
  "#5aa7cd",
  "#e0975f",
  "#cd6f95",
  "#cf9eff",
];

function buildExportFilename(notes: Array<{ title: string }>): string {
  const date = new Date().toISOString().split("T")[0];
  const title = notes.length === 1 ? notes[0]?.title.trim() ?? "" : "";
  if (!title) return `notes-${date}.html`;

  const slug = title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${slug || "note"}-${date}.html`;
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(207, 158, 255, ${alpha})`;
  const int = Number.parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

/** Stable accent for a note: its course accent, or a palette colour derived
 *  from the course id when the course is not in the local list (shared note). */
function noteAccent(
  note: Note,
  accentByCourseId: Map<number, string>,
): string {
  if (note.courseId == null) return GENERAL_ACCENT;
  return (
    accentByCourseId.get(note.courseId) ??
    NOTE_ACCENTS[Math.abs(note.courseId) % NOTE_ACCENTS.length]
  );
}

function noteOrderKey(): string {
  return `${NOTE_ORDER_PREFIX}${getUser()?.id ?? "guest"}`;
}

function readStoredNoteOrder(): string[] {
  try {
    const raw = window.localStorage.getItem(noteOrderKey());
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredNoteOrder(ids: string[]) {
  try {
    window.localStorage.setItem(noteOrderKey(), JSON.stringify(ids));
  } catch {
    return;
  }
}

function applyStoredOrder(rows: Note[]): Note[] {
  if (rows.some((note) => note.sortOrder != null)) return rows;
  const rank = new Map(readStoredNoteOrder().map((id, index) => [id, index]));
  if (rank.size === 0) return rows;
  return [...rows].sort((a, b) => {
    const aRank = rank.get(a.id);
    const bRank = rank.get(b.id);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return 0;
  });
}

/**
 * Same behaviour as the Roadmap course switcher: pick a course to scope the
 * view, or "All notes" to see everything grouped by subject.
 */
function CourseSwitcher({
  courses,
  value,
  onChange,
}: {
  courses: { id: number; title: string; accent?: string }[];
  value: number | null;
  onChange: (courseId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = [
    { id: null, title: "All notes", icon: StickyNote, accent: "#cf9eff" },
    ...courses.map((course) => ({
      id: course.id,
      title: course.title,
      icon: BookOpen,
      accent: course.accent ?? "#cf9eff",
    })),
  ];
  const selected = items.find((item) => item.id === value) ?? items[0];
  const selectedAccent = selected.accent;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter notes by course"
        title="Show notes for one course, or all notes by subject"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex max-w-56 items-center gap-2 rounded-full border px-4 py-2.5 text-sm backdrop-blur-[40px] transition-colors ${
          open
            ? "border-[#cf9eff]/50 bg-[#cf9eff]/[0.08] text-white"
            : "border-white/[0.08] bg-white/[0.03] text-white/75 hover:border-[#cf9eff]/45 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <StickyNote
          className={`size-4 shrink-0 ${open ? "" : "opacity-80"}`}
          style={{ color: selectedAccent }}
        />
        <span className="truncate">{selected.title}</span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-[#cf9eff]" : "text-white/35"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Notes by course"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 w-full rounded-2xl border border-white/10 bg-[#111] p-1.5 shadow-xl backdrop-blur-2xl md:left-auto md:w-64"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.id === value;
              const accent = item.accent ?? "#cf9eff";
              return (
                <button
                  key={item.id ?? "all"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star ${
                    active ? "" : "hover:bg-white/[0.07]"
                  }`}
                  style={active ? { backgroundColor: hexToRgba(accent, 0.12) } : undefined}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                      active ? "" : "border-white/10 bg-white/[0.05]"
                    }`}
                    style={
                      active
                        ? {
                            color: accent,
                            borderColor: hexToRgba(accent, 0.4),
                            backgroundColor: hexToRgba(accent, 0.15),
                          }
                        : undefined
                    }
                  >
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      active ? "font-medium text-white" : "text-white/75"
                    }`}
                  >
                    {item.title}
                  </span>
                  {active && (
                    <Check className="size-4 shrink-0" style={{ color: accent }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { courses, loading: coursesLoading } = useCourses();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorSectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<number | null>(null);
  const savedRef = useRef<number | null>(null);
  const networkRef = useRef<number | null>(null);
  const pendingRef = useRef<Map<string, Partial<Omit<Note, "id">>>>(new Map());
  /** Bumped on every local write: in-flight refetches that started before a
   *  write can be stale, so their responses are discarded. */
  const dataVersionRef = useRef(0);
  const activeRef = useRef<string | null>(activeId);
  const codeBlocksRef = useRef<Array<{ id: string; code: string; language: string }>>([]);
  const tableBlocksRef = useRef<TableBlockData[]>([]);
  const savedRangeRef = useRef<Range | null>(null);
  const editingBlockIdRef = useRef<string | null>(null);
  const editingTableIdRef = useRef<string | null>(null);
  const saveNoteContentRef = useRef<() => void>(() => {});
  const draftSaveRef = useRef<number | null>(null);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'download' | 'share' | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<Array<{ id: string; code: string; language: string }>>([]);
  const [tableBlocks, setTableBlocks] = useState<TableBlockData[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const courseMenuRef = useRef<HTMLDivElement>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement>(null);

  const selectedCourseId = useMemo(() => {
    const raw = Number(searchParams.get("courseId") ?? "");
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );
  /** The selected id while the course exists, else null (stale param).
   *  Number-valued so the notes fetch effect does not re-run on every
   *  unrelated courses refresh (rename, topic toggle, focus commit). */
  const activeCourseId = selectedCourse ? selectedCourseId : null;

  const active = notes.find((n) => n.id === activeId) ?? null;
  const activeCourse =
    active?.courseId != null
      ? (courses.find((course) => course.id === active.courseId) ?? null)
      : null;
  const activeAccent = activeCourse?.accent ?? GENERAL_ACCENT;
  /** Share only persisted notes: numeric positive id, no optimistic rows. */
  const shareableId =
    active && toShareableId(active.id) !== null ? active.id : null;
  const closeShare = useCallback(() => setShareOpen(false), []);

  // Drop a stale ?courseId= (course was deleted) once courses are known.
  useEffect(() => {
    if (coursesLoading) return;
    if (selectedCourseId != null && !selectedCourse) {
      setSearchParams({}, { replace: true });
    }
  }, [coursesLoading, selectedCourseId, selectedCourse, setSearchParams]);

  /** Keep optimistic edits that have not reached the database yet on top of
   *  a refetched snapshot, so the list never flashes back to an old value. */
  const mergePending = useCallback((rows: Note[]): Note[] => {
    if (pendingRef.current.size === 0) return rows;
    return rows.map((note) => {
      const patch = pendingRef.current.get(note.id);
      return patch ? { ...note, ...patch } : note;
    });
  }, []);

  const flush = useCallback(async () => {
    if (networkRef.current) {
      window.clearTimeout(networkRef.current);
      networkRef.current = null;
    }
    if (pendingRef.current.size === 0) return;
    const entries = Array.from(pendingRef.current.entries());
    pendingRef.current.clear();
    for (const [id, patch] of entries) {
      await updateNote(id, patch);
    }
    dataVersionRef.current += 1;
  }, []);

  // Close course menu on outside click
  useEffect(() => {
    if (!courseMenuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!courseMenuRef.current?.contains(event.target as Node)) {
        setCourseMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCourseMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [courseMenuOpen]);

  // Close the mobile actions menu on outside tap or Escape.
  useEffect(() => {
    if (!mobileActionsOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setMobileActionsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileActionsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileActionsOpen]);

  // Fetch only the notes of the active context: the selected course's
  // notes when a course is picked, otherwise every note (the list is then
  // grouped by course below).
  useEffect(() => {
    if (coursesLoading) return;
    if (selectedCourseId != null && activeCourseId == null) return; // stale param
    let alive = true;
    setLoading(true);
    const scope =
      activeCourseId != null ? { courseId: activeCourseId } : undefined;
    void fetchNotes(scope)
      .then((rows) => {
        if (!alive) return;
        const ordered = applyStoredOrder(mergePending(rows));
        setNotes(ordered);
        setActiveId((current) =>
          current && ordered.some((note) => note.id === current)
            ? current
            : (ordered[0]?.id ?? null),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });

    // Real-time subscription for notes
    const me = getUser();
    if (me) {
      const channel = supabase
        .channel("notes-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notes",
            filter: `user_id=eq.${me.id}`,
          },
          () => {
            if (!alive) return;
            const version = dataVersionRef.current;
            void fetchNotes(scope).then((rows) => {
              // A local edit landed while this request was in flight - the
              // snapshot may already be outdated, so ignore it.
              if (!alive || dataVersionRef.current !== version) return;
              const ordered = applyStoredOrder(mergePending(rows));
              setNotes(ordered);
            });
          },
        )
        .subscribe();

      return () => {
        alive = false;
        supabase.removeChannel(channel);
      };
    }
    return () => {
      alive = false;
    };
  }, [coursesLoading, selectedCourseId, activeCourseId, mergePending]);

  const accentByCourseId = useMemo(
    () => new Map(courses.map((course) => [course.id, course.accent])),
    [courses],
  );

  const groupedNotes = useMemo<NoteGroup[]>(() => {
    const groups = new Map<string, NoteGroup>();
    for (const note of notes) {
      const key = note.courseId == null ? "general" : `course-${note.courseId}`;
      const course =
        note.courseId == null
          ? null
          : (courses.find((item) => item.id === note.courseId) ?? null);
      const title =
        note.courseId == null
          ? "General"
          : (course?.title ?? note.courseTitle ?? "Course");
      const accent = noteAccent(note, accentByCourseId);
      const group = groups.get(key);
      if (group) group.notes.push(note);
      else groups.set(key, { key, title, accent, notes: [note] });
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === "general") return -1;
      if (b.key === "general") return 1;
      return a.title.localeCompare(b.title);
    });
  }, [notes, courses, accentByCourseId]);

  useEffect(() => {
    if (activeRef.current !== activeId) {
      saveNoteContentRef.current();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (draftSaveRef.current !== null) {
        window.clearTimeout(draftSaveRef.current);
        draftSaveRef.current = null;
      }
    }

    activeRef.current = activeId;
    setEditingBlockId(null);
    setEditingTableId(null);

    const editor = editorRef.current;
    const note = notes.find((n) => n.id === activeId);
    if (!editor || !note) {
      if (!note) {
        codeBlocksRef.current = [];
        setCodeBlocks([]);
        tableBlocksRef.current = [];
        setTableBlocks([]);
      }
      return;
    }

    editor.innerHTML = sanitizeNoteHtml(note.html);

    const restored = hydrateCodeBlocks(editor);
    codeBlocksRef.current = restored;
    setCodeBlocks(restored);

    const restoredTables = hydrateTableBlocks(editor);
    tableBlocksRef.current = restoredTables;
    setTableBlocks(restoredTables);
    // selectionMode is a dep so leaving multi-select repopulates the editor
    // (the contentEditable is remounted after being hidden).
  }, [activeId, selectionMode]);

  useEffect(() => {
    editingBlockIdRef.current = editingBlockId;
  }, [editingBlockId]);

  useEffect(() => {
    editingTableIdRef.current = editingTableId;
  }, [editingTableId]);

  // Keep codeBlocksRef in sync with codeBlocks state
  useEffect(() => {
    codeBlocksRef.current = codeBlocks;
  }, [codeBlocks]);

  useEffect(() => {
    tableBlocksRef.current = tableBlocks;
  }, [tableBlocks]);

  // Re-render saved views when a block changes and no overlay is mounted.
  // Lazy Monaco grammars are upgraded asynchronously so the first paint is
  // never blank or unstyled.
  useEffect(() => {
    if (editingBlockId) return;
    const editor = editorRef.current;
    if (!editor) return;
    let alive = true;

    for (const block of codeBlocks) {
      const element = findCodeBlockElement(editor, block.id);
      if (!element) continue;

      element.dataset.code = block.code;
      element.dataset.language = block.language;
      element.innerHTML = renderCodeBlockViewHtml(
        block.code,
        block.language,
      );

      if (isLanguageReady(block.language)) continue;

      void renderCodeBlockViewHtmlAsync(block.code, block.language).then(
        (html) => {
          if (!alive || editingBlockIdRef.current === block.id) return;
          const current = findCodeBlockElement(
            editorRef.current ?? editor,
            block.id,
          );
          if (current) current.innerHTML = html;
        },
      );
    }

    return () => {
      alive = false;
    };
  }, [codeBlocks, editingBlockId]);

  useEffect(() => {
    if (editingTableId) return;
    const editor = editorRef.current;
    if (!editor) return;

    for (const block of tableBlocks) {
      const element = findTableBlockElement(editor, block.id);
      if (!element) continue;
      element.dataset.table = JSON.stringify(block.rows);
      element.innerHTML = renderTableBlockViewHtml(block.rows);
    }
  }, [tableBlocks, editingTableId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (savedRef.current) window.clearTimeout(savedRef.current);
      if (draftSaveRef.current !== null) {
        window.clearTimeout(draftSaveRef.current);
        draftSaveRef.current = null;
      }
      void flush();
    };
  }, [flush]);

  const markSaved = () => {
    setSaved(true);
    if (savedRef.current) window.clearTimeout(savedRef.current);
    savedRef.current = window.setTimeout(() => setSaved(false), 1200);
  };

  const persist = (id: string, patch: Partial<Omit<Note, "id">>) => {
    dataVersionRef.current += 1;
    pendingRef.current.set(id, {
      ...(pendingRef.current.get(id) ?? {}),
      ...patch,
    });
    // DO NOT call setNotes here - it causes re-render and cursor jump
    // Only update the pending ref for eventual server sync
    markSaved();
    if (networkRef.current) window.clearTimeout(networkRef.current);
    networkRef.current = window.setTimeout(() => void flush(), 700);
  };

  const serializeEditorHtml = useCallback((): string | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const clone = editor.cloneNode(true) as HTMLElement;

    // Strip the React-mounted overlays and any legacy editor chrome.
    clone
      .querySelectorAll("[data-editor-container]")
      .forEach((node) => node.remove());
    clone
      .querySelectorAll(".atomic-code-block-toolbar")
      .forEach((node) => node.remove());
    clone
      .querySelectorAll(
        "[data-table-editor-container], .atomic-table-toolbar, .table-top-bar, .table-btn",
      )
      .forEach((node) => node.remove());

    // Unwrap legacy wrappers, keeping the atomic block itself.
    clone.querySelectorAll(".atomic-code-block-wrapper").forEach((wrapper) => {
      const block = wrapper.querySelector(".atomic-code-block");
      if (block) wrapper.replaceWith(block);
      else wrapper.remove();
    });

    // Persist the editor's latest values instead of the stale static view.
    clone
      .querySelectorAll<HTMLElement>(".atomic-code-block")
      .forEach((block) => {
        const id = block.dataset.codeBlockId;
        if (!id) return;
        const data = codeBlocksRef.current.find((item) => item.id === id);
        if (!data) return;

        block.dataset.code = data.code;
        block.dataset.language = data.language;
        block.setAttribute("contenteditable", "false");
        block.removeAttribute("data-editing");
        block.removeAttribute("style");
        block.innerHTML = renderCodeBlockViewHtml(data.code, data.language);
      });

    clone
      .querySelectorAll<HTMLElement>(".atomic-table-block")
      .forEach((block) => {
        const id = block.dataset.tableId;
        const data = id
          ? tableBlocksRef.current.find((item) => item.id === id)
          : undefined;
        const rows = normalizeTableRows(
          data?.rows ?? readTableBlockRows(block),
        );

        block.dataset.tableId = id || createTableId();
        block.dataset.table = JSON.stringify(rows);
        block.setAttribute("contenteditable", "false");
        block.removeAttribute("data-editing");
        block.removeAttribute("style");
        block.innerHTML = renderTableBlockViewHtml(rows);
      });

    return clone.innerHTML;
  }, []);

  const saveNoteContent = useCallback(() => {
    const id = activeRef.current;
    if (!id) return;
    const html = serializeEditorHtml();
    if (html === null) return;

    persist(id, { html });
    // Also update local notes state for UI consistency (sidebar, etc)
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, html, updatedAt: Date.now() } : note,
      ),
    );
  }, [serializeEditorHtml]);

  useEffect(() => {
    saveNoteContentRef.current = saveNoteContent;
  }, [saveNoteContent]);

  const handleInput = () => {
    const id = activeRef.current;
    if (!id) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (activeRef.current !== id) return;
      const html = serializeEditorHtml();
      if (html !== null) persist(id, { html });
    }, 600);
  };

  const saveOrder = (ordered: Note[]) => {
    const ids = ordered.map((note) => note.id);
    writeStoredNoteOrder(ids);
    void updateNoteOrder(ids);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reorderNotes = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    dataVersionRef.current += 1;
    setNotes((prev) => {
      const from = prev.findIndex((note) => note.id === sourceId);
      const to = prev.findIndex((note) => note.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const ordered = next.map((note, index) => ({ ...note, sortOrder: index }));
      saveOrder(ordered);
      return ordered;
    });
  };

  const addNote = async () => {
    // In a course view the note is owned by the course (and linked to its
    // first topic for subject grouping), so it stays in that course's scope.
    const courseId = selectedCourse?.id ?? null;
    const topicId = selectedCourse?.topics[0]?.id ?? null;
    const note = await createNote({ courseId, topicId });
    if (!note) return;
    dataVersionRef.current += 1;
    setNotes((prev) => {
      const ordered = [note, ...prev].map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
      saveOrder(ordered);
      return ordered;
    });
    setActiveId(note.id);
    revealEditorOnMobile();
  };

  const removeNote = (id: string) => {
    pendingRef.current.delete(id);
    dataVersionRef.current += 1;
    const next = notes
      .filter((note) => note.id !== id)
      .map((note, index) => ({ ...note, sortOrder: index }));
    setNotes(next);
    saveOrder(next);
    if (activeId === id) {
      activeRef.current = null;
      if (draftSaveRef.current !== null) {
        window.clearTimeout(draftSaveRef.current);
        draftSaveRef.current = null;
      }
      setEditingBlockId(null);
      setActiveId(next[0]?.id ?? null);
    }
    void deleteNote(id);
  };

  const updateNoteCourse = useCallback(async (noteId: string, courseId: number | null) => {
    if (!active) return;
    dataVersionRef.current += 1;
    try {
      await updateNote(noteId, { courseId });
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, courseId } : note,
        ),
      );
      toast.success(courseId ? "Note moved to course" : "Note moved to General");
    } catch (error) {
      toast.error("Failed to move note");
      console.error(error);
    }
  }, [active]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const revealEditorOnMobile = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    window.requestAnimationFrame(() => {
      editorSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleEditorBlur = useCallback(() => {
    // Save note content when editor loses focus
    saveNoteContent();
  }, [saveNoteContent]);

  const saveSelection = useCallback(
    (event?: { target: EventTarget | null }) => {
      const target = event?.target;
      if (
        target instanceof Element &&
        target.closest(
          ".atomic-code-block, .atomic-table-block, [data-editor-container], [data-table-editor-container]",
        )
      ) {
        return;
      }
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
    },
    [],
  );

  const restoreEditorSelection = useCallback((): boolean => {
    const editor = editorRef.current;
    if (!editor) return false;

    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      return true;
    }

    const saved = savedRangeRef.current;
    if (saved && editor.contains(saved.commonAncestorContainer)) {
      selection?.removeAllRanges();
      selection?.addRange(saved);
      return true;
    }

    if (!selection) return false;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, []);

  const applyEditorCommand = useCallback(
    (command: string, value?: string) => {
      if (!restoreEditorSelection()) return;
      try {
        document.execCommand("styleWithCSS", false, "false");
      } catch {
        void 0;
      }
      document.execCommand(command, false, value);
      saveSelection();
    },
    [restoreEditorSelection, saveSelection],
  );

  const getSelectionBlock = useCallback((): HTMLElement | null => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    let node: Node | null = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    let element = node instanceof HTMLElement ? node : null;

    while (element && element !== editor) {
      if (element.closest(".atomic-code-block, .atomic-table-block")) {
        return null;
      }
      if (/^(P|DIV|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|LI)$/.test(element.tagName)) {
        return element;
      }
      element = element.parentElement;
    }

    return null;
  }, []);

  const getTableCellEditor = useCallback((): HTMLElement | null => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    let node: Node | null = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    const element = node instanceof HTMLElement ? node : null;
    const cell = element?.closest<HTMLElement>(
      ".atomic-table-input[contenteditable]",
    );

    if (!cell || !editor.contains(cell)) return null;
    return cell;
  }, []);

  const handleCopy = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (
        !editor ||
        !selection ||
        selection.rangeCount === 0 ||
        selection.isCollapsed
      ) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;

      const wrapper = document.createElement("div");
      wrapper.appendChild(range.cloneContents());
      wrapper
        .querySelectorAll(
          "[data-editor-container], [data-table-editor-container], .atomic-code-block-toolbar, .atomic-table-toolbar, .table-top-bar, .table-btn",
        )
        .forEach((node) => node.remove());
      wrapper
        .querySelectorAll("[contenteditable]")
        .forEach((node) => node.removeAttribute("contenteditable"));
      wrapper
        .querySelectorAll<HTMLElement>(".atomic-code-block, .atomic-table-block")
        .forEach((block) => block.removeAttribute("style"));
      normalizeInlineFormatting(wrapper);
      wrapper
        .querySelectorAll<HTMLElement>(".atomic-table-block")
        .forEach((block) => {
          const table = document.createElement("div");
          table.innerHTML = renderTableClipboardHtml(
            readTableBlockRows(block),
          );
          block.replaceWith(table);
        });

      const html = wrapper.innerHTML;
      if (!html) return;

      event.clipboardData.setData("text/html", html);
      event.clipboardData.setData("text/plain", htmlToPlainText(html));
      event.preventDefault();
    },
    [],
  );

  const insertTableBlock = useCallback((rows: string[][]) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    const liveRange =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0)
        : null;
    const savedRange = savedRangeRef.current;
    const range =
      liveRange && editor.contains(liveRange.commonAncestorContainer)
        ? liveRange
        : savedRange && editor.contains(savedRange.commonAncestorContainer)
          ? savedRange
          : null;

    const id = createTableId();
    const normalized = normalizeTableRows(rows);
    const block = document.createElement("div");
    block.className = "atomic-table-block";
    block.contentEditable = "false";
    block.dataset.tableId = id;
    block.dataset.table = JSON.stringify(normalized);
    block.innerHTML = renderTableBlockViewHtml(normalized);

    const trailing = document.createElement("p");
    trailing.innerHTML = "<br>";

    const topLevelChild = (node: Node | null): HTMLElement | null => {
      let current: Node | null = node;
      while (current && current.parentNode !== editor) {
        current = current.parentNode;
      }
      return current instanceof HTMLElement ? current : null;
    };

    let placement: HTMLElement = trailing;

    if (range) {
      range.collapse(true);
      const top = topLevelChild(range.startContainer);

      if (top?.classList.contains("atomic-table-block")) {
        top.after(block, trailing);
      } else if (
        top &&
        ["P", "DIV", "H1", "H2", "H3", "BLOCKQUOTE"].includes(
          top.tagName,
        )
      ) {
        const tailRange = document.createRange();
        tailRange.selectNodeContents(top);
        tailRange.setStart(range.startContainer, range.startOffset);
        const tail = tailRange.extractContents();
        const tailBlock = top.cloneNode(false) as HTMLElement;
        tailBlock.appendChild(tail);
        top.after(tailBlock);
        top.after(block);

        const hasTailContent =
          Boolean((tailBlock.textContent ?? "").trim()) ||
          Boolean(
            tailBlock.querySelector(
              "img, ul, ol, blockquote, h1, h2, h3, table, pre, hr",
            ),
          );
        if (!hasTailContent) tailBlock.remove();
        block.after(trailing);
        placement = trailing;
      } else if (top) {
        top.after(block, trailing);
      } else {
        editor.append(block, trailing);
      }
    } else {
      editor.append(block, trailing);
    }

    const caret = document.createRange();
    caret.setStart(placement, 0);
    caret.collapse(true);
    const nextSelection = window.getSelection();
    nextSelection?.removeAllRanges();
    nextSelection?.addRange(caret);
    savedRangeRef.current = null;

    tableBlocksRef.current = [
      ...tableBlocksRef.current,
      { id, rows: normalized },
    ];
    setTableBlocks(tableBlocksRef.current);
    setEditingBlockId(null);
    setEditingTableId(id);
  }, []);

  const handlePaste = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("[data-editor-container], [data-table-editor-container]")
      ) {
        return;
      }

      const pastedHtml = event.clipboardData.getData("text/html");
      const hasHtmlTable = /<table[\s>]/i.test(pastedHtml);

      if (!hasHtmlTable) {
        const pastedText = event.clipboardData.getData("text/plain");
        const rows = parseTabularText(pastedText);
        if (rows && restoreEditorSelection()) {
          event.preventDefault();
          insertTableBlock(rows);
          saveSelection();
          handleInput();
          return;
        }
      }

      if (!pastedHtml) return;

      const cleaned = sanitizeNoteHtml(pastedHtml);
      if (!cleaned.trim()) return;

      event.preventDefault();
      if (!restoreEditorSelection()) return;

      try {
        document.execCommand("styleWithCSS", false, "false");
      } catch {
        void 0;
      }
      document.execCommand("insertHTML", false, cleaned);

      const editor = editorRef.current;
      if (editor) {
        const restoredCode = hydrateCodeBlocks(editor);
        codeBlocksRef.current = restoredCode;
        setCodeBlocks(restoredCode);

        const restoredTables = hydrateTableBlocks(editor);
        tableBlocksRef.current = restoredTables;
        setTableBlocks(restoredTables);
      }

      saveSelection();
      handleInput();
    },
    [
      handleInput,
      restoreEditorSelection,
      saveSelection,
      insertTableBlock,
    ],
  );

  const endCodeEdit = useCallback(() => {
    if (draftSaveRef.current !== null) {
      window.clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }
    setEditingBlockId(null);
  }, []);

  const insertCodeBlock = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    const liveRange =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0)
        : null;
    const savedRange = savedRangeRef.current;
    const range =
      liveRange && editor.contains(liveRange.commonAncestorContainer)
        ? liveRange
        : savedRange && editor.contains(savedRange.commonAncestorContainer)
          ? savedRange
          : null;

    const id = `block-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const language = "javascript";

    const block = document.createElement("div");
    block.className = "atomic-code-block";
    block.contentEditable = "false";
    block.dataset.codeBlockId = id;
    block.dataset.code = "";
    block.dataset.language = language;
    block.innerHTML = renderCodeBlockViewHtml("", language);

    const trailing = document.createElement("p");
    trailing.innerHTML = "<br>";

    const topLevelChild = (node: Node | null): HTMLElement | null => {
      let current: Node | null = node;
      while (current && current.parentNode !== editor) {
        current = current.parentNode;
      }
      return current instanceof HTMLElement ? current : null;
    };

    let placement: HTMLElement = trailing;

    if (range) {
      range.collapse(true);
      const top = topLevelChild(range.startContainer);

      if (top?.classList.contains("atomic-code-block")) {
        top.after(block, trailing);
      } else if (
        top &&
        ["P", "DIV", "H1", "H2", "H3", "BLOCKQUOTE"].includes(
          top.tagName,
        )
      ) {
        const tailRange = document.createRange();
        tailRange.selectNodeContents(top);
        tailRange.setStart(range.startContainer, range.startOffset);
        const tail = tailRange.extractContents();
        const tailBlock = top.cloneNode(false) as HTMLElement;
        tailBlock.appendChild(tail);
        top.after(tailBlock);
        top.after(block);

        if (tailBlock.textContent?.trim() || tailBlock.querySelector("*")) {
          placement = tailBlock;
        } else {
          tailBlock.remove();
          block.after(trailing);
        }
      } else if (top) {
        top.after(block, trailing);
      } else {
        editor.append(block, trailing);
      }
    } else {
      editor.append(block, trailing);
    }

    const caret = document.createRange();
    caret.setStart(placement, 0);
    caret.collapse(true);
    const nextSelection = window.getSelection();
    nextSelection?.removeAllRanges();
    nextSelection?.addRange(caret);
    savedRangeRef.current = null;

    codeBlocksRef.current = [
      ...codeBlocksRef.current,
      { id, code: "", language },
    ];
    setCodeBlocks(codeBlocksRef.current);
    setEditingBlockId(id);
  }, []);

  const handleCodeBlockDraft = useCallback(
    (id: string, code: string, language: string) => {
      const normalized = normalizeLanguageId(language);
      const index = codeBlocksRef.current.findIndex(
        (block) => block.id === id,
      );

      if (index >= 0) {
        codeBlocksRef.current = codeBlocksRef.current.map((block) =>
          block.id === id
            ? { ...block, code, language: normalized }
            : block,
        );
      } else {
        codeBlocksRef.current = [
          ...codeBlocksRef.current,
          { id, code, language: normalized },
        ];
      }

      const editor = editorRef.current;
      const element = editor ? findCodeBlockElement(editor, id) : null;
      if (element) {
        element.dataset.code = code;
        element.dataset.language = normalized;
      }

      if (draftSaveRef.current !== null) {
        window.clearTimeout(draftSaveRef.current);
      }
      draftSaveRef.current = window.setTimeout(() => {
        draftSaveRef.current = null;
        saveNoteContentRef.current();
      }, 600);
    },
    [],
  );

  const handleCodeBlockCommit = useCallback(
    (id: string, code: string, language: string) => {
      const normalized = normalizeLanguageId(language);
      codeBlocksRef.current = codeBlocksRef.current.map((block) =>
        block.id === id
          ? { ...block, code, language: normalized }
          : block,
      );

      const editor = editorRef.current;
      const element = editor ? findCodeBlockElement(editor, id) : null;
      if (element) {
        element.dataset.code = code;
        element.dataset.language = normalized;
      }

      setCodeBlocks(codeBlocksRef.current);
      saveNoteContent();
    },
    [saveNoteContent],
  );

  const handleCodeBlockRemove = useCallback(
    (id: string) => {
      codeBlocksRef.current = codeBlocksRef.current.filter(
        (block) => block.id !== id,
      );
      setCodeBlocks(codeBlocksRef.current);

      const editor = editorRef.current;
      const element = editor ? findCodeBlockElement(editor, id) : null;
      if (editor && element) {
        const next = element.nextElementSibling;
        element.remove();
        if (
          next?.tagName === "P" &&
          next.innerHTML === "<br>" &&
          !next.nextElementSibling
        ) {
          next.remove();
        }
        if (editor.childNodes.length === 0) {
          const paragraph = document.createElement("p");
          paragraph.innerHTML = "<br>";
          editor.appendChild(paragraph);
        }
      }

      endCodeEdit();
      saveNoteContent();
    },
    [endCodeEdit, saveNoteContent],
  );

  const endTableEdit = useCallback(() => {
    if (draftSaveRef.current !== null) {
      window.clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }
    setEditingTableId(null);
  }, []);

  const handleTableDraft = useCallback((id: string, rows: string[][]) => {
    const normalized = normalizeTableRows(rows);
    const index = tableBlocksRef.current.findIndex((block) => block.id === id);

    if (index >= 0) {
      tableBlocksRef.current = tableBlocksRef.current.map((block) =>
        block.id === id ? { ...block, rows: normalized } : block,
      );
    } else {
      tableBlocksRef.current = [
        ...tableBlocksRef.current,
        { id, rows: normalized },
      ];
    }

    const editor = editorRef.current;
    const element = editor ? findTableBlockElement(editor, id) : null;
    if (element) element.dataset.table = JSON.stringify(normalized);

    if (draftSaveRef.current !== null) {
      window.clearTimeout(draftSaveRef.current);
    }
    draftSaveRef.current = window.setTimeout(() => {
      draftSaveRef.current = null;
      saveNoteContentRef.current();
    }, 600);
  }, []);

  const handleTableCommit = useCallback(
    (id: string, rows: string[][]) => {
      const normalized = normalizeTableRows(rows);
      const exists = tableBlocksRef.current.some((block) => block.id === id);

      tableBlocksRef.current = exists
        ? tableBlocksRef.current.map((block) =>
            block.id === id ? { ...block, rows: normalized } : block,
          )
        : [...tableBlocksRef.current, { id, rows: normalized }];

      const editor = editorRef.current;
      const element = editor ? findTableBlockElement(editor, id) : null;
      if (element) {
        element.dataset.table = JSON.stringify(normalized);
        element.dataset.tableId = id;

        // Always leave a tappable paragraph after the table so mobile users
        // have somewhere to place the caret without fighting the table view.
        const next = element.nextElementSibling;
        if (
          !next ||
          next.classList.contains("atomic-table-block") ||
          next.classList.contains("atomic-code-block")
        ) {
          const paragraph = document.createElement("p");
          paragraph.innerHTML = "<br>";
          element.after(paragraph);
        }
      }

      setTableBlocks(tableBlocksRef.current);
      saveNoteContent();
    },
    [saveNoteContent],
  );

  const handleTableRemove = useCallback(
    (id: string) => {
      tableBlocksRef.current = tableBlocksRef.current.filter(
        (block) => block.id !== id,
      );
      setTableBlocks(tableBlocksRef.current);

      const editor = editorRef.current;
      const element = editor ? findTableBlockElement(editor, id) : null;
      if (editor && element) {
        const next = element.nextElementSibling;
        const wrapper = element.parentElement;
        element.remove();
        if (
          wrapper &&
          wrapper !== editor &&
          wrapper.tagName === "DIV" &&
          wrapper.childElementCount === 0 &&
          !(wrapper.textContent ?? "").trim()
        ) {
          wrapper.remove();
        }
        if (
          next?.tagName === "P" &&
          next.innerHTML === "<br>" &&
          !next.nextElementSibling
        ) {
          next.remove();
        }
        if (editor.childNodes.length === 0) {
          const paragraph = document.createElement("p");
          paragraph.innerHTML = "<br>";
          editor.appendChild(paragraph);
        }
      }

      endTableEdit();
      saveNoteContent();
    },
    [endTableEdit, saveNoteContent],
  );

  const handleEditorClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const element = event.target as HTMLElement;
      if (element.closest("[data-table-editor-container]")) return;

      const tableElement = element.closest<HTMLElement>(
        ".atomic-table-block",
      );
      const tableId = tableElement?.dataset.tableId;
      if (tableId) {
        if (tableElement.dataset.editing === "true") return;
        event.preventDefault();
        setEditingBlockId(null);
        setEditingTableId(tableId);
        return;
      }

      const blockElement = element.closest<HTMLElement>(
        ".atomic-code-block",
      );
      const id = blockElement?.dataset.codeBlockId;
      if (!id) return;
      if (blockElement.dataset.editing === "true") return;
      event.preventDefault();
      setEditingTableId(null);
      setEditingBlockId(id);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active || selectionMode) return;
      const target = e.target as HTMLElement | null;
      const inTableEditor = Boolean(
        target?.closest("[data-table-editor-container]"),
      );
      if (target?.closest(".atomic-code-block, [data-editor-container]")) {
        return;
      }

      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      const findTool = (label: string) =>
        tools.find((tool) => tool.label === label);

      let tool: Tool | undefined;
      if (mod && !e.altKey && !e.shiftKey) {
        if (key === "b") tool = findTool("Bold");
        else if (key === "i") tool = findTool("Italic");
        else if (key === "u") tool = findTool("Underline");
        else if (key === "q") tool = findTool("Quote");
      } else if (mod && e.altKey && !e.shiftKey) {
        if (key === "h" || key === "2") tool = findTool("Heading");
      } else if (e.altKey && e.shiftKey && !mod) {
        if (key === "h") tool = findTool("Heading");
        else if (key === "l") tool = findTool("Bullet list");
        else if (key === "n") tool = findTool("Numbered list");
        else if (key === "e") tool = findTool("Code block");
        else if (key === "t") tool = findTool("Table");
      } else if (mod && e.shiftKey && !e.altKey) {
        if (key === "7" || key === "&") tool = findTool("Numbered list");
        else if (key === "8" || key === "*") tool = findTool("Bullet list");
        else if (key === "9") tool = findTool("Code block");
      }

      if (!tool) return;
      e.preventDefault();
      e.stopPropagation();

      if (inTableEditor) {
        if (!TABLE_CELL_TOOL_LABELS.has(tool.label)) return;
        tool.run();
        getTableCellEditor()?.dispatchEvent(
          new Event("input", { bubbles: true }),
        );
        handleInput();
        return;
      }

      focusEditor();
      tool.run();
      handleInput();
    },
    [active, selectionMode, handleInput, getTableCellEditor],
  );

  useEffect(() => {
    if (!active) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.addEventListener("keydown", handleKeyDown, true);
    return () => editor.removeEventListener("keydown", handleKeyDown, true);
  }, [active, handleKeyDown]);

  // Selection mode handlers
  const toggleSelectAll = useCallback(() => {
    const allIds = notes.map((n) => n.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [notes, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
    setBulkActionType(null);
  }, []);

  const enterSelectionMode = useCallback((type: 'download' | 'share') => {
    saveNoteContentRef.current();
    if (draftSaveRef.current !== null) {
      window.clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }
    setBulkActionType(type);
    setSelectionMode(true);
  }, []);

  const handleBulkDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDownloading(true);
    try {
      const ids = Array.from(selectedIds).filter(
        (id): id is string => typeof id === "string",
      );
      await flush();
      const downloadNotes = await bulkDownloadNotes(ids);
      const content = await buildNotesExportHtml(
        downloadNotes.map((note) => ({
          title: note.title,
          html: note.html,
          courseTitle: note.courseTitle,
          updatedAt: note.updatedAt,
        })),
      );

      const blob = new Blob([content], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportFilename(downloadNotes);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Downloaded ${downloadNotes.length} note${
          downloadNotes.length > 1 ? "s" : ""
        }`,
      );
      clearSelection();
    } catch (error) {
      toast.error("Failed to download notes");
      console.error(error);
    } finally {
      setBulkDownloading(false);
    }
  }, [selectedIds, clearSelection, flush]);

  const handleBulkShare = useCallback(() => {
    if (selectedIds.size === 0) return;
    void flush()
      .catch(() => undefined)
      .finally(() => setBulkShareOpen(true));
  }, [selectedIds, flush]);
  
  const [bulkShareOpen, setBulkShareOpen] = useState(false);

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
  const MOD = isMac ? "⌘" : "Ctrl";
  const SHIFT = isMac ? "⇧" : "Shift";
  const ALT = isMac ? "⌥" : "Alt";

  const toggleHeading = () => {
    const cell = getTableCellEditor();
    if (cell) {
      const heading = cell.querySelector<HTMLElement>("h2, h3");
      if (heading) {
        while (heading.firstChild) {
          cell.insertBefore(heading.firstChild, heading);
        }
        heading.remove();
      } else {
        const next = document.createElement("h2");
        while (cell.firstChild) next.appendChild(cell.firstChild);
        cell.appendChild(next);
      }
      cell.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (!restoreEditorSelection()) return;
    const block = getSelectionBlock();
    const target = block?.closest("h2") ? "p" : "h2";
    applyEditorCommand("formatBlock", `<${target}>`);
  };

  const toggleQuote = () => {
    const cell = getTableCellEditor();
    if (cell) {
      const quote = cell.querySelector<HTMLElement>("blockquote");
      if (quote) {
        while (quote.firstChild) {
          cell.insertBefore(quote.firstChild, quote);
        }
        quote.remove();
      } else {
        const next = document.createElement("blockquote");
        while (cell.firstChild) next.appendChild(cell.firstChild);
        cell.appendChild(next);
      }
      cell.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (!restoreEditorSelection()) return;
    const block = getSelectionBlock();
    const quote = block?.closest("blockquote");
    if (quote) {
      const parent = quote.parentNode;
      if (parent) {
        while (quote.firstChild) {
          parent.insertBefore(quote.firstChild, quote);
        }
        parent.removeChild(quote);
        saveSelection();
      }
      return;
    }
    applyEditorCommand("formatBlock", "<blockquote>");
  };

  const insertTable = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    insertTableBlock(createDefaultTableRows());
  };

  const tools: Tool[] = [
    { label: "Bold", icon: Bold, run: () => applyEditorCommand("bold"), shortcut: `${MOD} + B` },
    { label: "Italic", icon: Italic, run: () => applyEditorCommand("italic"), shortcut: `${MOD} + I` },
    {
      label: "Underline",
      icon: Underline,
      run: () => applyEditorCommand("underline"),
      shortcut: `${MOD} + U`,
    },
    {
      label: "Heading",
      icon: Heading2,
      run: toggleHeading,
      shortcut: `${ALT} + ${SHIFT} + H`,
    },
    {
      label: "Quote",
      icon: Quote,
      run: toggleQuote,
      shortcut: `${MOD} + Q`,
    },
    {
      label: "Bullet list",
      icon: List,
      run: () => applyEditorCommand("insertUnorderedList"),
      shortcut: `${ALT} + ${SHIFT} + L`,
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      run: () => applyEditorCommand("insertOrderedList"),
      shortcut: `${ALT} + ${SHIFT} + N`,
    },
    {
      label: "Code block",
      icon: Code,
      run: insertCodeBlock,
      shortcut: `${ALT} + ${SHIFT} + E`,
    },
    {
      label: "Table",
      icon: Table,
      run: insertTable,
      shortcut: `${ALT} + ${SHIFT} + T`,
    },
  ];

  /** Shared "move to course" option list for the desktop menu and the mobile
   *  three-dot menu. */
  const courseOptionButtons = active ? (
    <>
      <button
        type="button"
        onClick={() => {
          updateNoteCourse(active.id, null);
          setCourseMenuOpen(false);
          setMobileActionsOpen(false);
        }}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star ${
          active.courseId === null
            ? "bg-[#cf9eff]/12 text-[#cf9eff]"
            : "hover:bg-white/[0.07] text-white/75"
        }`}
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
            active.courseId === null
              ? "border-[#cf9eff]/40 bg-[#cf9eff]/15 text-[#cf9eff]"
              : "border-white/10 bg-white/[0.05] text-white/45"
          }`}
        >
          <StickyNote className="size-4" />
        </span>
        <span
          className={`min-w-0 flex-1 truncate ${
            active.courseId === null
              ? "font-medium text-white"
              : "text-white/75"
          }`}
        >
          General
        </span>
        {active.courseId === null && (
          <Check className="size-4 shrink-0 text-[#cf9eff]" />
        )}
      </button>
      {courses.map((course) => (
        <button
          key={course.id}
          type="button"
          onClick={() => {
            updateNoteCourse(active.id, course.id);
            setCourseMenuOpen(false);
            setMobileActionsOpen(false);
          }}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star ${
            active.courseId === course.id
              ? "bg-[#cf9eff]/12"
              : "hover:bg-white/[0.07]"
          }`}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
              active.courseId === course.id
                ? "border-[#cf9eff]/40 bg-[#cf9eff]/15"
                : "border-white/10 bg-white/[0.05]"
            }`}
            style={{
              color:
                active.courseId === course.id ? course.accent : "white",
            }}
          >
            <BookOpen className="size-4" style={{ color: course.accent }} />
          </span>
          <span
            className={`min-w-0 flex-1 truncate ${
              active.courseId === course.id
                ? "font-medium text-white"
                : "text-white/75"
            }`}
          >
            {course.title}
          </span>
          {active.courseId === course.id && (
            <Check
              className="size-4 shrink-0"
              style={{ color: course.accent }}
            />
          )}
        </button>
      ))}
    </>
  ) : null;

  const onSubmitNewNote = (event: FormEvent) => {
    event.preventDefault();
    void addNote();
  };

  const renderNote = (note: Note, context: 'sidebar' | 'selection' = 'sidebar') => {
    const dragging = draggingId === note.id;
    const dragOver = dragOverId === note.id && !dragging;
    const isSelected = selectedIds.has(note.id);
    const hasSender = note.sharedBy != null;
    const isSelectionContext = context === 'selection';
    const accent = noteAccent(note, accentByCourseId);
    const isActive = note.id === activeId && !selectionMode;

    return (
      <li
        key={note.id}
        draggable
        onDragStart={(event) => {
          if (selectionMode) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", note.id);
          setDraggingId(note.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
        }}
        onDragOver={(event) => {
          if (selectionMode || !draggingId || draggingId === note.id) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (dragOverId !== note.id) setDragOverId(note.id);
        }}
        onDragLeave={() =>
          setDragOverId((current) => (current === note.id ? null : current))
        }
        onDrop={(event) => {
          if (selectionMode) return;
          event.preventDefault();
          const source =
            event.dataTransfer.getData("text/plain") || draggingId;
          if (source) reorderNotes(source, note.id);
          setDraggingId(null);
          setDragOverId(null);
        }}
        className={`relative rounded-xl transition-all duration-200 ease-in-out ${
          dragging ? "opacity-45" : ""
        } ${
          dragOver ? "shadow-[0_0_0_2px_rgba(207,158,255,0.55)]" : ""
        } ${isSelected
          ? "bg-[#cf9eff]/10 border border-[#cf9eff]/30 backdrop-blur-sm"
          : ""}`}
      >
        {selectionMode && isSelectionContext && (
          <label
            className="absolute right-2 top-2 z-10 flex items-center justify-center size-5 shrink-0 rounded-full border border-white/20 bg-white/[0.03] transition-colors hover:border-[#cf9eff]/50 hover:bg-[#cf9eff]/10 cursor-pointer"
            htmlFor={`note-checkbox-${note.id}`}
          >
            <input
              type="checkbox"
              id={`note-checkbox-${note.id}`}
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(note.id);
                  else next.delete(note.id);
                  return next;
                });
              }}
              className="sr-only"
            />
            <Check
              className={`size-3.5 transition-all duration-200 ${
                isSelected ? "text-[#cf9eff] opacity-100 scale-100" : "text-white/50 opacity-0 scale-50"
              }`}
              aria-hidden="true"
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => {
            if (selectionMode) {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(note.id)) next.delete(note.id);
                else next.add(note.id);
                return next;
              });
            } else {
              setActiveId(note.id);
              revealEditorOnMobile();
            }
          }}
          title={selectionMode ? "Toggle selection" : "Drag to reorder"}
          className={`group relative flex w-full items-start gap-2.5 rounded-xl border py-3 pr-3 pl-4 text-left transition-colors ${
            isActive
              ? ""
              : isSelected
                ? "border-transparent bg-transparent"
                : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
          }`}
          style={{
            backgroundColor: isActive
              ? hexToRgba(accent, 0.14)
              : isSelected
                ? "transparent"
                : hexToRgba(accent, 0.05),
            borderColor: isActive ? hexToRgba(accent, 0.35) : undefined,
          }}
        >
          <span
            aria-hidden="true"
            className={`absolute top-2 bottom-2 left-1.5 w-[3px] rounded-full transition-opacity ${
              isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
            }`}
            style={{ backgroundColor: accent }}
          />
          {!selectionMode && (
            <GripVertical
              className="mt-0.5 size-3.5 shrink-0 cursor-grab text-white/15 transition-colors group-hover:text-white/45"
              aria-hidden="true"
            />
          )}
          <span className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm text-white">
                {note.title || "Untitled note"}
              </span>
              {hasSender && !isSelectionContext && (
                <span
                  className="shrink-0 rounded-full border border-[#cf9eff]/30 bg-[#cf9eff]/10 px-2 py-0.5 text-[10px] font-medium text-[#cf9eff] transition-all duration-200"
                  title="Shared with you"
                >
                  {note.sharedByName || "User"}
                </span>
              )}
            </div>
            <span className="mt-0.5 block text-xs text-white/35">
              {new Date(note.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <style>{CODE_BLOCK_CSS}</style>
      <style>{TABLE_BLOCK_CSS}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Memory
          </p>
          <RevealText
            as="h1"
            text="Notes that survive the session."
            className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl"
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <CourseSwitcher
            courses={courses}
            value={selectedCourseId}
            onChange={(next) =>
              setSearchParams(next != null ? { courseId: String(next) } : {})
            }
          />
          <form onSubmit={onSubmitNewNote}>
            <button
              type="submit"
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
            >
              <Plus className="size-4" />
              New note
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="glass card-sheen flex max-h-[42dvh] flex-col overflow-hidden rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] lg:max-h-[65vh]">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.07] px-4 py-3">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: selectedCourse?.accent ?? "#cf9eff",
              }}
            />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
              {selectedCourse?.title ?? "All Notes"}
            </p>
          </div>

          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
          >
            {loading || (selectedCourseId != null && coursesLoading) ? (
              <p className="p-4 text-center text-sm text-white/40">
                Loading notes…
              </p>
            ) : notes.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-white/40">
                  {selectedCourse
                    ? "No notes in this course yet."
                    : "No notes yet."}
                </p>
                <button
                  type="button"
                  onClick={() => void addNote()}
                  className="mt-2 text-sm text-star transition-colors hover:text-white"
                >
                  {selectedCourse
                    ? "Write one in this course"
                    : "Write the first one"}
                </button>
              </div>
            ) : selectedCourseId == null ? (
              <div className="space-y-3">
                {groupedNotes.map((group) => {
                  const collapsed = collapsedGroups.has(group.key);
                  return (
                    <div key={group.key}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={!collapsed}
                        className="flex w-full items-center gap-1.5 rounded-lg px-3.5 pt-2 pb-1.5 text-left text-[10px] font-medium uppercase tracking-[0.22em] text-white/35 transition-colors hover:text-white/60"
                      >
                        {collapsed ? (
                          <ChevronRight className="size-3 shrink-0" />
                        ) : (
                          <ChevronDown className="size-3 shrink-0" />
                        )}
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: group.accent }}
                        />
                        <span
                          className="min-w-0 flex-1 truncate"
                          style={{ color: hexToRgba(group.accent, 0.9) }}
                        >
                          {group.title}
                        </span>
                      </button>
                      {!collapsed && (
                        <ul className="space-y-1.5">
                          {group.notes.map((note) => renderNote(note, 'sidebar'))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="space-y-1.5">{notes.map((note) => renderNote(note, 'sidebar'))}</ul>
            )}
          </div>
        </aside>

        {selectionMode && (
          <aside className="glass card-sheen flex max-h-[65vh] flex-col overflow-hidden rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-[#cf9eff]/30 bg-[#cf9eff]/5">
            <div className="shrink-0 border-b border-white/[0.07] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="relative flex items-center justify-center size-5 shrink-0 rounded-full border border-white/20 bg-white/[0.03] transition-colors hover:border-[#cf9eff]/50 hover:bg-[#cf9eff]/10">
                    <input
                      type="checkbox"
                      checked={notes.length > 0 && notes.every((n) => selectedIds.has(n.id))}
                      onChange={toggleSelectAll}
                      className="sr-only"
                      aria-label="Select all notes"
                    />
                    <Check
                      className={`size-3.5 transition-all duration-200 ${
                        notes.length > 0 && notes.every((n) => selectedIds.has(n.id))
                          ? "text-[#cf9eff] opacity-100 scale-100"
                          : "text-white/50 opacity-0 scale-50"
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-sm font-medium text-white">
                    {notes.length > 0 && notes.every((n) => selectedIds.has(n.id))
                      ? "Deselect all"
                      : "Select all"}
                  </span>
                </label>
                <span className="text-xs text-white/50 px-2 py-0.5 rounded-full bg-white/[0.05]">
                  {selectedIds.size} selected
                </span>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm text-white/60 hover:text-white transition-colors"
                aria-label="Cancel selection"
              >
                Cancel
              </button>
            </div>
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
            >
              {selectedCourseId == null ? (
                <div className="space-y-3">
                  {groupedNotes.map((group) => {
                    const collapsed = collapsedGroups.has(group.key);
                    return (
                      <div key={group.key}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          aria-expanded={!collapsed}
                          className="flex w-full items-center gap-1.5 rounded-lg px-3.5 pt-2 pb-1.5 text-left text-[10px] font-medium uppercase tracking-[0.22em] text-white/35 transition-colors hover:text-white/60"
                        >
                          {collapsed ? (
                            <ChevronRight className="size-3 shrink-0" />
                          ) : (
                            <ChevronDown className="size-3 shrink-0" />
                          )}
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: group.accent }}
                          />
                          <span
                            className="min-w-0 flex-1 truncate"
                            style={{ color: hexToRgba(group.accent, 0.9) }}
                          >
                            {group.title}
                          </span>
                        </button>
                        {!collapsed && (
                          <ul className="space-y-1.5">
{group.notes.map((note) => renderNote(note, 'selection'))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
<ul className="space-y-1.5">{notes.map((note) => renderNote(note, 'selection'))}</ul>
              )}
            </div>
          </aside>
        )}

        {!selectionMode && (
          <section ref={editorSectionRef} className="glass card-sheen flex min-h-[60vh] min-w-0 flex-col rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] lg:min-h-[65vh]">
          {active ? (
            <>
              <div className="flex items-center gap-1 border-b border-white/[0.07] px-2 py-2 sm:px-4 sm:py-3">
                <div
                  data-lenis-prevent
                  className="flex min-w-0 flex-1 items-center gap-0.5 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden sm:gap-1"
                >
                  {tools.map((tool) => (
                    <button
                      key={tool.label}
                      type="button"
                      title={tool.label}
                      aria-label={tool.label}
                      data-format-tool={
                        editingTableId &&
                        TABLE_CELL_TOOL_LABELS.has(tool.label)
                          ? "true"
                          : undefined
                      }
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (editingTableId) {
                          if (!TABLE_CELL_TOOL_LABELS.has(tool.label)) return;
                          tool.run();
                          getTableCellEditor()?.dispatchEvent(
                            new Event("input", { bubbles: true }),
                          );
                          handleInput();
                          return;
                        }
                        focusEditor();
                        tool.run();
                        handleInput();
                      }}
                      className="relative group shrink-0 rounded-lg p-2 text-white/45 transition-colors hover:bg-[#cf9eff]/15 hover:text-[#cf9eff]"
                    >
                      <tool.icon className="size-4" />
                      {tool.shortcut && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                          {tool.shortcut}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-1 sm:pl-2">
                  <div className="hidden items-center gap-1.5 md:flex">
                  <button
                    type="button"
                    onClick={() => active && enterSelectionMode('download')}
                    className="relative rounded-lg p-2 text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white group"
                    aria-label="Download notes"
                  >
                    <Download className="size-4" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                      Download notes (select multiple)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => active && enterSelectionMode('share')}
                    disabled={!shareableId}
                    className="relative rounded-lg p-2 text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/45 group"
                    aria-label="Share notes"
                  >
                    <Share2 className="size-4" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                      {shareableId ? "Share notes (select multiple)" : "Wait for this note to save before sharing"}
                    </span>
                  </button>
{active && courses.length > 0 && (
                      <div className="relative" ref={courseMenuRef}>
                        <button
                          type="button"
                          onClick={() => setCourseMenuOpen((prev) => !prev)}
                          className={`relative rounded-lg p-2 transition-colors group ${
                            courseMenuOpen
                              ? "bg-[#cf9eff]/15 text-[#cf9eff]"
                              : "text-white/45 hover:bg-white/[0.07] hover:text-white"
                          }`}
                          aria-label="Move note to course"
                        >
                          <BookOpen className="size-4" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                            Move note to course
                          </span>
                        </button>

                        <AnimatePresence>
                          {courseMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: EASE }}
                              className="absolute right-0 top-full mt-2 z-50 min-w-[180px] max-w-[90vw] rounded-2xl border border-white/10 bg-[#111] p-1.5 shadow-xl backdrop-blur-2xl"
                            >
                              {courseOptionButtons}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  <span
                    className={`text-xs transition-opacity duration-300 ${
                      saved ? "text-[#cf9eff]/80 opacity-100" : "opacity-0"
                    }`}
                  >
                    Saved
                  </span>
                  <button
                    type="button"
                    onClick={() => active && setDeleteConfirmId(active.id)}
                    className="relative rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-red-300 group"
                    aria-label="Delete note"
                  >
                    <Trash2 className="size-4" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                      Delete note
                    </span>
                  </button>
                  </div>
                  <span
                    className={`text-xs transition-opacity duration-300 md:hidden ${
                      saved ? "text-[#cf9eff]/80 opacity-100" : "opacity-0"
                    }`}
                  >
                    Saved
                  </span>
                  <div ref={mobileActionsRef} className="relative md:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileActionsOpen((prev) => !prev);
                        setCourseMenuOpen(false);
                      }}
                      aria-haspopup="menu"
                      aria-expanded={mobileActionsOpen}
                      aria-label="Note actions"
                      className={`rounded-lg p-2 transition-colors ${
                        mobileActionsOpen
                          ? "bg-[#cf9eff]/15 text-[#cf9eff]"
                          : "text-white/45 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      <EllipsisVertical className="size-4" />
                    </button>
                    <AnimatePresence>
                      {mobileActionsOpen && (
                        <motion.div
                          role="menu"
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: EASE }}
                          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#111] p-1.5 shadow-xl backdrop-blur-2xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMobileActionsOpen(false);
                              if (active) enterSelectionMode("download");
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white"
                          >
                            <Download className="size-4" /> Download notes
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={!shareableId}
                            onClick={() => {
                              setMobileActionsOpen(false);
                              if (active) enterSelectionMode("share");
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/75"
                          >
                            <Share2 className="size-4" /> Share notes
                          </button>
                          {active && courses.length > 0 && (
                            <>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => setCourseMenuOpen((prev) => !prev)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white"
                              >
                                <BookOpen className="size-4" /> Move to course
                                <ChevronDown
                                  className={`ml-auto size-3.5 transition-transform ${
                                    courseMenuOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              {courseMenuOpen && (
                                <div className="mt-1 max-h-52 overflow-y-auto overscroll-contain border-t border-white/[0.07] pt-1">
                                  {courseOptionButtons}
                                </div>
                              )}
                            </>
                          )}
                          <div className="mx-1 my-1 border-t border-white/[0.07]" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMobileActionsOpen(false);
                              if (active) setDeleteConfirmId(active.id);
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-200"
                          >
                            <Trash2 className="size-4" /> Delete note
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </span>
              </div>

              <div className="border-b border-white/[0.07] px-4 pt-4 sm:px-6 sm:pt-5">
                {activeCourse && (
                  <div
                    className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: hexToRgba(activeAccent, 0.9) }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: activeAccent }}
                    />
                    <span className="truncate">{activeCourse.title}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={active.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNotes((prev) =>
                      prev.map((note) =>
                        note.id === active.id ? { ...note, title } : note,
                      ),
                    );
                    persist(active.id, { title });
                  }}
                  placeholder="Untitled note"
                  className="w-full bg-transparent text-xl font-semibold tracking-[-0.03em] text-white placeholder:text-white/20 focus:outline-none sm:text-2xl"
                />
              </div>

{!selectionMode ? (
                <>
                  <div
                    data-lenis-prevent
                    className="relative min-h-0 flex-1 max-md:max-h-[68dvh] max-md:overflow-y-auto max-md:overscroll-contain max-md:scroll-smooth"
                  >
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleInput}
                      onBlur={handleEditorBlur}
                      onClick={handleEditorClick}
                      onCopy={handleCopy}
                      onPaste={handlePaste}
                      onKeyUp={saveSelection}
                      onMouseUp={saveSelection}
                      spellCheck={false}
                      className="min-h-[42dvh] flex-1 break-words px-3 py-4 text-base leading-relaxed text-white/70 focus:outline-none max-md:min-h-[52dvh] max-md:pb-32 sm:min-h-[38vh] sm:px-6 sm:py-5 sm:text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-star/50 [&_blockquote]:pl-4 [&_blockquote]:text-white/50 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      aria-label="Note content"
                    />
                    {/* Render InlineCodeBlock as portals targeting the atomic-code-block elements inside the editor */}
                    {codeBlocks.map((block) => (
                      <InlineCodeBlock
                        key={block.id}
                        id={block.id}
                        code={block.code}
                        language={block.language}
                        editing={editingBlockId === block.id}
                        containerRef={editorRef}
                        onDraftChange={(code, language) =>
                          handleCodeBlockDraft(block.id, code, language)
                        }
                        onCommit={(code, language) =>
                          handleCodeBlockCommit(block.id, code, language)
                        }
                        onExit={endCodeEdit}
                        onRemove={() => handleCodeBlockRemove(block.id)}
                      />
                    ))}
                    {tableBlocks.map((block) => (
                      <InlineTableBlock
                        key={block.id}
                        id={block.id}
                        rows={block.rows}
                        editing={editingTableId === block.id}
                        containerRef={editorRef}
                        onDraftChange={(rows) =>
                          handleTableDraft(block.id, rows)
                        }
                        onCommit={(rows) =>
                          handleTableCommit(block.id, rows)
                        }
                        onExit={endTableEdit}
                        onRemove={() => handleTableRemove(block.id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="min-h-[38vh] flex-1 px-6 py-5 flex items-center justify-center">
                  <p className="text-white/30 text-center">Select notes from the sidebar to perform bulk actions</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center sm:p-10">
              <p className="text-sm text-white/40">
                {loading
                  ? "Loading notes…"
                  : "Pick a note on the left, or start a fresh page."}
              </p>
              <button
                type="button"
                onClick={() => void addNote()}
                className="text-sm text-star transition-colors hover:text-white"
              >
                + New note
              </button>
            </div>
          )}
          </section>
        )}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
        className="text-xs text-white/30"
      >
        Content is sanitized with DOMPurify and saved as you type.
      </motion.p>

      <ShareNoteModal
        open={shareOpen}
        noteId={shareableId}
        noteTitle={active?.title ?? ""}
        onClose={closeShare}
      />

      {selectionMode && selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:bottom-6 sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-3 sm:px-4 sm:py-3"
          style={{ backgroundColor: "rgba(10, 10, 18, 0.95)" }}
          role="region"
          aria-label="Bulk actions"
        >
          <span className="text-xs text-white/50 shrink-0">
            {selectedIds.size} note{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          {bulkActionType === 'download' && (
            <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-3">
              <button
                type="button"
                onClick={handleBulkDownload}
                disabled={bulkDownloading}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Download selected notes"
              >
                <Download className="size-3.5" />
                <span>Download</span>
              </button>
            </div>
          )}
          {bulkActionType === 'share' && (
            <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-3">
              <button
                type="button"
                onClick={handleBulkShare}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06]"
                aria-label="Share selected notes"
              >
                <Users className="size-3.5" />
                <span>Share</span>
              </button>
            </div>
          )}
        </motion.div>
      )}

      <BulkShareModal
        open={bulkShareOpen}
        noteIds={Array.from(selectedIds).filter((id): id is string => typeof id === "string")}
        noteCount={selectedIds.size}
        onClose={() => setBulkShareOpen(false)}
        onShared={clearSelection}
      />

      {deleteConfirmId && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="relative flex max-w-md w-full flex-col overflow-hidden rounded-2xl border border-white/10 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)]"
              style={{ backgroundColor: "#0a0a12" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-6 pt-5 pb-4">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-red-400/25 bg-red-500/10 text-red-400">
                  <Trash2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
                    Delete note
                  </p>
                  <h3 className="mt-1 truncate text-base font-semibold text-white">
                    Are you sure?
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    This will permanently delete the selected note. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="border-t border-white/[0.07] px-6 py-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const note = notes.find((n) => n.id === deleteConfirmId);
                    if (note) removeNote(note.id);
                    setDeleteConfirmId(null);
                  }}
                  className="rounded-xl border border-red-400/25 bg-red-500/15 px-4 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25 hover:text-red-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      </div>
  );
}
