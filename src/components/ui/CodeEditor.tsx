import { useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  onSubmit?: () => void;
  disabled?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = "plaintext",
  height = "200px",
  onSubmit,
  disabled = false,
}: CodeEditorProps) {
  const handleMount: OnMount = useCallback(
    (editor) => {
      editor.onKeyDown((e) => {
        if (e.code === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit?.();
        }
      });
    },
    [onSubmit],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <Editor
        height={height}
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{
          readOnly: disabled,
          cursorStyle: "line",
          autoClosingBrackets: "always",
          formatOnType: true,
          formatOnPaste: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
          wordWrap: "on",
        }}
      />
    </div>
  );
}
