import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import {
  deleteContactMessage,
  fetchContactMessages,
  markContactMessageRead,
  type ContactMessage,
} from "../../lib/admin";
import { toast } from "../../lib/toast";
import { Card, EmptyState, ErrorState, SkeletonRows } from "./ui";

type Status = "loading" | "ready" | "error";

/** Date + time — contact messages are often same-day. */
function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function Messages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      setMessages(await fetchContactMessages());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onMarkRead = async (message: ContactMessage) => {
    // Optimistic: flip instantly, revert if the write fails.
    const previous = messages;
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m)),
    );
    try {
      await markContactMessageRead(message.id);
    } catch (e) {
      setMessages(previous);
      toast.error(
        e instanceof Error ? e.message : "Failed to mark as read.",
      );
    }
  };

  const onDelete = async (message: ContactMessage) => {
    const ok = window.confirm(
      `Delete message from "${message.name}"? This cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(message.id);
    try {
      await deleteContactMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      toast.success("Message deleted.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to delete message.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Messages
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {status === "ready"
            ? `${messages.length} message${messages.length === 1 ? "" : "s"} · ${unread} unread`
            : "Contact form submissions."}
        </p>
      </div>

      <Card className="overflow-hidden">
        {status === "loading" && <SkeletonRows rows={6} />}
        {status === "error" && <ErrorState message={error} onRetry={load} />}
        {status === "ready" && messages.length === 0 && (
          <EmptyState message="No messages yet." />
        )}

        {status === "ready" && messages.length > 0 && (
          <ul className="divide-y divide-white/[0.06]">
            {messages.map((m) => {
              const expanded = expandedId === m.id;
              const deleting = deletingId === m.id;
              const isLong = m.message.length > 160;
              return (
                <li
                  key={m.id}
                  className={`border-l-2 p-4 transition-colors sm:p-5 ${
                    m.isRead
                      ? "border-l-transparent"
                      : "border-l-blue-500/70 bg-blue-500/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!m.isRead && (
                          <span
                            className="size-2 shrink-0 rounded-full bg-blue-500"
                            aria-label="Unread"
                          />
                        )}
                        <p
                          className={`truncate text-sm text-white ${
                            m.isRead ? "" : "font-semibold"
                          }`}
                        >
                          {m.name}
                        </p>
                        <a
                          href={`mailto:${m.email}`}
                          className="truncate text-xs text-gray-500 transition-colors hover:text-gray-300"
                        >
                          {m.email}
                        </a>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-200">
                        {m.subject || "(no subject)"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-gray-500">
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>

                  <p
                    className={`mt-2 text-sm text-gray-400 ${
                      expanded ? "whitespace-pre-wrap break-words" : "line-clamp-2"
                    }`}
                  >
                    {m.message}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : m.id)}
                      className="mt-1 text-xs font-medium text-[#cf9eff] transition-colors hover:text-white"
                    >
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    {!m.isRead && (
                      <button
                        type="button"
                        onClick={() => void onMarkRead(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:border-blue-400/50 hover:bg-blue-500/20"
                      >
                        <CheckCheck className="size-3.5" />
                        Mark as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onDelete(m)}
                      disabled={deleting}
                      aria-label={`Delete message from ${m.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
