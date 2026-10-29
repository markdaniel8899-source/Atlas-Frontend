import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GripVertical,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  Share2,
  StickyNote,
  Trash2,
  Underline,
  Users,
} from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { ShareNoteModal } from "../../components/notes/ShareNoteModal";
import { BulkShareModal } from "../../components/notes/BulkShareModal";
import { sanitizeHtml } from "../../lib/notes";
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
  notes: Note[];
}

const NOTE_ORDER_PREFIX = "atlas:note-order:";

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
  courses: { id: number; title: string }[];
  value: number | null;
  onChange: (courseId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = [
    { id: null, title: "All notes", icon: StickyNote },
    ...courses.map((course) => ({
      id: course.id,
      title: course.title,
      icon: BookOpen,
    })),
  ];
  const selected = items.find((item) => item.id === value) ?? items[0];

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
          className={`size-4 shrink-0 ${open ? "text-[#cf9eff]" : "text-[#cf9eff]/70"}`}
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
                    active ? "bg-[#cf9eff]/12" : "hover:bg-white/[0.07]"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                      active
                        ? "border-[#cf9eff]/40 bg-[#cf9eff]/15 text-[#cf9eff]"
                        : "border-white/10 bg-white/[0.05] text-white/45"
                    }`}
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
                    <Check className="size-4 shrink-0 text-[#cf9eff]" />
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
  const timerRef = useRef<number | null>(null);
  const savedRef = useRef<number | null>(null);
  const networkRef = useRef<number | null>(null);
  const pendingRef = useRef<Map<string, Partial<Omit<Note, "id">>>>(new Map());
  /** Bumped on every local write: in-flight refetches that started before a
   *  write can be stale, so their responses are discarded. */
  const dataVersionRef = useRef(0);
  const activeRef = useRef<string | null>(activeId);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'download' | 'share' | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const courseMenuRef = useRef<HTMLDivElement>(null);

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
      const group = groups.get(key);
      if (group) group.notes.push(note);
      else groups.set(key, { key, title, notes: [note] });
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === "general") return -1;
      if (b.key === "general") return 1;
      return a.title.localeCompare(b.title);
    });
  }, [notes, courses]);

  useEffect(() => {
    activeRef.current = activeId;
    const note = notes.find((n) => n.id === activeId);
    if (editorRef.current && note) {
      editorRef.current.innerHTML = sanitizeHtml(note.html);
    }
    // selectionMode is a dep so leaving multi-select repopulates the editor
    // (the contentEditable is remounted after being hidden).
  }, [activeId, selectionMode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (savedRef.current) window.clearTimeout(savedRef.current);
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
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note,
      ),
    );
    markSaved();
    if (networkRef.current) window.clearTimeout(networkRef.current);
    networkRef.current = window.setTimeout(() => void flush(), 700);
  };

  const handleInput = () => {
    const id = activeRef.current;
    if (!id || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => persist(id, { html }), 600);
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
  };

  const removeNote = (id: string) => {
    pendingRef.current.delete(id);
    dataVersionRef.current += 1;
    const next = notes
      .filter((note) => note.id !== id)
      .map((note, index) => ({ ...note, sortOrder: index }));
    setNotes(next);
    saveOrder(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active || selectionMode) return;
      if (!(e.metaKey || e.ctrlKey)) return;

      const key = e.key.toUpperCase();
      const tool = tools.find((t) => t.shortcut?.toUpperCase() === `⌘${key}`);
      if (tool) {
        e.preventDefault();
        e.stopPropagation();
        focusEditor();
        tool.run();
        handleInput();
      }
    },
    [active, selectionMode, handleInput],
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
      const downloadNotes = await bulkDownloadNotes(ids);
      
      // Create HTML file with all notes content (preserves rich text formatting)
      const content = downloadNotes
        .map(
          (note) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #111;
      margin-top: 24px;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    h1 { font-size: 2.5rem; border-bottom: 2px solid #eaeaea; padding-bottom: 8px; }
    h2 { font-size: 1.8rem; }
    h3 { font-size: 1.4rem; }
    p { margin: 12px 0; }
    ul, ol { margin: 12px 0; padding-left: 24px; }
    li { margin: 6px 0; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SF Mono", "Fira Code", "Monaco", monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: 0.9rem;
    }
    blockquote {
      border-left: 4px solid #cf9eff;
      padding-left: 16px;
      margin: 16px 0;
      color: #666;
      font-style: italic;
    }
    a { color: #cf9eff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #eaeaea; margin: 24px 0; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    u { text-decoration: underline; }
    .note-separator {
      border-top: 2px dashed #cf9eff;
      margin: 40px 0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div>${note.html}</div>
</body>
</html>
`,
        )
        .join('<div class="note-separator"></div>');
      
      const blob = new Blob([content], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${downloadNotes.length} note${downloadNotes.length > 1 ? "s" : ""}`);
      clearSelection();
    } catch (error) {
      toast.error("Failed to download notes");
      console.error(error);
    } finally {
      setBulkDownloading(false);
    }
  }, [selectedIds, clearSelection]);

  const handleBulkShare = useCallback(() => {
    if (selectedIds.size > 0) {
      setBulkShareOpen(true);
    }
  }, [selectedIds]);
  
  const [bulkShareOpen, setBulkShareOpen] = useState(false);

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
  const MOD = isMac ? "⌘" : "Ctrl";
  const SHIFT = isMac ? "⇧" : "Shift";

  const tools: Tool[] = [
    { label: "Bold", icon: Bold, run: () => document.execCommand("bold"), shortcut: `${MOD} + B` },
    { label: "Italic", icon: Italic, run: () => document.execCommand("italic"), shortcut: `${MOD} + I` },
    {
      label: "Underline",
      icon: Underline,
      run: () => document.execCommand("underline"),
      shortcut: `${MOD} + U`,
    },
    {
      label: "Heading",
      icon: Heading2,
      run: () => document.execCommand("formatBlock", false, "h2"),
      shortcut: `${MOD} + ${SHIFT} + H`,
    },
    {
      label: "Quote",
      icon: Quote,
      run: () => document.execCommand("formatBlock", false, "blockquote"),
      shortcut: `${MOD} + Q`,
    },
    {
      label: "Bullet list",
      icon: List,
      run: () => document.execCommand("insertUnorderedList"),
      shortcut: `${MOD} + ${SHIFT} + L`,
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      run: () => document.execCommand("insertOrderedList"),
      shortcut: `${MOD} + ${SHIFT} + N`,
    },
  ];

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
        className={`rounded-xl transition-all duration-200 ease-in-out ${
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
            }
          }}
          title={selectionMode ? "Toggle selection" : "Drag to reorder"}
          className={`group flex w-full items-start gap-2.5 rounded-xl px-3 py-3 text-left transition-colors ${
            note.id === activeId && !selectionMode
              ? "border border-white/10 bg-white/[0.07]"
              : isSelected
                ? "bg-transparent"
                : "border border-transparent hover:bg-white/[0.04]"
          }`}
        >
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
              {new Date(note.updatedAt).toLocaleDateString("en-US", {
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            Memory
          </p>
          <RevealText
            as="h1"
            text="Notes that survive the session."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="glass card-sheen flex max-h-[65vh] flex-col overflow-hidden rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div className="shrink-0 border-b border-white/[0.07] px-4 py-3">
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
                        <span className="min-w-0 flex-1 truncate">
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
                          <span className="min-w-0 flex-1 truncate">
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
          <section className="glass card-sheen flex min-h-[65vh] flex-col rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          {active ? (
            <>
              <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.07] px-4 py-3">
                {tools.map((tool) => (
                  <button
                    key={tool.label}
                    type="button"
                    title={tool.label}
                    aria-label={tool.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      focusEditor();
                      tool.run();
                      handleInput();
                    }}
                    className="relative group rounded-lg p-2 text-white/45 transition-colors hover:bg-[#cf9eff]/15 hover:text-[#cf9eff]"
                  >
                    <tool.icon className="size-4" />
                    {tool.shortcut && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                        {tool.shortcut}
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-1.5">
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
                              <button
                                type="button"
                                onClick={() => {
                                  updateNoteCourse(active.id, null);
                                  setCourseMenuOpen(false);
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
                                        active.courseId === course.id
                                          ? course.accent
                                          : "white",
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
                </span>
              </div>

              <div className="border-b border-white/[0.07] px-6 pt-5">
                <input
                  type="text"
                  value={active.title}
                  onChange={(e) => {
                    persist(active.id, { title: e.target.value });
                  }}
                  placeholder="Untitled note"
                  className="w-full bg-transparent text-2xl font-semibold tracking-[-0.03em] text-white placeholder:text-white/20 focus:outline-none"
                />
              </div>

{!selectionMode ? (
                <>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    spellCheck={false}
                    className="min-h-[38vh] flex-1 px-6 py-5 text-sm leading-relaxed text-white/70 focus:outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-star/50 [&_blockquote]:pl-4 [&_blockquote]:text-white/50 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    aria-label="Note content"
                  />
                </>
              ) : (
                <div className="min-h-[38vh] flex-1 px-6 py-5 flex items-center justify-center">
                  <p className="text-white/30 text-center">Select notes from the sidebar to perform bulk actions</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
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
