import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import "../../lib/monacoSetup";
import { normalizeLanguageId } from "../notes/codeBlock";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  wordWrap?: "on" | "off";
  lineNumbers?: "on" | "off";
  compact?: boolean;
  bare?: boolean;
  placeholder?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "plaintext",
  height = "200px",
  disabled = false,
  onFocus,
  onBlur,
  wordWrap = "on",
  lineNumbers = "on",
  compact = false,
  bare = false,
  placeholder,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
      editorRef.current = null;
    };
  }, []);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();

    disposablesRef.current.push(
      editor.onDidFocusEditorText(() => {
        onFocus?.();
      }),
      editor.onDidBlurEditorText(() => {
        onBlur?.();
      }),
    );
  };

  return (
    <div
      className={
        bare
          ? "overflow-hidden"
          : "overflow-hidden rounded-xl border border-white/10"
      }
      style={{
        backgroundColor: "#1e1e1e",
        width: "100%",
        height: "100%",
        overscrollBehavior: "contain",
        overflow: "hidden",
      }}
    >
      <Editor
        height={height}
        language={normalizeLanguageId(language)}
        value={value}
        theme="vs-dark"
        onChange={(next) => onChange(next ?? "")}
        onMount={handleMount}
        options={
          {
            readOnly: disabled,
            cursorStyle: "line",
            cursorBlinking: "smooth",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingTags: true,
            autoClosingDelete: "always",
            autoSurround: "languageDefined",
            formatOnType: true,
            formatOnPaste: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fixedOverflowWidgets: true,
            alwaysConsumeMouseWheel: false,
            fontSize: compact ? 13 : 14,
            lineHeight: compact ? 21 : 20,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            wordWrap,
            lineNumbers,
            placeholder,
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            tabCompletion: "on",
            snippetSuggestions: "inline",
            wordBasedSuggestions: "currentDocument",
            acceptSuggestionOnEnter: "on",
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            padding: compact ? { top: 12, bottom: 12 } : undefined,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: compact
              ? {
                  vertical: "hidden",
                  horizontal: "auto",
                  horizontalScrollbarSize: 8,
                  useShadows: false,
                }
              : { vertical: "hidden", horizontal: "hidden" },
          } as Record<string, unknown>
        }
      />
    </div>
  );
}
