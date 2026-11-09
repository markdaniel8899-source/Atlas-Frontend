import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Minus, Plus, Table as TableIcon, Trash2 } from "lucide-react";
import {
  normalizeTableRows,
  renderTableClipboardHtml,
  sanitizeTableCellHtml,
  tableCellToText,
} from "./tableBlock";

interface InlineTableBlockProps {
  id: string;
  rows: string[][];
  editing: boolean;
  containerRef: { readonly current: HTMLDivElement | null };
  onDraftChange: (rows: string[][]) => void;
  onCommit: (rows: string[][]) => void;
  onExit: () => void;
  onRemove?: () => void;
}

const TOOLBAR_HEIGHT = 44;
const ROW_HEIGHT = 44;

function cloneRows(rows: string[][]): string[][] {
  return rows.map((row) => row.slice());
}

export function InlineTableBlock({
  id,
  rows,
  editing,
  containerRef,
  onDraftChange,
  onCommit,
  onExit,
  onRemove,
}: InlineTableBlockProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [draftRows, setDraftRows] = useState<string[][]>(() =>
    normalizeTableRows(rows),
  );
  const [copied, setCopied] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height:
      typeof window === "undefined"
        ? 0
        : window.visualViewport?.height ?? window.innerHeight,
    top:
      typeof window === "undefined"
        ? 0
        : window.visualViewport?.offsetTop ?? 0,
  }));

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const rowsRef = useRef(draftRows);
  const editingRef = useRef(editing);
  const closedRef = useRef(false);
  const baselineRef = useRef<string[][]>(normalizeTableRows(rows));
  const copyTimerRef = useRef<number | null>(null);
  const latestRef = useRef({
    onCommit,
    onExit,
    onDraftChange,
    onRemove,
  });

  useEffect(() => {
    latestRef.current = { onCommit, onExit, onDraftChange, onRemove };
  });

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setTarget(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const find = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(".atomic-table-block"),
      ).find((element) => element.dataset.tableId === id) ?? null;

    const existing = find();
    if (existing) {
      setTarget(existing);
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const next = find();
      if (next) {
        setTarget(next);
        window.clearInterval(timer);
      } else if (attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [editing, id, containerRef]);

  useEffect(() => {
    if (!editing) return;
    const normalized = normalizeTableRows(rows);
    editingRef.current = true;
    closedRef.current = false;
    baselineRef.current = normalized;
    rowsRef.current = normalized;
    setDraftRows(normalized);
    setCopied(false);
  }, [editing, rows]);

  useEffect(() => {
    if (!editing) return;
    const visualViewport = window.visualViewport;
    const update = () =>
      setViewport({
        width: window.innerWidth,
        height: visualViewport?.height ?? window.innerHeight,
        top: visualViewport?.offsetTop ?? 0,
      });
    update();
    visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [editing]);

  const columnCount = Math.max(1, draftRows[0]?.length ?? 1);
  const isPhoneViewport = viewport.width > 0 && viewport.width < 768;
  const isCompactViewport =
    (viewport.width > 0 && viewport.width < 768) ||
    (viewport.height > 0 && viewport.height < 520);
  const maxEditorHeight =
    isCompactViewport && viewport.height > 0
      ? Math.max(140, Math.min(380, viewport.height - 148))
      : 380;
  const editorHeight = Math.min(
    maxEditorHeight,
    Math.max(140, draftRows.length * ROW_HEIGHT + 28),
  );
  const overlayHeight = editorHeight + TOOLBAR_HEIGHT;

  useEffect(() => {
    if (!editing || !target) return;
    target.dataset.editing = "true";
    // On phones the editor is a viewport-covering overlay, so the inline block
    // does not need to reserve space for it.
    if (!isPhoneViewport) {
      target.style.minHeight = `${overlayHeight}px`;
    }
    return () => {
      delete target.dataset.editing;
      target.style.removeProperty("min-height");
    };
  }, [editing, target, overlayHeight, isPhoneViewport]);

  // Keep the page behind a phone overlay from scrolling under the editor.
  useEffect(() => {
    if (!editing || !isPhoneViewport) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [editing, isPhoneViewport]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      if (!closedRef.current && editingRef.current) {
        closedRef.current = true;
        latestRef.current.onCommit(rowsRef.current);
      }
    };
  }, []);

  const finish = useCallback((notifyExit: boolean) => {
    if (!editingRef.current || closedRef.current) return;
    closedRef.current = true;
    latestRef.current.onCommit(rowsRef.current);
    if (notifyExit) latestRef.current.onExit();
  }, []);

  const updateRows = useCallback((nextRows: string[][]) => {
    const normalized = normalizeTableRows(nextRows);
    rowsRef.current = normalized;
    setDraftRows(normalized);
    latestRef.current.onDraftChange(normalized);
  }, []);

  const updateCellHtml = useCallback(
    (rowIndex: number, columnIndex: number, element: HTMLElement) => {
      const next = cloneRows(rowsRef.current);
      if (!next[rowIndex]) return;
      next[rowIndex][columnIndex] = sanitizeTableCellHtml(element.innerHTML);
      rowsRef.current = next;
      setDraftRows(next);
      latestRef.current.onDraftChange(next);
    },
    [],
  );

  const handleCellPaste = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      const html = event.clipboardData.getData("text/html");
      const text = event.clipboardData.getData("text/plain");
      if (!html && !text) return;

      event.preventDefault();
      const cell = event.currentTarget;
      if (html) {
        document.execCommand(
          "insertHTML",
          false,
          sanitizeTableCellHtml(html),
        );
      } else {
        document.execCommand(
          "insertText",
          false,
          text.replace(/\r?\n/g, " "),
        );
      }
      cell.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [],
  );

  const handleCellKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.execCommand("insertLineBreak");
        return;
      }

      if (event.key !== "Tab") return;
      const cells = Array.from(
        overlayRef.current?.querySelectorAll<HTMLElement>(
          ".atomic-table-input",
        ) ?? [],
      );
      const index = cells.indexOf(event.currentTarget);
      if (index < 0) return;
      const next = cells[index + (event.shiftKey ? -1 : 1)];
      if (!next) return;
      event.preventDefault();
      next.focus();
    },
    [],
  );

  const addRow = useCallback(() => {
    const next = cloneRows(rowsRef.current);
    const width = Math.max(1, next[0]?.length ?? 1);
    next.push(Array.from({ length: width }, () => ""));
    updateRows(next);
  }, [updateRows]);

  const removeRow = useCallback(() => {
    const next = cloneRows(rowsRef.current);
    if (next.length <= 1) return;
    next.pop();
    updateRows(next);
  }, [updateRows]);

  const addColumn = useCallback(() => {
    const next = cloneRows(rowsRef.current);
    const width = next[0]?.length ?? 0;
    next.forEach((row, index) => {
      row.push(index === 0 ? `Header ${width + 1}` : "");
    });
    updateRows(next);
  }, [updateRows]);

  const removeColumn = useCallback(() => {
    const next = cloneRows(rowsRef.current);
    if ((next[0]?.length ?? 0) <= 1) return;
    next.forEach((row) => row.pop());
    updateRows(next);
  }, [updateRows]);

  const markCopied = useCallback(() => {
    setCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 1600);
  }, []);

  const handleCopy = useCallback(async () => {
    const rows = rowsRef.current;
    const tsv = rows
      .map((row) => row.map((cell) => tableCellToText(cell)).join("\t"))
      .join("\n");
    const html = renderTableClipboardHtml(rows);

    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        typeof navigator.clipboard?.write === "function"
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([tsv], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      markCopied();
    } catch {
      try {
        await navigator.clipboard.writeText(tsv);
        markCopied();
      } catch {
        setCopied(false);
      }
    }
  }, [markCopied]);

  const handleRemove = useCallback(() => {
    closedRef.current = true;
    latestRef.current.onRemove?.();
  }, []);

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [editing, finish]);

  useEffect(() => {
    if (!editing) return;
    const handlePointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (node instanceof Element && node.closest("[data-format-tool]")) {
        return;
      }
      if (overlayRef.current?.contains(node)) return;
      if (target?.contains(node)) return;
      finish(true);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [editing, target, finish]);

  useEffect(() => {
    if (!editing || !target) return;
    const timer = window.setTimeout(() => {
      const cell =
        overlayRef.current?.querySelector<HTMLElement>(".atomic-table-input");
      if (!cell) return;
      cell.focus();
      const range = document.createRange();
      range.selectNodeContents(cell);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [editing, target]);

  if (!editing || !target) return null;

  // On phones the editor escapes the note sheet and covers the viewport, so
  // mount it on <body>. Desktop keeps the inline absolutely-positioned overlay.
  const portalTarget =
    isPhoneViewport && typeof document !== "undefined" ? document.body : target;

  return createPortal(
    <div
      ref={overlayRef}
      data-table-editor-container="true"
      className={`atomic-table-overlay${
        isPhoneViewport ? " atomic-table-overlay--phone" : ""
      }`}
      style={{
        position: isPhoneViewport ? "fixed" : "absolute",
        top: isPhoneViewport ? viewport.top : 0,
        left: 0,
        right: isPhoneViewport ? undefined : 0,
        width: isPhoneViewport ? "100%" : undefined,
        height: isPhoneViewport
          ? viewport.height || "100dvh"
          : overlayHeight,
        display: isPhoneViewport ? "flex" : undefined,
        flexDirection: isPhoneViewport ? "column" : undefined,
        zIndex: isPhoneViewport ? 90 : 30,
        borderRadius: isPhoneViewport ? 0 : 9,
        boxSizing: isPhoneViewport ? "border-box" : undefined,
        paddingTop: isPhoneViewport ? "env(safe-area-inset-top)" : undefined,
        paddingBottom: isPhoneViewport
          ? "env(safe-area-inset-bottom)"
          : undefined,
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (
          next &&
          (overlayRef.current?.contains(next) || target.contains(next))
        ) {
          return;
        }
        window.setTimeout(() => {
          if (!editingRef.current || closedRef.current) return;
          const active = document.activeElement;
          if (active && overlayRef.current?.contains(active)) return;
          finish(true);
        }, 0);
      }}
    >
      <div
        className="atomic-table-toolbar"
        data-lenis-prevent
        style={{ height: TOOLBAR_HEIGHT, flexShrink: 0 }}
      >
        <span className="atomic-table-toolbar-label">
          <TableIcon className="size-4 shrink-0 text-white/35" />
          <span className="atomic-table-toolbar-title">Table</span>
          <span className="atomic-table-toolbar-dims">
            {draftRows.length} × {columnCount}
          </span>
        </span>
        <span className="atomic-table-toolbar-divider" />
        <button
          type="button"
          className="atomic-table-toolbar-btn atomic-table-toolbar-btn--accent"
          title="Add row"
          aria-label="Add row"
          onMouseDown={(event) => event.preventDefault()}
          onClick={addRow}
        >
          <Plus className="size-3.5" />
          <span className="atomic-table-toolbar-btn-text">Row</span>
        </button>
        <button
          type="button"
          className="atomic-table-toolbar-btn"
          title="Remove row"
          aria-label="Remove row"
          disabled={draftRows.length <= 1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={removeRow}
        >
          <Minus className="size-3.5" />
          <span className="atomic-table-toolbar-btn-text">Row</span>
        </button>
        <button
          type="button"
          className="atomic-table-toolbar-btn atomic-table-toolbar-btn--accent"
          title="Add column"
          aria-label="Add column"
          onMouseDown={(event) => event.preventDefault()}
          onClick={addColumn}
        >
          <Plus className="size-3.5" />
          <span className="atomic-table-toolbar-btn-text">Col</span>
        </button>
        <button
          type="button"
          className="atomic-table-toolbar-btn"
          title="Remove column"
          aria-label="Remove column"
          disabled={columnCount <= 1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={removeColumn}
        >
          <Minus className="size-3.5" />
          <span className="atomic-table-toolbar-btn-text">Col</span>
        </button>
        <span className="atomic-table-toolbar-spacer" />
        <button
          type="button"
          className="atomic-table-toolbar-btn"
          title="Copy table"
          aria-label="Copy table"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="size-3.5 text-green-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
          <span className="atomic-table-toolbar-btn-text">
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
        {onRemove && (
          <button
            type="button"
            className="atomic-table-toolbar-btn atomic-table-toolbar-btn--danger"
            title="Delete table"
            aria-label="Delete table"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleRemove}
          >
            <Trash2 className="size-3.5" />
            <span className="atomic-table-toolbar-btn-text">Delete</span>
          </button>
        )}
        <button
          type="button"
          className="atomic-table-toolbar-btn atomic-table-toolbar-btn--done"
          title="Done"
          aria-label="Done editing table"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => finish(true)}
        >
          <Check className="size-3.5" />
          <span className="atomic-table-toolbar-btn-text">Done</span>
        </button>
      </div>

      <div
        className="atomic-table-editor"
        data-lenis-prevent
        style={
          isPhoneViewport
            ? { flex: "1 1 auto", minHeight: 0 }
            : { height: editorHeight }
        }
      >
        <table className="atomic-table-editor-grid">
          <thead>
            <tr>
              {draftRows[0]?.map((cell, columnIndex) => (
                <th key={columnIndex}>
                  <div
                    className="atomic-table-input"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    data-placeholder="Header"
                    aria-label={`Header column ${columnIndex + 1}`}
                    spellCheck={false}
                    ref={(node) => {
                      if (!node || node.dataset.hydrated === "true") return;
                      node.dataset.hydrated = "true";
                      node.innerHTML = sanitizeTableCellHtml(cell);
                    }}
                    onInput={(event) =>
                      updateCellHtml(0, columnIndex, event.currentTarget)
                    }
                    onPaste={handleCellPaste}
                    onKeyDown={handleCellKeyDown}
                  />
                </th>
              ))}
            </tr>
          </thead>
          {draftRows.length > 1 && (
            <tbody>
              {draftRows.slice(1).map((row, bodyIndex) => (
                <tr key={bodyIndex}>
                  {row.map((cell, columnIndex) => (
                    <td key={columnIndex}>
                      <div
                        className="atomic-table-input"
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        data-placeholder="Cell"
                        aria-label={`Row ${bodyIndex + 2} column ${
                          columnIndex + 1
                        }`}
                        spellCheck={false}
                        ref={(node) => {
                          if (!node || node.dataset.hydrated === "true") {
                            return;
                          }
                          node.dataset.hydrated = "true";
                          node.innerHTML = sanitizeTableCellHtml(cell);
                        }}
                        onInput={(event) =>
                          updateCellHtml(
                            bodyIndex + 1,
                            columnIndex,
                            event.currentTarget,
                          )
                        }
                        onPaste={handleCellPaste}
                        onKeyDown={handleCellKeyDown}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>,
    portalTarget,
  );
}
