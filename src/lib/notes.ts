import DOMPurify from "dompurify";

export interface Note {
  id: string;
  title: string;
  html: string;
  updatedAt: number;
  /** Course this note belongs to (notes.course_id); null = unlinked. */
  courseId: number | null;
  /** Course topic this note is attached to (notes.topic_id); null = unlinked. */
  topicId: number | null;
  /** Title of the owning course, used for subject grouping. */
  courseTitle: string | null;
  sortOrder: number | null;
  /** User ID of who shared this note (for sender tags). */
  sharedBy: string | null;
  /** Display name of who shared this note (for sender tags). */
  sharedByName: string | null;
  /** When this note was shared (for sender tags). */
  sharedAt: number | null;
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "style"],
  });
}

/**
 * Convert HTML content to clean plain text for downloads.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
