import { useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

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

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  return (
    <div
      tabIndex={0}
      className="overflow-hidden rounded-xl border border-white/10"
      style={{ backgroundColor: "#1e1e1e", width: "100%", height: "100%" }}
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
            autoClosingTags: "always",
            autoClosingQuotes: "always",
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
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: "hidden", horizontal: "hidden" },
          } as Record<string, unknown>
        }
      />
    </div>
  );
}
