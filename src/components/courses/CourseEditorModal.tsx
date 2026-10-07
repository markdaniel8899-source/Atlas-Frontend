import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Loader2, Plus, Save, X } from "lucide-react";
import { addTopic, removeTopic, updateCourse } from "../../lib/db/courses";
import type { Course, CourseTopic } from "../../lib/db/types";
import { EASE } from "../../lib/motion";

interface CourseEditorModalProps {
  /** Course to edit, or null when the modal is closed. */
  course: Course | null;
  onClose: () => void;
  /** Called after any successful write so the parent can reload. */
  onSaved: () => void;
}

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-star/45 focus:outline-none";

const LABEL =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-white/40";

export function CourseEditorModal({
  course,
  onClose,
  onSaved,
}: CourseEditorModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [topicTitle, setTopicTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) return;
    setTitle(course.title);
    setDescription(course.description);
    setTopics(course.topics);
    setTopicTitle("");
    setError(null);
    setBusy(false);
  }, [course]);

  useEffect(() => {
    if (!course) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [course, busy, onClose]);

  const submitCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (!course || busy) return;
    if (!title.trim()) {
      setError("Give the course a title.");
      return;
    }

    setBusy(true);
    setError(null);
    const updated = await updateCourse(course.id, { title, description });
    setBusy(false);

    if (!updated) {
      setError("Could not save the course. Check your connection.");
      return;
    }
    onSaved();
    onClose();
  };

  const submitTopic = async (event: FormEvent) => {
    event.preventDefault();
    if (!course || busy || !topicTitle.trim()) return;

    setBusy(true);
    setError(null);
    const created = await addTopic(course.id, topicTitle);
    setBusy(false);

    if (!created) {
      setError("Could not add the topic. Check your connection.");
      return;
    }
    setTopics((prev) => [...prev, created]);
    setTopicTitle("");
    onSaved();
  };

  const deleteTopic = async (topic: CourseTopic) => {
    if (!course || busy) return;

    setBusy(true);
    setError(null);
    const removed = await removeTopic(course.id, topic.id);
    setBusy(false);

    if (!removed) {
      setError("Could not remove the topic. Check your connection.");
      return;
    }
    setTopics((prev) => prev.filter((item) => item.id !== topic.id));
    onSaved();
  };

  return (
    <AnimatePresence>
      {course && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!busy) onClose();
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="dialog"
              role="dialog"
              aria-modal="true"
              aria-label={`Edit ${course.title}`}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="glass card-sheen max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-[#cf9eff]/25 bg-[#cf9eff]/10 text-[#cf9eff]">
                    <BookOpen className="size-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
                      Manage course
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">
                      Edit course
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  aria-label="Close editor"
                  className="rounded-lg p-2 text-white/40 transition-colors hover:text-white disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={submitCourse} className="mt-6 grid gap-4">
                <label className="block">
                  <span className={LABEL}>Title</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    placeholder="Excel Fundamentals"
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>Source</span>
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={160}
                    placeholder="ByteGrad"
                    className={FIELD}
                  />
                </label>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
                    Topics · {topics.length}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {topics.length === 0 ? (
                      <span className="text-[11px] text-white/30">
                        No topics yet.
                      </span>
                    ) : (
                      topics.map((topic) => (
                        <span
                          key={topic.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-1 pl-2.5 text-[11px] text-white/60"
                        >
                          <span className="max-w-44 truncate">{topic.title}</span>
                          <button
                            type="button"
                            onClick={() => void deleteTopic(topic)}
                            disabled={busy}
                            aria-label={`Remove topic ${topic.title}`}
                            title="Remove topic"
                            className="grid size-5 place-items-center rounded-full text-white/35 transition-colors hover:bg-white/10 hover:text-rose-300 disabled:opacity-50"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={submitTopic}
                    className="mt-3 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={topicTitle}
                      onChange={(event) => setTopicTitle(event.target.value)}
                      placeholder="Add a topic"
                      maxLength={160}
                      disabled={busy}
                      className={`${FIELD} min-w-0 flex-1 text-xs`}
                    />
                    <button
                      type="submit"
                      disabled={busy || !topicTitle.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white transition-colors hover:bg-white/[0.1] disabled:opacity-50"
                    >
                      <Plus className="size-3.5" />
                      Add
                    </button>
                  </form>
                </div>

                {error && (
                  <p className="text-xs text-rose-300/85" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.02] px-5 py-2.5 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#05050a] transition-shadow hover:shadow-[0_0_36px_rgba(157,180,255,0.4)] disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
