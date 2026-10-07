import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  StickyNote,
  Trash2,
  Underline,
} from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { sanitizeHtml } from "../../lib/notes";
import type { Note } from "../../lib/notes";
import {
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from "../../lib/db/notes";
import { useCourses } from "../../hooks/useCourses";
import { inferSubject } from "../../lib/subjects";
import { EASE } from "../../lib/motion";

interface Tool {
  label: string;
  icon: typeof Bold;
  run: () => void;
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
            className="absolute top-[calc(100%+8px)] right-0 z-40 w-64 rounded-2xl border border-white/10 bg-[#0a0a12]/95 p-1.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
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
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const { courses, loading: coursesLoading } = useCourses();
  const editorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const savedRef = useRef<number | null>(null);
  const networkRef = useRef<number | null>(null);
  const pendingRef = useRef<Map<string, Partial<Omit<Note, "id">>>>(new Map());
  const activeRef = useRef<string | null>(activeId);

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

  // Drop a stale ?courseId= (course was deleted) once courses are known.
  useEffect(() => {
    if (coursesLoading) return;
    if (selectedCourseId != null && !selectedCourse) {
      setSearchParams({}, { replace: true });
    }
  }, [coursesLoading, selectedCourseId, selectedCourse, setSearchParams]);

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
  }, []);

  // Fetch only the notes of the active context: the selected course's
  // notes when a course is picked, otherwise every note (the list is then
  // grouped by subject below).
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
        setNotes(rows);
        setActiveId((current) =>
          current && rows.some((note) => note.id === current)
            ? current
            : (rows[0]?.id ?? null),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [coursesLoading, selectedCourseId, activeCourseId]);

  // Subject groups for the "All notes" view; null in a course view (flat).
  const groupedNotes = useMemo(() => {
    if (selectedCourseId != null) return null;
    const groups = new Map<string, Note[]>();
    for (const note of notes) {
      const text = `${note.title} ${note.html.replace(/<[^>]+>/g, " ")}`;
      const subject = inferSubject(text) ?? note.courseTitle ?? "General";
      const list = groups.get(subject);
      if (list) list.push(note);
      else groups.set(subject, [note]);
    }
    return Array.from(groups.entries());
  }, [notes, selectedCourseId]);

  useEffect(() => {
    activeRef.current = activeId;
    const note = notes.find((n) => n.id === activeId);
    if (editorRef.current && note) {
      editorRef.current.innerHTML = sanitizeHtml(note.html);
      setTitle(note.title);
    }
  }, [activeId]);

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

  const addNote = async () => {
    // In a course view the note is owned by the course (and linked to its
    // first topic for subject grouping), so it stays in that course's scope.
    const courseId = selectedCourse?.id ?? null;
    const topicId = selectedCourse?.topics[0]?.id ?? null;
    const note = await createNote({ courseId, topicId });
    if (!note) return;
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
  };

  const removeNote = (id: string) => {
    pendingRef.current.delete(id);
    const next = notes.filter((note) => note.id !== id);
    setNotes(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    void deleteNote(id);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const tools: Tool[] = [
    { label: "Bold", icon: Bold, run: () => document.execCommand("bold") },
    { label: "Italic", icon: Italic, run: () => document.execCommand("italic") },
    {
      label: "Underline",
      icon: Underline,
      run: () => document.execCommand("underline"),
    },
    {
      label: "Heading",
      icon: Heading2,
      run: () => document.execCommand("formatBlock", false, "h2"),
    },
    {
      label: "Quote",
      icon: Quote,
      run: () => document.execCommand("formatBlock", false, "blockquote"),
    },
    {
      label: "Bullet list",
      icon: List,
      run: () => document.execCommand("insertUnorderedList"),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      run: () => document.execCommand("insertOrderedList"),
    },
  ];

  const onSubmitNewNote = (event: FormEvent) => {
    event.preventDefault();
    void addNote();
  };

  const renderNote = (note: Note) => (
    <li key={note.id}>
      <button
        type="button"
        onClick={() => setActiveId(note.id)}
        className={`group w-full rounded-xl px-3.5 py-3 text-left transition-colors ${
          note.id === activeId
            ? "border border-white/10 bg-white/[0.07]"
            : "border border-transparent hover:bg-white/[0.04]"
        }`}
      >
        <span className="block truncate text-sm text-white">
          {note.title || "Untitled note"}
        </span>
        <span className="mt-0.5 block text-xs text-white/35">
          {new Date(note.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </button>
    </li>
  );

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
        <aside className="glass card-sheen max-h-[65vh] overflow-y-auto rounded-2xl p-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
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
                {selectedCourse ? "Write one in this course" : "Write the first one"}
              </button>
            </div>
          ) : groupedNotes ? (
            <div className="space-y-3">
              {groupedNotes.map(([subject, list]) => (
                <div key={subject}>
                  <p className="px-3.5 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/35">
                    {subject}
                  </p>
                  <ul className="space-y-1.5">{list.map(renderNote)}</ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">{notes.map(renderNote)}</ul>
          )}
        </aside>

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
                    className="rounded-lg p-2 text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
                  >
                    <tool.icon className="size-4" />
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-3">
                  <span
                    className={`text-xs transition-opacity duration-300 ${
                      saved ? "text-emerald-300/80 opacity-100" : "opacity-0"
                    }`}
                  >
                    Saved
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNote(active.id)}
                    className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-red-300"
                    aria-label="Delete note"
                    title="Delete note"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>

              <div className="border-b border-white/[0.07] px-6 pt-5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    persist(active.id, { title: e.target.value });
                  }}
                  placeholder="Untitled note"
                  className="w-full bg-transparent text-2xl font-semibold tracking-[-0.03em] text-white placeholder:text-white/20 focus:outline-none"
                />
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                spellCheck
                className="min-h-[38vh] flex-1 px-6 py-5 text-sm leading-relaxed text-white/70 focus:outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-star/50 [&_blockquote]:pl-4 [&_blockquote]:text-white/50 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                aria-label="Note content"
              />
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
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
        className="text-xs text-white/30"
      >
        Content is sanitized with DOMPurify and saved as you type.
      </motion.p>
    </div>
  );
}
