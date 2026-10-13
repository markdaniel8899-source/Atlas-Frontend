import { useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import "../../lib/monacoSetup";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  disabled?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = "plaintext",
  height = "200px",
  disabled = false,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.focus();

    // Ensure HTML auto-closing tags work via the language service
    if (language === "html") {
      monaco.languages.html.defaults.setOptions = {
        format: { insertSpaces: true, tabSize: 2 },
        suggest: { html5: true, svg: true },
      };
    }
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/10"
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
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={
          {
            readOnly: disabled,
            cursorStyle: "line",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingDelete: "always",
            autoSurround: "languageDefined",
            formatOnType: true,
            formatOnPaste: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            wordWrap: "on",
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            tabCompletion: "on",
            snippetSuggestions: "inline",
            wordBasedSuggestions: "currentDocument",
            acceptSuggestionOnEnter: "on",
            tabSize: 2,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: "hidden", horizontal: "hidden" },
          } as Record<string, unknown>
        }
      />
    </div>
  );
}
