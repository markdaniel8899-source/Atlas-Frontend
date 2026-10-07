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
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "style"],
  });
}
