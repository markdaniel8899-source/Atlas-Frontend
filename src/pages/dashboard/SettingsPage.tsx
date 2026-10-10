import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { getUser } from "../../lib/auth";
import { fetchProfile, notifyProfileChanged, updateProfile } from "../../lib/db/profile";
import { apiSelectAvatar } from "../../lib/gamificationApi";
import { deleteCourse, topicCounts } from "../../lib/db/courses";
import {
  XP_PER_LEVEL,
  levelProgress,
  type Course,
  type Profile,
} from "../../lib/db/types";
import { rankForLevel } from "../../lib/gamification";
import { RevealText } from "../../components/RevealText";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CourseEditorModal } from "../../components/courses/CourseEditorModal";
import { AvatarPickerModal } from "../../components/profile/AvatarPickerModal";
import { AchievementsPanel } from "../../components/profile/AchievementsPanel";
import { useCourses } from "../../hooks/useCourses";
import { EASE } from "../../lib/motion";

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export default function SettingsPage() {
  const user = getUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    courses: managedCourses,
    loading: coursesLoading,
    reload: reloadCourses,
  } = useCourses();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseBusy, setCourseBusy] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  const deleteCourseWithConfirm = async (course: Course) => {
    if (courseBusy) return;

    const confirmed = window.confirm(
      `Delete "${course.title}"?\n\nThis also removes its roadmap, levels, topics and notes. This cannot be undone.`,
    );
    if (!confirmed) return;

    setCourseBusy(true);
    setCourseError(null);
    const removed = await deleteCourse(course.id);
    setCourseBusy(false);

    if (!removed) {
      setCourseError("Could not delete the course. Check your connection.");
      return;
    }
    setEditingCourse((current) =>
      current?.id === course.id ? null : current,
    );
    await reloadCourses();
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchProfile(user.id)
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setDisplayName(loaded?.display_name ?? user.name ?? "");
        setUsername(loaded?.username ?? "");
        setAvatarUrl(loaded?.avatar_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleAvatarSelected = async (url: string): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    setError(null);
    setSaved(false);

    // Prefer the FastAPI endpoint (validates + stores server-side); fall
    // back to a direct profile update when the AI service is offline.
    let nextAvatar = url;
    let failure: string | null = null;
    const viaApi = await apiSelectAvatar(url);
    if (viaApi && viaApi.ok === false) {
      failure = (viaApi.error as string | undefined) ?? "Couldn't save that avatar.";
    } else if (!viaApi) {
      const { profile: updated, error: saveError } = await updateProfile(user.id, {
        avatar_url: url,
      });
      if (saveError) failure = saveError;
      else if (updated) setProfile(updated);
    } else {
      const { profile: updated } = await updateProfile(user.id, {
        avatar_url: url,
      });
      if (updated) setProfile(updated);
    }

    setSaving(false);

    if (failure) {
      setError(failure);
      return false;
    }

    setAvatarUrl(nextAvatar);
    notifyProfileChanged();
    setSaved(true);
    return true;
  };

  const removeAvatar = async () => {
    if (!user) return;
    setAvatarUrl(null);
    setSaving(true);
    setError(null);
    setSaved(false);
    const viaApi = await apiSelectAvatar(null);
    const { profile: updated, error: saveError } = await updateProfile(user.id, {
      avatar_url: null,
    });
    setSaving(false);
    if (saveError || (viaApi && viaApi.ok === false)) {
      setError(
        saveError ??
          ((viaApi?.error as string | undefined) ?? "Couldn't remove the avatar."),
      );
      return;
    }
    setProfile(updated);
    notifyProfileChanged();
    setSaved(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;

    const name = displayName.trim();
    const handle = username.trim().toLowerCase();

    if (!name) {
      setError("Display name can't be empty.");
      return;
    }
    if (name.length > 60) {
      setError("Display name must be 60 characters or fewer.");
      return;
    }
    if (!USERNAME_RE.test(handle)) {
      setError("Username must be 3-24 characters: lowercase letters, numbers or _.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const { profile: updated, error: saveError } = await updateProfile(user.id, {
      display_name: name,
      username: handle,
      avatar_url: avatarUrl,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setProfile(updated);
    setAvatarUrl(avatarUrl);
    setDisplayName(updated?.display_name ?? name);
    setUsername(updated?.username ?? handle);
    notifyProfileChanged();
    setSaved(true);
  };

  const showAvatar = avatarUrl;
  const progress = levelProgress(profile?.xp ?? 0);
  const rank = rankForLevel(profile?.level ?? 1);
  const RankIcon = rank.icon;
  const initials =
    (displayName || profile?.display_name || user?.name || "A")
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <div className="space-y-6">
      <RevealText
        as="h1"
        text="Settings."
        className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <form onSubmit={handleSave}>
              <Card className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-white/45 uppercase">
                  <UserRound className="size-3.5" />
                  Profile
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-5">
                  <div className="relative">
                    <span
                      className={`flex size-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#3d4f9e] to-[#7b8ee8] text-lg font-semibold text-white ring-2 ring-offset-2 ring-offset-[#0d0d16] ${rank.ring}`}
                    >
                      {showAvatar ? (
                        <img
                          src={showAvatar}
                          alt=""
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAvatarPickerOpen(true)}
                      disabled={loading}
                      className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border border-[#cf9eff]/45 bg-[#0a0a14] text-white/70 transition-colors hover:border-[#cf9eff]/70 hover:text-white"
                      aria-label="Edit avatar"
                      title="Edit avatar"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/55">
                      Unique generated avatars via DiceBear - pick a style that
                      fits your rank.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAvatarPickerOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#cf9eff]/40 bg-[#cf9eff]/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-[#cf9eff]/70 hover:text-white"
                      >
                        <Sparkles className="size-3.5" />
                        Edit avatar
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => void removeAvatar()}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55 transition-colors hover:border-rose-300/40 hover:text-rose-200"
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </button>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${rank.border} ${rank.bg} ${rank.text} ${rank.glow}`}
                      >
                        <RankIcon className="size-3.5" />
                        {rank.label} · Lvl {profile?.level ?? 1}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium tracking-[0.1em] text-white/45 uppercase">
                      Display name
                    </span>
                    <input
                      type="text"
                      value={displayName}
                      maxLength={60}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="Ada Lovelace"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-[border-color,background-color] placeholder:text-white/30 focus:border-[#cf9eff]/60 focus:bg-white/[0.05]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium tracking-[0.1em] text-white/45 uppercase">
                      Username
                    </span>
                    <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 transition-[border-color] focus-within:border-[#cf9eff]/60">
                      <span className="select-none text-sm text-white/30">@</span>
                      <input
                        type="text"
                        value={username}
                        maxLength={24}
                        onChange={(e) => {
                          setUsername(e.target.value.replace(/\s+/g, ""));
                          setSaved(false);
                        }}
                        onBlur={() => setUsername((v) => v.trim().toLowerCase())}
                        placeholder="ada"
                        className="w-full bg-transparent py-3 pl-1.5 text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </div>
                    <span className="mt-1.5 block text-[11px] text-white/30">
                      3-24 chars · lowercase, numbers, underscore
                    </span>
                  </label>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-5 flex items-start gap-2 rounded-xl border border-rose-300/30 bg-rose-300/[0.07] px-3.5 py-3 text-sm text-rose-200"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  {saved && !error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/[0.07] px-3.5 py-3 text-sm text-emerald-200"
                    >
                      <Check className="size-4" />
                      Profile saved.
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving || loading || !user}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save changes
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
          >
            <Card className="p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-white/45 uppercase">
                  <GraduationCap className="size-3.5" />
                  Manage courses
                </div>
                <span className="text-[11px] text-white/35">
                  {coursesLoading
                    ? "Loading…"
                    : `${managedCourses.length} total`}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-white/55">
                Central control for every course. Editing updates the title and
                topics; deleting also removes the course's roadmap and notes.
              </p>

              {courseError && (
                <p className="mt-3 text-xs text-rose-300/85" role="alert">
                  {courseError}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {coursesLoading ? (
                  <p className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading courses…
                  </p>
                ) : managedCourses.length === 0 ? (
                  <p className="text-sm text-white/40">
                    No courses yet: create one from the Courses page.
                  </p>
                ) : (
                  managedCourses.map((course) => {
                    const { total, done } = topicCounts(course);
                    const progress = Math.max(
                      0,
                      Math.min(100, course.progress_percentage),
                    );
                    return (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3"
                      >
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"
                          style={{ color: course.accent }}
                        >
                          <BookOpen className="size-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {course.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/40">
                            {done}/{total} topics · {Math.round(progress)}%
                          </p>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${progress}%`,
                                background: course.accent,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCourse(course)}
                            disabled={courseBusy}
                            aria-label={`Edit ${course.title}`}
                            title="Edit course"
                            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/45 transition-colors hover:border-[#cf9eff]/45 hover:text-white disabled:opacity-50"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCourseWithConfirm(course)}
                            disabled={courseBusy}
                            aria-label={`Delete ${course.title}`}
                            title="Delete course and roadmap"
                            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/45 transition-colors hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
          className="space-y-5"
        >
          <Card className="p-6">
            <div className="text-xs font-medium tracking-[0.14em] text-white/45 uppercase">
              Account
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Email</dt>
                <dd className="truncate text-white/80">{user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">User ID</dt>
                <dd className="truncate font-mono text-xs text-white/50">
                  {user?.id}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <div className="text-xs font-medium tracking-[0.14em] text-white/45 uppercase">
              Progress
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Level</dt>
                <dd className="text-white/80">{profile?.level ?? 1}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Rank</dt>
                <dd
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${rank.border} ${rank.bg} ${rank.text} ${rank.glow}`}
                >
                  <RankIcon className="size-3.5" />
                  {rank.label}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">XP</dt>
                <dd className="text-white/80">{profile?.xp ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Weekly XP</dt>
                <dd className="text-white/80">{profile?.weekly_xp ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/45">Streak</dt>
                <dd className="text-white/80">{profile?.streak ?? 0}d</dd>
              </div>
            </dl>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${rank.gradient}`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/35">
              {XP_PER_LEVEL - progress.into} XP to level {progress.level + 1}
            </p>
          </Card>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
          >
            <Card className="p-6">
              <AchievementsPanel userId={user?.id ?? ""} />
            </Card>
          </motion.div>
        </motion.div>
      </div>

      <CourseEditorModal
        course={editingCourse}
        onClose={() => setEditingCourse(null)}
        onSaved={() => void reloadCourses()}
      />

      <AvatarPickerModal
        open={avatarPickerOpen}
        currentUrl={avatarUrl}
        userId={user?.id ?? ""}
        onClose={() => setAvatarPickerOpen(false)}
        onSelect={handleAvatarSelected}
      />
    </div>
  );
}
