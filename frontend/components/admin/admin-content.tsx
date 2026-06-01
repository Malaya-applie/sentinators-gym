"use client";

import { useEffect, useState, useRef } from "react";
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

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("image", file);
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
};

function isImageKey(key: string) {
  return (
    key.toLowerCase().includes("image") || key.toLowerCase().includes("_img")
  );
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
    const url = await uploadImage(file);
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
          "min-h-[160px] p-3 text-white text-sm outline-none leading-relaxed break-words",
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
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-[#111] border border-white/10 max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-red-900/40">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <AlertDialogTitle className="text-white text-base">
              {title ?? "Delete this item?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/50 text-sm pl-[52px]">
            {description ?? "This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-white/10 text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-red-700 hover:bg-red-600 text-white"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── TEXT CONTENT ───────────────────────────────────────────────────────────

type TextRow = { id: number; key: string; value: string; section: string };

function TextContentPanel() {
  const [rows, setRows] = useState<TextRow[]>([]);
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => {
    apiFetch("/admin/content/text")
      .then(setRows)
      .catch(() => {});
  }, []);

  async function save(row: TextRow) {
    await apiFetch(`/admin/content/text/${row.key}`, {
      method: "PUT",
      body: JSON.stringify({ value: editing[row.id] ?? row.value }),
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, value: editing[row.id] ?? r.value } : r,
      ),
    );
    setSaved((prev) => ({ ...prev, [row.id]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [row.id]: false })), 1500);
  }

  const sections = [...new Set(rows.map((r) => r.section))].sort();

  return (
    <div>
      <SectionHeader title="Text & Headings" />
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
                  {isImageKey(row.key) ? (
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
                          onClick={() => save(row)}
                          className={
                            saved[row.id]
                              ? "bg-green-700 text-white"
                              : "bg-red-700 hover:bg-red-600 text-white"
                          }
                        >
                          {saved[row.id] ? <Check size={14} /> : "Save"}
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
                              Reset to default
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
                        onClick={() => save(row)}
                        className={
                          saved[row.id]
                            ? "bg-green-700 text-white"
                            : "bg-red-700 hover:bg-red-600 text-white"
                        }
                      >
                        {saved[row.id] ? <Check size={14} /> : "Save"}
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
  type?: "text" | "textarea" | "richtext" | "image" | "number";
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
    return (
      <Input
        type={col.type === "number" ? "number" : "text"}
        min={col.type === "number" ? 0 : undefined}
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
          <p className="text-white/50 text-xs mb-2">New item</p>
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
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleAdd}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              {saving ? "Saving…" : "Create"}
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
  monthlyPrice: number | null;
  quarterlyPrice: number | null;
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
  monthlyPrice: null,
  quarterlyPrice: null,
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
  const durationOptions = Array.from({ length: 36 }, (_, i) => {
    const months = i + 1;
    return `${months} ${months === 1 ? "Month" : "Months"}`;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Name</Label>
          <Input
            value={String(form.name ?? "")}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Annual Membership"
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Duration</Label>
          <select
            value={String(form.duration ?? "")}
            onChange={(e) => onChange("duration", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-md px-3 py-2"
          >
            <option value="" disabled>
              Select duration
            </option>
            {durationOptions.map((duration) => (
              <option key={duration} value={duration}>
                {duration}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Price (number)
          </Label>
          <Input
            type="number"
            min={0}
            value={String(form.price ?? "")}
            onChange={(e) =>
              onChange("price", Math.max(0, Number(e.target.value)))
            }
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Currency</Label>
          <Input
            value={String(form.currency ?? "CHF")}
            onChange={(e) => onChange("currency", e.target.value)}
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Monthly Price{" "}
            <span className="text-white/30 font-normal">(optional)</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={
              form.monthlyPrice != null && form.monthlyPrice > 0
                ? String(form.monthlyPrice)
                : ""
            }
            onChange={(e) =>
              onChange(
                "monthlyPrice",
                e.target.value === ""
                  ? null
                  : Math.max(0, Number(e.target.value)),
              )
            }
            placeholder="e.g. 70"
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
          <p className="text-white/25 text-[10px] mt-0.5">
            Per month if paying monthly. Leave blank to auto-calculate.
          </p>
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Quarterly Price{" "}
            <span className="text-white/30 font-normal">(optional)</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={
              form.quarterlyPrice != null && form.quarterlyPrice > 0
                ? String(form.quarterlyPrice)
                : ""
            }
            onChange={(e) =>
              onChange(
                "quarterlyPrice",
                e.target.value === ""
                  ? null
                  : Math.max(0, Number(e.target.value)),
              )
            }
            placeholder="e.g. 105"
            className="bg-[#1a1a1a] border-white/10 text-white text-sm"
          />
          <p className="text-white/25 text-[10px] mt-0.5">
            Per quarter if paying quarterly. Leave blank to auto-calculate.
          </p>
        </div>
      </div>
      <div>
        <Label className="text-white/50 text-xs mb-1 block">Category</Label>
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
          Features (comma-separated)
        </Label>
        <Textarea
          value={String(form.features ?? "")}
          onChange={(e) => onChange("features", e.target.value)}
          placeholder="Full gym access, Modern equipment, Locker room"
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
          Active (visible on the frontend)
        </Label>
      </div>
    </div>
  );
}

function MembershipPlansPanel() {
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
        title="Delete this plan?"
        description="This plan will be permanently removed. Plans with existing purchases cannot be deleted — deactivate them instead."
        onConfirm={() =>
          deleteTargetId !== null && handleDelete(deleteTargetId)
        }
        onCancel={() => setDeleteTargetId(null)}
      />
      <AlertDialog open={deleteError !== null}>
        <AlertDialogContent className="bg-[#111] border border-white/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base">
              Cannot Delete
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
              OK
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category delete confirm */}
      <DeleteConfirmDialog
        open={catDeleteTargetId !== null}
        title="Delete this category?"
        description="The category will be removed. You must first reassign or remove all plans in this category."
        onConfirm={() =>
          catDeleteTargetId !== null && handleCatDelete(catDeleteTargetId)
        }
        onCancel={() => setCatDeleteTargetId(null)}
      />
      <AlertDialog open={catDeleteError !== null}>
        <AlertDialogContent className="bg-[#111] border border-white/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base">
              Cannot Delete
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
              OK
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Plan Categories management ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <h3 className="text-white font-bold text-lg">Plan Categories</h3>
          <Button
            size="sm"
            onClick={() => setShowCatPanel((v) => !v)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            {showCatPanel ? "Close" : "Manage Categories"}
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
                      placeholder="Category label"
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
                placeholder="New category name, e.g. Premium"
                className="bg-[#1a1a1a] border-white/10 text-white text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCatAdd()}
              />
              <Button
                size="sm"
                disabled={catSaving || !catAddForm.label.trim()}
                onClick={handleCatAdd}
                className="bg-red-700 hover:bg-red-600 text-white shrink-0"
              >
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Plans ── */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
        <SectionHeader title="Membership Plans" />
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="bg-red-700 hover:bg-red-600 text-white"
        >
          <Plus size={14} className="mr-1" /> Add Plan
        </Button>
      </div>

      {showAdd && (
        <div className="bg-[#111] border border-white/10 rounded-lg p-4 mb-6 space-y-3">
          <p className="text-white/50 text-xs mb-2">New plan</p>
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
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleAdd}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              {saving ? "Saving…" : "Create"}
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
            <p className="text-white/20 text-sm italic ml-2">No plans yet</p>
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
  footer_address: "Lorem Ipsum St, 25/99034,",
  footer_phone: "+990 000 0000",
  footer_email: "info@fitness.com",
  footer_copyright: "© 2026 Fitness. All rights reserved.",
};

type FooterData = typeof FOOTER_DEFAULTS;

function FooterPanel() {
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
      <SectionHeader title="Footer" />

      {/* About / Description */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-4 space-y-3">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
          [About]
        </p>
        {field("footer_description", "Description", "textarea")}
        <div className="grid grid-cols-2 gap-3">
          {field("footer_facebook_url", "Facebook URL")}
          {field("footer_instagram_url", "Instagram URL")}
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

      {/* Contact */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-4 space-y-3">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
          [Contact]
        </p>
        {field("footer_address", "Address")}
        {field("footer_phone", "Phone")}
        {field("footer_email", "Email")}
      </div>

      {/* Copyright */}
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-6">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-2">
          [Copyright]
        </p>
        {field("footer_copyright", "Copyright Text")}
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
            "Saving…"
          ) : saved ? (
            <>
              <Check size={14} className="mr-1" /> Saved
            </>
          ) : (
            "Save All"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── REGISTRATION SETTINGS PANEL ───────────────────────────────────────────

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

function RegistrationSettingsPanel() {
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
      <SectionHeader title="Registration Form Settings" />
      <div className="bg-[#111] border border-white/5 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {field("registration_fee", "Fixed Registration Fee", "number")}
          {field("registration_currency", "Currency")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field(
            "discount_amount",
            "Discount Amount (set 0 to disable)",
            "number",
          )}
          {field("discount_label", "Discount Label")}
        </div>
        {field("agreement_text", "Agreement Text", "textarea")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field("agreement_checkbox_1", "Agreement Checkbox 1")}
          {field("agreement_checkbox_2", "Agreement Checkbox 2")}
        </div>
        {field("terms_text", "Terms & Conditions Text", "textarea")}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field("terms_checkbox_1", "Terms Checkbox 1")}
          {field("terms_checkbox_2", "Terms Checkbox 2")}
        </div>
        {field("terms_final_checkbox", "Signature Confirmation")}
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
              "Saving..."
            ) : saved ? (
              <>
                <Check size={14} className="mr-1" /> Saved
              </>
            ) : (
              "Save Registration Settings"
            )}
          </Button>
        </div>
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
  "Achievements",
  "Why Choose Us",
  "Events",
  "Training Zones",
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
  const [tab, setTab] = useState<Tab>("Text");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Website Content</h1>
        <p className="text-white/40 text-sm">
          Edit everything that appears on your website.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t
                ? "bg-red-700 text-white"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div>
        {tab === "Text" && <TextContentPanel />}

        {tab === "Stats" && (
          <CrudPanel
            title="Stats Bar"
            endpoint="stats"
            cols={[
              { key: "value" as never, label: "Value", type: "text" },
              { key: "label" as never, label: "Label", type: "text" },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={{ value: "", label: "", order: 0 } as never}
          />
        )}

        {tab === "Trainers" && (
          <CrudPanel
            title="Trainers"
            endpoint="trainers"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              { key: "name" as never, label: "Name", type: "text" },
              { key: "role" as never, label: "Role", type: "text" },
              {
                key: "description" as never,
                label: "Description",
                type: "textarea",
              },
              { key: "order" as never, label: "Order", type: "number" },
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
            title="Testimonials"
            endpoint="testimonials"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              { key: "name" as never, label: "Name", type: "text" },
              { key: "role" as never, label: "Role", type: "text" },
              { key: "rating" as never, label: "Rating (1-5)", type: "number" },
              { key: "content" as never, label: "Content", type: "textarea" },
              { key: "order" as never, label: "Order", type: "number" },
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
            title="Blog Posts"
            endpoint="blog"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              { key: "title" as never, label: "Title", type: "text" },
              { key: "excerpt" as never, label: "Excerpt", type: "richtext" },
              {
                key: "content" as never,
                label: "Full Content",
                type: "richtext",
              },
            ]}
            emptyForm={
              { title: "", excerpt: "", content: "", image: "" } as never
            }
          />
        )}

        {tab === "Gallery" && (
          <CrudPanel
            title="Gallery Images"
            endpoint="gallery"
            cols={[
              { key: "src" as never, label: "Image", type: "image" },
              { key: "alt" as never, label: "Alt Text", type: "text" },
              { key: "category" as never, label: "Category", type: "text" },
              {
                key: "gridCol" as never,
                label: "Grid Column (CSS)",
                type: "text",
              },
              {
                key: "gridRow" as never,
                label: "Grid Row (CSS)",
                type: "text",
              },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={
              {
                src: "",
                alt: "",
                category: "All",
                gridCol: "",
                gridRow: "",
                order: 0,
              } as never
            }
          />
        )}

        {tab === "Achievements" && (
          <CrudPanel
            title="Achievements & Certifications"
            endpoint="achievements"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              {
                key: "title" as never,
                label: "Title / Caption",
                type: "textarea",
              },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={{ title: "", image: "", order: 0 } as never}
          />
        )}

        {tab === "Why Choose Us" && (
          <CrudPanel
            title="Why Choose Us Features"
            endpoint="why-features"
            cols={[
              {
                key: "icon" as never,
                label: "Icon Name (lucide)",
                type: "text",
              },
              { key: "title" as never, label: "Title", type: "text" },
              {
                key: "description" as never,
                label: "Description",
                type: "textarea",
              },
              { key: "order" as never, label: "Order", type: "number" },
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

        {tab === "Events" && (
          <CrudPanel
            title="Event Highlights"
            endpoint="event-highlights"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              { key: "title" as never, label: "Title", type: "text" },
              {
                key: "description" as never,
                label: "Description",
                type: "textarea",
              },
              {
                key: "videoUrl" as never,
                label: "Video Embed URL",
                type: "text",
              },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={
              {
                title: "",
                description: "",
                image: "",
                videoUrl: "",
                order: 0,
              } as never
            }
          />
        )}

        {tab === "Training Zones" && (
          <CrudPanel
            title="Training Zone Images"
            endpoint="training-zones"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              { key: "alt" as never, label: "Alt Text", type: "text" },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={{ image: "", alt: "", order: 0 } as never}
          />
        )}

        {tab === "Membership Plans" && <MembershipPlansPanel />}

        {tab === "Registration" && <RegistrationSettingsPanel />}

        {tab === "Shop Products" && (
          <CrudPanel
            title="Shop Products"
            endpoint="products"
            cols={[
              { key: "image" as never, label: "Image", type: "image" },
              { key: "name" as never, label: "Name", type: "text" },
              { key: "price" as never, label: "Price (CHF)", type: "number" },
              { key: "currency" as never, label: "Currency", type: "text" },
              { key: "category" as never, label: "Category", type: "text" },
              {
                key: "features" as never,
                label: "Features (comma-separated)",
                type: "textarea",
              },
              { key: "stock" as never, label: "Stock", type: "number" },
            ]}
            emptyForm={
              {
                name: "",
                price: 0,
                currency: "CHF",
                image: "",
                category: "General",
                features: "",
                stock: 100,
              } as never
            }
          />
        )}

        {tab === "Shop Categories" && (
          <CrudPanel
            title="Shop Category Tabs"
            endpoint="product-categories"
            cols={[
              { key: "name" as never, label: "Category Name", type: "text" },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={{ name: "", order: 0 } as never}
          />
        )}

        {tab === "FAQ" && (
          <CrudPanel
            title="FAQ Items"
            endpoint="faqs"
            cols={[
              {
                key: "question" as never,
                label: "Question",
                type: "textarea",
              },
              {
                key: "answer" as never,
                label: "Answer",
                type: "textarea",
              },
              { key: "order" as never, label: "Order", type: "number" },
            ]}
            emptyForm={{ question: "", answer: "", order: 0 } as never}
          />
        )}

        {tab === "Footer" && <FooterPanel />}
      </div>
    </div>
  );
}
