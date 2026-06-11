"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Check,
  Upload,
  ImageIcon,
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = BASE.replace("/api", "");

function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("gym_admin_token") ?? "")
    : "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

interface Booking {
  id: number;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface AdminTrainer {
  id: number;
  name: string;
  role: string;
  image?: string | null;
}

interface AdminEvent {
  id: number;
  title: string;
  description?: string | null;
  image?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  capacity?: number | null;
  isActive: boolean;
  trainerId?: number | null;
  trainer?: AdminTrainer | null;
  createdAt: string;
  _count: { bookings: number };
  bookings: Booking[];
}

const emptyForm = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  capacity: "",
  image: "",
  isActive: true,
  trainerId: "",
};

export function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [uploadingFor, setUploadingFor] = useState<"create" | "edit" | null>(
    null,
  );
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, target: "create" | "edit") => {
    setUploadingFor(target);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${BASE}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (target === "create")
        setCreateForm((f) => ({ ...f, image: data.url }));
      else setForm((f) => ({ ...f, image: data.url }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingFor(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [evRes, trRes] = await Promise.all([
        fetch(`${BASE}/events/admin/list`, { headers: authHeaders() }),
        fetch(`${BASE}/content/trainers`),
      ]);
      const evData = await evRes.json();
      const trData = await trRes.json();
      setEvents(evData.events ?? []);
      setTrainers(
        Array.isArray(trData) ? trData.filter((t: AdminTrainer) => t) : [],
      );
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const handleCreate = async () => {
    if (!createForm.title || !createForm.date) {
      setError("Title and date are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/events/admin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...createForm,
          capacity: createForm.capacity ? Number(createForm.capacity) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("Event created!");
      setShowCreate(false);
      setCreateForm(emptyForm);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ev: AdminEvent) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      date: ev.date.slice(0, 10),
      time: ev.time ?? "",
      location: ev.location ?? "",
      capacity: ev.capacity != null ? String(ev.capacity) : "",
      image: ev.image ?? "",
      isActive: ev.isActive as unknown as boolean,
      trainerId: ev.trainerId != null ? String(ev.trainerId) : "",
    } as typeof emptyForm);
  };

  const handleSaveEdit = async (id: number) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/events/admin/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? Number(form.capacity) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("Event updated!");
      setEditingId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event and all its bookings?")) return;
    setError(null);
    try {
      const res = await fetch(`${BASE}/events/admin/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("Event deleted");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const inputCls =
    "w-full bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-lg px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-purple-500/50";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar size={20} className="text-purple-400" />
          Events ({events.length})
        </h2>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-600/30 hover:bg-purple-600/30 transition-colors"
        >
          <Plus size={13} /> New Event
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-[#111] border border-white/5 rounded-xl p-5 space-y-3">
          <p className="text-white text-sm font-medium">Create New Event</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              placeholder="Title *"
              value={createForm.title}
              onChange={(e) =>
                setCreateForm({ ...createForm, title: e.target.value })
              }
              className={inputCls}
            />
            <input
              type="date"
              value={createForm.date}
              onChange={(e) =>
                setCreateForm({ ...createForm, date: e.target.value })
              }
              className={`${inputCls} date-input-themed`}
            />
            <input
              placeholder="Time (e.g. 10:00 AM)"
              value={createForm.time}
              onChange={(e) =>
                setCreateForm({ ...createForm, time: e.target.value })
              }
              className={inputCls}
            />
            <input
              placeholder="Location"
              value={createForm.location}
              onChange={(e) =>
                setCreateForm({ ...createForm, location: e.target.value })
              }
              className={inputCls}
            />
            <input
              type="number"
              placeholder="Capacity (blank = unlimited)"
              value={createForm.capacity}
              onChange={(e) =>
                setCreateForm({ ...createForm, capacity: e.target.value })
              }
              className={inputCls}
            />
            {/* Image upload */}
            <div className="col-span-2">
              <input
                type="file"
                accept="image/*"
                ref={createFileRef}
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  uploadImage(e.target.files[0], "create")
                }
              />
              <button
                type="button"
                onClick={() => createFileRef.current?.click()}
                disabled={uploadingFor === "create"}
                className={`${inputCls} flex items-center gap-2 cursor-pointer hover:border-purple-500/50 disabled:opacity-50`}
              >
                {uploadingFor === "create" ? (
                  <span className="text-white/40 text-sm">Uploading…</span>
                ) : createForm.image ? (
                  <>
                    <ImageIcon size={13} className="text-green-400 shrink-0" />
                    <span className="text-green-400 text-xs truncate">
                      Image uploaded ✓
                    </span>
                    <span className="ml-auto text-white/30 text-xs">
                      Change
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={13} className="text-white/40 shrink-0" />
                    <span className="text-white/30 text-sm">
                      Upload event thumbnail
                    </span>
                  </>
                )}
              </button>
            </div>
            <select
              value={createForm.trainerId}
              onChange={(e) =>
                setCreateForm({ ...createForm, trainerId: e.target.value })
              }
              className={`${inputCls} col-span-2`}
            >
              <option value="">No trainer assigned</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.role}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Description"
            rows={2}
            value={createForm.description}
            onChange={(e) =>
              setCreateForm({ ...createForm, description: e.target.value })
            }
            className={`${inputCls} resize-none`}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-xs font-semibold btn-gradient disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-white/40 text-xs hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-xl p-10 text-center text-white/30">
          No events yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-[#111] border border-white/5 rounded-xl overflow-hidden"
            >
              {/* Row */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  {editingId === ev.id ? (
                    <div className="space-y-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input
                          value={form.title}
                          onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                          }
                          placeholder="Title"
                          className={inputCls}
                        />
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) =>
                            setForm({ ...form, date: e.target.value })
                          }
                          className={`${inputCls} date-input-themed`}
                        />
                        <input
                          value={form.time}
                          onChange={(e) =>
                            setForm({ ...form, time: e.target.value })
                          }
                          placeholder="Time"
                          className={inputCls}
                        />
                        <input
                          value={form.location}
                          onChange={(e) =>
                            setForm({ ...form, location: e.target.value })
                          }
                          placeholder="Location"
                          className={inputCls}
                        />
                        <input
                          type="number"
                          value={form.capacity}
                          onChange={(e) =>
                            setForm({ ...form, capacity: e.target.value })
                          }
                          placeholder="Capacity"
                          className={inputCls}
                        />
                        {/* Image upload */}
                        <div className="col-span-2">
                          <input
                            type="file"
                            accept="image/*"
                            ref={editFileRef}
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              uploadImage(e.target.files[0], "edit")
                            }
                          />
                          <button
                            type="button"
                            onClick={() => editFileRef.current?.click()}
                            disabled={uploadingFor === "edit"}
                            className={`${inputCls} flex items-center gap-2 cursor-pointer hover:border-purple-500/50 disabled:opacity-50`}
                          >
                            {uploadingFor === "edit" ? (
                              <span className="text-white/40 text-sm">
                                Uploading…
                              </span>
                            ) : form.image ? (
                              <>
                                <ImageIcon
                                  size={13}
                                  className="text-green-400 shrink-0"
                                />
                                <span className="text-green-400 text-xs truncate">
                                  Image uploaded ✓
                                </span>
                                <span className="ml-auto text-white/30 text-xs">
                                  Change
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload
                                  size={13}
                                  className="text-white/40 shrink-0"
                                />
                                <span className="text-white/30 text-sm">
                                  Upload event thumbnail
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                        <select
                          value={form.trainerId}
                          onChange={(e) =>
                            setForm({ ...form, trainerId: e.target.value })
                          }
                          className={`${inputCls} col-span-2`}
                        >
                          <option value="">No trainer assigned</option>
                          {trainers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.role}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={2}
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        placeholder="Description"
                        className={`${inputCls} resize-none`}
                      />
                      <label className="flex items-center gap-2 text-white/60 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isActive as unknown as boolean}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              isActive: e.target.checked as unknown as string,
                            })
                          }
                        />
                        Active (visible on site)
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(ev.id)}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 border border-green-600/20 text-xs disabled:opacity-50"
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white text-xs hover:bg-white/5"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">
                          {ev.title}
                        </span>
                        {!ev.isActive && (
                          <span className="text-xs border px-2 py-0.5 rounded-full bg-white/5 text-white/30 border-white/10">
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-white/40 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(ev.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {ev.time && ` • ${ev.time}`}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {ev.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {ev._count.bookings} booked
                          {ev.capacity != null && ` / ${ev.capacity}`}
                        </span>
                        {ev.trainer && (
                          <span className="flex items-center gap-1 text-purple-400/70">
                            🏋️ {ev.trainer.name}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-white/40 text-xs mt-1 line-clamp-1">
                          {ev.description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {editingId !== ev.id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === ev.id ? null : ev.id)
                      }
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-white border border-white/10 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Users size={12} /> {ev._count.bookings}
                      {expandedId === ev.id ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(ev)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-purple-400 hover:bg-purple-600/10 border border-white/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-600/10 border border-white/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Bookings Drawer */}
              {expandedId === ev.id && (
                <div className="border-t border-white/5 px-5 py-4">
                  <p className="text-white/50 text-xs font-medium mb-3">
                    Bookings ({ev.bookings.length})
                  </p>
                  {ev.bookings.length === 0 ? (
                    <p className="text-white/20 text-xs">No bookings yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {ev.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 text-xs"
                        >
                          <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
                            {b.user.firstName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium">
                              {b.user.firstName} {b.user.lastName}
                            </span>
                            <span className="text-white/30 ml-2">
                              {b.user.email}
                            </span>
                            {b.user.phone && (
                              <span className="text-white/30 ml-2">
                                {b.user.phone}
                              </span>
                            )}
                          </div>
                          <span className="text-white/20 shrink-0">
                            {new Date(b.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
