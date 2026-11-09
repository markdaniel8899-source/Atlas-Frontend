import DOMPurify from "dompurify";

export interface TableBlockData {
  id: string;
  rows: string[][];
}

const MAX_ROWS = 60;
const MAX_COLS = 12;
const DEFAULT_HEADERS = ["Header 1", "Header 2"];
const CELL_ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "br",
  "p",
  "h2",
  "h3",
  "blockquote",
  "ul",
  "ol",
  "li",
];

export function sanitizeTableCellHtml(value: string): string {
  if (!value) return "";
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: CELL_ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });
}

export function tableCellToText(value: string): string {
  if (!value) return "";
  const html = sanitizeTableCellHtml(value);
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.body
      .querySelectorAll("br")
      .forEach((node) => node.replaceWith(" "));
    return (doc.body.textContent ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createTableId(): string {
  return `table-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createDefaultTableRows(): string[][] {
  return [DEFAULT_HEADERS.slice()];
}

export function normalizeTableRows(input: unknown): string[][] {
  const source = Array.isArray(input) ? input : [];
  const rows: string[][] = [];

  for (const rawRow of source.slice(0, MAX_ROWS)) {
    if (!Array.isArray(rawRow)) continue;
    rows.push(
      rawRow
        .slice(0, MAX_COLS)
        .map((cell) => (typeof cell === "string" ? cell : String(cell ?? ""))),
    );
  }

  if (rows.length === 0) rows.push([]);

  const width = Math.max(
    1,
    Math.min(
      MAX_COLS,
      Math.max(...rows.map((row) => row.length), 1),
    ),
  );

  for (const row of rows) {
    while (row.length < width) row.push("");
    if (row.length > width) row.length = width;
  }

  return rows;
}

export function parseTableRows(raw: string | null | undefined): string[][] {
  if (!raw) return createDefaultTableRows();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createDefaultTableRows();
    return normalizeTableRows(parsed);
  } catch {
    return createDefaultTableRows();
  }
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows;
}

/**
 * Detect CSV/TSV clipboard text and convert it into table rows.
 * Returns null when the text does not look like tabular data.
 */
export function parseTabularText(raw: string): string[][] | null {
  const text = raw.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
  if (!text.trim()) return null;

  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) return null;

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  if (delimiter === "," && !lines.some((line) => line.includes(","))) {
    return null;
  }

  const parsed =
    delimiter === ","
      ? parseCsvText(text)
      : lines.map((line) => line.split("\t"));

  const rows = parsed
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rows.length < 2) return null;

  const width = Math.max(...rows.map((row) => row.length));
  if (width < 2) return null;

  const aligned = rows.filter((row) => row.length === width).length;
  if (aligned < 2) return null;

  return normalizeTableRows(rows);
}

export function renderTableBlockViewHtml(input: unknown): string {
  const rows = normalizeTableRows(input);
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  const head = `<thead><tr>${header
    .map((cell) => `<th>${sanitizeTableCellHtml(cell)}</th>`)
    .join("")}</tr></thead>`;
  const rowsHtml = body
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${sanitizeTableCellHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const bodyHtml = body.length ? `<tbody>${rowsHtml}</tbody>` : "";

  return `<div class="atomic-table-view"><table class="atomic-table">${head}${bodyHtml}</table></div>`;
}

export function renderTableClipboardHtml(input: unknown): string {
  const rows = normalizeTableRows(input);
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const cellStyle =
    "border:1px solid #c9c9c9;padding:6px 10px;text-align:left;vertical-align:top;";
  const headStyle = `${cellStyle}background:#f2f2f2;font-weight:600;`;

  const head = `<thead><tr>${header
    .map((cell) => `<th style="${headStyle}">${sanitizeTableCellHtml(cell)}</th>`)
    .join("")}</tr></thead>`;
  const rowsHtml = body
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="${cellStyle}">${sanitizeTableCellHtml(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<table style="border-collapse:collapse;border-spacing:0;font-family:inherit;">${head}${
    body.length ? `<tbody>${rowsHtml}</tbody>` : ""
  }</table>`;
}

export function readTableRowsFromElement(table: HTMLTableElement): string[][] {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => sanitizeTableCellHtml(cell.innerHTML)),
  );
  if (rows.length === 0) return createDefaultTableRows();
  return normalizeTableRows(rows);
}

export function readTableBlockRows(block: HTMLElement): string[][] {
  if (block.dataset.table) return parseTableRows(block.dataset.table);
  const table = block.querySelector<HTMLTableElement>("table");
  if (table) return readTableRowsFromElement(table);
  return createDefaultTableRows();
}

function createTableBlockElement(id: string, rows: string[][]): HTMLDivElement {
  const block = document.createElement("div");
  block.className = "atomic-table-block";
  block.dataset.tableId = id;
  block.dataset.table = JSON.stringify(rows);
  block.contentEditable = "false";
  block.innerHTML = renderTableBlockViewHtml(rows);
  return block;
}

function unwrapLegacyWrapper(block: HTMLElement, container: HTMLElement): void {
  const wrapper = block.parentElement;
  if (!wrapper || wrapper === container) return;
  if (wrapper.tagName !== "DIV") return;
  if (wrapper.classList.contains("atomic-table-block")) return;

  const hasOtherContent = Array.from(wrapper.childNodes).some((node) => {
    if (node === block) return false;
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").trim().length > 0;
    }
    if (node instanceof HTMLElement) {
      if (node.classList.contains("atomic-table-block")) return false;
      if (node.tagName === "P" && !(node.textContent ?? "").trim()) {
        return node.querySelector("*") !== null;
      }
      return true;
    }
    return false;
  });

  if (!hasOtherContent) wrapper.replaceWith(block);
}

export function hydrateTableBlocks(container: HTMLElement): TableBlockData[] {
  container
    .querySelectorAll(".table-top-bar, .table-btn")
    .forEach((node) => node.remove());

  const legacyTables = Array.from(
    container.querySelectorAll<HTMLTableElement>("table"),
  ).filter((table) => !table.closest(".atomic-table-block"));

  for (const table of legacyTables) {
    const rows = readTableRowsFromElement(table);
    const block = createTableBlockElement(createTableId(), rows);
    table.replaceWith(block);
    unwrapLegacyWrapper(block, container);
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(".atomic-table-block"),
  ).map((block) => {
    const id = block.dataset.tableId || createTableId();
    const rows = normalizeTableRows(readTableBlockRows(block));

    block.dataset.tableId = id;
    block.dataset.table = JSON.stringify(rows);
    block.setAttribute("contenteditable", "false");
    block.removeAttribute("data-editing");
    block.removeAttribute("style");
    block.innerHTML = renderTableBlockViewHtml(rows);

    return { id, rows };
  });
}

export function findTableBlockElement(
  container: ParentNode,
  id: string,
): HTMLElement | null {
  return (
    Array.from(
      container.querySelectorAll<HTMLElement>(".atomic-table-block"),
    ).find((element) => element.dataset.tableId === id) ?? null
  );
}

export const TABLE_BLOCK_CSS = `
.atomic-table-block {
  position: relative;
  margin: 14px 0;
  min-width: 0;
  max-width: 100%;
  text-align: left;
}
.atomic-table-block[data-editing="true"] > .atomic-table-view {
  visibility: hidden;
}
.atomic-table-view {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(207, 158, 255, 0.22);
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.5);
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}
.atomic-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}
.atomic-table th,
.atomic-table td {
  padding: 9px 12px;
  text-align: left;
  vertical-align: top;
  border-right: 1px solid rgba(207, 158, 255, 0.12);
  border-bottom: 1px solid rgba(207, 158, 255, 0.12);
  white-space: normal;
  word-break: break-word;
}
.atomic-table th:last-child,
.atomic-table td:last-child {
  border-right: 0;
}
.atomic-table tbody tr:last-child td {
  border-bottom: 0;
}
.atomic-table thead:last-child tr:last-child th {
  border-bottom: 0;
}
.atomic-table thead th {
  background: rgba(207, 158, 255, 0.08);
  color: #cf9eff;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.01em;
}
.atomic-table tbody td {
  color: rgba(255, 255, 255, 0.78);
}
.atomic-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}
.atomic-table th p,
.atomic-table td p,
.atomic-table th ul,
.atomic-table td ul,
.atomic-table th ol,
.atomic-table td ol,
.atomic-table th blockquote,
.atomic-table td blockquote,
.atomic-table th h2,
.atomic-table td h2,
.atomic-table th h3,
.atomic-table td h3 {
  margin: 0;
}
.atomic-table td h2,
.atomic-table th h2 {
  font-size: 15px;
  font-weight: 600;
}
.atomic-table td h3,
.atomic-table th h3 {
  font-size: 14px;
  font-weight: 600;
}
.atomic-table td ul,
.atomic-table td ol,
.atomic-table th ul,
.atomic-table th ol {
  padding-left: 18px;
}
.atomic-table td blockquote,
.atomic-table th blockquote {
  padding-left: 8px;
  border-left: 2px solid rgba(207, 158, 255, 0.35);
}
.atomic-table-overlay {
  background: #1e1e1e;
  box-shadow: 0 18px 50px -20px rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(207, 158, 255, 0.22);
}
.atomic-table-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 10px;
  background: rgba(13, 13, 22, 0.97);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px 9px 0 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  white-space: nowrap;
}
.atomic-table-toolbar::-webkit-scrollbar {
  display: none;
}
.atomic-table-toolbar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  font-weight: 500;
}
.atomic-table-toolbar-dims {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.4);
  font-family: "Fira Code", "Cascadia Code", Consolas, monospace;
  font-size: 10px;
}
.atomic-table-toolbar-divider {
  flex: 0 0 auto;
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.08);
}
.atomic-table-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 auto;
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.atomic-table-toolbar-btn:hover {
  border-color: rgba(207, 158, 255, 0.45);
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}
.atomic-table-toolbar-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
.atomic-table-toolbar-btn:disabled:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
}
.atomic-table-toolbar-btn--accent {
  border-color: rgba(207, 158, 255, 0.3);
  background: rgba(207, 158, 255, 0.12);
  color: #cf9eff;
}
.atomic-table-toolbar-btn--accent:hover {
  border-color: rgba(207, 158, 255, 0.55);
  background: rgba(207, 158, 255, 0.2);
  color: #e6ccff;
}
.atomic-table-toolbar-btn--danger {
  border-color: rgba(248, 113, 113, 0.28);
  background: rgba(248, 113, 113, 0.08);
  color: #fca5a5;
}
.atomic-table-toolbar-btn--danger:hover {
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(248, 113, 113, 0.14);
  color: #fecaca;
}
.atomic-table-toolbar-btn--done {
  border-color: rgba(207, 158, 255, 0.45);
  background: rgba(207, 158, 255, 0.16);
  color: #cf9eff;
}
.atomic-table-toolbar-btn--done:hover {
  border-color: rgba(207, 158, 255, 0.65);
  background: rgba(207, 158, 255, 0.24);
  color: #fff;
}
.atomic-table-toolbar-spacer {
  flex: 1 1 auto;
  min-width: 4px;
}
.atomic-table-editor {
  padding: 10px;
  background: #1e1e1e;
  overflow: auto;
  border-radius: 0 0 9px 9px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}
.atomic-table-editor-grid {
  width: 100%;
  min-width: max-content;
  border-collapse: separate;
  border-spacing: 0;
}
.atomic-table-editor-grid th,
.atomic-table-editor-grid td {
  padding: 2px;
  border: 0;
  text-align: left;
  vertical-align: middle;
}
.atomic-table-input {
  display: block;
  width: 100%;
  min-width: 96px;
  min-height: 34px;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.35;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  cursor: text;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.atomic-table-input:empty::before,
.atomic-table-input:has(> br:only-child)::before {
  content: attr(data-placeholder);
  color: rgba(255, 255, 255, 0.25);
  pointer-events: none;
}
.atomic-table-input:focus {
  border-color: rgba(207, 158, 255, 0.55);
  background: rgba(207, 158, 255, 0.06);
}
.atomic-table-input h2,
.atomic-table-input h3,
.atomic-table-input p,
.atomic-table-input ul,
.atomic-table-input ol,
.atomic-table-input blockquote {
  margin: 0;
}
.atomic-table-input h2 {
  font-size: 15px;
  font-weight: 600;
}
.atomic-table-input h3 {
  font-size: 14px;
  font-weight: 600;
}
.atomic-table-input ul,
.atomic-table-input ol {
  padding-left: 18px;
}
.atomic-table-input blockquote {
  padding-left: 8px;
  border-left: 2px solid rgba(207, 158, 255, 0.35);
}
.atomic-table-editor-grid thead .atomic-table-input {
  color: #cf9eff;
  font-weight: 600;
}
@media (max-width: 639px) {
  .atomic-table-block {
    margin: 12px 0;
    scroll-margin-block: 16px 112px;
  }
  .atomic-table-view {
    border-radius: 8px;
    scroll-behavior: smooth;
  }
  .atomic-table th,
  .atomic-table td {
    padding: 8px 10px;
    font-size: 12px;
  }
  .atomic-table thead th {
    white-space: nowrap;
  }
  .atomic-table-overlay {
    border-radius: 8px;
  }
  .atomic-table-toolbar {
    gap: 4px;
    padding: 0 8px;
  }
  .atomic-table-toolbar-title,
  .atomic-table-toolbar-dims,
  .atomic-table-toolbar-spacer {
    display: none;
  }
  .atomic-table-toolbar-btn {
    order: 3;
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
  }
  .atomic-table-toolbar-btn--done {
    order: 2;
  }
  .atomic-table-toolbar-btn-text {
    display: none;
  }
  .atomic-table-editor {
    padding: 8px;
  }
  .atomic-table-input {
    min-width: 88px;
    min-height: 40px;
    padding: 8px 9px;
  }
}
@media (max-width: 767px) {
  /* Phone table editor: a full-screen sheet that spreads across the viewport
     instead of being squeezed into the note column. */
  .atomic-table-overlay--phone {
    background: #0a0a12;
    overscroll-behavior: contain;
    border: 0;
    box-shadow: none;
  }
  .atomic-table-overlay--phone .atomic-table-toolbar {
    border-radius: 0;
    background: rgba(13, 13, 22, 0.98);
  }
  .atomic-table-overlay--phone .atomic-table-editor {
    border-radius: 0;
    padding: 10px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    overscroll-behavior: contain;
  }
  .atomic-table-overlay--phone .atomic-table-editor-grid {
    width: max-content;
    min-width: 100%;
  }
  .atomic-table-overlay--phone .atomic-table-input {
    min-width: 120px;
    min-height: 44px;
    font-size: 14px;
  }
}
.notes-export table:not(.atomic-table) {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
  font-size: 13px;
}
.notes-export table:not(.atomic-table) th,
.notes-export table:not(.atomic-table) td {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: left;
  vertical-align: top;
}
.notes-export table:not(.atomic-table) th {
  background: rgba(207, 158, 255, 0.08);
  color: #cf9eff;
  font-weight: 600;
}
`;
