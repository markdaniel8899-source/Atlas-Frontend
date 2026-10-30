import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, ChevronDown, Check, FileCode, Pencil, X } from "lucide-react";
import { CodeEditor } from "../ui/CodeEditor";

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", java: "java", cpp: "cpp", cc: "cpp", c: "c", cs: "csharp",
  go: "go", rs: "rust", php: "php", rb: "ruby", swift: "swift", kt: "kotlin",
  html: "html", htm: "html", css: "css", scss: "scss", json: "json", sql: "sql",
  sh: "bash", bash: "bash", md: "markdown", yaml: "yaml", yml: "yaml",
  xml: "xml", plaintext: "plaintext",
};

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", ext: ["js", "jsx"] },
  { id: "typescript", label: "TypeScript", ext: ["ts", "tsx"] },
  { id: "python", label: "Python", ext: ["py"] },
  { id: "java", label: "Java", ext: ["java"] },
  { id: "cpp", label: "C++", ext: ["cpp", "cc"] },
  { id: "c", label: "C", ext: ["c"] },
  { id: "csharp", label: "C#", ext: ["cs"] },
  { id: "go", label: "Go", ext: ["go"] },
  { id: "rust", label: "Rust", ext: ["rs"] },
  { id: "php", label: "PHP", ext: ["php"] },
  { id: "ruby", label: "Ruby", ext: ["rb"] },
  { id: "swift", label: "Swift", ext: ["swift"] },
  { id: "kotlin", label: "Kotlin", ext: ["kt"] },
  { id: "html", label: "HTML", ext: ["html", "htm"] },
  { id: "css", label: "CSS", ext: ["css", "scss"] },
  { id: "scss", label: "SCSS", ext: ["scss"] },
  { id: "json", label: "JSON", ext: ["json"] },
  { id: "sql", label: "SQL", ext: ["sql"] },
  { id: "bash", label: "Bash/Shell", ext: ["sh", "bash"] },
  { id: "markdown", label: "Markdown", ext: ["md"] },
  { id: "yaml", label: "YAML", ext: ["yaml", "yml"] },
  { id: "xml", label: "XML", ext: ["xml"] },
  { id: "plaintext", label: "Plain Text", ext: ["txt"] },
];

interface InlineCodeBlockProps {
  placeholderRef: HTMLElement & { appendChild: (node: Node) => Node };
  initialCode?: string;
  initialLanguage?: string;
  onRemove?: () => void;
}

export function InlineCodeBlock({ placeholderRef, initialCode = "", initialLanguage = "javascript", onRemove }: InlineCodeBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(() => placeholderRef?.getAttribute("data-code") ?? initialCode);
  const [language, setLanguage] = useState(() => placeholderRef?.getAttribute("data-language") ?? initialLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(2 * 22 + 44);
  const [toolbarHovered, setToolbarHovered] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const viewModeRef = useRef<HTMLDivElement>(null);
  const monacoMountedRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setLanguageOpen(false);
        if (isEditing) setIsEditing(false);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isEditing]);

  useEffect(() => {
    if (!languageOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!languageRef.current?.contains(e.target as Node)) {
        setLanguageOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [languageOpen]);

  useEffect(() => {
    if (placeholderRef) {
      placeholderRef.dataset.language = language;
      placeholderRef.dataset.code = code;
    }
  }, [language, code, placeholderRef]);

  useEffect(() => {
    const lineHeight = 22;
    const headerHeight = 44;
    const lineCount = code.split("\n").length;
    const newHeight = Math.min(Math.max(lineCount, 2), 30) * lineHeight + headerHeight;
    setHeight(newHeight);
  }, [code]);

  useEffect(() => {
    if (!placeholderRef) return;
    
    if (containerRef.current) {
      containerRef.current.remove();
      containerRef.current = null;
    }
    monacoMountedRef.current = false;

    let container = placeholderRef.querySelector('[data-editor-container]') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.dataset.editorContainer = 'true';
      container.style.width = '100%';
      placeholderRef.appendChild(container);
    }
    containerRef.current = container;
    monacoMountedRef.current = true;
  }, [placeholderRef]);

  useEffect(() => {
    if (!isEditing || !viewModeRef.current) return;
    
    const highlightCode = async () => {
      const monaco = (window as any).monaco;
      if (!monaco) return;
      
      const codeElement = viewModeRef.current?.querySelector("code");
      if (!codeElement) return;
      
      codeElement.textContent = code;
      codeElement.className = `language-${language}`;
      
      try {
        await monaco.editor.colorizeElement(codeElement, {
          theme: "vs-dark",
          tabSize: 2,
        });
      } catch {
        // Fallback: just set text content
        codeElement.textContent = code;
      }
    };
    
    highlightCode();
  }, [code, language, isEditing]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    if (placeholderRef) {
      placeholderRef.dataset.code = value;
      placeholderRef.dataset.language = language;
    }
  }, [language, placeholderRef]);

  const handleEditorBlur = useCallback(() => {
    if (!toolbarHovered && !languageOpen) {
      setIsEditing(false);
    }
  }, [toolbarHovered, languageOpen]);

  const handleViewClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    hasUserSetLanguage.current = true;
    setLanguageOpen(false);
  }, []);

  const handleExtensionInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (val.startsWith(".")) {
      const ext = val.slice(1).toLowerCase();
      if (LANGUAGE_MAP[ext]) {
        setLanguage(LANGUAGE_MAP[ext]);
        hasUserSetLanguage.current = true;
      }
    }
  }, []);

  const hasUserSetLanguage = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const editorPortal = containerRef.current && isEditing
    ? createPortal(
        <div
          ref={wrapperRef}
          style={{ height: height + "px", minHeight: '68px' }}
          className="inline-code-block-editor relative"
          onMouseEnter={() => setToolbarHovered(true)}
          onMouseLeave={() => setToolbarHovered(false)}
        >
          <div
            ref={languageRef}
            className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2 bg-[#0a0a12]/95 backdrop-blur-sm border-b border-white/10 z-10"
          >
            <div className="relative flex items-center gap-1.5 flex-1 min-w-0">
              <FileCode className="size-4 text-white/40 shrink-0" />

              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setLanguageOpen(!languageOpen)}
                  className="flex items-center gap-1 w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-white/75 transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06] hover:text-white"
                  aria-haspopup="listbox"
                  aria-expanded={languageOpen}
                >
                  <span className="truncate font-mono flex-1">{LANGUAGES.find((l) => l.id === language)?.label ?? language}</span>
                  <ChevronDown className={`size-3.5 shrink-0 transition-transform ${languageOpen ? "rotate-180 text-[#cf9eff]" : "text-white/35"}`} />
                </button>
                {languageOpen && (
                  <div className="absolute left-0 top-full mt-1 z-10 min-w-[180px] max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#111] py-1 shadow-md">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleLanguageChange(lang.id)}
                        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors ${language === lang.id ? "bg-[#cf9eff]/12 text-[#cf9eff]" : "hover:bg-white/[0.07] text-white/75"}`}
                      >
                        {language === lang.id && <Check className="size-3.5 shrink-0 text-[#cf9eff]" />}
                        <span className="truncate font-mono">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Type .sql, .js, .py..."
                className="w-[110px] min-w-0 rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:border-[#cf9eff]/45 focus:bg-white/[0.06] focus:outline-none font-mono text-[10px]"
                onChange={handleExtensionInput}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                aria-label="File extension for language"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                disabled={!code.trim()}
                className="relative rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30 group"
                aria-label="Copy code"
              >
                {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Remove code block"
                >
                  <svg className="size-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div style={{ height: height + "px", paddingTop: 44 }}>
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              language={language}
              height={height + "px"}
              onBlur={handleEditorBlur}
            />
          </div>
        </div>,
        containerRef.current
      )
    : null;

  const viewMode = !isEditing && (
    <div
      ref={viewModeRef}
      className="inline-code-block-view relative"
      onClick={handleViewClick}
      style={{ minHeight: '68px', width: '100%' }}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2 bg-[#0a0a12]/80 backdrop-blur-sm border-b border-white/10 transition-opacity duration-150 z-10 opacity-0 hover:opacity-100 pointer-events-none hover:pointer-events-auto">
        <div className="relative flex items-center gap-1.5 flex-1 min-w-0">
          <FileCode className="size-4 text-white/40 shrink-0" />
          <span className="truncate font-mono text-[11px] text-white/60 flex-1">
            {LANGUAGES.find((l) => l.id === language)?.label ?? language}
          </span>
          <input
            type="text"
            placeholder="Type .sql, .js, .py..."
            className="w-[110px] min-w-0 rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:border-[#cf9eff]/45 focus:bg-white/[0.06] focus:outline-none font-mono text-[10px]"
            onChange={handleExtensionInput}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => e.stopPropagation()}
            aria-label="File extension for language"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            disabled={!code.trim()}
            className="relative rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30 group"
            aria-label="Copy code"
          >
            {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white group"
            aria-label="Edit code"
          >
            <Pencil className="size-4" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              Edit
            </span>
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Remove code block"
            >
              <X className="size-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      <div style={{ paddingTop: 44 }}>
        <pre style={{
          backgroundColor: "#1e1e1e",
          color: "#d4d4d4",
          padding: "16px",
          borderRadius: "0 0 8px 8px",
          fontFamily: "'Fira Code', 'Consolas', monospace",
          fontSize: "14px",
          lineHeight: "1.5",
          overflowX: "auto",
          margin: 0,
          minHeight: "24px",
        }}>
          <code className={`language-${language}`} ref={(el) => { viewModeRef.current = el?.parentElement as HTMLDivElement; }} />
        </pre>
      </div>
    </div>
  );

  return (
    <>
      {viewMode}
      {editorPortal}
    </>
  );
}