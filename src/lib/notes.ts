import DOMPurify from "dompurify";

export interface Note {
  id: string;
  title: string;
  html: string;
  createdAt: number;
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

const FORMAT_EXCLUSIONS =
  "pre, code, .atomic-code-block, .atomic-table-block";

function formatTagsForElement(element: HTMLElement): string[] {
  const style = element.style;
  const tags: string[] = [];
  const weight = style.fontWeight;
  const numericWeight = Number.parseInt(weight, 10);

  if (
    weight === "bold" ||
    weight === "bolder" ||
    (Number.isFinite(numericWeight) && numericWeight >= 600)
  ) {
    tags.push("strong");
  }
  if (style.fontStyle === "italic" || style.fontStyle === "oblique") {
    tags.push("em");
  }

  const decoration = `${style.textDecorationLine} ${style.textDecoration}`;
  if (decoration.includes("underline")) tags.push("u");
  if (decoration.includes("line-through")) tags.push("s");

  return tags;
}

function wrapElementContents(
  element: HTMLElement,
  tags: string[],
): HTMLElement | null {
  if (tags.length === 0) return null;

  let outermost: HTMLElement | null = null;
  let innermost: HTMLElement | null = null;

  for (const tag of tags) {
    const wrapper = element.ownerDocument.createElement(tag);
    if (!outermost) outermost = wrapper;
    if (innermost) innermost.appendChild(wrapper);
    innermost = wrapper;
  }

  if (!outermost || !innermost) return null;
  while (element.firstChild) innermost.appendChild(element.firstChild);
  element.appendChild(outermost);
  return outermost;
}

function unwrapElement(element: HTMLElement): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

export function normalizeInlineFormatting(root: ParentNode): void {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>("[style], font"),
  );

  for (const element of elements) {
    if (element.closest(FORMAT_EXCLUSIONS)) continue;

    const tags = element.hasAttribute("style")
      ? formatTagsForElement(element)
      : [];

    if (element.tagName === "SPAN" || element.tagName === "FONT") {
      const wrapper = wrapElementContents(element, tags);
      if (wrapper) element.replaceWith(wrapper);
      else unwrapElement(element);
      continue;
    }

    if (tags.length > 0) wrapElementContents(element, tags);
    element.removeAttribute("style");
  }
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "style"],
  });
}

export function sanitizeNoteHtml(html: string): string {
  let source = html;

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    normalizeInlineFormatting(doc.body);
    source = doc.body.innerHTML;
  }

  return sanitizeHtml(source);
}

/**
 * Convert HTML content to clean plain text for downloads.
 */
export function htmlToPlainText(html: string): string {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const body = doc.body;

    body
      .querySelectorAll("br")
      .forEach((node) => node.replaceWith(doc.createTextNode("\n")));
    body
      .querySelectorAll("td, th")
      .forEach((node) => node.append(doc.createTextNode("\t")));
    body
      .querySelectorAll(
        "tr, p, li, h1, h2, h3, h4, h5, h6, blockquote, div, table",
      )
      .forEach((node) => node.append(doc.createTextNode("\n")));

    return (body.textContent ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
