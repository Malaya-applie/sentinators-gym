"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import UnderlineExtension from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  Trash2,
  Plus,
  Upload,
  X,
  Check,
  AlertTriangle,
  RotateCcw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EquipmentAdminPanel } from "@/components/admin/equipment-admin-panel";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = BASE.replace("/api", "");

// ── helpers ────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("gym_admin_token") ?? "";
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadMedia(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url as string;
}

function img(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  if (src.startsWith("/uploads/")) return `${UPLOADS_BASE}${src}`;
  return src;
}

const IMAGE_DEFAULTS: Record<string, string> = {
  hero_image:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/anastase-maragos-ehQimz6-1qM-unsplash%201-GdqLOCVXElCrEmbSonGZfnAdIqozNH.png",
  why_choose_video_image: "/why-choose-us.png",
  about_hero_image: "/about-hero-image.png",
  events_hero_image: "/event-hero-image.jpg",
  shop_hero_image: "/shop-hero-image.jpg",
  membership_hero_image: "/pricing-hero-image.png",
};

function isImageKey(key: string) {
  return (
    key.toLowerCase().includes("image") || key.toLowerCase().includes("_img")
  );
}

function isVideoKey(key: string) {
  return key === "why_choose_video_url";
}

// ── tiny reusable pieces ───────────────────────────────────────────────────

function ImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadMedia(file);
    setUploading(false);
    if (url) onChange(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Image URL or upload ↗"
        className="bg-[#1a1a1a] border-white/10 text-white text-xs flex-1"
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="shrink-0 p-2 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
        title="Upload image"
      >
        {uploading ? <span className="text-xs">…</span> : <Upload size={14} />}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

function VideoInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadMedia(file);
    setUploading(false);
    if (url) onChange(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Video URL or upload ↗"
        className="bg-[#1a1a1a] border-white/10 text-white text-xs flex-1"
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="shrink-0 p-2 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
        title="Upload video"
      >
        {uploading ? <span className="text-xs">…</span> : <Upload size={14} />}
      </button>
      <input
        ref={ref}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── rich-text editor (Tiptap) ─────────────────────────────────────────────

type ToolbarButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onClick}
      className={`p-1.5 rounded transition text-sm ${
        active
          ? "bg-red-700 text-white"
          : "bg-transparent text-white/50 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension.configure({ openOnClick: false }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] p-3 text-white text-sm outline-none leading-relaxed break-words [&_p]:mb-3 [&_p:last-child]:mb-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-red-500/60 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-red-300 [&_a]:underline",
      },
    },
  });

  // Sync external value changes (e.g. opening edit mode fills in existing content)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!editor) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only update if the value differs (avoid infinite loop)
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  function prevent(e: React.MouseEvent) {
    e.preventDefault(); // prevent blur on editor
  }

  function setLink(e: React.MouseEvent) {
    e.preventDefault();
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL:", prev ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor!
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }

  return (
    <div className="rounded-md border border-white/10 overflow-hidden bg-[#1a1a1a] focus-within:border-red-700/60 transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 px-1.5 py-1 border-b border-white/10 bg-[#111]">
        <ToolbarButton
          title="Undo"
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().undo().run();
          }}
        >
          <Undo2 size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().redo().run();
          }}
        >
          <Redo2 size={13} />
        </ToolbarButton>

        <span className="w-px bg-white/10 mx-0.5 self-stretch" />

        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleBold().run();
          }}
        >
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleItalic().run();
          }}
        >
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleUnderline().run();
          }}
        >
          <Underline size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleStrike().run();
          }}
        >
          <Strikethrough size={13} />
        </ToolbarButton>

        <span className="w-px bg-white/10 mx-0.5 self-stretch" />

        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
        >
          <Heading2 size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
        >
          <Heading3 size={13} />
        </ToolbarButton>

        <span className="w-px bg-white/10 mx-0.5 self-stretch" />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={(e) => {
            prevent(e);
            editor.chain().focus().toggleBlockquote().run();
          }}
        >
          <Quote size={13} />
        </ToolbarButton>

        <span className="w-px bg-white/10 mx-0.5 self-stretch" />

        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <Link size={13} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-white font-bold text-lg mb-4 border-b border-white/10 pb-2">
      {title}
    </h3>
  );
}

function DeleteConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.content");
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-[#111] border border-white/10 max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-red-900/40">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <AlertDialogTitle className="text-white text-base">
              {title ?? t("deleteItemTitle")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/50 text-sm pl-[52px]">
            {description ?? t("deleteItemDesc")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-white/10 text-white/60 hover:text-white"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-red-700 hover:bg-red-600 text-white"
          >
            {t("delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── TEXT CONTENT ───────────────────────────────────────────────────────────

type TextRow = { id: number; key: string; value: string; section: string };

const REQUIRED_TEXT_ROWS: Array<Pick<TextRow, "key" | "section" | "value">> = [
  { key: "why_choose_video_url", section: "why", value: "" },
  {
    key: "shop_hero_image",
    section: "shop",
    value: "/shop-hero-image.jpg",
  },
  {
    key: "shop_hero_title",
    section: "shop",
    value: "LOREM IPSUM\nLOREM IPSUM LOREM",
  },
  {
    key: "events_hero_image",
    section: "events_page",
    value: "/event-hero-image.jpg",
  },
  {
    key: "events_schedule_title",
    section: "events_page",
    value: "FOLLOW EVENT SCHEDULE",
  },
  {
    key: "events_schedule_subtitle",
    section: "events_page",
    value: "Moments that define the experience",
  },
  {
    key: "membership_hero_title",
    section: "membership",
    value: "PLANS & PRICING",
  },
  {
    key: "membership_hero_image",
    section: "membership",
    value: "/pricing-hero-image.png",
  },
  { key: "navbar_home_label", section: "navbar", value: "Home" },
  { key: "navbar_about_label", section: "navbar", value: "About" },
  { key: "navbar_membership_label", section: "navbar", value: "Membership" },
  { key: "navbar_shop_label", section: "navbar", value: "Shop" },
  { key: "navbar_events_label", section: "navbar", value: "Events" },
  { key: "navbar_gallery_label", section: "navbar", value: "Gallery" },
  { key: "navbar_blog_label", section: "navbar", value: "Blog" },
  {
    key: "navbar_member_login_text",
    section: "navbar",
    value: "Member Login",
  },
];

function TextContentPanel() {
  const t = useTranslations("admin.content");
  const [rows, setRows] = useState<TextRow[]>([]);
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => {
    apiFetch("/admin/content/text")
      .then((fetched: TextRow[]) => {
        const existingKeys = new Set(fetched.map((row) => row.key));
        const missingRows = REQUIRED_TEXT_ROWS.filter(
          (row) => !existingKeys.has(row.key),
        ).map((row, idx) => ({
          id: -(idx + 1),
          ...row,
        }));

        setRows([...fetched, ...missingRows]);
      })
      .catch(() => {});
  }, []);

  async function save(row: TextRow) {
    await apiFetch(`/admin/content/text/${row.key}`, {
      method: "PUT",
      body: JSON.stringify({
        value: editing[row.id] ?? row.value,
        section: row.section,
      }),
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, value: editing[row.id] ?? r.value } : r,
      ),
    );
    setSaved((prev) => ({ ...prev, [row.id]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [row.id]: false })), 1500);
  }

  async function remove(row: TextRow) {
    if (row.id < 0) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, value: "" } : r)),
      );
      setEditing((prev) => ({ ...prev, [row.id]: "" }));
      return;
    }

    await apiFetch(`/admin/content/text/${row.key}`, {
      method: "DELETE",
    });

    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, value: "" } : r)),
    );
    setEditing((prev) => ({ ...prev, [row.id]: "" }));
  }

  const sections = [...new Set(rows.map((r) => r.section))].sort();

  return (
    <div>
      <SectionHeader title={t("textHeadings")} />
      {sections.map((sec) => (
        <div key={sec} className="mb-6">
          <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-2">
            [{sec}]
          </p>
          <div className="space-y-3">
            {rows
              .filter((r) => r.section === sec)
              .map((row) => (
                <div
                  key={row.id}
                  className="bg-[#111] rounded-lg p-3 border border-white/5 flex flex-col gap-1"
                >
                  <Label className="text-white/50 text-xs font-mono">
                    {row.key}
                  </Label>
                  {isVideoKey(row.key) ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <VideoInput
                          value={editing[row.id] ?? row.value}
                          onChange={(url) =>
                            setEditing((prev) => ({ ...prev, [row.id]: url }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => remove(row)}
                          className="border-white/10 text-white/60 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => save(row)}
                          className={
                            saved[row.id]
                              ? "bg-green-700 text-white"
                              : "bg-red-700 hover:bg-red-600 text-white"
                          }
                        >
                          {saved[row.id] ? <Check size={14} /> : t("save")}
                        </Button>
                      </div>
                      {(editing[row.id] ?? row.value) && (
                        <div className="w-40 h-20 rounded overflow-hidden bg-white/5 shrink-0 border border-white/10">
                          <video
                            src={img(editing[row.id] ?? row.value)}
                            controls
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ) : isImageKey(row.key) ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <ImageInput
                          value={editing[row.id] ?? row.value}
                          onChange={(url) =>
                            setEditing((prev) => ({ ...prev, [row.id]: url }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => remove(row)}
                          className="border-white/10 text-white/60 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => save(row)}
                          className={
                            saved[row.id]
                              ? "bg-green-700 text-white"
                              : "bg-red-700 hover:bg-red-600 text-white"
                          }
                        >
                          {saved[row.id] ? <Check size={14} /> : t("save")}
                        </Button>
                      </div>
                      {(editing[row.id] ?? row.value) && (
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-14 rounded overflow-hidden bg-white/5 shrink-0 border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img(editing[row.id] ?? row.value)}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {IMAGE_DEFAULTS[row.key] && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [row.id]: IMAGE_DEFAULTS[row.key],
                                }))
                              }
                              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 transition"
                              title="Reset to original default image"
                            >
                              <RotateCcw size={12} />
                              {t("resetToDefault")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-start">
                      {row.value.length > 80 ? (
                        <Textarea
                          value={editing[row.id] ?? row.value}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="bg-[#1a1a1a] border-white/10 text-white text-sm flex-1 min-h-[70px]"
                        />
                      ) : (
                        <Input
                          value={editing[row.id] ?? row.value}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="bg-[#1a1a1a] border-white/10 text-white text-sm flex-1"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => remove(row)}
                        className="border-white/10 text-white/60 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => save(row)}
                        className={
                          saved[row.id]
                            ? "bg-green-700 text-white"
                            : "bg-red-700 hover:bg-red-600 text-white"
                        }
                      >
                        {saved[row.id] ? <Check size={14} /> : t("save")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── GENERIC CRUD TABLE ─────────────────────────────────────────────────────

interface ColDef<T> {
  key: keyof T;
  label: string;
  type?: "text" | "textarea" | "richtext" | "image" | "number" | "select";
  options?: string[];
}

function CrudPanel<T extends { id: number }>({
  title,
  endpoint,
  cols,
  emptyForm,
}: {
  title: string;
  endpoint: string;
  cols: ColDef<T>[];
  emptyForm: Omit<T, "id">;
}) {
  const t = useTranslations("admin.content");
  const [items, setItems] = useState<T[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<T>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Omit<T, "id">>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`/admin/content/${endpoint}`)
      .then(setItems)
      .catch(() => {});
  }, [endpoint]);

  async function handleSave(id: number) {
    setSaving(true);
    const updated = await apiFetch(`/admin/content/${endpoint}/${id}`, {
      method: "PUT",
      body: JSON.stringify(editForm),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await apiFetch(`/admin/content/${endpoint}/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteTargetId(null);
  }

  async function handleAdd() {
    setSaving(true);
    const created = await apiFetch(`/admin/content/${endpoint}`, {
      method: "POST",
      body: JSON.stringify(addForm),
    });
    setItems((prev) => [...prev, created]);
    setAddForm(emptyForm);
    setShowAdd(false);
    setSaving(false);
  }

  function fieldInput(
    col: ColDef<T>,
    value: string,
    onChange: (v: string) => void,
  ) {
    if (col.type === "image") {
      return <ImageInput value={value} onChange={onChange} />;
    }
    if (col.type === "richtext") {
      return <RichTextEditor value={value} onChange={onChange} />;
    }
    if (col.type === "textarea") {
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#1a1a1a] border-white/10 text-white text-sm min-h-[60px]"
        />
      );
    }
    if (col.type === "select") {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-md px-3 py-2"
        >
          <option value="" className="bg-[#1a1a1a]">
            -- Select --
          </option>
          {(col.options ?? []).map((opt) => (
            <option key={opt} value={opt} className="bg-[#1a1a1a]">
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <Input
        type={col.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border-white/10 text-white text-sm"
      />
    );
  }

  return (
    <div>
      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={() =>
          deleteTargetId !== null && handleDelete(deleteTargetId)
        }
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
        <SectionHeader title={title} />
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="bg-red-700 hover:bg-red-600 text-white"
        >
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#111] border border-white/10 rounded-lg p-4 mb-4 space-y-3">
          <p className="text-white/50 text-xs mb-2">{t("newItem")}</p>
          {cols.map((col) => (
            <div key={String(col.key)}>
              <Label className="text-white/50 text-xs mb-1 block">
                {col.label}
              </Label>
              {fieldInput(
                col,
                String(
                  (addForm as Record<string, unknown>)[String(col.key)] ?? "",
                ),
                (v) =>
                  setAddForm((prev) => ({
                    ...prev,
                    [col.key]: col.type === "number" ? Number(v) : v,
                  })),
              )}
            </div>
          ))}
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(false)}
              className="border-white/10 text-white/60 hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleAdd}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              {saving ? t("saving") : t("create")}
            </Button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {items.map((item) =>
          editingId === item.id ? (
            /* Edit mode */
            <div
              key={item.id}
              className="bg-[#111] border border-red-700/30 rounded-lg p-4 space-y-3"
            >
              {cols.map((col) => (
                <div key={String(col.key)}>
                  <Label className="text-white/50 text-xs mb-1 block">
                    {col.label}
                  </Label>
                  {fieldInput(
                    col,
                    String(
                      (editForm as Record<string, unknown>)[String(col.key)] ??
                        (item as Record<string, unknown>)[String(col.key)] ??
                        "",
                    ),
                    (v) =>
                      setEditForm((prev) => ({
                        ...prev,
                        [col.key]: col.type === "number" ? Number(v) : v,
                      })),
                  )}
                </div>
              ))}
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                  className="border-white/10 text-white/60"
                >
                  <X size={14} />
                </Button>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => handleSave(item.id)}
                  className="bg-green-700 hover:bg-green-600 text-white"
                >
                  {saving ? "…" : <Check size={14} />}
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div
              key={item.id}
              className="bg-[#111] border border-white/5 rounded-lg p-3 flex gap-3 items-start"
            >
              {/* Thumbnail if image col exists */}
              {cols.find((c) => c.type === "image") && (
                <div className="shrink-0 w-14 h-14 rounded overflow-hidden bg-white/5">
                  {img(
                    String(
                      (item as Record<string, unknown>)[
                        String(cols.find((c) => c.type === "image")!.key)
                      ] ?? "",
                    ),
                  ) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img(
                        String(
                          (item as Record<string, unknown>)[
                            String(cols.find((c) => c.type === "image")!.key)
                          ] ?? "",
                        ),
                      )}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {cols
                  .filter((c) => c.type !== "image")
                  .slice(0, 2)
                  .map((col) => (
                    <p
                      key={String(col.key)}
                      className="text-sm text-white truncate"
                    >
                      <span className="text-white/40 text-xs mr-1">
                        {col.label}:
                      </span>
                      {String(
                        (item as Record<string, unknown>)[String(col.key)] ??
                          "",
                      ).slice(0, 80)}
                    </p>
                  ))}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditForm(item);
                  }}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteTargetId(item.id)}
                  className="p-1.5 rounded bg-white/5 hover:bg-red-900/40 text-white/50 hover:text-red-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ── MEMBERSHIP PLANS PANEL ─────────────────────────────────────────────────

type MembershipPlan = {
  id: number;
  name: string;
  duration: string;
  price: number;
  currency: string;
  features: string; // comma-separated
  category: string;
  isActive: boolean;
};

type PlanCategoryItem = {
  id: number;
  name: string;
  label: string;
  order: number;
};

const emptyPlan: Omit<MembershipPlan, "id"> = {
  name: "",
  duration: "",
  price: 0,
  currency: "CHF",
  features: "",
  category: "MEMBERSHIP",
  isActive: true,
};

function PlanForm({
  form,
  onChange,
  categories,
}: {
  form: Partial<Omit<MembershipPlan, "id">>;
  onChange: (key: string, value: string | number | boolean | null) => void;
  categories: PlanCategoryItem[];
}) {
  const t = useTranslations("admin.content");
  const isAdditional = form.category === "ADDITIONAL";
  const durationOptions = Array.from({ length: 36 }, (_, i) => {
    const months = i + 1;
    return {
      value: `${months} ${months === 1 ? "Monat" : "Monate"}`,
      label: `${months} ${months === 1 ? "Monat" : "Monate"}`,
    };
  });

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-3 ${isAdditional ? "grid-cols-1" : "grid-cols-2"}`}
      >
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            {t("planName")}
          </Label>
          <Input
            value={String(form.name ?? "")}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder={t("planNamePlaceholder")}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        </div>
        {!isAdditional && (
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              {t("planDuration")}
            </Label>
            <select
              value={String(form.duration ?? "")}
              onChange={(e) => onChange("duration", e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-md px-3 py-2"
            >
              <option value="" disabled>
                {t("selectDuration")}
              </option>
              {durationOptions.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            {t("planPrice")}
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            value={String(form.price ?? "")}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || val === "-") {
                onChange("price", val as any);
              } else {
                const n = Number(val);
                if (!isNaN(n)) onChange("price", n);
              }
            }}
            onBlur={(e) => {
              const n = Number(e.target.value);
              onChange("price", isNaN(n) ? 0 : n);
            }}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
          {isAdditional && (
            <p className="text-white/25 text-[10px] mt-0.5">
              Negative value = discount (e.g. -50)
            </p>
          )}
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            {t("planCurrency")}
          </Label>
          <Input
            value={String(form.currency ?? "CHF")}
            onChange={(e) => onChange("currency", e.target.value)}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-white/50 text-xs mb-1 block">
          {t("planCategory")}
        </Label>
        <select
          value={String(form.category ?? categories[0]?.name ?? "")}
          onChange={(e) => onChange("category", e.target.value)}
          className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-md px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-white/50 text-xs mb-1 block">
          {t("planFeatures")}
        </Label>
        <Textarea
          value={String(form.features ?? "")}
          onChange={(e) => onChange("features", e.target.value)}
          placeholder={t("planFeaturesPlaceholder")}
          className="bg-[#1a1a1a] border-white/10 text-white text-sm min-h-[70px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="plan-active"
          checked={form.isActive !== false}
          onChange={(e) => onChange("isActive", e.target.checked)}
          className="accent-red-600 w-4 h-4"
        />
        <Label
          htmlFor="plan-active"
          className="text-white/70 text-sm cursor-pointer"
        >
          {t("planActive")}
        </Label>
      </div>
    </div>
  );
}

function MembershipPlansPanel() {
  const t = useTranslations("admin.content");
  // ── plan categories state ──
  const [categories, setCategories] = useState<PlanCategoryItem[]>([]);
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [catAddForm, setCatAddForm] = useState({ label: "" });
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catEditForm, setCatEditForm] = useState({ label: "" });
  const [catSaving, setCatSaving] = useState(false);
  const [catDeleteTargetId, setCatDeleteTargetId] = useState<number | null>(
    null,
  );
  const [catDeleteError, setCatDeleteError] = useState<string | null>(null);

  // ── plans state ──
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<MembershipPlan>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] =
    useState<Partial<Omit<MembershipPlan, "id">>>(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/admin/content/plan-categories")
      .then((cats: PlanCategoryItem[]) => {
        setCategories(cats);
        if (cats.length > 0) {
          setAddForm((prev) => ({ ...prev, category: cats[0].name }));
        }
      })
      .catch(() => {});
    apiFetch("/admin/content/membership-plans")
      .then(setPlans)
      .catch(() => {});
  }, []);

  // ── category CRUD ──
  async function handleCatAdd() {
    if (!catAddForm.label.trim()) return;
    setCatSaving(true);
    try {
      const created = await apiFetch("/admin/content/plan-categories", {
        method: "POST",
        body: JSON.stringify({
          name: catAddForm.label,
          label: catAddForm.label,
        }),
      });
      setCategories((prev) => [...prev, created]);
      setCatAddForm({ label: "" });
    } catch (e: any) {
      alert(e?.message ?? "Failed to create category");
    }
    setCatSaving(false);
  }

  async function handleCatSave(id: number) {
    if (!catEditForm.label.trim()) return;
    setCatSaving(true);
    try {
      const updated = await apiFetch(`/admin/content/plan-categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ label: catEditForm.label }),
      });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setCatEditId(null);
    } catch {
      alert("Failed to save category");
    }
    setCatSaving(false);
  }

  async function handleCatDelete(id: number) {
    try {
      await apiFetch(`/admin/content/plan-categories/${id}`, {
        method: "DELETE",
      });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setCatDeleteTargetId(null);
    } catch (e: any) {
      setCatDeleteTargetId(null);
      setCatDeleteError(e?.message ?? "Failed to delete category");
    }
  }

  // ── plans CRUD ──
  async function handleSave(id: number) {
    setSaving(true);
    try {
      const updated = await apiFetch(`/admin/content/membership-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
    } catch {
      alert("Failed to save plan");
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/admin/content/membership-plans/${id}`, {
        method: "DELETE",
      });
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setDeleteTargetId(null);
    } catch (e: any) {
      setDeleteTargetId(null);
      setDeleteError(e?.message ?? "Failed to delete plan");
    }
  }

  async function handleAdd() {
    setSaving(true);
    try {
      const created = await apiFetch("/admin/content/membership-plans", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setPlans((prev) => [...prev, created]);
      setAddForm(emptyPlan);
      setShowAdd(false);
    } catch {
      alert("Failed to create plan");
    }
    setSaving(false);
  }

  const grouped = categories.map((cat) => ({
    cat,
    items: plans.filter((p) => p.category === cat.name),
  }));

  return (
    <div>
      {/* Plan delete confirm */}
      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        title={t("deletePlanTitle")}
        description={t("deletePlanDesc")}
        onConfirm={() =>
          deleteTargetId !== null && handleDelete(deleteTargetId)
        }
        onCancel={() => setDeleteTargetId(null)}
      />
      <AlertDialog open={deleteError !== null}>
        <AlertDialogContent className="bg-[#111] border border-white/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base">
              {t("cannotDelete")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 text-sm">
              {deleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              size="sm"
              onClick={() => setDeleteError(null)}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              {t("ok")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category delete confirm */}
      <DeleteConfirmDialog
        open={catDeleteTargetId !== null}
        title={t("deleteCategoryTitle")}
        description={t("deleteCategoryDesc")}
        onConfirm={() =>
          catDeleteTargetId !== null && handleCatDelete(catDeleteTargetId)
        }
        onCancel={() => setCatDeleteTargetId(null)}
      />
      <AlertDialog open={catDeleteError !== null}>
        <AlertDialogContent className="bg-[#111] border border-white/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base">
              {t("cannotDelete")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 text-sm">
              {catDeleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              size="sm"
              onClick={() => setCatDeleteError(null)}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              {t("ok")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Plan Categories management ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <h3 className="text-white font-bold text-lg">
            {t("planCategories")}
          </h3>
          <Button
            size="sm"
            onClick={() => setShowCatPanel((v) => !v)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            {showCatPanel ? t("close") : t("manageCategories")}
          </Button>
        </div>

        {showCatPanel && (
          <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4 space-y-3">
            <p className="text-white/40 text-xs mb-2">
              Categories control the tabs on the membership page. The{" "}
              <span className="font-mono">name</span> is auto-generated from the
              label and is used as an internal key.
            </p>

            {/* Existing categories */}
            <div className="space-y-2">
              {categories.map((cat) =>
                catEditId === cat.id ? (
                  <div key={cat.id} className="flex gap-2 items-center">
                    <Input
                      value={catEditForm.label}
                      onChange={(e) =>
                        setCatEditForm({ label: e.target.value })
                      }
                      placeholder={t("categoryLabelPlaceholder")}
                      className="bg-[#1a1a1a] border-white/10 text-white text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={catSaving}
                      onClick={() => handleCatSave(cat.id)}
                      className="bg-green-700 hover:bg-green-600 text-white shrink-0"
                    >
                      {catSaving ? "…" : <Check size={14} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCatEditId(null)}
                      className="border-white/10 text-white/60 shrink-0"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between bg-[#111] border border-white/5 rounded-lg px-3 py-2"
                  >
                    <div>
                      <span className="text-white text-sm font-medium">
                        {cat.label}
                      </span>
                      <span className="ml-2 text-white/30 text-xs font-mono">
                        [{cat.name}]
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setCatEditId(cat.id);
                          setCatEditForm({ label: cat.label });
                        }}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setCatDeleteTargetId(cat.id)}
                        className="p-1.5 rounded bg-white/5 hover:bg-red-900/40 text-white/50 hover:text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>

            {/* Add new category */}
            <div className="flex gap-2 items-center pt-2 border-t border-white/10">
              <Input
                value={catAddForm.label}
                onChange={(e) => setCatAddForm({ label: e.target.value })}
                placeholder={t("newCategoryPlaceholder")}
                className="bg-[#1a1a1a] border-white/10 text-white text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCatAdd()}
              />
              <Button
                size="sm"
                disabled={catSaving || !catAddForm.label.trim()}
                onClick={handleCatAdd}
                className="bg-red-700 hover:bg-red-600 text-white shrink-0"
              >
                <Plus size={14} className="mr-1" /> {t("add")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Plans ── */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
        <SectionHeader title={t("membershipPlansTitle")} />
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="bg-red-700 hover:bg-red-600 text-white"
        >
          <Plus size={14} className="mr-1" /> {t("addPlan")}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-[#111] border border-white/10 rounded-lg p-4 mb-6 space-y-3">
          <p className="text-white/50 text-xs mb-2">{t("newPlan")}</p>
          <PlanForm
            form={addForm}
            onChange={(k, v) => setAddForm((prev) => ({ ...prev, [k]: v }))}
            categories={categories}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                setAddForm(emptyPlan);
              }}
              className="border-white/10 text-white/60 hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleAdd}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              {saving ? t("saving") : t("create")}
            </Button>
          </div>
        </div>
      )}

      {grouped.map(({ cat, items }) => (
        <div key={cat.id} className="mb-8">
          <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-3">
            [{cat.label}]
          </p>

          {items.length === 0 && (
            <p className="text-white/20 text-sm italic ml-2">
              {t("noPlansYet")}
            </p>
          )}

          <div className="space-y-3">
            {items.map((plan) =>
              editingId === plan.id ? (
                <div
                  key={plan.id}
                  className="bg-[#111] border border-red-700/30 rounded-lg p-4 space-y-3"
                >
                  <PlanForm
                    form={editForm}
                    onChange={(k, v) =>
                      setEditForm((prev) => ({ ...prev, [k]: v }))
                    }
                    categories={categories}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      className="border-white/10 text-white/60"
                    >
                      <X size={14} />
                    </Button>
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSave(plan.id)}
                      className="bg-green-700 hover:bg-green-600 text-white"
                    >
                      {saving ? "…" : <Check size={14} />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={plan.id}
                  className="bg-[#111] border border-white/5 rounded-lg p-3 flex gap-3 items-start"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-white font-medium truncate">
                        {plan.name}
                      </p>
                      {!plan.isActive && (
                        <span className="text-xs bg-yellow-900/50 border border-yellow-700/40 text-yellow-400 px-1.5 py-0.5 rounded">
                          inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40">
                      {plan.duration} &middot; {plan.currency} {plan.price}
                    </p>
                    <p className="text-xs text-white/30 truncate mt-0.5">
                      {plan.features}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(plan.id);
                        setEditForm(plan);
                      }}
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(plan.id)}
                      className="p-1.5 rounded bg-white/5 hover:bg-red-900/40 text-white/50 hover:text-red-400 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FOOTER PANEL ──────────────────────────────────────────────────────────

const FOOTER_DEFAULTS = {
  footer_description:
    "Lorem ipsum dolor sit amet consectetur. Ut a mattis augue primum planum est absque. In lorem suspendisse et blandit est ante laboribus. Vel mauris amet mi sit et amet.",
  footer_facebook_url: "#",
  footer_instagram_url: "#",
  footer_menu_1_label: "Home",
  footer_menu_1_url: "/",
  footer_menu_2_label: "About",
  footer_menu_2_url: "/about",
  footer_menu_3_label: "Membership",
  footer_menu_3_url: "/membership",
  footer_menu_4_label: "Shop",
  footer_menu_4_url: "/shop",
  footer_timing_heading: "Öffnungszeiten",
  footer_timing_mon_thu: "09:00–12:00 & 17:00–21:00",
  footer_timing_fri: "09:00–12:00 & 17:00–20:00",
  footer_timing_sat: "09:00–14:00",
  footer_timing_key_card: "Mit Schlüsselkarte: 05:00–24:00",
  footer_address: "Lorem Ipsum St, 25/99034,",
  footer_phone: "+990 000 0000",
  footer_email: "info@fitness.com",
  footer_copyright: "© 2026 Fitness. All rights reserved.",
};

type FooterData = typeof FOOTER_DEFAULTS;

function FooterPanel() {
  const t = useTranslations("admin.content");
  const [form, setForm] = useState<FooterData>({ ...FOOTER_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/admin/content/text")
      .then((rows: { key: string; value: string }[]) => {
        const map: Record<string, string> = {};
        rows.forEach((r) => (map[r.key] = r.value));
        setForm((prev) => {
          const merged = { ...prev };
          (Object.keys(prev) as (keyof FooterData)[]).forEach((k) => {
            if (map[k] !== undefined) merged[k] = map[k];
          });
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      await apiFetch("/admin/content/text", {
        method: "PUT",
        body: JSON.stringify({
          updates: (Object.keys(form) as (keyof FooterData)[]).map((k) => ({
            key: k,
            value: form[k],
            section: "footer",
          })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save footer content");
    }
    setSaving(false);
  }

  function field(
    key: keyof FooterData,
    label: string,
    type: "text" | "textarea" = "text",
  ) {
    return (
      <div key={key}>
        <Label className="text-white/50 text-xs mb-1 block">{label}</Label>
        {type === "textarea" ? (
          <Textarea
            value={form[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm min-h-[80px]"
          />
        ) : (
          <Input
            value={form[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title={t("footerTitle")} />

      {/* About / Description */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-4 space-y-3">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
          [About]
        </p>
        {field("footer_description", t("footerDescription"), "textarea")}
        <div className="grid grid-cols-2 gap-3">
          {field("footer_facebook_url", t("facebookUrl"))}
          {field("footer_instagram_url", t("instagramUrl"))}
        </div>
      </div>

      {/* Menu Links */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-4 space-y-3">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
          [Menu Links]
        </p>
        {([1, 2, 3, 4] as const).map((n) => (
          <div key={n} className="grid grid-cols-2 gap-3">
            {field(
              `footer_menu_${n}_label` as keyof FooterData,
              `Link ${n} Label`,
            )}
            {field(`footer_menu_${n}_url` as keyof FooterData, `Link ${n} URL`)}
          </div>
        ))}
      </div>

      {/* Timings */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-4 space-y-3">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
          [Timings / Öffnungszeiten]
        </p>
        {field("footer_timing_heading", "Heading")}
        {field("footer_timing_mon_thu", "Mo – Do")}
        {field("footer_timing_fri", "Freitag")}
        {field("footer_timing_sat", "Samstag")}
        {field("footer_timing_key_card", "Mit Schlüsselkarte")}
      </div>

      {/* Contact */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-4 space-y-3">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
          [Contact]
        </p>
        {field("footer_address", t("address"))}
        {field("footer_phone", t("phone"))}
        {field("footer_email", t("email"))}
      </div>

      {/* Copyright */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-6">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-2">
          [Copyright]
        </p>
        {field("footer_copyright", t("copyrightText"))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={saveAll}
          disabled={saving}
          className={
            saved
              ? "bg-green-700 text-white"
              : "bg-red-700 hover:bg-red-600 text-white"
          }
        >
          {saving ? (
            t("saving")
          ) : saved ? (
            <>
              <Check size={14} className="mr-1" /> {t("saved")}
            </>
          ) : (
            t("saveAll")
          )}
        </Button>
      </div>
    </div>
  );
}

// ── TERMS SECTIONS EDITOR ─────────────────────────────────────────────────

type TermsSection = { title: string; content: string };

function TermsSectionsEditor({
  label,
  dbKey,
  defaultSections,
}: {
  label: string;
  dbKey: string;
  defaultSections: TermsSection[];
}) {
  const [sections, setSections] = useState<TermsSection[]>(defaultSections);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch("/admin/content/text")
      .then((rows: { key: string; value: string }[]) => {
        const row = rows.find((r) => r.key === dbKey);
        if (row) {
          try {
            const parsed = JSON.parse(row.value);
            if (Array.isArray(parsed)) setSections(parsed as TermsSection[]);
          } catch {
            /* ignore */
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [dbKey]);

  function updateSection(
    index: number,
    field: keyof TermsSection,
    value: string,
  ) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { title: `${prev.length + 1}. New Section`, content: "" },
    ]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const arr = [...prev];
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/admin/content/text", {
        method: "PUT",
        body: JSON.stringify({
          updates: [
            {
              key: dbKey,
              value: JSON.stringify(sections),
              section: "registration",
            },
          ],
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      alert("Failed to save sections");
    }
    setSaving(false);
  }

  if (!loaded)
    return <div className="text-white/40 text-sm py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-white/70 text-sm font-semibold">{label}</Label>
        <button
          type="button"
          onClick={addSection}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <Plus size={13} /> Add Section
        </button>
      </div>
      <div className="space-y-3">
        {sections.map((sec, i) => (
          <div
            key={i}
            className="rounded-md border border-white/10 bg-[#0d0d0d] p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs w-5">{i + 1}.</span>
              <Input
                value={sec.title}
                onChange={(e) => updateSection(i, "title", e.target.value)}
                placeholder="Section title"
                className="bg-[#1a1a1a] border-white/10 text-white text-xs flex-1 h-7"
              />
              <button
                type="button"
                onClick={() => moveSection(i, -1)}
                disabled={i === 0}
                className="text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
                title="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveSection(i, 1)}
                disabled={i === sections.length - 1}
                className="text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
                title="Move down"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => removeSection(i)}
                className="text-red-500/60 hover:text-red-400 transition-colors"
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <Textarea
              value={sec.content}
              onChange={(e) => updateSection(i, "content", e.target.value)}
              placeholder="Section content..."
              className="bg-[#1a1a1a] border-white/10 text-white/80 text-xs min-h-[70px] resize-y"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          size="sm"
          className={
            saved
              ? "bg-green-700 hover:bg-green-700 text-white text-xs"
              : "bg-red-700 hover:bg-red-600 text-white text-xs"
          }
        >
          {saving ? (
            "Saving…"
          ) : saved ? (
            <>
              <Check size={12} className="mr-1" /> Saved
            </>
          ) : (
            "Save Sections"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── REGISTRATION SETTINGS PANEL ───────────────────────────────────────────

const MEMBERSHIP_TERMS_DEFAULTS: TermsSection[] = [
  {
    title: "1. Membership Agreement",
    content:
      "By joining, you enter into a binding membership agreement with the gym. The membership starts from your selected start date and remains valid for the agreed duration. Membership fees are non-refundable once the membership period begins.",
  },
  {
    title: "2. Payment Terms",
    content:
      "All fees must be paid in advance according to the selected payment frequency (monthly, quarterly, or yearly). Failure to pay may result in suspension or termination of membership. Late payments may incur additional charges.",
  },
  {
    title: "3. Gym Rules & House Rules",
    content:
      "Members must conduct themselves respectfully at all times. Proper gym attire and footwear are required. Equipment must be returned to its designated place after use. Aggressive or unsafe behaviour will result in immediate termination of membership without refund.",
  },
  {
    title: "4. Health & Safety Responsibility",
    content:
      "You confirm that you are in good physical health and have consulted a medical professional if required before commencing any exercise program. The gym will not be held liable for any injury, illness, or loss of personal property during your use of the facilities. You exercise at your own risk.",
  },
  {
    title: "5. Cancellation Policy",
    content:
      "Memberships may be cancelled with a written notice of at least 30 days before the next billing cycle. Early termination fees may apply. Monthly memberships cannot be cancelled mid-cycle; cancellation takes effect at the end of the current period.",
  },
  {
    title: "6. Freeze & Suspension",
    content:
      "Members may request a membership freeze for medical reasons with valid documentation. Freeze periods extend the membership end date accordingly. Abuse of freeze requests may result in membership termination.",
  },
  {
    title: "7. Guest Policy",
    content:
      "Guests are only permitted when accompanied by an active member and subject to a guest fee. Guest visits are limited per month and guests must register at reception. Members are responsible for the behaviour of their guests.",
  },
  {
    title: "8. Privacy & Data",
    content:
      "Your personal data will be processed in accordance with our Privacy Policy. We collect and store data necessary to manage your membership and may contact you with relevant information about your account or facility updates.",
  },
  {
    title: "9. Amendments",
    content:
      "The gym reserves the right to amend these terms at any time. Members will be notified of significant changes with reasonable notice. Continued use of the facilities after notification constitutes acceptance of the updated terms.",
  },
];

const GYM_RULES_DEFAULTS: TermsSection[] = [
  {
    title: "1. General Conduct",
    content:
      "All members must treat staff, fellow members, and equipment with respect at all times. Harassment, aggressive behaviour, or intimidation of any kind will result in immediate termination of membership without refund.",
  },
  {
    title: "2. Dress Code & Hygiene",
    content:
      "Appropriate gym attire and closed-toe athletic footwear must be worn at all times on the gym floor. Members are expected to maintain personal hygiene. Use of a personal towel during workouts is mandatory.",
  },
  {
    title: "3. Equipment Use",
    content:
      "All equipment must be used for its intended purpose and returned to its designated place after use. Weights must be re-racked after every set. Dropping weights carelessly is not permitted. Members must wipe down equipment with the provided disinfectant spray after each use.",
  },
  {
    title: "4. Time Limits & Sharing",
    content:
      "During peak hours, members may be asked to share equipment or limit their time on a single machine to 30 minutes. Reserving equipment while not actively using it is not permitted.",
  },
  {
    title: "5. Mobile Phones & Photography",
    content:
      "Phone calls should be taken outside the workout areas. Photography or video recording of other members without their explicit consent is strictly prohibited and may result in membership termination.",
  },
  {
    title: "6. Health Responsibility",
    content:
      "Members are responsible for their own health and safety during gym use. By accepting this policy, you confirm that you are in a suitable physical condition to participate in exercise and have consulted a qualified medical professional if you have any pre-existing medical conditions, injuries, or health concerns.",
  },
  {
    title: "7. Liability Waiver",
    content:
      "The gym and its staff shall not be held liable for any injury, illness, accident, or loss of personal property sustained during your use of the facilities. You voluntarily assume all risks associated with gym participation. Members exercise entirely at their own risk.",
  },
  {
    title: "8. Emergency Procedures",
    content:
      "In case of a medical emergency, notify gym staff immediately. Do not attempt to move an injured person unless trained to do so. First-aid kits and defibrillators are located at the front desk. Emergency exits are clearly marked throughout the facility.",
  },
  {
    title: "9. Prohibited Substances",
    content:
      "The use of illegal performance-enhancing drugs or any controlled substances on gym premises is strictly prohibited. Members found in violation of this rule will have their membership revoked immediately and the incident may be reported to relevant authorities.",
  },
  {
    title: "10. Compliance",
    content:
      "All members are expected to follow the instructions of gym staff at all times. Failure to comply with these rules may result in a warning, suspension, or permanent termination of membership at the discretion of management.",
  },
];

const REGISTRATION_DEFAULTS = {
  registration_fee: "99",
  registration_currency: "CHF",
  discount_amount: "0",
  discount_label: "Discount",
  agreement_text:
    "Membership starts from the selected start date. The selected plan and registration fee are payable according to gym policy.",
  agreement_checkbox_1: "I confirm my personal details are accurate.",
  agreement_checkbox_2:
    "I understand the membership plan is submitted for approval.",
  terms_text:
    "Please review the gym terms, house rules, health responsibility, cancellation policy, and payment terms before signing.",
  terms_checkbox_1: "I have read and agree to the membership terms.",
  terms_checkbox_2: "I accept the gym rules and health responsibility policy.",
  terms_final_checkbox: "I confirm this signature is mine.",
};

type RegistrationSettings = typeof REGISTRATION_DEFAULTS;

// ── GALLERY IMAGES PANEL (with dynamic category dropdown) ──────────────────

function GalleryImagesPanel() {
  const t = useTranslations("admin.content");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  useEffect(() => {
    apiFetch("/admin/content/gallery-categories")
      .then((rows: { name: string }[]) => {
        setCategoryOptions(rows.map((r) => r.name));
      })
      .catch(() => {});
  }, []);

  return (
    <CrudPanel
      title={t("titleGalleryImages")}
      endpoint="gallery"
      cols={[
        { key: "src" as never, label: t("colImage"), type: "image" },
        { key: "alt" as never, label: t("colAltText"), type: "text" },
        {
          key: "category" as never,
          label: t("colCategory"),
          type: "select",
          options: categoryOptions,
        },
        { key: "order" as never, label: t("colOrder"), type: "number" },
      ]}
      emptyForm={
        {
          src: "",
          alt: "",
          category: categoryOptions[0] ?? "",
          order: 0,
        } as never
      }
    />
  );
}

function ShopProductsPanel() {
  const t = useTranslations("admin.content");
  const [categories, setCategories] = useState<
    { id: number; name: string; order: number }[]
  >([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryOrder, setNewCategoryOrder] = useState(0);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryOrder, setEditCategoryOrder] = useState(0);
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  async function loadCategories() {
    try {
      const rows = await apiFetch("/admin/content/product-categories");
      const typedRows = rows as { id: number; name: string; order: number }[];
      setCategories(typedRows);
      const names = typedRows.map((r) => r.name.trim()).filter(Boolean);
      setCategoryOptions(Array.from(new Set(names)));
    } catch {
      setCategories([]);
      setCategoryOptions([]);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      await apiFetch("/admin/content/product-categories", {
        method: "POST",
        body: JSON.stringify({ name, order: Number(newCategoryOrder) || 0 }),
      });
      setNewCategoryName("");
      setNewCategoryOrder(0);
      await loadCategories();
    } catch {
      alert("Failed to create category");
    }
    setCreatingCategory(false);
  }

  function startEditCategory(category: {
    id: number;
    name: string;
    order: number;
  }) {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryOrder(category.order);
  }

  async function handleSaveCategory() {
    if (editingCategoryId === null || !editCategoryName.trim()) return;
    setCategoryActionLoading(true);
    try {
      await apiFetch(`/admin/content/product-categories/${editingCategoryId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editCategoryName.trim(),
          order: Number(editCategoryOrder) || 0,
        }),
      });
      setEditingCategoryId(null);
      await loadCategories();
    } catch {
      alert("Failed to update category");
    }
    setCategoryActionLoading(false);
  }

  async function handleDeleteCategory() {
    if (deleteCategoryId === null) return;
    setCategoryActionLoading(true);
    try {
      await apiFetch(`/admin/content/product-categories/${deleteCategoryId}`, {
        method: "DELETE",
      });
      if (editingCategoryId === deleteCategoryId) {
        setEditingCategoryId(null);
      }
      setDeleteCategoryId(null);
      await loadCategories();
    } catch {
      alert("Failed to delete category");
    }
    setCategoryActionLoading(false);
  }

  return (
    <div className="space-y-4">
      <DeleteConfirmDialog
        open={deleteCategoryId !== null}
        title="Delete Category"
        description="Are you sure you want to delete this category?"
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteCategoryId(null)}
      />

      <div className="bg-[#111] border border-white/10 rounded-lg p-4">
        <p className="text-white text-sm font-semibold mb-3">Create Category</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Name</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Supplements"
              className="bg-[#1a1a1a] border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Order</Label>
            <Input
              type="number"
              value={newCategoryOrder}
              onChange={(e) => setNewCategoryOrder(Number(e.target.value) || 0)}
              className="bg-[#1a1a1a] border-white/10 text-white text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleCreateCategory}
              disabled={creatingCategory || !newCategoryName.trim()}
              className="w-full bg-red-700 hover:bg-red-600 text-white"
            >
              {creatingCategory ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </div>

        {categoryOptions.length > 0 && (
          <p className="text-white/50 text-xs mt-3">
            Available: {categoryOptions.join(", ")}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {categories.map((category) =>
            editingCategoryId === category.id ? (
              <div
                key={category.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-center bg-[#1a1a1a] border border-white/10 rounded-md p-2"
              >
                <Input
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="bg-[#121212] border-white/10 text-white text-sm"
                />
                <Input
                  type="number"
                  value={editCategoryOrder}
                  onChange={(e) =>
                    setEditCategoryOrder(Number(e.target.value) || 0)
                  }
                  className="bg-[#121212] border-white/10 text-white text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveCategory}
                    disabled={categoryActionLoading || !editCategoryName.trim()}
                    className="bg-green-700 hover:bg-green-600 text-white"
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCategoryId(null)}
                    className="border-white/10 text-white/60 hover:text-white"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={category.id}
                className="flex items-center justify-between bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2"
              >
                <p className="text-white text-sm">
                  {category.name}
                  <span className="text-white/40 text-xs ml-2">
                    (order: {category.order})
                  </span>
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditCategory(category)}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                    title="Edit category"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteCategoryId(category.id)}
                    className="p-1.5 rounded bg-white/5 hover:bg-red-900/40 text-white/50 hover:text-red-400 transition"
                    title="Delete category"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <CrudPanel
        title={t("titleShopProducts")}
        endpoint="products"
        cols={[
          { key: "image" as never, label: t("colImage"), type: "image" },
          { key: "name" as never, label: t("colName"), type: "text" },
          { key: "price" as never, label: t("colPrice"), type: "number" },
          { key: "currency" as never, label: t("currency"), type: "text" },
          {
            key: "category" as never,
            label: t("colCategory"),
            type: "select",
            options: categoryOptions,
          },
          {
            key: "features" as never,
            label: t("colFeatures"),
            type: "textarea",
          },
          { key: "stock" as never, label: t("colStock"), type: "number" },
        ]}
        emptyForm={
          {
            name: "",
            price: 0,
            currency: "CHF",
            image: "",
            category: categoryOptions[0] ?? "",
            features: "",
            stock: 100,
          } as never
        }
      />
    </div>
  );
}

function RegistrationSettingsPanel() {
  const t = useTranslations("admin.content");
  const [form, setForm] = useState<RegistrationSettings>({
    ...REGISTRATION_DEFAULTS,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/admin/content/text")
      .then((rows: { key: string; value: string }[]) => {
        const map: Record<string, string> = {};
        rows.forEach((r) => (map[r.key] = r.value));
        setForm((prev) => {
          const merged = { ...prev };
          (Object.keys(prev) as (keyof RegistrationSettings)[]).forEach(
            (key) => {
              if (map[key] !== undefined) merged[key] = map[key];
            },
          );
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      await apiFetch("/admin/content/text", {
        method: "PUT",
        body: JSON.stringify({
          updates: (Object.keys(form) as (keyof RegistrationSettings)[]).map(
            (key) => ({
              key,
              value: form[key],
              section: "registration",
            }),
          ),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      alert("Failed to save registration settings");
    }
    setSaving(false);
  }

  function field(
    key: keyof RegistrationSettings,
    label: string,
    type: "text" | "number" | "textarea" = "text",
  ) {
    return (
      <div>
        <Label className="text-white/50 text-xs mb-1 block">{label}</Label>
        {type === "textarea" ? (
          <Textarea
            value={form[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm min-h-[90px]"
          />
        ) : (
          <Input
            type={type}
            min={type === "number" ? 0 : undefined}
            value={form[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title={t("registrationSettingsTitle")} />
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {field("registration_fee", t("regFee"), "number")}
          {field("registration_currency", t("currency"))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("discount_amount", t("discountAmount"), "number")}
          {field("discount_label", t("discountLabel"))}
        </div>
        {field("terms_text", t("termsText"), "textarea")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field("terms_checkbox_1", t("termsCheckbox1"))}
          {field("terms_checkbox_2", t("termsCheckbox2"))}
        </div>
        {field("terms_final_checkbox", t("signatureConfirmation"))}
        {field("agreement_text", t("agreementText"), "textarea")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field("agreement_checkbox_1", t("agreementCheckbox1"))}
          {field("agreement_checkbox_2", t("agreementCheckbox2"))}
        </div>

        {/* ── Membership Terms Sections ── */}
        <div className="border-t border-white/5 pt-4">
          <TermsSectionsEditor
            label="Membership Terms & Conditions — Sections"
            dbKey="membership_terms_sections"
            defaultSections={MEMBERSHIP_TERMS_DEFAULTS}
          />
        </div>

        {/* ── Gym Rules Sections ── */}
        <div className="border-t border-white/5 pt-4">
          <TermsSectionsEditor
            label="Gym Rules & Health Responsibility — Sections"
            dbKey="gym_rules_sections"
            defaultSections={GYM_RULES_DEFAULTS}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={saveAll}
            disabled={saving}
            className={
              saved
                ? "bg-green-700 hover:bg-green-700 text-white"
                : "bg-red-700 hover:bg-red-600 text-white"
            }
          >
            {saving ? (
              t("saving")
            ) : saved ? (
              <>
                <Check size={14} className="mr-1" /> {t("saved")}
              </>
            ) : (
              t("saveRegistration")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── EVENT HIGHLIGHTS PANEL ────────────────────────────────────────────────

type EventHighlight = {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  videoUrl: string | null;
  order: number;
  isMain: boolean;
  isActive?: boolean;
};

function EventHighlightsPanel() {
  const t = useTranslations("admin.content");
  const [items, setItems] = useState<EventHighlight[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<EventHighlight>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Omit<EventHighlight, "id">>>({
    title: "",
    description: "",
    image: "",
    videoUrl: "",
    order: 0,
    isMain: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/admin/content/event-highlights")
      .then(setItems)
      .catch(() => {});
  }, []);

  async function handleSave(id: number) {
    setSaving(true);
    const updated = await apiFetch(`/admin/content/event-highlights/${id}`, {
      method: "PUT",
      body: JSON.stringify(editForm),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await apiFetch(`/admin/content/event-highlights/${id}`, {
      method: "DELETE",
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteTargetId(null);
  }

  async function handleAdd() {
    setSaving(true);
    const created = await apiFetch("/admin/content/event-highlights", {
      method: "POST",
      body: JSON.stringify(addForm),
    });
    setItems((prev) => [...prev, created]);
    setAddForm({
      title: "",
      description: "",
      image: "",
      videoUrl: "",
      order: 0,
      isMain: false,
    });
    setShowAdd(false);
    setSaving(false);
  }

  return (
    <div>
      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={() =>
          deleteTargetId !== null && handleDelete(deleteTargetId)
        }
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
        <SectionHeader title={t("titleEvents")} />
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="bg-red-700 hover:bg-red-600 text-white"
        >
          <Plus size={14} className="mr-1" /> {t("add")}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-[#111] border border-white/10 rounded-lg p-4 mb-4 space-y-3">
          <p className="text-white/50 text-xs mb-2">{t("newItem")}</p>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              {t("colImage")}
            </Label>
            <ImageInput
              value={String(addForm.image ?? "")}
              onChange={(v) => setAddForm((prev) => ({ ...prev, image: v }))}
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              {t("colTitle")}
            </Label>
            <Input
              value={String(addForm.title ?? "")}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="bg-[#1a1a1a] border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              {t("colDescription")}
            </Label>
            <Textarea
              value={String(addForm.description ?? "")}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="bg-[#1a1a1a] border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              Video URL
            </Label>
            <Input
              value={String(addForm.videoUrl ?? "")}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, videoUrl: e.target.value }))
              }
              placeholder="https://youtube.com/..."
              className="bg-[#1a1a1a] border-white/10 text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/50 text-xs mb-1 block">
                {t("colOrder")}
              </Label>
              <Input
                type="number"
                value={String(addForm.order ?? 0)}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    order: Number(e.target.value),
                  }))
                }
                className="bg-[#1a1a1a] border-white/10 text-white text-sm"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="checkbox"
                  id="add-is-main"
                  checked={addForm.isMain === true}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      isMain: e.target.checked,
                    }))
                  }
                  className="accent-red-600 w-4 h-4"
                />
                <Label
                  htmlFor="add-is-main"
                  className="text-white/70 text-xs cursor-pointer"
                >
                  Main Event
                </Label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(false)}
              className="border-white/10 text-white/60 hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleAdd}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              {saving ? t("saving") : t("create")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) =>
          editingId === item.id ? (
            <div
              key={item.id}
              className="bg-[#111] border border-red-700/30 rounded-lg p-4 space-y-3"
            >
              <div>
                <Label className="text-white/50 text-xs mb-1 block">
                  {t("colImage")}
                </Label>
                <ImageInput
                  value={String(editForm.image ?? item.image ?? "")}
                  onChange={(v) =>
                    setEditForm((prev) => ({ ...prev, image: v }))
                  }
                />
              </div>
              <div>
                <Label className="text-white/50 text-xs mb-1 block">
                  {t("colTitle")}
                </Label>
                <Input
                  value={String(editForm.title ?? item.title ?? "")}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="bg-[#1a1a1a] border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <Label className="text-white/50 text-xs mb-1 block">
                  {t("colDescription")}
                </Label>
                <Textarea
                  value={String(editForm.description ?? item.description ?? "")}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="bg-[#1a1a1a] border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <Label className="text-white/50 text-xs mb-1 block">
                  Video URL
                </Label>
                <Input
                  value={String(editForm.videoUrl ?? item.videoUrl ?? "")}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      videoUrl: e.target.value,
                    }))
                  }
                  placeholder="https://youtube.com/..."
                  className="bg-[#1a1a1a] border-white/10 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/50 text-xs mb-1 block">
                    {t("colOrder")}
                  </Label>
                  <Input
                    type="number"
                    value={String(editForm.order ?? item.order ?? 0)}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        order: Number(e.target.value),
                      }))
                    }
                    className="bg-[#1a1a1a] border-white/10 text-white text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="checkbox"
                      id={`edit-is-main-${item.id}`}
                      checked={editForm.isMain ?? item.isMain ?? false}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          isMain: e.target.checked,
                        }))
                      }
                      className="accent-red-600 w-4 h-4"
                    />
                    <Label
                      htmlFor={`edit-is-main-${item.id}`}
                      className="text-white/70 text-xs cursor-pointer"
                    >
                      Main Event
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                  className="border-white/10 text-white/60"
                >
                  <X size={14} />
                </Button>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => handleSave(item.id)}
                  className="bg-green-700 hover:bg-green-600 text-white"
                >
                  {saving ? "…" : <Check size={14} />}
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={item.id}
              className="bg-[#111] border border-white/5 rounded-lg p-3 flex gap-3 items-start"
            >
              <div className="shrink-0 w-20 h-20 rounded overflow-hidden bg-white/5">
                {img(item.image ?? "") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img(item.image ?? "")}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {item.title}
                  </p>
                  {item.isMain && (
                    <span className="px-2 py-0.5 bg-red-700/30 text-red-300 text-xs rounded font-semibold shrink-0">
                      MAIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 line-clamp-2">
                  {item.description}
                </p>
                {item.videoUrl && (
                  <p className="text-xs text-blue-400 mt-1">
                    Video: {item.videoUrl.slice(0, 40)}
                    {item.videoUrl.length > 40 ? "…" : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditForm(item);
                  }}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteTargetId(item.id)}
                  className="p-1.5 rounded bg-white/5 hover:bg-red-900/40 text-white/50 hover:text-red-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ── TABS ───────────────────────────────────────────────────────────────────

const TABS = [
  "Text",
  "Stats",
  "Trainers",
  "Testimonials",
  "Blog",
  "Gallery",
  "Gallery Categories",
  "Achievements",
  "Why Choose Us",
  "Events",
  "Training Zones",
  "Equipments",
  "Membership Plans",
  "Registration",
  "FAQ",
  "Shop Products",
  "Shop Categories",
  "Footer",
] as const;

type Tab = (typeof TABS)[number];

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function AdminContent() {
  const t = useTranslations("admin.content");
  const [tab, setTab] = useState<Tab>("Text");

  const TAB_LABELS: Record<Tab, string> = {
    Text: t("tabText"),
    Stats: t("tabStats"),
    Trainers: t("tabTrainers"),
    Testimonials: t("tabTestimonials"),
    Blog: t("tabBlog"),
    Gallery: t("tabGallery"),
    "Gallery Categories": t("tabGalleryCategories"),
    Achievements: t("tabAchievements"),
    "Why Choose Us": t("tabWhyChooseUs"),
    Events: t("tabEvents"),
    "Training Zones": t("tabTrainingZones"),
    Equipments: "Equipments",
    "Membership Plans": t("tabMembershipPlans"),
    Registration: t("tabRegistration"),
    FAQ: t("tabFaq"),
    "Shop Products": t("tabShopProducts"),
    "Shop Categories": t("tabShopCategories"),
    Footer: t("tabFooter"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{t("title")}</h1>
        <p className="text-white/40 text-sm">{t("subtitle")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === tabKey
                ? "bg-red-700 text-white"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {TAB_LABELS[tabKey]}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div>
        {tab === "Text" && <TextContentPanel />}

        {tab === "Stats" && (
          <CrudPanel
            title={t("titleStatsBar")}
            endpoint="stats"
            cols={[
              { key: "value" as never, label: t("colValue"), type: "text" },
              { key: "label" as never, label: t("colLabel"), type: "text" },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={{ value: "", label: "", order: 0 } as never}
          />
        )}

        {tab === "Trainers" && (
          <CrudPanel
            title={t("titleTrainers")}
            endpoint="trainers"
            cols={[
              { key: "image" as never, label: t("colImage"), type: "image" },
              { key: "name" as never, label: t("colName"), type: "text" },
              { key: "role" as never, label: t("colRole"), type: "text" },
              {
                key: "description" as never,
                label: t("colDescription"),
                type: "textarea",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={
              {
                name: "",
                role: "",
                description: "",
                image: "",
                order: 0,
              } as never
            }
          />
        )}

        {tab === "Testimonials" && (
          <CrudPanel
            title={t("titleTestimonials")}
            endpoint="testimonials"
            cols={[
              { key: "image" as never, label: t("colImage"), type: "image" },
              { key: "name" as never, label: t("colName"), type: "text" },
              { key: "role" as never, label: t("colRole"), type: "text" },
              { key: "rating" as never, label: t("colRating"), type: "number" },
              {
                key: "content" as never,
                label: t("colContent"),
                type: "textarea",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={
              {
                name: "",
                role: "",
                rating: 5,
                content: "",
                image: "",
                order: 0,
              } as never
            }
          />
        )}

        {tab === "Blog" && (
          <CrudPanel
            title={t("titleBlogPosts")}
            endpoint="blog"
            cols={[
              { key: "image" as never, label: t("colImage"), type: "image" },
              { key: "title" as never, label: t("colTitle"), type: "text" },
              {
                key: "excerpt" as never,
                label: t("colExcerpt"),
                type: "richtext",
              },
              {
                key: "content" as never,
                label: t("colFullContent"),
                type: "richtext",
              },
            ]}
            emptyForm={
              { title: "", excerpt: "", content: "", image: "" } as never
            }
          />
        )}

        {tab === "Gallery" && <GalleryImagesPanel />}

        {tab === "Gallery Categories" && (
          <CrudPanel
            title={t("titleGalleryCategories")}
            endpoint="gallery-categories"
            cols={[
              {
                key: "name" as never,
                label: t("colCategoryName"),
                type: "text",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={{ name: "", order: 0 } as never}
          />
        )}

        {tab === "Achievements" && (
          <CrudPanel
            title={t("titleAchievements")}
            endpoint="achievements"
            cols={[
              { key: "image" as never, label: t("colImage"), type: "image" },
              {
                key: "title" as never,
                label: t("colTitleCaption"),
                type: "textarea",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={{ title: "", image: "", order: 0 } as never}
          />
        )}

        {tab === "Why Choose Us" && (
          <CrudPanel
            title={t("titleWhyChooseUs")}
            endpoint="why-features"
            cols={[
              {
                key: "icon" as never,
                label: t("colIconName"),
                type: "text",
              },
              { key: "title" as never, label: t("colTitle"), type: "text" },
              {
                key: "description" as never,
                label: t("colDescription"),
                type: "textarea",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={
              {
                icon: "Dumbbell",
                title: "",
                description: "",
                order: 0,
              } as never
            }
          />
        )}

        {tab === "Events" && <EventHighlightsPanel />}

        {tab === "Training Zones" && (
          <CrudPanel
            title={t("titleTrainingZones")}
            endpoint="training-zones"
            cols={[
              { key: "image" as never, label: t("colImage"), type: "image" },
              { key: "alt" as never, label: t("colAltText"), type: "text" },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={{ image: "", alt: "", order: 0 } as never}
          />
        )}

        {tab === "Equipments" && <EquipmentAdminPanel />}

        {tab === "Membership Plans" && <MembershipPlansPanel />}

        {tab === "Registration" && <RegistrationSettingsPanel />}

        {tab === "Shop Products" && <ShopProductsPanel />}

        {tab === "Shop Categories" && (
          <CrudPanel
            title={t("titleShopCategories")}
            endpoint="product-categories"
            cols={[
              {
                key: "name" as never,
                label: t("colCategoryName"),
                type: "text",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={{ name: "", order: 0 } as never}
          />
        )}

        {tab === "FAQ" && (
          <CrudPanel
            title={t("titleFaq")}
            endpoint="faqs"
            cols={[
              {
                key: "question" as never,
                label: t("colQuestion"),
                type: "textarea",
              },
              {
                key: "answer" as never,
                label: t("colAnswer"),
                type: "textarea",
              },
              { key: "order" as never, label: t("colOrder"), type: "number" },
            ]}
            emptyForm={{ question: "", answer: "", order: 0 } as never}
          />
        )}

        {tab === "Footer" && <FooterPanel />}
      </div>
    </div>
  );
}
