export interface TableBlockData {
  id: string;
  rows: string[][];
}

const MAX_ROWS = 60;
const MAX_COLS = 12;
const DEFAULT_HEADERS = ["Header 1", "Header 2"];

export function createTableId(): string {
  return `table-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createDefaultTableRows(): string[][] {
  return [DEFAULT_HEADERS.slice()];
}

function escapeTableHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function renderTableBlockViewHtml(input: unknown): string {
  const rows = normalizeTableRows(input);
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  const head = `<thead><tr>${header
    .map((cell) => `<th>${escapeTableHtml(cell)}</th>`)
    .join("")}</tr></thead>`;
  const rowsHtml = body
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeTableHtml(cell)}</td>`)
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
    .map((cell) => `<th style="${headStyle}">${escapeTableHtml(cell)}</th>`)
    .join("")}</tr></thead>`;
  const rowsHtml = body
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="${cellStyle}">${escapeTableHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<table style="border-collapse:collapse;border-spacing:0;font-family:inherit;">${head}${
    body.length ? `<tbody>${rowsHtml}</tbody>` : ""
  }</table>`;
}

export function readTableRowsFromElement(table: HTMLTableElement): string[][] {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) =>
      (cell.textContent ?? "").replace(/\u00a0/g, " ").trim(),
    ),
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
  width: 100%;
  min-width: 96px;
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
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.atomic-table-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}
.atomic-table-input:focus {
  border-color: rgba(207, 158, 255, 0.55);
  background: rgba(207, 158, 255, 0.06);
}
.atomic-table-editor-grid thead .atomic-table-input {
  color: #cf9eff;
  font-weight: 600;
}
@media (max-width: 639px) {
  .atomic-table-block {
    margin: 12px 0;
  }
  .atomic-table-view {
    border-radius: 8px;
  }
  .atomic-table th,
  .atomic-table td {
    padding: 8px 10px;
    font-size: 12px;
  }
  .atomic-table-overlay {
    border-radius: 8px;
  }
  .atomic-table-toolbar {
    gap: 4px;
    padding: 0 8px;
  }
  .atomic-table-toolbar-title {
    display: none;
  }
  .atomic-table-toolbar-btn {
    padding: 0 7px;
  }
  .atomic-table-toolbar-btn-text {
    display: none;
  }
  .atomic-table-editor {
    padding: 8px;
  }
  .atomic-table-input {
    min-width: 82px;
    font-size: 12px;
    padding: 7px 8px;
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
