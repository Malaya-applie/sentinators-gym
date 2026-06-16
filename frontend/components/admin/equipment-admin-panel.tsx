"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Upload, Trash2, Plus } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = BASE.replace("/api", "");

interface EquipmentData {
  id: number;
  title: string;
  subtitle: string;
  images: string[];
  features: string[];
}

const EMPTY_EQUIPMENT: EquipmentData = {
  id: 0,
  title: "EQUIPMENTS OVERVIEW",
  subtitle: "Everything You Need For Serious Training Comfort And Result",
  images: [],
  features: [],
};

function getToken() {
  return localStorage.getItem("gym_admin_token") ?? "";
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function toImageUrl(src: string) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  if (src.startsWith("/uploads/")) return `${UPLOADS_BASE}${src}`;
  return src;
}

export function EquipmentAdminPanel() {
  const [equipment, setEquipment] = useState<EquipmentData>(EMPTY_EQUIPMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const imageSlots = useMemo(() => [0, 1, 2, 3], []);

  useEffect(() => {
    void fetchEquipment();
  }, []);

  async function fetchEquipment() {
    try {
      const res = await fetch(`${BASE}/admin/equipment`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch equipment");
      const data = await res.json();
      setEquipment({
        id: data.id ?? 0,
        title:
          typeof data.title === "string" && data.title.trim()
            ? data.title
            : EMPTY_EQUIPMENT.title,
        subtitle:
          typeof data.subtitle === "string" && data.subtitle.trim()
            ? data.subtitle
            : EMPTY_EQUIPMENT.subtitle,
        images: Array.isArray(data.images) ? data.images : [],
        features: Array.isArray(data.features) ? data.features : [],
      });
    } catch (err) {
      setError("Failed to load equipment data. Please refresh and try again.");
      console.error(err);
    }
  }

  async function saveEquipment(next: EquipmentData, successText: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/admin/equipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: next.title,
          subtitle: next.subtitle,
          images: next.images.slice(0, 4),
          features: next.features.filter((f) => f.trim()),
        }),
      });
      if (!res.ok) throw new Error("Failed to save equipment");
      const data = await res.json();
      const normalized: EquipmentData = {
        id: data.id ?? 0,
        title:
          typeof data.title === "string" && data.title.trim()
            ? data.title
            : EMPTY_EQUIPMENT.title,
        subtitle:
          typeof data.subtitle === "string" && data.subtitle.trim()
            ? data.subtitle
            : EMPTY_EQUIPMENT.subtitle,
        images: Array.isArray(data.images) ? data.images : [],
        features: Array.isArray(data.features) ? data.features : [],
      };
      setEquipment(normalized);
      setSuccess(successText);
      setTimeout(() => setSuccess(""), 2200);
    } catch (err) {
      setError("Save failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(index: number, file: File) {
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);

      const uploadRes = await fetch(`${BASE}/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const uploadData = await uploadRes.json();
      const uploadedUrl =
        (uploadData.url as string | undefined) ||
        (uploadData.path as string | undefined) ||
        "";

      if (!uploadedUrl) throw new Error("Upload response missing url/path");

      const nextImages = [...equipment.images];
      nextImages[index] = uploadedUrl;

      await saveEquipment(
        { ...equipment, images: nextImages.slice(0, 4) },
        "Image uploaded successfully",
      );
    } catch (err) {
      setLoading(false);
      setError("Image upload failed.");
      console.error(err);
    }
  }

  async function handleRemoveImage(index: number) {
    const nextImages = equipment.images.filter((_, i) => i !== index);
    await saveEquipment(
      { ...equipment, images: nextImages },
      "Image removed successfully",
    );
  }

  function updateFeature(index: number, value: string) {
    const nextFeatures = [...equipment.features];
    nextFeatures[index] = value;
    setEquipment((prev) => ({ ...prev, features: nextFeatures }));
  }

  function addFeature() {
    setEquipment((prev) => ({ ...prev, features: [...prev.features, ""] }));
  }

  function removeFeature(index: number) {
    setEquipment((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  async function saveFeaturesOnly() {
    await saveEquipment(equipment, "Features saved successfully");
  }

  return (
    <div className="bg-[#111] rounded-xl border border-white/10 p-5 space-y-6">
      <div>
        <h2 className="text-white text-lg font-semibold">Equipment</h2>
        <p className="text-white/50 text-xs mt-1">
          Manage heading, subheading, images, and feature bullet points.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-white/90 text-sm font-medium">Section Heading</h3>
        <input
          type="text"
          value={equipment.title}
          onChange={(e) =>
            setEquipment((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="EQUIPMENTS OVERVIEW"
          className="w-full rounded border border-white/10 bg-[#1b1b1b] text-white text-sm px-3 py-2 outline-none focus:border-red-600"
        />

        <h3 className="text-white/90 text-sm font-medium">
          Section Subheading
        </h3>
        <textarea
          value={equipment.subtitle}
          onChange={(e) =>
            setEquipment((prev) => ({ ...prev, subtitle: e.target.value }))
          }
          placeholder="Everything You Need For Serious Training Comfort And Result"
          rows={3}
          className="w-full rounded border border-white/10 bg-[#1b1b1b] text-white text-sm px-3 py-2 outline-none focus:border-red-600 resize-y"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 text-green-200 text-sm px-3 py-2">
          {success}
        </div>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-white/90 text-sm font-medium">Images (Max 4)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {imageSlots.map((idx) => {
            const slotSrc = equipment.images[idx] || "";
            return (
              <div
                key={idx}
                className="rounded-lg border border-white/10 bg-white/2 p-3"
              >
                {slotSrc ? (
                  <div className="relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toImageUrl(slotSrc)}
                      alt={`Equipment ${idx + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => void handleRemoveImage(idx)}
                      disabled={loading}
                      className="absolute right-1 top-1 h-8 w-8 rounded-full grid place-items-center bg-red-600 hover:bg-red-700 disabled:opacity-60"
                      aria-label="Remove image"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="h-32 mb-2 rounded bg-white/5 border border-dashed border-white/15 grid place-items-center text-white/40 text-xs">
                    Empty Slot #{idx + 1}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-medium px-3 py-2 cursor-pointer">
                  <Upload size={14} /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(idx, file);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white/90 text-sm font-medium">Feature Points</h3>
          <button
            type="button"
            onClick={addFeature}
            className="inline-flex items-center gap-1 rounded bg-white/10 hover:bg-white/15 text-white text-xs px-2.5 py-1.5"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="space-y-2">
          {equipment.features.map((feature, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(idx, e.target.value)}
                placeholder={`Feature ${idx + 1}`}
                className="flex-1 rounded border border-white/10 bg-[#1b1b1b] text-white text-sm px-3 py-2 outline-none focus:border-red-600"
              />
              <button
                type="button"
                onClick={() => removeFeature(idx)}
                className="rounded bg-red-700 hover:bg-red-600 text-white text-xs px-3"
              >
                Remove
              </button>
            </div>
          ))}

          {equipment.features.length === 0 ? (
            <p className="text-white/40 text-xs">
              No points yet. Click Add to create your first feature point.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void saveFeaturesOnly()}
          disabled={loading}
          className="w-full rounded bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium py-2.5"
        >
          {loading ? "Saving..." : "Save Equipment Content"}
        </button>
      </div>
    </div>
  );
}
