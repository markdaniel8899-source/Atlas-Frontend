import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface RichTextProps {
  text: string;
  className?: string;
}

const MATH = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

const TOKEN =
  /\^\{([^}]*)\}|\^([+\-]?[A-Za-z0-9]+)|_\{([^}]*)\}|_(\d+)|([A-Z)])(\d+)/g;

function applySymbols(text: string): string {
  return text
    .replace(
      /(?<!<)<=|(?<!>)>=|(?<![!=])!=(?!=)|\+\/-/g,
      (match) =>
        match === "<=" ? "≤" : match === ">=" ? "≥" : match === "!=" ? "≠" : "±",
    )
    .replace(/\bsqrt\b/gi, "√")
    .replace(/\bpi\b/gi, "π")
    .replace(/\binfinity\b/gi, "∞");
}

function plainNodes(text: string, nextKey: () => string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  let match = TOKEN.exec(text);
  while (match) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [full, supBraced, sup, subBraced, sub, base, digits] = match;
    if (full.startsWith("^")) {
      nodes.push(<sup key={nextKey()}>{supBraced ?? sup ?? ""}</sup>);
    } else if (full.startsWith("_")) {
      nodes.push(<sub key={nextKey()}>{subBraced ?? sub ?? ""}</sub>);
    } else {
      nodes.push(base);
      nodes.push(<sub key={nextKey()}>{digits}</sub>);
    }
    last = match.index + full.length;
    match = TOKEN.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMath(tex: string, key: string): ReactNode {
  try {
    const html = katex.renderToString(tex, {
      throwOnError: false,
      strict: false,
      output: "html",
    });
    return (
      <span key={key} dangerouslySetInnerHTML={{ __html: html }} />
    );
  } catch {
    return <span key={key}>{`$${tex}$`}</span>;
  }
}

function toNodes(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let counter = 0;
  const nextKey = () => `rt${counter++}`;
  let last = 0;
  MATH.lastIndex = 0;
  let match = MATH.exec(text);
  while (match) {
    const tex = match[1] ?? match[2] ?? "";
    if (/[\\^_]/.test(tex)) {
      if (match.index > last) {
        nodes.push(
          ...plainNodes(applySymbols(text.slice(last, match.index)), nextKey),
        );
      }
      nodes.push(renderMath(tex, nextKey()));
      last = match.index + match[0].length;
    }
    match = MATH.exec(text);
  }
  if (last < text.length) {
    nodes.push(...plainNodes(applySymbols(text.slice(last)), nextKey));
  }
  return nodes;
}

export const RichText = memo(function RichText({
  text,
  className,
}: RichTextProps) {
  const nodes = useMemo(() => toNodes(text), [text]);
  const cls = className ? `rich-text ${className}` : "rich-text";
  return <span className={cls}>{nodes}</span>;
});
