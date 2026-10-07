import { FileCode2 } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  caption?: string;
  startLine?: number;
}

export function CodeBlock({
  code,
  language,
  caption,
  startLine = 1,
}: CodeBlockProps) {
  const lines = code.replace(/\n+$/, "").split("\n");

  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/45">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.03] px-3.5 py-2">
        <span className="flex items-center gap-1.5 text-[11px] text-white/45">
          <FileCode2 className="size-3.5" />
          {caption ?? "Snippet"}
        </span>
        {language && (
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
            {language}
          </span>
        )}
      </figcaption>
      <div className="overflow-x-auto px-3.5 py-3">
        <pre className="font-mono text-xs leading-[1.7] text-white/85">
          <code>
            {lines.map((line, index) => (
              <span key={startLine + index} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 select-none text-right text-white/25"
                >
                  {startLine + index}
                </span>
                <span className="whitespace-pre">{line || " "}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
