import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, ChevronDown, Check } from "lucide-react";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", patterns: ["function", "const ", "let ", "=>", "console.log", "import ", "export "] },
  { id: "typescript", label: "TypeScript", patterns: ["interface ", "type ", ": string", ": number", "import ", "export "] },
  { id: "python", label: "Python", patterns: ["def ", "import ", "from ", "print(", "class ", "if __name__"] },
  { id: "java", label: "Java", patterns: ["public class", "public static void", "System.out", "import java"] },
  { id: "cpp", label: "C++", patterns: ["#include", "std::", "int main", "cout <<", "namespace "] },
  { id: "c", label: "C", patterns: ["#include", "int main", "printf", "scanf"] },
  { id: "csharp", label: "C#", patterns: ["using System", "namespace ", "public class", "Console.WriteLine"] },
  { id: "go", label: "Go", patterns: ["package main", "func main", "fmt.Println", "import "] },
  { id: "rust", label: "Rust", patterns: ["fn main", "let mut", "println!", "use ", "cargo "] },
  { id: "php", label: "PHP", patterns: ["<?php", "echo ", "$_", "function "] },
  { id: "ruby", label: "Ruby", patterns: ["def ", "puts ", "require ", "class ", "end"] },
  { id: "swift", label: "Swift", patterns: ["func ", "var ", "let ", "print(", "import "] },
  { id: "kotlin", label: "Kotlin", patterns: ["fun main", "val ", "var ", "println(", "package "] },
  { id: "html", label: "HTML", patterns: ["<div", "<html", "<body", "<script", "<style", "class="] },
  { id: "css", label: "CSS", patterns: ["{", "}:", "color:", "margin:", "padding:", "@media"] },
  { id: "json", label: "JSON", patterns: ['{"', '":', "[]", "true", "false", "null"] },
  { id: "sql", label: "SQL", patterns: ["SELECT ", "FROM ", "WHERE ", "JOIN ", "INSERT ", "CREATE TABLE"] },
  { id: "bash", label: "Bash/Shell", patterns: ["#!/bin", "echo ", "cd ", "ls ", "grep ", "npm "] },
  { id: "markdown", label: "Markdown", patterns: ["# ", "## ", "- ", "* ", "[", "](", "```"] },
  { id: "yaml", label: "YAML", patterns: [": ", "- ", "  ", "version:", "services:"] },
  { id: "xml", label: "XML", patterns: ["<?xml", "<", ">", "/>", "xmlns"] },
];

function detectLanguage(code: string): string {
  const lower = code.toLowerCase();
  let bestMatch = "plaintext";
  let bestScore = 0;

  for (const lang of LANGUAGES) {
    let score = 0;
    for (const pattern of lang.patterns) {
      if (lower.includes(pattern.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = lang.id;
    }
  }
  return bestMatch;
}

interface InlineCodeBlockProps {
  onExit: () => void;
  initialCode?: string;
  onSave?: (code: string, language: string) => void;
}

export function InlineCodeBlock({ onExit, initialCode = "", onSave }: InlineCodeBlockProps) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState("javascript");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    textareaRef.current?.focus();
    setLanguage(detectLanguage(initialCode) || "javascript");
  }, [initialCode]);

  useEffect(() => {
    const newLang = detectLanguage(code);
    if (newLang !== language) setLanguage(newLang);
  }, [code, language]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onSave?.(code, language);
        onExit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onSave?.(code, language);
        onExit();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onExit, onSave, code, language]);

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

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const lineCount = code.split("\n").length;
  const minLines = 4;
  const maxLines = 30;
  const rows = Math.min(Math.max(lineCount, minLines), maxLines);

  return (
    <div
      ref={containerRef}
      className="relative w-full my-2"
      style={{ minHeight: "120px" }}
    >
      <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5 px-2 py-1 bg-[#0a0a12] border border-white/10 rounded-tl-xl">
        <div className="relative" ref={languageRef}>
          <button
            type="button"
            onClick={() => setLanguageOpen(!languageOpen)}
            className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/75 transition-colors hover:border-[#cf9eff]/45 hover:bg-white/[0.06] hover:text-white"
            aria-haspopup="listbox"
            aria-expanded={languageOpen}
          >
            <span className="truncate max-w-[120px] font-mono">{LANGUAGES.find((l) => l.id === language)?.label ?? language}</span>
            <ChevronDown className={`size-3 shrink-0 transition-transform ${languageOpen ? "rotate-180 text-[#cf9eff]" : "text-white/35"}`} />
          </button>
          {languageOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#111] py-1 shadow-xl backdrop-blur-2xl">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => { setLanguage(lang.id); setLanguageOpen(false); }}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors ${
                    language === lang.id ? "bg-[#cf9eff]/12 text-[#cf9eff]" : "hover:bg-white/[0.07] text-white/75"
                  }`}
                >
                  {language === lang.id && <Check className="size-3.5 shrink-0 text-[#cf9eff]" />}
                  <span className="truncate font-mono">{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!code.trim()}
            className="relative rounded p-1 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30 group"
            aria-label="Copy code"
          >
            {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-[10px] font-medium text-white bg-[#111] border border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-white/30 bg-white/[0.03] border border-white/10 rounded">Esc to exit</kbd>
        </div>
      </div>

      <div className="relative bg-[#0d0d14] border border-white/10 rounded-b-xl rounded-tl-xl overflow-hidden">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            textareaRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const ta = textareaRef.current;
              if (!ta) return;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              setCode(v => v.slice(0, start) + "  " + v.slice(end));
              requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
            }
          }}
          onCompositionStart={() => { isComposing.current = true; }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            setCode(e.currentTarget.value);
          }}
          spellCheck={false}
          rows={rows}
          className="w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/20 focus:outline-none"
          placeholder="Write code... (Esc to exit, Ctrl+Enter to confirm)"
          style={{
            lineHeight: 1.6,
            fontSize: "13px",
            fontFamily: "'Fira Code', 'Consolas', monospace",
            tabSize: 2,
          }}
        />
        <pre className="absolute inset-0 pointer-events-none opacity-0 font-mono text-sm" style={{ lineHeight: 1.6, fontSize: "13px", fontFamily: "'Fira Code', 'Consolas', monospace" }} aria-hidden="true">
          <code>{code || " "}</code>
        </pre>
      </div>
    </div>
  );
}