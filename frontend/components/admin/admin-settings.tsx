"use client";

import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("gym_admin_token") ?? "")
    : "";
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

export function AdminSettings() {
  const [quarterlyFeePercent, setQuarterlyFeePercent] = useState<number>(5);
  const [monthlyFeePercent, setMonthlyFeePercent] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Example plan price for live preview
  const examplePrice = 890;

  const yearlyTotal = examplePrice;
  const quarterlyPerPeriod =
    Math.round(((examplePrice * (1 + quarterlyFeePercent / 100)) / 4) * 100) /
    100;
  const quarterlyTotal =
    Math.round(examplePrice * (1 + quarterlyFeePercent / 100) * 100) / 100;
  const monthlyPerPeriod =
    Math.round(((examplePrice * (1 + monthlyFeePercent / 100)) / 12) * 100) /
    100;
  const monthlyTotal =
    Math.round(examplePrice * (1 + monthlyFeePercent / 100) * 100) / 100;

  useEffect(() => {
    fetch(`${BASE}/admin/settings`, {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((data) => {
        setQuarterlyFeePercent(data.quarterlyFeePercent ?? 5);
        setMonthlyFeePercent(data.monthlyFeePercent ?? 10);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/admin/settings`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ quarterlyFeePercent, monthlyFeePercent }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ msg: "Settings saved successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {toast && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-900/80 border border-green-500 text-green-300"
              : "bg-red-900/80 border border-red-500 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-600/15 border border-purple-600/20">
          <Settings size={18} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-base">
            Instalment Fee Settings
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Surcharge applied when members choose quarterly or monthly payment
          </p>
        </div>
      </div>

      {/* Settings inputs */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-6 space-y-5">
        <div>
          <label className="text-white/60 text-xs font-medium block mb-1.5">
            Quarterly Payment Surcharge (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={quarterlyFeePercent}
              onChange={(e) =>
                setQuarterlyFeePercent(
                  Math.max(0, parseFloat(e.target.value) || 0),
                )
              }
              className="w-32 bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-500"
            />
            <span className="text-white/40 text-sm">
              % added to yearly price for quarterly billing
            </span>
          </div>
        </div>

        <div>
          <label className="text-white/60 text-xs font-medium block mb-1.5">
            Monthly Payment Surcharge (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={monthlyFeePercent}
              onChange={(e) =>
                setMonthlyFeePercent(
                  Math.max(0, parseFloat(e.target.value) || 0),
                )
              }
              className="w-32 bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-500"
            />
            <span className="text-white/40 text-sm">
              % added to yearly price for monthly billing
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          <Save size={15} />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* Live preview */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-6">
        <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">
          Live Preview — Example Plan: CHF {examplePrice}/year
        </h3>
        <div className="space-y-3">
          {/* Yearly */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">Yearly (Upfront)</p>
              <p className="text-white/40 text-xs">No surcharge</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">CHF {yearlyTotal}</p>
              <p className="text-white/40 text-xs">full amount</p>
            </div>
          </div>
          {/* Quarterly */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">Quarterly</p>
              <p className="text-white/40 text-xs">
                {examplePrice} × {(1 + quarterlyFeePercent / 100).toFixed(2)} ÷
                4 = CHF {quarterlyPerPeriod}/qtr
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">
                CHF {quarterlyPerPeriod}
                <span className="text-white/50 font-normal text-xs">/qtr</span>
              </p>
              <p className="text-white/40 text-xs">
                total: CHF {quarterlyTotal} (+{quarterlyFeePercent}%)
              </p>
            </div>
          </div>
          {/* Monthly */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">Monthly</p>
              <p className="text-white/40 text-xs">
                {examplePrice} × {(1 + monthlyFeePercent / 100).toFixed(2)} ÷ 12
                = CHF {monthlyPerPeriod}/mo
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">
                CHF {monthlyPerPeriod}
                <span className="text-white/50 font-normal text-xs">/mo</span>
              </p>
              <p className="text-white/40 text-xs">
                total: CHF {monthlyTotal} (+{monthlyFeePercent}%)
              </p>
            </div>
          </div>
        </div>

        <p className="text-white/25 text-xs mt-4">
          These surcharges apply to the base plan price only. Registration fees
          and add-on plans are not affected.
        </p>
      </div>
    </div>
  );
}
