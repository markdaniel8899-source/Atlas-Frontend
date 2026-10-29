import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, ChevronDown, Check, FileCode, X } from "lucide-react";
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
  { id: "javascript", label: "JavaScript", ext: ["js", "jsx"], patterns: ["function", "const ", "let ", "=>", "console.log", "import ", "export "] },
  { id: "typescript", label: "TypeScript", ext: ["ts", "tsx"], patterns: ["interface ", "type ", ": string", ": number", "import ", "export "] },
  { id: "python", label: "Python", ext: ["py"], patterns: ["def ", "import ", "from ", "print(", "class ", "if __name__"] },
  { id: "java", label: "Java", ext: ["java"], patterns: ["public class", "public static void", "System.out", "import java"] },
  { id: "cpp", label: "C++", ext: ["cpp", "cc"], patterns: ["#include", "std::", "int main", "cout <<", "namespace "] },
  { id: "c", label: "C", ext: ["c"], patterns: ["#include", "int main", "printf", "scanf"] },
  { id: "csharp", label: "C#", ext: ["cs"], patterns: ["using System", "namespace ", "public class", "Console.WriteLine"] },
  { id: "go", label: "Go", ext: ["go"], patterns: ["package main", "func main", "fmt.Println", "import "] },
  { id: "rust", label: "Rust", ext: ["rs"], patterns: ["fn main", "let mut", "println!", "use ", "cargo "] },
  { id: "php", label: "PHP", ext: ["php"], patterns: ["<?php", "echo ", "$_", "function "] },
  { id: "ruby", label: "Ruby", ext: ["rb"], patterns: ["def ", "puts ", "require ", "class ", "end"] },
  { id: "swift", label: "Swift", ext: ["swift"], patterns: ["func ", "var ", "let ", "print(", "import "] },
  { id: "kotlin", label: "Kotlin", ext: ["kt"], patterns: ["fun main", "val ", "var ", "println(", "package "] },
  { id: "html", label: "HTML", ext: ["html", "htm"], patterns: ["<div", "<html", "<body", "<script", "<style", "class="] },
  { id: "css", label: "CSS", ext: ["css"], patterns: ["{", "}:", "color:", "margin:", "padding:", "@media"] },
  { id: "scss", label: "SCSS", ext: ["scss"], patterns: ["@", "$", "mixin", "include"] },
  { id: "json", label: "JSON", ext: ["json"], patterns: ['{"', '":', "[]", "true", "false", "null"] },
  { id: "sql", label: "SQL", ext: ["sql"], patterns: ["SELECT ", "FROM ", "WHERE ", "JOIN ", "INSERT ", "CREATE TABLE"] },
  { id: "bash", label: "Bash/Shell", ext: ["sh", "bash"], patterns: ["#!/bin", "echo ", "cd ", "ls ", "grep ", "npm "] },
  { id: "markdown", label: "Markdown", ext: ["md"], patterns: ["# ", "## ", "- ", "* ", "[", "](", "```"] },
  { id: "yaml", label: "YAML", ext: ["yaml", "yml"], patterns: [": ", "- ", "  ", "version:", "services:"] },
  { id: "xml", label: "XML", ext: ["xml"], patterns: ["<?xml", "<", ">", "/>", "xmlns"] },
  { id: "plaintext", label: "Plain Text", ext: ["txt"], patterns: [] },
];

interface InlineCodeBlockProps {
  /** Placeholder element inside contentEditable where Monaco mounts */
  placeholderRef: HTMLElement & { appendChild: (node: Node) => Node };
  /** Called when user saves (Escape or Ctrl+Enter) */
  onSave?: (code: string, language: string) => void;
  /** Called when user cancels (clicks X button) */
  onCancel?: () => void;
}

export function InlineCodeBlock({ placeholderRef, onSave, onCancel }: InlineCodeBlockProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(2 * 22 + 44 + 24); // 2 lines + header + padding = 112px
  const languageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const hasUserSetLanguage = useRef(false);
  const monacoMountedRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onSave?.(code, language);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onSave?.(code, language);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onSave, code, language]);

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
    const lineHeight = 22;
    const headerHeight = 44;
    const padding = 24;
    // Start at 2 lines, expand up to 30 lines as user types
    const lineCount = code.split("\n").length;
    const newHeight = Math.min(Math.max(lineCount, 2), 30) * lineHeight + padding + headerHeight;
    setHeight(newHeight);
  }, [code]);

  // Mount Monaco inside the placeholder's container
  useEffect(() => {
    if (!placeholderRef || monacoMountedRef.current) return;
    
    // Find or create the container div inside placeholder
    let container = placeholderRef.querySelector('[data-monaco-container]') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.dataset.monacoContainer = 'true';
      container.style.width = '100%';
      container.style.minHeight = '112px';
      placeholderRef.appendChild(container);
    }
    containerRef.current = container;
    monacoMountedRef.current = true;
  }, [placeholderRef]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const monacoPortal = containerRef.current
    ? createPortal(
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          language={language}
          height={`${height}px`}
        />,
        containerRef.current
      )
    : null;

  // Render header inline at the placeholder position
  return (
    <>
      <div className="w-full" style={{ minHeight: height }}>
        {/* Header bar - part of the inline flow */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0a0a12] border border-white/10 rounded-t-xl">
          <div className="relative flex items-center gap-1.5 flex-1 min-w-0" ref={languageRef}>
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
                      onClick={() => { setLanguage(lang.id); hasUserSetLanguage.current = true; setLanguageOpen(false); }}
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
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val.startsWith(".")) {
                  const ext = val.slice(1).toLowerCase();
                  if (LANGUAGE_MAP[ext]) {
                    setLanguage(LANGUAGE_MAP[ext]);
                    hasUserSetLanguage.current = true;
                  }
                }
              }}
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
            <button
              type="button"
              onClick={() => onSave?.(code, language)}
              className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Save (Esc / Ctrl+Enter)"
            >
              <Check className="size-4 text-green-400" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                Save (Esc / Ctrl+Enter)
              </span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Discard"
            >
              <X className="size-4 text-red-400" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                Discard
              </span>
            </button>
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-white/30 bg-white/[0.03] border border-white/10 rounded">Esc to save</kbd>
          </div>
        </div>

        {/* Monaco Editor - portaled into the placeholder's container */}
      </div>
      {monacoPortal}
    </>
  );
}