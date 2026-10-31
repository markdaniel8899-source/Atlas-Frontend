import { monaco } from "../../lib/monacoSetup";
import { sanitizeHtml } from "../../lib/notes";

export interface CodeBlockData {
  id: string;
  code: string;
  language: string;
}

export interface LanguageOption {
  id: string;
  label: string;
  extension: string;
}

export interface ExportNote {
  title: string;
  html: string;
}

const PHP_PREFIX = "<?php\n";

/**
 * Extensions people actually type that do not appear verbatim in Monaco's
 * language metadata. Everything else is resolved from Monaco itself, so any
 * registered language/extension works without a hardcoded list.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  objc: "objective-c",
  psql: "pgsql",
  postgres: "pgsql",
  postgresql: "pgsql",
  golang: "go",
};

const DEFAULT_PROBE =
  "const value = 1; 'text' 42 // comment\n<div class=\"x\">text</div>";

const TOKEN_PROBES: Record<string, string> = {
  php: `${PHP_PREFIX}const value = 1; 'text' 42 // comment`,
  html: '<div class="x">text</div><!-- comment -->',
};

let languageOptionsCache: LanguageOption[] | null = null;
const readyLanguages = new Set<string>();
const pendingLanguages = new Map<string, Promise<void>>();

function normalizeInput(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  const raw = trimmed.includes(".")
    ? trimmed.slice(trimmed.lastIndexOf(".") + 1)
    : trimmed;
  return raw.replace(/[^a-z0-9+#_-]/g, "");
}

/**
 * All languages Monaco knows about. Labels/extension are derived from
 * Monaco's own language registry, which keeps the picker in sync with the
 * editor and avoids maintaining a second language list by hand.
 */
export function getLanguageOptions(): LanguageOption[] {
  if (languageOptionsCache) return languageOptionsCache;

  const options = monaco.languages.getLanguages().map((language) => {
    const extension = language.extensions?.[0] ?? "";
    return {
      id: language.id,
      label: language.aliases?.[0] ?? language.id,
      extension: extension
        ? extension.startsWith(".")
          ? extension
          : `.${extension}`
        : "",
    };
  });

  if (!options.some((option) => option.id === "plaintext")) {
    options.push({ id: "plaintext", label: "Plain Text", extension: ".txt" });
  }

  options.sort((a, b) => a.label.localeCompare(b.label));
  languageOptionsCache = options;
  return options;
}

export function resolveLanguageInput(input: string): LanguageOption | null {
  const value = normalizeInput(input);
  if (!value) return null;

  const options = getLanguageOptions();
  const alias = LANGUAGE_ALIASES[value];
  if (alias) {
    const aliased = options.find((option) => option.id === alias);
    if (aliased) return aliased;
  }

  return (
    options.find(
      (option) => option.extension.toLowerCase() === `.${value}`,
    ) ??
    options.find((option) => option.id.toLowerCase() === value) ??
    null
  );
}

export function normalizeLanguageId(input: string | null | undefined): string {
  if (!input) return "plaintext";
  return resolveLanguageInput(input)?.id ?? "plaintext";
}

export function extensionForLanguage(language: string): string {
  const normalized = normalizeLanguageId(language);
  return (
    getLanguageOptions().find((option) => option.id === normalized)
      ?.extension || ".txt"
  );
}

export function languageLabel(language: string): string {
  const normalized = normalizeLanguageId(language);
  return (
    getLanguageOptions().find((option) => option.id === normalized)?.label ??
    normalized
  );
}

/**
 * Monaco ships each language grammar as a lazy chunk. `editor.tokenize`
 * synchronously returns uncolored tokens until that chunk has loaded, so the
 * first paint may be plain. This poll warms the grammar once and resolves
 * when real token types are available; callers can then re-render the view.
 */
export function ensureLanguageReady(language: string): Promise<void> {
  const id = normalizeLanguageId(language);
  if (id === "plaintext" || readyLanguages.has(id)) return Promise.resolve();

  const pending = pendingLanguages.get(id);
  if (pending) return pending;

  const known = monaco.languages
    .getLanguages()
    .some((language) => language.id === id);
  if (!known) {
    readyLanguages.add(id);
    return Promise.resolve();
  }

  const probe = TOKEN_PROBES[id] ?? DEFAULT_PROBE;
  const promise = new Promise<void>((resolve) => {
    let attempts = 0;

    const attempt = () => {
      try {
        const lines = monaco.editor.tokenize(probe, id);
        const first = lines[0] ?? [];
        if (first.length > 1 && first.some((token) => Boolean(token.type))) {
          readyLanguages.add(id);
          resolve();
          return;
        }
      } catch {
        readyLanguages.add(id);
        resolve();
        return;
      }

      attempts += 1;
      if (attempts >= 60) {
        // A few grammars (e.g. markdown) can tokenize a probe into a single
        // token. Rendering still works; stop polling instead of looping.
        readyLanguages.add(id);
        resolve();
        return;
      }

      globalThis.setTimeout(attempt, 40);
    };

    attempt();
  }).finally(() => {
    pendingLanguages.delete(id);
  });

  pendingLanguages.set(id, promise);
  return promise;
}

type TokenCategory =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "type"
  | "function"
  | "variable"
  | "constant"
  | "tag"
  | "attribute"
  | "operator"
  | "meta"
  | "invalid";

const CATEGORY_CLASS: Record<TokenCategory, string> = {
  keyword: "cb-tok-keyword",
  string: "cb-tok-string",
  comment: "cb-tok-comment",
  number: "cb-tok-number",
  type: "cb-tok-type",
  function: "cb-tok-function",
  variable: "cb-tok-variable",
  constant: "cb-tok-constant",
  tag: "cb-tok-tag",
  attribute: "cb-tok-attribute",
  operator: "cb-tok-operator",
  meta: "cb-tok-meta",
  invalid: "cb-tok-invalid",
};

function categoryForToken(type: string): TokenCategory | null {
  if (!type) return null;
  const value = type.toLowerCase();

  if (value.includes("comment")) return "comment";
  if (value.includes("string.key") || value.includes("key.json"))
    return "attribute";
  if (
    value.includes("string") ||
    value.includes("regexp") ||
    value.includes("character")
  ) {
    return "string";
  }
  if (value.includes("number") || value.includes("numeric")) return "number";
  if (value.includes("metatag")) return "keyword";
  if (value.includes("keyword") || value.includes("annotation"))
    return "keyword";
  if (value.includes("attribute.name")) return "attribute";
  if (value.includes("attribute.value")) return "string";
  if (value.includes("tag")) return "tag";
  if (
    value.includes("type") ||
    value.includes("class") ||
    value.includes("interface") ||
    value.includes("enum") ||
    value.includes("namespace") ||
    value.includes("module")
  ) {
    return "type";
  }
  if (value.includes("function") || value.includes("method")) return "function";
  if (value.includes("variable")) return "variable";
  if (value.includes("constant") || value.includes("predefined"))
    return "constant";
  if (value.includes("operator")) return "operator";
  if (
    value.includes("delimiter") ||
    value.includes("punctuation") ||
    value.includes("bracket")
  ) {
    return "operator";
  }
  if (
    value.includes("identifier") ||
    value.includes("entity") ||
    value.includes("property")
  ) {
    return "variable";
  }
  if (value.includes("invalid")) return "invalid";
  if (value.includes("meta")) return "meta";
  return null;
}

interface TokenPiece {
  text: string;
  category: TokenCategory | null;
}

interface MonacoToken {
  offset: number;
  type: string;
}

function renderTokenLine(line: string, tokens: MonacoToken[]): string {
  if (!line) return "";
  if (tokens.length === 0) return escapeHtml(line);

  const pieces: TokenPiece[] = [];
  let cursor = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const start = Math.max(cursor, Math.min(line.length, token.offset));
    const next = tokens[index + 1];
    const end = next
      ? Math.max(start, Math.min(line.length, next.offset))
      : line.length;

    if (start > cursor) {
      pieces.push({ text: line.slice(cursor, start), category: null });
    }
    if (end > start) {
      pieces.push({
        text: line.slice(start, end),
        category: categoryForToken(token.type),
      });
    }

    cursor = end;
    if (cursor >= line.length) break;
  }

  if (cursor < line.length) {
    pieces.push({ text: line.slice(cursor), category: null });
  }

  // Identifiers followed by a call are function names (Monaco's Monarch
  // tokenizer reports plain identifiers for many languages).
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (piece.category !== "variable") continue;
    const next = pieces
      .slice(index + 1)
      .find((candidate) => candidate.text.trim().length > 0);
    if (next?.text.trimStart().startsWith("(")) {
      piece.category = "function";
    }
  }

  return pieces
    .map((piece) =>
      piece.category
        ? `<span class="${CATEGORY_CLASS[piece.category]}">${escapeHtml(piece.text)}</span>`
        : escapeHtml(piece.text),
    )
    .join("");
}

/**
 * Real Monaco tokenization (not regex) rendered to static HTML. The output
 * works inside the note, in downloads and in shared copies, with no runtime
 * scripting required.
 */
export function highlightCode(code: string, language: string): string {
  const normalizedCode = code.replace(/\r\n?/g, "\n");
  const normalizedLanguage = normalizeLanguageId(language);

  if (!normalizedCode) return "";
  if (normalizedLanguage === "plaintext") return escapeHtml(normalizedCode);

  const prefix =
    normalizedLanguage === "php" && !/<\?(?:php|=)?/i.test(normalizedCode)
      ? PHP_PREFIX
      : "";
  const source = prefix + normalizedCode;

  let tokenized: MonacoToken[][] = [];
  try {
    tokenized = monaco.editor.tokenize(source, normalizedLanguage);
  } catch {
    return escapeHtml(normalizedCode);
  }

  const lines = source.split("\n");
  const firstLine = prefix ? 1 : 0;
  const rendered: string[] = [];

  for (let index = firstLine; index < lines.length; index += 1) {
    rendered.push(renderTokenLine(lines[index], tokenized[index] ?? []));
  }

  return rendered.join("\n");
}

export function findCodeBlockElement(
  container: ParentNode,
  id: string,
): HTMLElement | null {
  return (
    Array.from(
      container.querySelectorAll<HTMLElement>(".atomic-code-block"),
    ).find((element) => element.dataset.codeBlockId === id) ?? null
  );
}

export function isLanguageReady(language: string): boolean {
  const id = normalizeLanguageId(language);
  return id === "plaintext" || readyLanguages.has(id);
}

export function renderCodeBlockViewHtml(
  code: string,
  language: string,
): string {
  const normalizedCode = code.replace(/\r\n?/g, "\n");
  const normalizedLanguage = normalizeLanguageId(language);
  const lineCount = Math.max(1, normalizedCode.split("\n").length);
  const lineNumbers = Array.from(
    { length: lineCount },
    (_, index) => String(index + 1),
  ).join("\n");
  const highlighted = highlightCode(normalizedCode, normalizedLanguage);

  return `<div class="atomic-code-block-view"><div class="atomic-code-block-gutter" aria-hidden="true">${lineNumbers}</div><pre class="atomic-code-block-pre"><code class="atomic-code-block-code">${highlighted}</code></pre></div>`;
}

export async function renderCodeBlockViewHtmlAsync(
  code: string,
  language: string,
): Promise<string> {
  await ensureLanguageReady(language);
  return renderCodeBlockViewHtml(code, language);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const CODE_BLOCK_CSS = `
.atomic-code-block {
  position: relative;
  margin: 14px 0;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: "Fira Code", "Cascadia Code", Consolas, "SFMono-Regular", Menlo, monospace;
  font-size: 13px;
  line-height: 21px;
  text-align: left;
  overflow: visible;
}
.atomic-code-block .atomic-code-block-view {
  display: flex;
  align-items: stretch;
  max-width: 100%;
  border-radius: 9px;
  overflow: hidden;
  background: #1e1e1e;
}
.atomic-code-block[data-editing="true"] > .atomic-code-block-view {
  visibility: hidden;
}
.atomic-code-block .atomic-code-block-gutter {
  flex: 0 0 auto;
  padding: 14px 10px 14px 16px;
  background: #1e1e1e;
  border-right: 1px solid rgba(255, 255, 255, 0.045);
  color: #5f5f5f;
  font: inherit;
  line-height: 21px;
  text-align: right;
  white-space: pre;
  user-select: none;
  -webkit-user-select: none;
}
.atomic-code-block .atomic-code-block-pre {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 14px 18px;
  background: transparent;
  color: #d4d4d4;
  font: inherit;
  line-height: 21px;
  white-space: pre;
  overflow-x: auto;
  overflow-y: hidden;
  tab-size: 2;
  -moz-tab-size: 2;
  scrollbar-width: thin;
  scrollbar-color: #4a4a4a #1e1e1e;
}
.atomic-code-block .atomic-code-block-code {
  display: block;
  min-width: max-content;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  white-space: pre;
}
.atomic-code-block .cb-tok-keyword { color: #569cd6; }
.atomic-code-block .cb-tok-string { color: #ce9178; }
.atomic-code-block .cb-tok-comment { color: #6a9955; font-style: italic; }
.atomic-code-block .cb-tok-number { color: #b5cea8; }
.atomic-code-block .cb-tok-type { color: #4ec9b0; }
.atomic-code-block .cb-tok-function { color: #dcdcaa; }
.atomic-code-block .cb-tok-variable { color: #9cdcfe; }
.atomic-code-block .cb-tok-constant { color: #4fc1ff; }
.atomic-code-block .cb-tok-tag { color: #569cd6; }
.atomic-code-block .cb-tok-attribute { color: #9cdcfe; }
.atomic-code-block .cb-tok-operator { color: #d4d4d4; }
.atomic-code-block .cb-tok-meta { color: #c586c0; }
.atomic-code-block .cb-tok-invalid {
  color: #f44747;
  background: rgba(244, 71, 71, 0.1);
  text-decoration: underline wavy;
}
`;

const EXPORT_PAGE_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { background: #0a0a12; }
body {
  margin: 0;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
main.notes-export {
  max-width: 880px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}
.export-note + .export-note {
  margin-top: 56px;
  padding-top: 40px;
  border-top: 1px dashed rgba(255, 255, 255, 0.16);
}
.export-note h1,
.export-note h2,
.export-note h3,
.export-note h4,
.export-note h5,
.export-note h6 {
  margin: 28px 0 12px;
  color: #f5f5f8;
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.export-note h1 { margin-top: 0; font-size: 2rem; }
.export-note h2 { font-size: 1.5rem; }
.export-note h3 { font-size: 1.2rem; }
.export-note p { margin: 12px 0; }
.export-note ul,
.export-note ol { margin: 12px 0; padding-left: 26px; }
.export-note li { margin: 6px 0; }
.export-note strong { color: #f0f0f5; font-weight: 600; }
.export-note em { font-style: italic; }
.export-note a { color: #cf9eff; text-decoration: none; }
.export-note a:hover { text-decoration: underline; }
.export-note blockquote {
  margin: 16px 0;
  padding: 2px 0 2px 16px;
  border-left: 3px solid rgba(207, 158, 255, 0.5);
  color: #a7a7b4;
  font-style: italic;
}
.export-note hr {
  margin: 28px 0;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.export-note img { max-width: 100%; height: auto; }
.export-note code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  color: #e8e8e8;
  font-family: "Fira Code", "Cascadia Code", Consolas, "SFMono-Regular", Menlo, monospace;
  font-size: 0.9em;
}
.export-note .atomic-code-block code {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
}
@media print {
  body { background: #0a0a12; }
  main.notes-export { max-width: none; padding: 0; }
}
`;

export async function buildNotesExportHtml(
  notes: ExportNote[],
): Promise<string> {
  const rendered: string[] = [];

  for (const note of notes) {
    const container = document.createElement("div");
    container.innerHTML = sanitizeHtml(note.html);

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>(".atomic-code-block"),
    );

    await Promise.all(
      blocks.map(async (block) => {
        const code =
          block.dataset.code ??
          block.querySelector("code")?.textContent ??
          "";
        const language = normalizeLanguageId(
          block.dataset.language ?? "plaintext",
        );
        block.dataset.code = code;
        block.dataset.language = language;
        block.setAttribute("contenteditable", "false");
        block.removeAttribute("data-editing");
        block.innerHTML = await renderCodeBlockViewHtmlAsync(
          code,
          language,
        );
      }),
    );

    rendered.push(
      `<article class="export-note"><h1>${escapeHtml(
        note.title || "Untitled note",
      )}</h1>${container.innerHTML}</article>`,
    );
  }

  const documentTitle =
    notes.length === 1 ? notes[0].title || "Untitled note" : "My notes";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(documentTitle)}</title>
<style>${EXPORT_PAGE_CSS}${CODE_BLOCK_CSS}</style>
</head>
<body>
<main class="notes-export">${rendered.join("")}</main>
</body>
</html>`;
}
