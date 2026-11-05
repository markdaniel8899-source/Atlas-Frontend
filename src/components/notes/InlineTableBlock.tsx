import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Minus, Plus, Table as TableIcon, Trash2 } from "lucide-react";
import { normalizeTableRows } from "./tableBlock";

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
    if (!editing || !target) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const reveal = (smooth: boolean) => {
      overlayRef.current?.scrollIntoView({
        block: "center",
        behavior: smooth ? "smooth" : "auto",
      });
    };

    const timers = [
      window.setTimeout(() => reveal(true), 80),
      window.setTimeout(() => reveal(true), 360),
    ];
    const viewport = window.visualViewport;
    const handleViewportChange = () => reveal(false);
    viewport?.addEventListener("resize", handleViewportChange);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      viewport?.removeEventListener("resize", handleViewportChange);
    };
  }, [editing, target]);

  const columnCount = Math.max(1, draftRows[0]?.length ?? 1);
  const editorHeight = Math.min(
    380,
    Math.max(140, draftRows.length * ROW_HEIGHT + 28),
  );
  const overlayHeight = editorHeight + TOOLBAR_HEIGHT;

  useEffect(() => {
    if (!editing || !target) return;
    target.dataset.editing = "true";
    target.style.minHeight = `${overlayHeight}px`;
    return () => {
      delete target.dataset.editing;
      target.style.removeProperty("min-height");
    };
  }, [editing, target, overlayHeight]);

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

  const updateCell = useCallback(
    (rowIndex: number, columnIndex: number, value: string) => {
      const next = cloneRows(rowsRef.current);
      if (!next[rowIndex]) return;
      next[rowIndex][columnIndex] = value;
      updateRows(next);
    },
    [updateRows],
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

  const handleCopy = useCallback(async () => {
    const tsv = rowsRef.current.map((row) => row.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1600);
    } catch {
      setCopied(false);
    }
  }, []);

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
      const input =
        overlayRef.current?.querySelector<HTMLInputElement>(
          ".atomic-table-input",
        );
      input?.focus();
      input?.select();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [editing, target]);

  if (!editing || !target) return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-table-editor-container="true"
      className="atomic-table-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: overlayHeight,
        zIndex: 30,
        borderRadius: 9,
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
        style={{ height: TOOLBAR_HEIGHT }}
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
        style={{ height: editorHeight }}
      >
        <table className="atomic-table-editor-grid">
          <thead>
            <tr>
              {draftRows[0]?.map((cell, columnIndex) => (
                <th key={columnIndex}>
                  <input
                    className="atomic-table-input"
                    value={cell}
                    placeholder="Header"
                    aria-label={`Header column ${columnIndex + 1}`}
                    spellCheck={false}
                    onChange={(event) =>
                      updateCell(0, columnIndex, event.target.value)
                    }
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
                      <input
                        className="atomic-table-input"
                        value={cell}
                        placeholder="Cell"
                        aria-label={`Row ${bodyIndex + 2} column ${
                          columnIndex + 1
                        }`}
                        spellCheck={false}
                        onChange={(event) =>
                          updateCell(
                            bodyIndex + 1,
                            columnIndex,
                            event.target.value,
                          )
                        }
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
    target,
  );
}
