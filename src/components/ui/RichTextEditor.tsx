import { useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading,
  Code,
  Quote,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  disabled?: boolean;
}

const TOOLBAR_BUTTONS: {
  icon: typeof Bold;
  label: string;
  wrap?: string;
  prefix?: string;
}[] = [
  { icon: Bold, label: "Bold", wrap: "**" },
  { icon: Italic, label: "Italic", wrap: "*" },
  { icon: Code, label: "Code", wrap: "`" },
  { icon: Quote, label: "Quote", prefix: "> " },
  { icon: List, label: "Bullet list", prefix: "- " },
  { icon: ListOrdered, label: "Numbered list", prefix: "1. " },
  { icon: Heading, label: "Heading", prefix: "## " },
];

export function RichTextEditor({
  value,
  onChange,
  height = "200px",
  disabled = false,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback(
    (wrapChar: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const newValue =
        value.slice(0, start) +
        wrapChar +
        selected +
        wrapChar +
        value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + wrapChar.length, end + wrapChar.length);
      });
    },
    [value, onChange],
  );

  const addPrefix = useCallback(
    (prefix: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const newValue =
        value.slice(0, lineStart) + prefix + value.slice(lineStart);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + prefix.length, start + prefix.length);
      });
    },
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      wrapSelection("**");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      wrapSelection("*");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "e") {
      e.preventDefault();
      wrapSelection("`");
    }
  };

  const lineCount = value ? value.split("\n").length : 0;
  const charCount = value.length;

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/10"
      style={{
        backgroundColor: "#1e1e1e",
        overscrollBehavior: "contain",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 border-b border-white/10 px-2 py-1.5"
        style={{ backgroundColor: "#252526" }}
      >
        {TOOLBAR_BUTTONS.map(({ icon: Icon, label, wrap, prefix }) => (
          <button
            key={label}
            type="button"
            title={label}
            disabled={disabled}
            onClick={() => {
              if (wrap) wrapSelection(wrap);
              else if (prefix) addPrefix(prefix);
            }}
            className="grid size-7 place-items-center rounded text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type predicted output..."
        spellCheck={false}
        style={{ height }}
        className="w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-white/25 focus:outline-none"
      />

      {/* Status bar - theme matched */}
      <div
        className="flex items-center justify-end gap-3 border-t border-white/10 px-3 py-1 text-[11px] text-white/40"
        style={{ backgroundColor: "#0a0a12" }}
      >
        <span>{lineCount} lines</span>
        <span>{charCount} chars</span>
        <span>Markdown</span>
      </div>
    </div>
  );
}
