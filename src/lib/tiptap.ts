/**
 * Coerce arbitrary lesson content into a Tiptap-compatible JSON doc.
 * Use this when migrating legacy plain text into the rich-text editor.
 */
export function plainTextToTiptapDoc(text: string | null | undefined): object {
  if (!text) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  // Split into paragraphs by blank line; each paragraph keeps soft line breaks as hardBreak nodes.
  const blocks = text.split(/\n{2,}/);
  return {
    type: "doc",
    content: blocks.map((block) => {
      const lines = block.split("\n");
      const inline: object[] = [];
      lines.forEach((line, idx) => {
        if (line) inline.push({ type: "text", text: line });
        if (idx < lines.length - 1) inline.push({ type: "hardBreak" });
      });
      return { type: "paragraph", content: inline.length ? inline : undefined };
    }),
  };
}

export function isTiptapDoc(v: unknown): v is { type: "doc"; content?: unknown[] } {
  return !!v && typeof v === "object" && (v as { type?: string }).type === "doc";
}
