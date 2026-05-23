"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminMemberships,
  updateMembershipStatus,
} from "@/store/slices/adminSlice";
import {
  CreditCard,
  Check,
  X,
  Filter,
  Search,
  ChevronDown,
} from "lucide-react";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;
const FREQUENCY_FILTERS = ["ALL", "MONTHLY", "QUARTERLY", "ANNUALLY"] as const;

// Converts a duration string like "6 months" / "1 year" to months.
function parseDurationToMonths(duration: string): number {
  if (!duration) return 0;
  const match = duration
    .toLowerCase()
    .trim()
    .match(/^(\d+)\s*(month|year|day|week)/);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const unit = match[2];
  if (unit === "month") return num;
  if (unit === "year") return num * 12;
  if (unit === "week") return Math.round((num * 7) / 30.44);
  if (unit === "day") return Math.round(num / 30.44);
  return 0;
}

function getAdminPerPeriodInfo(
  totalAmount: number | undefined,
  registrationFee: number | undefined,
  totalMonths: number,
  paymentFrequency: string | undefined,
): { perPeriod: number; label: string; unit: string } | null {
  if (!totalMonths || totalMonths <= 0 || !paymentFrequency) return null;
  const membershipCost = Math.max(
    0,
    (totalAmount ?? 0) - (registrationFee ?? 0),
  );
  const monthly = membershipCost / totalMonths;
  const freq = paymentFrequency.toUpperCase();
  if (freq === "MONTHLY")
    return { perPeriod: monthly, label: "Monthly", unit: "/mo" };
  if (freq === "QUARTERLY")
    return { perPeriod: monthly * 3, label: "Quarterly", unit: "/qtr" };
  if (freq === "YEARLY" || freq === "ANNUALLY")
    return { perPeriod: monthly * 12, label: "Yearly", unit: "/yr" };
  return null;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "APPROVED":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "REJECTED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-white/5 text-white/40 border-white/10";
  }
};

export function AdminMemberships() {
  const dispatch = useAppDispatch();
  const { memberships, loading, actionLoading } = useAppSelector(
    (s) => s.admin,
  );
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<
    "ALL" | "MONTHLY" | "QUARTERLY" | "ANNUALLY"
  >("ALL");
  const [planSearch, setPlanSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    dispatch(fetchAdminMemberships(filter === "ALL" ? undefined : filter));
  }, [dispatch, filter]);

  const planOptions = useMemo(() => {
    const seen = new Set<string>();
    return memberships
      .map((m) => m.plan.name)
      .filter((name) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort();
  }, [memberships]);

  const filtered = useMemo(() => {
    return memberships.filter((m) => {
      if (
        frequencyFilter !== "ALL" &&
        m.paymentFrequency?.toUpperCase() !== frequencyFilter
      )
        return false;
      if (planSearch && m.plan.name !== planSearch) return false;
      if (userSearch.trim()) {
        const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
        const email = m.user.email.toLowerCase();
        const q = userSearch.trim().toLowerCase();
        if (!fullName.includes(q) && !email.includes(q)) return false;
      }
      if (startDateFrom && m.startDate) {
        if (new Date(m.startDate) < new Date(startDateFrom)) return false;
      }
      if (startDateTo && m.startDate) {
        if (new Date(m.startDate) > new Date(startDateTo)) return false;
      }
      return true;
    });
  }, [
    memberships,
    frequencyFilter,
    planSearch,
    userSearch,
    startDateFrom,
    startDateTo,
  ]);

  const handleAction = (id: number, status: "APPROVED" | "REJECTED") => {
    dispatch(
      updateMembershipStatus({ id, status, notes: notesMap[id] || undefined }),
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard size={20} className="text-green-400" />
          Membership Purchases
          <span className="text-sm font-normal text-white/40">
            ({filtered.length})
          </span>
        </h2>
      </div>

      {/* Filter panel */}
      <div className="bg-[#0e0e0e] border border-white/8 rounded-2xl overflow-hidden">
        {/* Filter header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-widest">
            <Filter size={12} />
            Filters
          </div>
          {(filter !== "ALL" ||
            frequencyFilter !== "ALL" ||
            planSearch ||
            userSearch ||
            startDateFrom ||
            startDateTo) && (
            <button
              onClick={() => {
                setFilter("ALL");
                setFrequencyFilter("ALL");
                setPlanSearch("");
                setUserSearch("");
                setStartDateFrom("");
                setStartDateTo("");
              }}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <X size={11} /> Clear all
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Row 1: Status + Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Status */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                Status
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                      filter === f
                        ? f === "APPROVED"
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : f === "REJECTED"
                            ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : f === "PENDING"
                              ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                              : "bg-white/10 text-white border-white/20"
                        : "bg-transparent text-white/35 border-white/8 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                Payment Frequency
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {FREQUENCY_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequencyFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                      frequencyFilter === f
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "bg-transparent text-white/35 border-white/8 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {f === "ALL"
                      ? "All"
                      : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Row 2: Search + Plan + Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User search */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                Member
              </label>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#161616] border border-white/8 text-white text-xs rounded-xl pl-8 pr-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>
            </div>

            {/* Plan dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                Plan
              </label>
              <div className="relative">
                <select
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="w-full appearance-none bg-[#161616] border border-white/8 text-white text-xs rounded-xl px-3 pr-8 py-2 focus:outline-none focus:border-white/25 transition-colors scheme-dark"
                >
                  <option value="">All plans</option>
                  {planOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
                />
              </div>
            </div>

            {/* Start date from */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                Start date from
              </label>
              <input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="w-full bg-[#161616] border border-white/8 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-white/25 transition-colors scheme-dark"
              />
            </div>

            {/* Start date to */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                Start date to
              </label>
              <input
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="w-full bg-[#161616] border border-white/8 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-white/25 transition-colors scheme-dark"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-xl p-10 text-center text-white/30">
          No membership records found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-[#111] border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">
                    {m.user.firstName} {m.user.lastName}
                  </span>
                  <span className="text-white/30 text-xs">{m.user.email}</span>
                  <span
                    className={`text-xs border px-2 py-0.5 rounded-full ${statusBadge(m.status)}`}
                  >
                    {m.status}
                  </span>
                  {m.registrationDetails?.contractNumber != null && (
                    <span className="text-xs border border-blue-500/20 bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                      {String(m.registrationDetails.contractNumber)}
                    </span>
                  )}
                  {m.registrationDetails?.customerNumber != null && (
                    <span className="text-xs border border-purple-500/20 bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                      {String(m.registrationDetails.customerNumber)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60">
                  Plan: <span className="text-white">{m.plan.name}</span> —{" "}
                  {m.plan.duration} — {m.plan.currency} {m.plan.price}
                </p>
                {m.additionalPlans && m.additionalPlans.length > 0 && (
                  <div className="text-sm text-white/60">
                    <span className="text-white/80 font-medium">Add-ons: </span>
                    {m.additionalPlans.map((ap, i) => (
                      <span key={ap.id}>
                        <span className="text-white/80">
                          {ap.name || ap.duration}
                        </span>
                        <span className="text-white/40">
                          {" "}
                          ({ap.currency} {ap.price})
                        </span>
                        {i < m.additionalPlans!.length - 1 && (
                          <span className="text-white/30">, </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {/* Combined duration + per-period billing breakdown */}
                {(() => {
                  const totalMonths =
                    parseDurationToMonths(m.plan.duration) +
                    (m.additionalPlans ?? []).reduce(
                      (sum, ap) => sum + parseDurationToMonths(ap.duration),
                      0,
                    );
                  const periodInfo = getAdminPerPeriodInfo(
                    m.totalAmount,
                    m.registrationFee,
                    totalMonths,
                    m.paymentFrequency,
                  );
                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {totalMonths > 0 && (
                        <span className="text-xs border border-white/10 bg-white/5 text-white/50 px-2 py-0.5 rounded-full">
                          {totalMonths} month{totalMonths !== 1 ? "s" : ""}{" "}
                          total
                        </span>
                      )}
                      {m.paymentFrequency && (
                        <span className="text-xs border border-blue-500/20 bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                          {periodInfo
                            ? periodInfo.label
                            : m.paymentFrequency.toUpperCase() === "UPFRONT"
                              ? "Yearly"
                              : m.paymentFrequency.charAt(0) +
                                m.paymentFrequency.slice(1).toLowerCase()}
                        </span>
                      )}
                      {periodInfo && (
                        <span className="text-xs border border-purple-500/20 bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                          {m.plan.currency}{" "}
                          {periodInfo.perPeriod.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                          <span className="font-normal opacity-70 ml-0.5">
                            {periodInfo.unit}
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })()}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/45">
                  <span>
                    Registration fee: {m.plan.currency}{" "}
                    {(m.registrationFee ?? 0).toFixed(2)}
                  </span>
                  <span>
                    Total (full duration): {m.plan.currency}{" "}
                    {(m.totalAmount ?? m.plan.price).toFixed(2)}
                  </span>
                  {m.paymentFrequency && (
                    <span>
                      Billing frequency:{" "}
                      <span className="text-white/70 font-medium capitalize">
                        {m.paymentFrequency.toUpperCase() === "UPFRONT"
                          ? "Yearly"
                          : m.paymentFrequency.charAt(0) +
                            m.paymentFrequency.slice(1).toLowerCase()}
                      </span>
                    </span>
                  )}
                  {m.startDate && (
                    <span>
                      Start date: {new Date(m.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {m.endDate && (
                    <span>
                      End date:{" "}
                      <span
                        className={`font-medium ${new Date(m.endDate) < new Date() ? "text-red-400" : "text-green-400"}`}
                      >
                        {new Date(m.endDate).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                  {m.emergencyContact && (
                    <span>Emergency: {m.emergencyContact}</span>
                  )}
                  {m.address && (
                    <span className="md:col-span-2">Address: {m.address}</span>
                  )}
                  <span>
                    Agreement: {m.acceptedAgreement ? "Accepted" : "Pending"}
                  </span>
                  <span>Terms: {m.acceptedTerms ? "Accepted" : "Pending"}</span>
                  <span>
                    Signature: {m.signatureDataUrl ? "Captured" : "Missing"}
                  </span>
                  {m.registrationDetails?.contractNumber != null && (
                    <span>
                      Contract No:{" "}
                      <span className="text-white/70 font-mono">
                        {String(m.registrationDetails.contractNumber)}
                      </span>
                    </span>
                  )}
                  {m.registrationDetails?.customerNumber != null && (
                    <span>
                      Customer No:{" "}
                      <span className="text-white/70 font-mono">
                        {String(m.registrationDetails.customerNumber)}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/30">
                  Requested: {new Date(m.createdAt).toLocaleString()}
                </p>
                {m.notes && (
                  <p className="text-xs text-white/40 italic">
                    Note: {m.notes}
                  </p>
                )}
              </div>

              {/* Actions (only for PENDING) */}
              {m.status === "PENDING" && (
                <div className="flex flex-col gap-2 min-w-50">
                  <input
                    type="text"
                    placeholder="Optional admin note..."
                    value={notesMap[m.id] || ""}
                    onChange={(e) =>
                      setNotesMap({ ...notesMap, [m.id]: e.target.value })
                    }
                    className="bg-[#1a1a1a] border border-white/10 text-white text-xs rounded px-3 py-1.5 placeholder:text-white/20 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(m.id, "APPROVED")}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/20 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(m.id, "REJECTED")}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/20 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
