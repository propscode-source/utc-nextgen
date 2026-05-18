"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faListUl,
  faListOl,
  faQuoteRight,
  faHeading,
  faLink,
  faRotateLeft,
  faRotateRight,
  faCode,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

type Props = {
  value: object | null;
  onChange?: (json: object) => void;
  editable?: boolean;
  placeholder?: string;
  minHeight?: string;
};

export function TiptapEditor({ value, onChange, editable = true, placeholder, minHeight }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Tulis isi materi di sini…" }),
    ],
    content: value ?? "",
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3",
          minHeight ?? "min-h-[280px]",
          "[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:italic",
          "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
          "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3"
        ),
      },
    },
  });

  // When read-only and the incoming value changes (e.g. user navigates lessons), update content.
  useEffect(() => {
    if (!editor || editable) return;
    editor.commands.setContent(value ?? "", { emitUpdate: false });
  }, [editor, editable, value]);

  if (!editor) return <div className={cn("rounded-md border animate-pulse bg-muted", minHeight ?? "min-h-[320px]")} />;

  if (!editable) {
    // Bare render — no surrounding border/bg so content blends with parent (e.g. inside a Card).
    return <EditorContent editor={editor} />;
  }

  return (
    <div className="rounded-md border bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const Btn = ({
    icon,
    onClick,
    active,
    disabled,
    title,
  }: {
    icon: typeof faBold;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 grid place-items-center rounded-md text-sm",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
    </button>
  );

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL link", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2">
      <Btn icon={faBold} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold" />
      <Btn icon={faItalic} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic" />
      <Btn icon={faUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline" />
      <Btn icon={faStrikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough" />
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn
        icon={faHeading}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading"
      />
      <Btn icon={faListUl} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list" />
      <Btn icon={faListOl} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list" />
      <Btn icon={faQuoteRight} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote" />
      <Btn icon={faCode} onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block" />
      <Btn icon={faLink} onClick={setLink} active={editor.isActive("link")} title="Link" />
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn icon={faRotateLeft} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo" />
      <Btn icon={faRotateRight} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo" />
    </div>
  );
}
