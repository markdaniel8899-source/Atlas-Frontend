import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Copy, FileCode, X } from "lucide-react";
import { CodeEditor } from "../ui/CodeEditor";
import {
  extensionForLanguage,
  findCodeBlockElement,
  getLanguageOptions,
  languageLabel,
  normalizeLanguageId,
  resolveLanguageInput,
} from "./codeBlock";

interface InlineCodeBlockProps {
  id: string;
  code: string;
  language: string;
  editing: boolean;
  containerRef: { readonly current: HTMLDivElement | null };
  onDraftChange: (code: string, language: string) => void;
  onCommit: (code: string, language: string) => void;
  onExit: () => void;
  onRemove?: () => void;
}

const TOOLBAR_HEIGHT = 44;

function extensionLabel(extension: string): string {
  return extension.replace(/^\./, "");
}

export function InlineCodeBlock({
  id,
  code,
  language,
  editing,
  containerRef,
  onDraftChange,
  onCommit,
  onExit,
  onRemove,
}: InlineCodeBlockProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState(() =>
    normalizeLanguageId(language),
  );
  const [extensionInput, setExtensionInput] = useState(() =>
    extensionLabel(extensionForLanguage(language)),
  );
  const [lineCount, setLineCount] = useState(
    () => Math.max(1, code.split("\n").length),
  );

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const extensionInputRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef(code);
  const languageRef = useRef(normalizeLanguageId(language));
  const editingRef = useRef(editing);
  const closedRef = useRef(false);
  const baselineRef = useRef({
    code,
    language: normalizeLanguageId(language),
  });
  const blurTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const lastPointerDownRef = useRef(0);
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

  // Find the atomic block that this React portal should dock into.
  useEffect(() => {
    if (!editing) {
      setTarget(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const find = () => findCodeBlockElement(container, id);

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

  // Reset the local editing session whenever the block enters edit mode.
  useEffect(() => {
    if (!editing) return;
    const normalized = normalizeLanguageId(language);
    editingRef.current = true;
    closedRef.current = false;
    baselineRef.current = { code, language: normalized };
    codeRef.current = code;
    languageRef.current = normalized;
    setActiveLanguage(normalized);
    setExtensionInput(extensionLabel(extensionForLanguage(normalized)));
    setLineCount(Math.max(1, code.split("\n").length));
    setLanguageOpen(false);
    setCopied(false);
  }, [editing, code, language]);

  // Reserve the block's space while the overlay is mounted so following
  // content is pushed down instead of being covered by the editor.
  const editorHeight = Math.max(140, lineCount * 21 + 44);
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

  // Real unmount (note switch, selection mode, delete) must not lose work.
  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      if (
        !closedRef.current &&
        editingRef.current &&
        (codeRef.current !== baselineRef.current.code ||
          languageRef.current !== baselineRef.current.language)
      ) {
        closedRef.current = true;
        latestRef.current.onCommit(codeRef.current, languageRef.current);
      }
    };
  }, []);

  const finish = useCallback((notifyExit: boolean) => {
    if (!editingRef.current || closedRef.current) return;
    closedRef.current = true;
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    latestRef.current.onCommit(codeRef.current, languageRef.current);
    if (notifyExit) latestRef.current.onExit();
  }, []);

  const handleCodeChange = useCallback((nextCode: string) => {
    codeRef.current = nextCode;
    setLineCount(Math.max(1, nextCode.split("\n").length));
    latestRef.current.onDraftChange(nextCode, languageRef.current);
  }, []);

  const applyLanguage = useCallback((nextLanguage: string) => {
    const normalized = normalizeLanguageId(nextLanguage);
    languageRef.current = normalized;
    setActiveLanguage(normalized);
    setExtensionInput(extensionLabel(extensionForLanguage(normalized)));
    latestRef.current.onDraftChange(codeRef.current, normalized);
  }, []);

  const handleExtensionInput = useCallback(
    (value: string) => {
      setExtensionInput(value);
      const resolved = resolveLanguageInput(value);
      if (resolved && resolved.id !== languageRef.current) {
        applyLanguage(resolved.id);
      }
    },
    [applyLanguage],
  );

  const handleEditorBlur = useCallback(() => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
    }
    blurTimerRef.current = window.setTimeout(() => {
      blurTimerRef.current = null;
      if (!editingRef.current || closedRef.current) return;
      if (Date.now() - lastPointerDownRef.current < 500) return;
      const activeElement = document.activeElement;
      if (activeElement && overlayRef.current?.contains(activeElement)) {
        return;
      }
      finish(true);
    }, 160);
  }, [finish]);

  // Clicking outside the overlay finishes editing immediately. This also
  // covers the case where focus already left Monaco for a toolbar button.
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
    if (!editing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      const widget = target?.querySelector(
        ".suggest-widget.visible, .parameter-hints-widget.visible",
      );
      if (widget) return;

      event.preventDefault();
      event.stopPropagation();

      if (languageOpen) {
        setLanguageOpen(false);
        return;
      }
      if (document.activeElement === extensionInputRef.current) {
        extensionInputRef.current?.blur();
        return;
      }
      finish(true);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [editing, languageOpen, target, finish]);

  useEffect(() => {
    if (!languageOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [languageOpen]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeRef.current);
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

  if (!editing || !target) return null;

  const extensionResolved = resolveLanguageInput(extensionInput) !== null;
  const extensionInvalid =
    extensionInput.trim().length > 0 && !extensionResolved;

  return createPortal(
    <div
      ref={overlayRef}
      data-editor-container="true"
      className="atomic-code-block-editor"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: overlayHeight,
        zIndex: 30,
        borderRadius: 9,
      }}
      onMouseDownCapture={() => {
        lastPointerDownRef.current = Date.now();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (
          next &&
          (overlayRef.current?.contains(next) ||
            target.contains(next))
        ) {
          return;
        }
        window.setTimeout(() => {
          if (!editingRef.current || closedRef.current) return;
          if (Date.now() - lastPointerDownRef.current < 500) return;
          const active = document.activeElement;
          if (active && overlayRef.current?.contains(active)) return;
          finish(true);
        }, 0);
      }}
    >
      <div
        className="relative z-20 flex h-11 items-center gap-2 rounded-t-[9px] border-b border-white/10 bg-[#0d0d16]/95 px-2.5 backdrop-blur-sm sm:px-3"
        style={{ height: TOOLBAR_HEIGHT }}
      >
        <FileCode className="hidden size-4 shrink-0 text-white/35 sm:block" />

        <div ref={languageMenuRef} className="relative min-w-0">
          <button
            type="button"
            onClick={() => setLanguageOpen((current) => !current)}
            className="flex h-7 max-w-[138px] items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[11px] text-white/75 transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.07] hover:text-white"
            aria-haspopup="listbox"
            aria-expanded={languageOpen}
            aria-label="Code language"
          >
            <span className="truncate font-mono">
              {languageLabel(activeLanguage)}
            </span>
            <ChevronDown
              className={`size-3.5 shrink-0 transition-transform ${
                languageOpen
                  ? "rotate-180 text-[#cf9eff]"
                  : "text-white/35"
              }`}
            />
          </button>

          {languageOpen && (
            <div
              role="listbox"
              aria-label="Choose code language"
              data-lenis-prevent
              className="absolute left-0 top-full z-50 mt-1 max-h-64 w-60 overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-[#111] py-1 shadow-xl"
            >
              {getLanguageOptions().map((option) => {
                const selected = option.id === activeLanguage;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      applyLanguage(option.id);
                      setLanguageOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                      selected
                        ? "bg-[#cf9eff]/12 text-[#cf9eff]"
                        : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {selected ? (
                      <Check className="size-3.5 shrink-0" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {option.label}
                    </span>
                    {option.extension && (
                      <span className="shrink-0 font-mono text-[10px] text-white/30">
                        {option.extension}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <input
            ref={extensionInputRef}
            type="text"
            value={extensionInput}
            onChange={(event) => handleExtensionInput(event.target.value)}
            onBlur={() =>
              setExtensionInput(
                extensionLabel(extensionForLanguage(activeLanguage)),
              )
            }
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                extensionInputRef.current?.blur();
              }
            }}
            placeholder="js, py, sql"
            aria-label="File extension, for example .sql"
            aria-invalid={extensionInvalid}
            spellCheck={false}
            autoComplete="off"
            className={`h-7 w-[92px] rounded-md border bg-white/[0.04] px-2 font-mono text-[11px] text-white placeholder:font-sans placeholder:text-white/30 focus:bg-white/[0.07] focus:outline-none sm:w-[118px] ${
              extensionInvalid
                ? "border-red-400/50 focus:border-red-400/70"
                : "border-white/10 focus:border-[#cf9eff]/45"
            }`}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="relative rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.07] hover:text-white"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="size-4 text-green-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300"
              aria-label="Remove code block"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className="relative z-10 overflow-hidden rounded-b-[9px] bg-[#1e1e1e]"
        style={{ height: editorHeight }}
      >
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          language={activeLanguage}
          height={`${editorHeight}px`}
          onBlur={handleEditorBlur}
          wordWrap="off"
          compact
          bare
          placeholder="Start typing code…"
        />
      </div>
    </div>,
    target,
  );
}
