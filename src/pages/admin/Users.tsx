import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { getUser } from "../../lib/auth";
import {
  deleteAdminUser,
  fetchAdminUsers,
  type AdminUser,
} from "../../lib/admin";
import { toast } from "../../lib/toast";
import { Card, EmptyState, ErrorState, SkeletonRows, formatDate } from "./ui";

type Status = "loading" | "ready" | "error";

const ROLE_STYLES: Record<string, string> = {
  admin: "border-[#cf9eff]/30 bg-[#cf9eff]/15 text-[#cf9eff]",
};

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const meId = getUser()?.id ?? null;

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      setUsers(await fetchAdminUsers());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (user: AdminUser) => {
    const name = user.displayName || user.username || user.email;
    const ok = window.confirm(
      `Delete ${name}? This permanently removes their account and ALL associated data. This cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(user.id);
    try {
      await deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`Deleted ${name}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Users
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {status === "ready"
              ? `${users.length} account${users.length === 1 ? "" : "s"}`
              : "Manage learner accounts."}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {status === "loading" && <SkeletonRows rows={6} />}
        {status === "error" && <ErrorState message={error} onRetry={load} />}
        {status === "ready" && users.length === 0 && (
          <EmptyState message="No users found." />
        )}

        {status === "ready" && users.length > 0 && (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const name = user.displayName || user.username || "—";
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                              {name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {name}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{user.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                            ROLE_STYLES[user.role] ??
                            "border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {user.id === meId ? (
                          <span className="text-xs text-gray-600">You</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void onDelete(user)}
                            disabled={deletingId === user.id}
                            aria-label={`Delete ${name}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            {deletingId === user.id ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {users.map((user) => {
                const name = user.displayName || user.username || "—";
                return (
                  <li key={user.id} className="flex items-center gap-3 p-4">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {user.email}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                            ROLE_STYLES[user.role] ??
                            "border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {user.role}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                    {user.id !== meId && (
                      <button
                        type="button"
                        onClick={() => void onDelete(user)}
                        disabled={deletingId === user.id}
                        aria-label={`Delete ${name}`}
                        className="shrink-0 rounded-lg border border-rose-400/20 bg-rose-500/10 p-2 text-rose-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
