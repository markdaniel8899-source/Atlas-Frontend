export type BlockType = "paragraph" | "heading" | "code" | "blockquote" | "bullet" | "numbered";

export interface NoteBlock {
  id: string;
  type: BlockType;
  content: string;
  language?: string;
}

export function htmlToBlocks(html: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const children = Array.from(doc.body.childNodes);

  for (const node of children) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: text });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "p") {
        const text = el.textContent?.trim() || "";
        if (text) blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: text });
      } else if (tag === "h2") {
        blocks.push({ id: crypto.randomUUID(), type: "heading", content: el.textContent?.trim() || "" });
      } else if (tag === "blockquote") {
        blocks.push({ id: crypto.randomUUID(), type: "blockquote", content: el.textContent?.trim() || "" });
      } else if (tag === "ul") {
        Array.from(el.querySelectorAll("li")).forEach((li) => {
          blocks.push({ id: crypto.randomUUID(), type: "bullet", content: li.textContent?.trim() || "" });
        });
      } else if (tag === "ol") {
        Array.from(el.querySelectorAll("li")).forEach((li) => {
          blocks.push({ id: crypto.randomUUID(), type: "numbered", content: li.textContent?.trim() || "" });
        });
      } else if (tag === "pre") {
        const codeEl = el.querySelector("code");
        const content = codeEl?.textContent || "";
        const language = codeEl?.className.replace("language-", "") || "javascript";
        blocks.push({ id: crypto.randomUUID(), type: "code", content, language });
      } else if (tag === "div" && el.classList.contains("inline-code-block")) {
        const codeEl = el.querySelector("code");
        const content = codeEl?.textContent || "";
        const language = codeEl?.className.replace("language-", "") || "javascript";
        blocks.push({ id: crypto.randomUUID(), type: "code", content, language });
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: "" });
  }
  return blocks;
}

export function blocksToHtml(blocks: NoteBlock[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case "paragraph":
        return `<p>${escapeHtml(block.content)}</p>`;
      case "heading":
        return `<h2>${escapeHtml(block.content)}</h2>`;
      case "blockquote":
        return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
      case "bullet":
        return `<ul><li>${escapeHtml(block.content)}</li></ul>`;
      case "numbered":
        return `<ol><li>${escapeHtml(block.content)}</li></ol>`;
      case "code":
        const lang = block.language || "javascript";
        return `<pre><code class="language-${lang}">${escapeHtml(block.content)}</code></pre>`;
      default:
        return `<p>${escapeHtml(block.content)}</p>`;
    }
  }).join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

export function createEmptyBlock(type: BlockType = "paragraph"): NoteBlock {
  return { id: crypto.randomUUID(), type, content: "", language: type === "code" ? "javascript" : undefined };
}