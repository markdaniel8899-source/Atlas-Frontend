/**
 * DiceBear avatar generation - free, no API key.
 * Docs: https://www.dicebear.com/how-to-use/http-api/
 */

export type DiceBearStyle =
  | "avataaars"
  | "lorelei"
  | "bottts"
  | "adventurer"
  | "micah"
  | "big-ears"
  | "notionists"
  | "shapes";

export const DICEBEAR_STYLES: { id: DiceBearStyle; label: string }[] = [
  { id: "avataaars", label: "Avataaars" },
  { id: "lorelei", label: "Lorelei" },
  { id: "bottts", label: "Bottts" },
  { id: "adventurer", label: "Adventurer" },
  { id: "micah", label: "Micah" },
  { id: "big-ears", label: "Big Ears" },
  { id: "notionists", label: "Notionists" },
  { id: "shapes", label: "Shapes" },
];

const DICEBEAR_BASE = "https://api.dicebear.com/7.x";

/** Pastel backgrounds that read well on the dark ATLAS surface. */
const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffdfbf", "ffd5dc"];

export function dicebearUrl(style: DiceBearStyle, seed: string): string {
  const bg =
    BACKGROUNDS[
      Math.abs(
        [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7),
      ) % BACKGROUNDS.length
    ];
  return `${DICEBEAR_BASE}/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;
}

export function isDicebearUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "api.dicebear.com" &&
      /^\/\d+\.x\/[a-z-]+\/(svg|png)$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * A stable base seed so a user's avatar set stays personal to their id,
 * while every candidate in the grid still differs.
 */
export function baseSeedFor(userId: string): string {
  return `atlas-${userId.slice(0, 8)}`;
}

/** 10 unique candidate URLs for the picker grid. */
export function generateAvatarCandidates(
  baseSeed: string,
  style: DiceBearStyle,
  count = 10,
): string[] {
  const stamp = Date.now().toString(36);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(dicebearUrl(style, `${baseSeed}-${stamp}-${i}`));
  }
  return out;
}
