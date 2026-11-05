import { languages, type editor, type Position } from "monaco-editor";

export const assemblyLanguageDefinition: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".asm",
  ignoreCase: true,

  keywords: [
    // x86 Instructions
    "mov", "add", "sub", "mul", "div", "inc", "dec", "neg", "cmp",
    "and", "or", "xor", "not", "shl", "shr", "rol", "ror",
    "jmp", "je", "jne", "jz", "jnz", "jg", "jl", "jge", "jle",
    "ja", "jb", "jae", "jbe", "call", "ret", "loop", "nop",
    "push", "pop", "lea", "int", "syscall",
    // ARM Instructions (basic)
    "ldr", "str", "bl", "bx", "swi", "svc",
  ],

  registers: [
    // x86 Registers
    "eax", "ebx", "ecx", "edx", "esi", "edi", "esp", "ebp",
    "ax", "bx", "cx", "dx", "ah", "al", "bh", "bl", "ch", "cl", "dh", "dl",
    "rax", "rbx", "rcx", "rdx", "rsi", "rdi", "rsp", "rbp",
    "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15",
    // ARM Registers
    "r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7",
    "sp", "lr", "pc", "cpsr", "spsr",
  ],

  directives: [
    ".data", ".text", ".bss", ".global", ".extern",
    ".byte", ".word", ".long", ".quad", ".ascii", ".asciz",
    ".section", ".align", ".equ", ".set", ".macro", ".endm",
  ],

  operators: [
    "+", "-", "*", "/", "%", "&", "|", "^", "~", "<<", ">>",
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abcfnrtv\\/]|u[0-9a-fA-F]{4})/,

  tokenizer: {
    root: [
      // Labels (`main:`)
      [/[a-zA-Z_]\w*(?=\s*:)/, "type.identifier"],

      // Directives
      [/\.[a-zA-Z_]\w*/, "keyword.directive"],

      // Keywords (instructions)
      [
        /\b(mov|add|sub|mul|div|inc|dec|neg|cmp|and|or|xor|not|shl|shr|rol|ror|jmp|je|jne|jz|jnz|jg|jl|jge|jle|ja|jb|jae|jbe|call|ret|loop|nop|push|pop|lea|int|syscall|ldr|str|bl|bx|swi|svc)\b/,
        "keyword",
      ],

      // Registers
      [
        /\b(eax|ebx|ecx|edx|esi|edi|esp|ebp|ax|bx|cx|dx|ah|al|bh|bl|ch|cl|dh|dl|rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r8|r9|r10|r11|r12|r13|r14|r15|r0|r1|r2|r3|r4|r5|r6|r7|sp|lr|pc|cpsr|spsr)\b/,
        "variable.predefined",
      ],

      // Numbers
      [/\b0x[0-9a-fA-F]+\b/, "number.hex"],
      [/\b0b[01]+\b/, "number.binary"],
      [/\b\d+\b/, "number"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, "string", "@string"],
      [/'[^\\']'/, "string"],
      [/'/, "string.invalid"],

      // Comments
      [/;.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],

      // Operators
      [/@symbols/, "operator"],

      // Identifiers
      [/[a-zA-Z_]\w*/, "identifier"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, "string", "@pop"],
    ],

    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
};

export const assemblyLanguageConfiguration: languages.LanguageConfiguration = {
  comments: {
    lineComment: ";",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

export const assemblyCompletionProvider: languages.CompletionItemProvider = {
  provideCompletionItems: (model: editor.ITextModel, position: Position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    const suggestions: languages.CompletionItem[] = [
      // Common Instructions
      { label: "mov", kind: languages.CompletionItemKind.Keyword, insertText: "mov ${1:dest}, ${2:src}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Move data between registers/memory", range },
      { label: "add", kind: languages.CompletionItemKind.Keyword, insertText: "add ${1:dest}, ${2:src}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Add values", range },
      { label: "sub", kind: languages.CompletionItemKind.Keyword, insertText: "sub ${1:dest}, ${2:src}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Subtract values", range },
      { label: "cmp", kind: languages.CompletionItemKind.Keyword, insertText: "cmp ${1:op1}, ${2:op2}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Compare values", range },
      { label: "jmp", kind: languages.CompletionItemKind.Keyword, insertText: "jmp ${1:label}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Unconditional jump", range },
      { label: "call", kind: languages.CompletionItemKind.Keyword, insertText: "call ${1:function}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Call function", range },
      { label: "ret", kind: languages.CompletionItemKind.Keyword, insertText: "ret", documentation: "Return from function", range },
      { label: "push", kind: languages.CompletionItemKind.Keyword, insertText: "push ${1:reg}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Push to stack", range },
      { label: "pop", kind: languages.CompletionItemKind.Keyword, insertText: "pop ${1:reg}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Pop from stack", range },

      // Registers
      { label: "eax", kind: languages.CompletionItemKind.Variable, insertText: "eax", documentation: "Accumulator register (32-bit)", range },
      { label: "ebx", kind: languages.CompletionItemKind.Variable, insertText: "ebx", documentation: "Base register (32-bit)", range },
      { label: "ecx", kind: languages.CompletionItemKind.Variable, insertText: "ecx", documentation: "Counter register (32-bit)", range },
      { label: "edx", kind: languages.CompletionItemKind.Variable, insertText: "edx", documentation: "Data register (32-bit)", range },
      { label: "rax", kind: languages.CompletionItemKind.Variable, insertText: "rax", documentation: "Accumulator register (64-bit)", range },
      { label: "rbx", kind: languages.CompletionItemKind.Variable, insertText: "rbx", documentation: "Base register (64-bit)", range },

      // Directives
      { label: ".data", kind: languages.CompletionItemKind.Keyword, insertText: ".data", documentation: "Data section", range },
      { label: ".text", kind: languages.CompletionItemKind.Keyword, insertText: ".text", documentation: "Code section", range },
      { label: ".global", kind: languages.CompletionItemKind.Keyword, insertText: ".global ${1:symbol}", insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: "Declare global symbol", range },
    ];

    return { suggestions };
  },
};
