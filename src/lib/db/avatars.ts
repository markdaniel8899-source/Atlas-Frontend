import { supabase } from "../supabase";

export const AVATARS_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const BUCKET_HINT =
  "Storage bucket missing. In the Supabase dashboard create a public bucket named 'avatars' (Storage > New bucket > Public), then try again.";

export interface AvatarUploadResult {
  url: string | null;
  error: string | null;
}

export function validateAvatar(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Pick an image file (PNG, JPG or WebP).";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Images must be smaller than 2 MB.";
  }
  return null;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<AvatarUploadResult> {
  const invalid = validateAvatar(file);
  if (invalid) return { url: null, error: invalid };

  const extension =
    (file.name.split(".").pop() ?? "png")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "png";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });

  if (error) {
    const message = error.message.toLowerCase();
    return {
      url: null,
      error: message.includes("bucket") ? BUCKET_HINT : error.message,
    };
  }

  const { data } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) return { url: null, error: BUCKET_HINT };

  // Cache-bust so a replaced avatar shows up immediately.
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}
