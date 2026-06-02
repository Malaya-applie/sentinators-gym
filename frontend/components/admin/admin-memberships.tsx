"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminMemberships,
  updateMembershipStatus,
  renewMembership,
  AdminMembership,
} from "@/store/slices/adminSlice";
import {
  CreditCard,
  Check,
  X,
  Filter,
  Search,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Clock,
  Eraser,
  ArrowLeft,
  FileText,
  Download,
} from "lucide-react";
import axios from "axios";
import { useTranslations } from "next-intl";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function adminApi() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("gym_admin_token")
      : null;
  return axios.create({
    baseURL: BASE,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;
const FREQUENCY_FILTERS = ["ALL", "MONTHLY", "QUARTERLY", "ANNUALLY"] as const;
const EXPIRY_FILTERS = ["ALL", "EXPIRING_THIS_MONTH", "EXPIRED"] as const;

type ExpiryFilter = (typeof EXPIRY_FILTERS)[number];

interface MembershipPlan {
  id: number;
  name: string;
  duration: string;
  price: number;
  monthlyPrice?: number | null;
  quarterlyPrice?: number | null;
  currency: string;
  features: string[];
  category: string;
}

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

function getExpiryStatus(endDate?: string): "active" | "expiring" | "expired" {
  if (!endDate) return "active";
  const end = new Date(endDate);
  const now = new Date();
  if (end < now) return "expired";
  const nextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  if (end <= nextMonth) return "expiring";
  return "active";
}

// ─── Renew Modal helpers (same as stepper) ───────────────
function money(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function planTitle(plan: MembershipPlan) {
  return plan.name || plan.duration;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-sm">
      <span className="text-gray-600 shrink-0 font-medium">{label}:</span>
      <span className="font-semibold text-gray-900 break-all">{value}</span>
    </div>
  );
}

// ─── Renew Modal ───────────────────────────────────────
function RenewModal({
  membership,
  onClose,
  onRenewed,
}: {
  membership: AdminMembership;
  onClose: () => void;
  onRenewed: () => void;
}) {
  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((s) => s.admin);

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [planCategories, setPlanCategories] = useState<
    { id: number; name: string; label: string; order: number }[]
  >([]);
  const [activePlanCategory, setActivePlanCategory] = useState("MEMBERSHIP");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [additionalPlanIds, setAdditionalPlanIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [frequency, setFrequency] = useState<
    "MONTHLY" | "QUARTERLY" | "YEARLY" | "UPFRONT"
  >("UPFRONT");
  const [notes, setNotes] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState("");
  const [quarterlyFeePercent, setQuarterlyFeePercent] = useState<number>(5);
  const [monthlyFeePercent, setMonthlyFeePercent] = useState<number>(10);

  // Contract step state
  const [modalStep, setModalStep] = useState<"plan" | "contract">("plan");
  const [endDate, setEndDate] = useState("");
  const [contractNumber] = useState(
    () => `CNT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
  );
  const [customerNumber] = useState(
    () => `MBR-${Math.floor(Math.random() * 90000 + 10000)}`,
  );

  // Contract signature canvas (dark ink on white — matches web contract page)
  const contractCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contractDrawingRef = useRef(false);
  const contractLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const contractCurrentPointRef = useRef<{ x: number; y: number } | null>(null);
  const [contractSig, setContractSig] = useState("");
  const [canvasHasContent, setCanvasHasContent] = useState(false);

  function getContractSigDataUrl() {
    const canvas = contractCanvasRef.current;
    if (!canvas) return "";
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < imageData.length; i += 4) {
      if (imageData[i] !== 0) return canvas.toDataURL("image/png");
    }
    return "";
  }

  function contractPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = contractCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function beginContractDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const { x, y } = contractPoint(e);
    contractDrawingRef.current = true;
    contractLastPointRef.current = { x, y };
    contractCurrentPointRef.current = { x, y };
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  }

  function drawContractSig(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!contractDrawingRef.current) return;
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const lastPoint = contractLastPointRef.current;
    if (!ctx || !canvas || !lastPoint) return;
    const { x, y } = contractPoint(e);
    const midPoint = { x: (lastPoint.x + x) / 2, y: (lastPoint.y + y) / 2 };
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midPoint.x, midPoint.y);
    contractLastPointRef.current = { x, y };
    contractCurrentPointRef.current = { x, y };
  }

  function endContractDraw(pointerId?: number) {
    if (!contractDrawingRef.current) return;
    contractDrawingRef.current = false;
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const currentPoint = contractCurrentPointRef.current;
    if (ctx && currentPoint) {
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
    }
    if (canvas && pointerId != null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    contractLastPointRef.current = null;
    contractCurrentPointRef.current = null;
    if (getContractSigDataUrl()) setCanvasHasContent(true);
  }

  function confirmContractSig() {
    const dataUrl = getContractSigDataUrl();
    if (dataUrl) {
      setContractSig(dataUrl);
      setCanvasHasContent(false);
    }
  }

  function clearContractSig() {
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const scale = window.devicePixelRatio || 1;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    contractLastPointRef.current = null;
    contractCurrentPointRef.current = null;
    setCanvasHasContent(false);
    setContractSig("");
  }

  useEffect(() => {
    setLoadingPlans(true);
    Promise.all([
      adminApi().get("/membership/plans"),
      adminApi().get("/content/plan-categories"),
      adminApi().get("/content/settings"),
    ])
      .then(([plansRes, catsRes, settingsRes]) => {
        setPlans(plansRes.data.plans ?? []);
        setPlanCategories(catsRes.data ?? []);
        setQuarterlyFeePercent(settingsRes.data.quarterlyFeePercent ?? 5);
        setMonthlyFeePercent(settingsRes.data.monthlyFeePercent ?? 10);
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  // All categories as grouped plans — same as stepper
  const groupedPlans = useMemo(
    () =>
      planCategories.map((cat) => ({
        key: cat.name,
        label: cat.label,
        title: cat.label,
        items: plans.filter((p) => p.category === cat.name),
      })),
    [plans, planCategories],
  );

  const selectedPlanGroup =
    groupedPlans.find((g) => g.key === activePlanCategory) ?? groupedPlans[0];

  // Auto-set active category when groupedPlans loads — same as stepper
  useEffect(() => {
    if (
      !groupedPlans.some((g) => g.key === activePlanCategory) &&
      groupedPlans.length > 0
    ) {
      setActivePlanCategory(groupedPlans[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedPlans]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const additionalPlans = useMemo(
    () =>
      additionalPlanIds
        .map((id) => plans.find((p) => p.id === id))
        .filter(Boolean) as MembershipPlan[],
    [additionalPlanIds, plans],
  );

  // Total duration in months (main + addons) — same formula as stepper
  const totalPlanMonths = useMemo(
    () =>
      parseDurationToMonths(selectedPlan?.duration ?? "") +
      additionalPlans.reduce(
        (s, p) => s + parseDurationToMonths(p.duration),
        0,
      ),
    [selectedPlan, additionalPlans],
  );

  const additionalTotal = additionalPlans.reduce((s, p) => s + p.price, 0);
  const subtotal = (selectedPlan?.price ?? 0) + additionalTotal;

  // Frequency-adjusted total — uses surcharge percentages on full subtotal
  const frequencyAdjustedTotal = useMemo(() => {
    if (
      !selectedPlan ||
      totalPlanMonths <= 0 ||
      frequency === "UPFRONT" ||
      frequency === "YEARLY"
    )
      return subtotal;
    if (frequency === "MONTHLY") {
      return subtotal * (1 + monthlyFeePercent / 100);
    }
    if (frequency === "QUARTERLY") {
      return subtotal * (1 + quarterlyFeePercent / 100);
    }
    return subtotal;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedPlan,
    totalPlanMonths,
    frequency,
    additionalTotal,
    quarterlyFeePercent,
    monthlyFeePercent,
  ]);

  // Per-period amount — uses surcharge percentages on full subtotal
  function calcPerPeriod(
    freq: "MONTHLY" | "QUARTERLY" | "YEARLY" | "UPFRONT",
  ): number | null {
    if (freq === "UPFRONT" || totalPlanMonths <= 0 || !selectedPlan)
      return null;
    if (freq === "MONTHLY") {
      return (subtotal * (1 + monthlyFeePercent / 100)) / totalPlanMonths;
    }
    if (freq === "QUARTERLY") {
      if (totalPlanMonths < 3) return null;
      const quarters = Math.ceil(totalPlanMonths / 3);
      return (subtotal * (1 + quarterlyFeePercent / 100)) / quarters;
    }
    if (totalPlanMonths < 12) return null;
    return subtotal / (totalPlanMonths / 12);
  }

  // Auto-reset frequency if duration becomes too short — identical to stepper
  useEffect(() => {
    if (
      totalPlanMonths > 0 &&
      totalPlanMonths < 3 &&
      frequency !== "MONTHLY" &&
      frequency !== "UPFRONT"
    ) {
      setFrequency("UPFRONT");
    } else if (
      totalPlanMonths >= 3 &&
      totalPlanMonths < 12 &&
      frequency === "YEARLY"
    ) {
      setFrequency("QUARTERLY");
    }
  }, [totalPlanMonths, frequency]);

  // Auto-compute end date when plan/addons/startDate changes
  useEffect(() => {
    if (!selectedPlan || !startDate) {
      setEndDate("");
      return;
    }
    const totalMonths =
      parseDurationToMonths(selectedPlan.duration) +
      additionalPlans.reduce(
        (s, p) => s + parseDurationToMonths(p.duration),
        0,
      );
    if (totalMonths > 0) {
      const d = new Date(startDate + "T00:00:00");
      d.setMonth(d.getMonth() + totalMonths);
      setEndDate(d.toISOString().slice(0, 10));
    } else {
      setEndDate("");
    }
  }, [selectedPlan, additionalPlans, startDate]);

  // Init contract canvas when entering contract step
  useEffect(() => {
    if (modalStep !== "contract" || contractSig) return;
    const t = setTimeout(() => {
      const canvas = contractCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      ctx.imageSmoothingEnabled = true;
    }, 150);
    return () => clearTimeout(t);
  }, [modalStep, contractSig]);

  function toggleAddon(id: number) {
    setAdditionalPlanIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    const latestContractSig = contractSig || getContractSigDataUrl();

    if (!selectedPlanId) {
      setError("Please select a plan.");
      return;
    }
    if (!latestContractSig) {
      setError("Please sign the contract.");
      return;
    }
    setError("");
    try {
      await dispatch(
        renewMembership({
          userId: membership.user.id,
          planId: selectedPlanId,
          additionalPlanIds,
          startDate,
          paymentFrequency: frequency,
          totalAmount: frequencyAdjustedTotal,
          notes,
          signatureDataUrl: latestContractSig,
        }),
      ).unwrap();
      onRenewed();
      onClose();
    } catch (e: any) {
      setError(e as string);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-4xl flex flex-col"
        style={{ height: "min(92vh, 760px)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
              <RefreshCw size={15} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm leading-tight">
                Renew Membership
              </h3>
              <p className="text-[11px] text-white/35 mt-0.5">
                {membership.user.firstName} {membership.user.lastName}
                <span className="text-white/20 mx-1.5">·</span>
                {membership.user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/6"
          >
            <X size={16} />
          </button>
        </div>

        {loadingPlans ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Loading plans…
          </div>
        ) : modalStep === "contract" ? (
          /* ── Contract step ── */
          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
            <button
              type="button"
              onClick={() => {
                setModalStep("plan");
                setError("");
              }}
              className="mb-4 flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-xs transition-colors font-medium"
            >
              <ArrowLeft size={14} /> Back to Plan Selection
            </button>

            <div className="bg-white rounded-lg overflow-hidden shadow-md text-gray-900 max-w-2xl mx-auto">
              {/* Contract Header */}
              <div className="bg-[#100a0a] text-white px-5 py-4 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[130px]">
                  <p className="text-base font-black tracking-widest text-red-500">
                    SENTINATORS
                  </p>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">
                    Keep Pumping Gym
                  </p>
                </div>
                <div className="flex-1 text-center min-w-[150px]">
                  <p className="text-sm font-black tracking-wide uppercase">
                    Fitness Membership Contract
                  </p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                    Membership Renewal
                  </p>
                </div>
                <div className="text-right text-xs space-y-1 min-w-[160px]">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-white/50">Contract Number:</span>
                    <span className="font-mono font-bold">
                      {contractNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-white/50">Customer Number:</span>
                    <span className="font-mono font-bold">
                      {customerNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-white/50">Date:</span>
                    <span className="font-semibold">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contract Body */}
              <div className="p-4 space-y-4">
                {/* Sections 1 & 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                      1. Member Details
                    </div>
                    <div className="p-3 space-y-2">
                      <ContractField
                        label="First Name / Surname"
                        value={
                          `${membership.user.firstName} ${membership.user.lastName}`.trim() ||
                          "-"
                        }
                      />
                      <ContractField
                        label="Address"
                        value={membership.address || "-"}
                      />
                      <ContractField
                        label="E-Mail"
                        value={membership.user.email || "-"}
                      />
                      <ContractField
                        label="Emergency Contact"
                        value={membership.emergencyContact || "-"}
                      />
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                      2. Subscription Selection
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-y-2 mb-3">
                        {plans
                          .filter((p) => p.category !== "ADDITIONAL")
                          .map((plan) => (
                            <label
                              key={plan.id}
                              className="flex items-center gap-1.5 cursor-default text-sm text-gray-900"
                            >
                              <input
                                type="checkbox"
                                readOnly
                                checked={selectedPlanId === plan.id}
                                className="accent-red-700 w-3 h-3"
                              />
                              <span>{planTitle(plan)}</span>
                            </label>
                          ))}
                      </div>
                      <div className="space-y-2 mt-1">
                        <ContractField
                          label="Start Date"
                          value={startDate ? formatDate(startDate) : "-"}
                        />
                        <ContractField
                          label="Valid until"
                          value={endDate ? formatDate(endDate) : "-"}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sections 3 & 4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                      3. Price Overview
                    </div>
                    <div className="p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          {selectedPlan ? planTitle(selectedPlan) : "Plan"}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {selectedPlan
                            ? money(selectedPlan.currency, selectedPlan.price)
                            : "-"}
                        </span>
                      </div>
                      {additionalPlans.map((ap) => (
                        <div key={ap.id} className="flex justify-between">
                          <span className="text-gray-700">
                            + {planTitle(ap)}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {money(ap.currency, ap.price)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-2 border-t-2 border-gray-300 text-gray-900">
                        <span>Total</span>
                        <span>
                          {money(
                            selectedPlan?.currency ?? "",
                            frequencyAdjustedTotal,
                          )}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-3">
                        {(["UPFRONT", "MONTHLY", "QUARTERLY"] as const).map(
                          (f) => (
                            <label
                              key={f}
                              className="flex items-center gap-1.5 cursor-default text-gray-900"
                            >
                              <input
                                type="checkbox"
                                readOnly
                                checked={frequency === f}
                                className="accent-red-700 w-3 h-3"
                              />
                              <span>
                                {f === "UPFRONT"
                                  ? "Yearly"
                                  : f.charAt(0) + f.slice(1).toLowerCase()}
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                      {calcPerPeriod(frequency) !== null &&
                        frequency !== "UPFRONT" && (
                          <div className="flex justify-between font-semibold pt-1 text-red-700">
                            <span>
                              Due per{" "}
                              {frequency === "MONTHLY" ? "month" : "quarter"}
                            </span>
                            <span>
                              {money(
                                selectedPlan?.currency ?? "",
                                calcPerPeriod(frequency)!,
                              )}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                      4. Membership Category
                    </div>
                    <div className="p-3 space-y-2 text-sm">
                      {planCategories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-1.5 cursor-default text-gray-900"
                        >
                          <input
                            type="checkbox"
                            readOnly
                            checked={selectedPlan?.category === cat.name}
                            className="accent-red-700 w-3 h-3"
                          />
                          <span>{cat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 5: Contract Conditions */}
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                    5. Contract Conditions
                  </div>
                  <div className="p-3">
                    {[
                      {
                        title: "Term",
                        text: "The selected membership begins on the start date and runs for the agreed term. An automatic extension occurs only if no timely cancellation is made.",
                      },
                      {
                        title: "Notice Period",
                        text: "Cancellation must be declared in writing and must be received at least 4 weeks before the end of the respective term.",
                      },
                      {
                        title: "Payment Obligation",
                        text: "The membership fee is to be paid in advance according to the chosen payment method and due date. In case of late payment, we reserve the right to charge reminder fees and suspend the membership.",
                      },
                      {
                        title: "House Rules",
                        text: "The membership is subject to the house rules of the gym. These are posted in the studio and can be viewed on our website. With your signature, you acknowledge these rules.",
                      },
                      {
                        title: "Liability",
                        text: "The gym is not liable for items brought in. Use of the equipment is at your own risk. Parents are liable for their children.",
                      },
                      {
                        title: "Data Protection",
                        text: "Your data will be used exclusively for contract processing and member support. Further information can be found in our privacy policy.",
                      },
                      {
                        title: "Health Responsibility",
                        text: "With your signature, you confirm that you are healthy enough to participate in training. In case of doubt, we recommend a medical clarification.",
                      },
                    ].map(({ title, text }) => (
                      <div
                        key={title}
                        className="py-2 border-b border-gray-200 last:border-0"
                      >
                        <p className="font-bold text-sm text-gray-900 mb-0.5">
                          {title}
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 6: Signatures */}
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                    6. Signatures
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
                      {/* Place & Date */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                          Place / Date
                        </span>
                        <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col justify-between min-h-[110px]">
                          <p className="text-base font-bold text-gray-900">
                            {new Date().toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-auto pt-3 border-t border-gray-300">
                            Date of signing
                          </p>
                        </div>
                      </div>
                      {/* Member Signature */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                            Member Signature
                            {contractSig || canvasHasContent ? (
                              <span className="ml-1.5 text-green-600 font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </span>
                          {contractSig ? (
                            <button
                              type="button"
                              onClick={() => {
                                setContractSig("");
                                setCanvasHasContent(false);
                              }}
                              className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Eraser size={11} /> Re-sign
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={clearContractSig}
                              className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Eraser size={11} /> Clear
                            </button>
                          )}
                        </div>
                        {contractSig ? (
                          <div className="rounded-lg border-2 border-green-200 bg-green-50 overflow-hidden min-h-[110px] flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={contractSig}
                              alt="Member signature"
                              className="max-h-[110px] w-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div
                            className={`relative rounded-xl overflow-hidden min-h-[160px] transition-all border-2 ${
                              canvasHasContent
                                ? "border-green-400 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]"
                                : "border-dashed border-gray-300 hover:border-gray-400 shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]"
                            } bg-white`}
                          >
                            <canvas
                              ref={contractCanvasRef}
                              onPointerDown={beginContractDraw}
                              onPointerMove={drawContractSig}
                              onPointerUp={() => endContractDraw()}
                              onPointerCancel={() => endContractDraw()}
                              className="h-[160px] w-full touch-none cursor-crosshair"
                            />
                            {/* Baseline */}
                            <div className="absolute bottom-9 left-5 right-5 border-b-2 border-dashed border-gray-200 pointer-events-none" />
                            {/* Pen icon + hint — shown when blank */}
                            {!canvasHasContent && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none select-none">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="22"
                                  height="22"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#d1d5db"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                                <p className="text-[11px] text-gray-300 font-medium tracking-wide">
                                  Draw your signature
                                </p>
                              </div>
                            )}
                            {/* OK + Clear buttons — appear after first stroke */}
                            {canvasHasContent && (
                              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none select-none">
                                <button
                                  type="button"
                                  onClick={clearContractSig}
                                  className="pointer-events-auto px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-400 border border-gray-200 bg-white hover:bg-gray-50 hover:text-red-500 transition-colors"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={confirmContractSig}
                                  className="pointer-events-auto px-3.5 py-1 rounded-md text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                                >
                                  ✓ OK
                                </button>
                              </div>
                            )}
                            {/* Bottom hint when blank */}
                            {!canvasHasContent && (
                              <p className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-300 pointer-events-none select-none">
                                Sign above the line
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Gym Signature */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                          Gym Signature
                        </span>
                        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 min-h-[110px] flex flex-col items-center justify-center">
                          <p className="text-xs font-medium text-gray-400">
                            To be signed by gym staff
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 justify-between items-center pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setModalStep("plan");
                          setError("");
                        }}
                        className="px-5 py-2.5 rounded-lg border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={actionLoading}
                        className="px-6 py-2.5 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {actionLoading ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />{" "}
                            Processing…
                          </>
                        ) : (
                          "Accept & Renew Membership"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Two-panel body (plan step) ── */
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* LEFT — Plan selection (scrollable) — identical structure to stepper */}
            <div className="flex-1 overflow-y-auto border-r border-white/6 px-5 py-4 min-w-0">
              {groupedPlans.every((g) => g.items.length === 0) ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center text-white/60 text-sm">
                  No active plans are available right now.
                </div>
              ) : (
                <div>
                  {/* Tab bar — same as stepper */}
                  <div className="mb-3 flex flex-wrap justify-center">
                    <div className="inline-flex flex-wrap rounded-full border border-white/10 bg-white/5 p-1">
                      {groupedPlans.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setActivePlanCategory(group.key)}
                          className={`rounded-full px-5 py-2 text-xs font-semibold transition sm:text-sm ${
                            activePlanCategory === group.key
                              ? "bg-red-700 text-white shadow-[0_0_18px_rgba(220,38,38,0.32)]"
                              : "text-white/55 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {group.label}
                          {group.key === "ADDITIONAL" &&
                            additionalPlanIds.length > 0 && (
                              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                                {additionalPlanIds.length}
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <h3 className="mb-4 text-center text-sm font-semibold">
                    {selectedPlanGroup?.title ?? "Select a Plan"}
                    {activePlanCategory === "ADDITIONAL" && (
                      <span className="ml-2 text-xs font-normal text-white/40">
                        (optional — select multiple)
                      </span>
                    )}
                  </h3>

                  {!selectedPlanGroup ||
                  selectedPlanGroup.items.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center text-white/60 text-sm">
                      No plans available in this category.
                    </div>
                  ) : activePlanCategory === "ADDITIONAL" ? (
                    /* ADDITIONAL tab — multi-select, same as stepper */
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedPlanGroup.items.map((plan) => {
                        const isSelected = additionalPlanIds.includes(plan.id);
                        return (
                          <button
                            type="button"
                            key={plan.id}
                            onClick={() => toggleAddon(plan.id)}
                            className={`rounded-lg border p-3 text-left transition w-full relative ${
                              isSelected
                                ? "border-red-500 bg-red-950/40 shadow-[0_0_24px_rgba(185,28,28,0.28)]"
                                : "border-white/10 bg-white/5 hover:border-white/30"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600">
                                <Check className="h-3 w-3 text-white" />
                              </span>
                            )}
                            <p className="text-base font-semibold pr-6">
                              {plan.duration}
                            </p>
                            <p className="text-sm text-white/55">
                              {planTitle(plan)}
                            </p>
                            <p className="mt-2 text-lg font-bold">
                              {money(plan.currency, plan.price)}
                            </p>
                            <ul className="mt-3 space-y-1 text-sm text-white/65">
                              {plan.features.slice(0, 3).map((feature) => (
                                <li key={feature} className="flex gap-2">
                                  <Check className="mt-0.5 h-4 w-4 text-red-400" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Main categories — single select, same as stepper */
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedPlanGroup.items.map((plan) => {
                        const selected = selectedPlanId === plan.id;
                        return (
                          <div
                            key={plan.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPlanId(plan.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                setSelectedPlanId(plan.id);
                            }}
                            className={`rounded-lg border p-3 text-left transition w-full cursor-pointer ${
                              selected
                                ? "border-red-500 bg-red-950/40 shadow-[0_0_24px_rgba(185,28,28,0.28)]"
                                : "border-white/10 bg-white/5 hover:border-white/30"
                            }`}
                          >
                            <p className="text-base font-semibold">
                              {plan.duration}
                            </p>
                            <p className="text-sm text-white/55">
                              {planTitle(plan)}
                            </p>
                            <p className="mt-2 text-lg font-bold">
                              {money(plan.currency, plan.price)}
                            </p>
                            <ul className="mt-3 space-y-1 text-sm text-white/65">
                              {plan.features.slice(0, 3).map((feature) => (
                                <li key={feature} className="flex gap-2">
                                  <Check className="mt-0.5 h-4 w-4 text-red-400" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — Settings + Signature + Summary (scrollable) */}
            <div className="w-72 shrink-0 overflow-y-auto px-4 py-4 space-y-4 flex flex-col">
              {/* Frequency */}
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2">
                  Payment Frequency
                </p>
                <div className="space-y-1.5">
                  {[
                    {
                      value: "UPFRONT" as const,
                      label: "Yearly",
                      unit: "",
                      minMonths: 1,
                    },
                    {
                      value: "MONTHLY" as const,
                      label: "Monthly",
                      unit: "/mo",
                      minMonths: 1,
                    },
                    {
                      value: "QUARTERLY" as const,
                      label: "Quarterly",
                      unit: "/qtr",
                      minMonths: 3,
                    },
                  ]
                    .filter(
                      ({ minMonths }) =>
                        totalPlanMonths === 0 || totalPlanMonths >= minMonths,
                    )
                    .map(({ value, label, unit }) => {
                      const periodAmt =
                        value === "UPFRONT"
                          ? frequencyAdjustedTotal
                          : calcPerPeriod(value);
                      const currency = selectedPlan?.currency ?? "";
                      return (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                            frequency === value
                              ? "border-green-500/60 bg-green-950/40"
                              : "border-white/8 bg-white/3 hover:border-white/18"
                          }`}
                        >
                          <input
                            type="radio"
                            name="renewFrequency"
                            value={value}
                            checked={frequency === value}
                            onChange={() => setFrequency(value)}
                            className="sr-only"
                          />
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              frequency === value
                                ? "border-green-500 bg-green-600"
                                : "border-white/25"
                            }`}
                          >
                            {frequency === value && (
                              <span className="h-1 w-1 rounded-full bg-white" />
                            )}
                          </span>
                          <span className="flex-1 text-xs font-medium text-white/80">
                            {label}
                          </span>
                          {periodAmt !== null && currency && (
                            <span className="text-[11px] font-semibold text-white/60">
                              {currency} {periodAmt.toFixed(2)}
                              {unit && (
                                <span className="text-white/30 font-normal">
                                  {unit}
                                </span>
                              )}
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Start date + Notes */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-widest font-semibold block mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#161616] border border-white/8 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/25 uppercase tracking-widest font-semibold block mb-1.5">
                    Admin Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional note…"
                    className="w-full bg-[#161616] border border-white/8 text-white text-xs rounded-lg px-3 py-2 placeholder:text-white/18 focus:outline-none focus:border-white/25 transition-colors"
                  />
                </div>
              </div>

              {/* Summary */}
              {selectedPlan && (
                <div className="bg-white/2 border border-white/8 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-white/45">
                    <span>Plan</span>
                    <span className="text-white/70 font-medium">
                      {selectedPlan.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/45">
                    <span>Duration</span>
                    <span className="text-white/70 font-medium">
                      {selectedPlan.duration}
                    </span>
                  </div>
                  {frequency !== "UPFRONT" &&
                    calcPerPeriod(frequency) !== null && (
                      <div className="flex justify-between text-white/45">
                        <span>
                          Per {frequency === "MONTHLY" ? "month" : "quarter"}
                        </span>
                        <span className="text-white/70 font-medium">
                          {selectedPlan.currency}{" "}
                          {calcPerPeriod(frequency)!.toFixed(2)}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between font-semibold text-white border-t border-white/8 pt-2 mt-1">
                    <span>Total</span>
                    <span className="text-green-400">
                      {selectedPlan.currency}{" "}
                      {frequencyAdjustedTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-red-400 text-[11px] flex items-center gap-1.5 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="shrink-0" /> {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedPlanId) {
                      setError("Please select a plan first.");
                      return;
                    }
                    setError("");
                    setModalStep("contract");
                  }}
                  disabled={!selectedPlanId}
                  className="flex-1 py-2.5 text-xs rounded-xl bg-red-700/20 hover:bg-red-700/30 text-red-400 border border-red-700/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 font-semibold"
                >
                  View & Sign Contract →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contract View Modal ───────────────────────────────
function ContractViewModal({
  membership,
  onClose,
  autoDownload = false,
}: {
  membership: AdminMembership;
  onClose: () => void;
  autoDownload?: boolean;
}) {
  const contractDocRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const autoDownloadFiredRef = useRef(false);

  // Auto-trigger PDF download after contract document has had time to render
  useEffect(() => {
    if (!autoDownload || autoDownloadFiredRef.current) return;
    autoDownloadFiredRef.current = true;
    const timer = setTimeout(() => {
      downloadPdf();
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload]);

  const contractNumber = membership.registrationDetails?.contractNumber
    ? String(membership.registrationDetails.contractNumber)
    : `CNT-${membership.id}`;
  const customerNumber = membership.registrationDetails?.customerNumber
    ? String(membership.registrationDetails.customerNumber)
    : `MBR-${membership.user.id}`;

  const signedDate = membership.createdAt
    ? new Date(membership.createdAt).toLocaleDateString()
    : new Date().toLocaleDateString();

  const mainPlan = membership.plan;
  const additionalPlans = membership.additionalPlans ?? [];
  const additionalTotal = additionalPlans.reduce((s, p) => s + p.price, 0);
  const totalMonths =
    parseDurationToMonths(mainPlan.duration) +
    additionalPlans.reduce((s, p) => s + parseDurationToMonths(p.duration), 0);

  const periodInfo = getAdminPerPeriodInfo(
    membership.totalAmount,
    membership.registrationFee,
    totalMonths,
    membership.paymentFrequency,
  );

  function downloadPdf() {
    setIsDownloading(true);
    try {
      const cur = mainPlan.currency;
      const money = (amount: number) =>
        `${cur} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      const freq = membership.paymentFrequency?.toUpperCase() ?? "";
      const totalAmount =
        membership.totalAmount ??
        mainPlan.price +
          additionalPlans.reduce((s, p) => s + p.price, 0) +
          (membership.registrationFee ?? 0);

      const field = (label: string, value: string) =>
        `<div style="display:flex;gap:8px;font-size:13px;margin-bottom:6px;">
           <span style="color:#6b7280;white-space:nowrap;">${label}:</span>
           <span style="font-weight:600;color:#111827;word-break:break-word;">${value}</span>
         </div>`;

      const sectionHead = (text: string) =>
        `<div class="sec-head">${text}</div>`;

      const additionalRows = additionalPlans
        .map(
          (ap) =>
            `<tr><td style="padding:3px 0;color:#4b5563;">+ ${ap.name || ap.duration}</td><td style="padding:3px 0;text-align:right;font-weight:600;color:#111827;">${money(ap.price)}</td></tr>`,
        )
        .join("");

      const additionalChecks = additionalPlans
        .map(
          (ap) =>
            `<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#111827;margin-bottom:4px;"><input type="checkbox" checked readonly style="accent-color:#b91c1c;width:12px;height:12px;" /><span>+ ${ap.name || ap.duration}</span></label>`,
        )
        .join("");

      const freqChecks = (["UPFRONT", "MONTHLY", "QUARTERLY"] as const)
        .map((f) => {
          const checked = freq === f || (f === "UPFRONT" && freq === "YEARLY");
          return `<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#111827;"><input type="checkbox" ${checked ? "checked" : ""} readonly style="accent-color:#b91c1c;width:12px;height:12px;" /><span>${f === "UPFRONT" ? "Yearly" : f.charAt(0) + f.slice(1).toLowerCase()}</span></label>`;
        })
        .join("");

      const perPeriodHtml = periodInfo
        ? `<div style="display:flex;justify-content:space-between;font-weight:600;color:#b91c1c;padding-top:4px;font-size:13px;"><span>Due per ${periodInfo.label === "Monthly" ? "month" : periodInfo.label === "Quarterly" ? "quarter" : "year"}</span><span>${money(periodInfo.perPeriod)}</span></div>`
        : "";

      const sigHtml = membership.signatureDataUrl
        ? `<img src="${membership.signatureDataUrl}" alt="Member signature" style="max-height:100px;width:100%;object-fit:contain;padding:4px;" />`
        : `<p style="font-size:12px;color:#9ca3af;margin:0;">No signature captured</p>`;

      const conditions = [
        {
          title: "Term",
          text: "The selected membership begins on the start date and runs for the agreed term. An automatic extension occurs only if no timely cancellation is made.",
        },
        {
          title: "Notice Period",
          text: "Cancellation must be declared in writing and must be received at least 4 weeks before the end of the respective term.",
        },
        {
          title: "Payment Obligation",
          text: "The membership fee is to be paid in advance according to the chosen payment method and due date. In case of late payment, we reserve the right to charge reminder fees and suspend the membership.",
        },
        {
          title: "House Rules",
          text: "The membership is subject to the house rules of the gym. These are posted in the studio and can be viewed on our website. With your signature, you acknowledge these rules.",
        },
        {
          title: "Liability",
          text: "The gym is not liable for items brought in. Use of the equipment is at your own risk. Parents are liable for their children.",
        },
        {
          title: "Data Protection",
          text: "Your data will be used exclusively for contract processing and member support. Further information can be found in our privacy policy.",
        },
        {
          title: "Health Responsibility",
          text: "With your signature, you confirm that you are healthy enough to participate in training. In case of doubt, we recommend a medical clarification.",
        },
      ]
        .map(
          ({ title, text }) =>
            `<div style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><p style="font-weight:700;font-size:13px;color:#111827;margin:0 0 2px;">${title}</p><p style="font-size:13px;color:#374151;line-height:1.5;margin:0;">${text}</p></div>`,
        )
        .join("");

      const catLabel = mainPlan.category
        ? mainPlan.category.charAt(0) + mainPlan.category.slice(1).toLowerCase()
        : "-";

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Contract ${contractNumber}</title>
<style>
@media print { @page { margin:12mm; size:A4; } body { margin:0; } }
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:system-ui,sans-serif;background:#fff;color:#111827;margin:0;}
.wrap{max-width:780px;margin:0 auto;padding:0;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.sec{border:1px solid #d1d5db;border-radius:4px;overflow:hidden;}
.sec-head{background:#1a0a0a !important;color:#fff !important;padding:8px 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;}
.contract-header{background:#100a0a !important;color:#fff !important;padding:16px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;}
.sig-date-box{border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb !important;padding:12px 16px;display:flex;flex-direction:column;justify-content:space-between;min-height:100px;}
.sig-member-box{border:2px solid #bbf7d0;border-radius:8px;background:#f0fdf4 !important;overflow:hidden;min-height:100px;display:flex;align-items:center;justify-content:center;}
.sig-gym-box{border:2px dashed #e5e7eb;border-radius:8px;background:#f9fafb !important;min-height:100px;display:flex;align-items:center;justify-content:center;}
</style>
</head>
<body>
<div class="wrap">
  <!-- header -->
  <div class="contract-header">
    <div style="flex:1;min-width:110px;"><p style="font-size:15px;font-weight:900;letter-spacing:.1em;color:#ef4444;margin:0;">SENTINATORS</p><p style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin:2px 0 0;">Keep Pumping Gym</p></div>
    <div style="flex:1;text-align:center;min-width:130px;"><p style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin:0;">Fitness Membership Contract</p><p style="font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em;margin:2px 0 0;">Membership Agreement</p></div>
    <div style="text-align:right;font-size:11px;min-width:140px;">
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:3px;"><span style="color:rgba(255,255,255,.5);">Contract Number:</span><span style="font-family:monospace;font-weight:700;">${contractNumber}</span></div>
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:3px;"><span style="color:rgba(255,255,255,.5);">Customer Number:</span><span style="font-family:monospace;font-weight:700;">${customerNumber}</span></div>
      <div style="display:flex;justify-content:flex-end;gap:6px;"><span style="color:rgba(255,255,255,.5);">Date:</span><span style="font-weight:600;">${signedDate}</span></div>
    </div>
  </div>

  <!-- body -->
  <div style="padding:14px;display:flex;flex-direction:column;gap:14px;">
    <div class="grid2">
      <div class="sec">${sectionHead("1. Member Details")}<div style="padding:12px;">${field("First Name / Surname", `${membership.user.firstName} ${membership.user.lastName}`.trim() || "-")}${field("Address", membership.address || "-")}${field("E-Mail", membership.user.email || "-")}${field("Emergency Contact", membership.emergencyContact || "-")}</div></div>
      <div class="sec">${sectionHead("2. Subscription Selection")}<div style="padding:12px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#111827;margin-bottom:4px;"><input type="checkbox" checked readonly style="accent-color:#b91c1c;width:12px;height:12px;" /><span>${mainPlan.name || mainPlan.duration}</span></label>
        ${additionalChecks}
        <div style="margin-top:10px;">${field("Start Date", membership.startDate ? formatDate(membership.startDate.slice(0, 10)) : "-")}${field("Valid until", membership.endDate ? formatDate(membership.endDate.slice(0, 10)) : "-")}</div>
      </div></div>
    </div>

    <div class="grid2">
      <div class="sec">${sectionHead("3. Price Overview")}<div style="padding:12px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:3px 0;color:#4b5563;">${mainPlan.name || mainPlan.duration}</td><td style="padding:3px 0;text-align:right;font-weight:600;color:#111827;">${money(mainPlan.price)}</td></tr>
          ${additionalRows}
          <tr><td style="padding:3px 0;color:#4b5563;">Registration Fee (one-time)</td><td style="padding:3px 0;text-align:right;font-weight:600;color:#111827;">${money(membership.registrationFee ?? 0)}</td></tr>
          <tr><td colspan="2"><div style="border-top:2px solid #d1d5db;margin:6px 0;"></div></td></tr>
          <tr><td style="font-weight:700;color:#111827;padding:3px 0;">Total</td><td style="font-weight:700;color:#111827;padding:3px 0;text-align:right;">${money(totalAmount)}</td></tr>
        </table>
        <div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:8px;display:flex;flex-wrap:wrap;gap:10px;">${freqChecks}</div>
        ${perPeriodHtml}
      </div></div>
      <div class="sec">${sectionHead("4. Membership Category")}<div style="padding:12px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#111827;"><input type="checkbox" checked readonly style="accent-color:#b91c1c;width:12px;height:12px;" /><span>${catLabel}</span></label>
      </div></div>
    </div>

    <div class="sec">${sectionHead("5. Contract Conditions")}<div style="padding:12px;">${conditions}</div></div>

    <div class="sec">${sectionHead("6. Signatures")}<div style="padding:20px;">
      <div class="grid3">
        <div style="display:flex;flex-direction:column;gap:8px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;">Place / Date</span>
          <div class="sig-date-box">
            <p style="font-size:15px;font-weight:700;color:#111827;margin:0;">${signedDate}</p>
            <p style="font-size:11px;color:#9ca3af;margin:0;padding-top:10px;border-top:1px solid #d1d5db;">Date of signing</p>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;">Member Signature</span>
          <div class="sig-member-box">${sigHtml}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;">Gym Signature</span>
          <div class="sig-gym-box"><p style="font-size:12px;font-weight:500;color:#9ca3af;margin:0;">To be signed by gym staff</p></div>
        </div>
      </div>
    </div></div>
  </div>
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1200);};</script>
</body>
</html>`;

      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        alert(
          "Popup blocked — please allow popups for this page and try again.",
        );
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error("PDF generation error:", e);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-4xl flex flex-col"
        style={{ height: "min(92vh, 780px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <FileText size={15} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm leading-tight">
                Membership Contract
              </h3>
              <p className="text-[11px] text-white/35 mt-0.5">
                {membership.user.firstName} {membership.user.lastName}
                <span className="text-white/20 mx-1.5">·</span>
                {membership.user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/25 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {isDownloading ? "Generating…" : "Download PDF"}
            </button>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/6"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contract document */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
          <div
            ref={contractDocRef}
            className="bg-white rounded-lg overflow-hidden shadow-md text-gray-900 max-w-2xl mx-auto"
          >
            {/* Contract Header */}
            <div className="bg-[#100a0a] text-white px-5 py-4 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[130px]">
                <p className="text-base font-black tracking-widest text-red-500">
                  SENTINATORS
                </p>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">
                  Keep Pumping Gym
                </p>
              </div>
              <div className="flex-1 text-center min-w-[150px]">
                <p className="text-sm font-black tracking-wide uppercase">
                  Fitness Membership Contract
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                  Membership Agreement
                </p>
              </div>
              <div className="text-right text-xs space-y-1 min-w-[160px]">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-white/50">Contract Number:</span>
                  <span className="font-mono font-bold">{contractNumber}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-white/50">Customer Number:</span>
                  <span className="font-mono font-bold">{customerNumber}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-white/50">Date:</span>
                  <span className="font-semibold">{signedDate}</span>
                </div>
              </div>
            </div>

            {/* Contract Body */}
            <div className="p-4 space-y-4">
              {/* Sections 1 & 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                    1. Member Details
                  </div>
                  <div className="p-3 space-y-2">
                    <ContractField
                      label="First Name / Surname"
                      value={
                        `${membership.user.firstName} ${membership.user.lastName}`.trim() ||
                        "-"
                      }
                    />
                    <ContractField
                      label="Address"
                      value={membership.address || "-"}
                    />
                    <ContractField
                      label="E-Mail"
                      value={membership.user.email || "-"}
                    />
                    <ContractField
                      label="Emergency Contact"
                      value={membership.emergencyContact || "-"}
                    />
                  </div>
                </div>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                    2. Subscription Selection
                  </div>
                  <div className="p-3">
                    <div className="space-y-1.5 mb-3">
                      <label className="flex items-center gap-1.5 cursor-default text-sm text-gray-900">
                        <input
                          type="checkbox"
                          readOnly
                          checked
                          className="accent-red-700 w-3 h-3"
                        />
                        <span>{planTitle(mainPlan)}</span>
                      </label>
                      {additionalPlans.map((ap) => (
                        <label
                          key={ap.id}
                          className="flex items-center gap-1.5 cursor-default text-sm text-gray-900"
                        >
                          <input
                            type="checkbox"
                            readOnly
                            checked
                            className="accent-red-700 w-3 h-3"
                          />
                          <span>+ {planTitle(ap)}</span>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2 mt-1">
                      <ContractField
                        label="Start Date"
                        value={
                          membership.startDate
                            ? formatDate(membership.startDate.slice(0, 10))
                            : "-"
                        }
                      />
                      <ContractField
                        label="Valid until"
                        value={
                          membership.endDate
                            ? formatDate(membership.endDate.slice(0, 10))
                            : "-"
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sections 3 & 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                    3. Price Overview
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        {planTitle(mainPlan)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {money(mainPlan.currency, mainPlan.price)}
                      </span>
                    </div>
                    {additionalPlans.map((ap) => (
                      <div key={ap.id} className="flex justify-between">
                        <span className="text-gray-700">+ {planTitle(ap)}</span>
                        <span className="font-semibold text-gray-900">
                          {money(ap.currency, ap.price)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        Registration Fee (one-time)
                      </span>
                      <span className="font-semibold text-gray-900">
                        {money(
                          mainPlan.currency,
                          membership.registrationFee ?? 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t-2 border-gray-300 text-gray-900">
                      <span>Total</span>
                      <span>
                        {money(
                          mainPlan.currency,
                          membership.totalAmount ??
                            mainPlan.price +
                              additionalTotal +
                              (membership.registrationFee ?? 0),
                        )}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-3">
                      {(["UPFRONT", "MONTHLY", "QUARTERLY"] as const).map(
                        (f) => (
                          <label
                            key={f}
                            className="flex items-center gap-1.5 cursor-default text-gray-900"
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={
                                membership.paymentFrequency?.toUpperCase() ===
                                  f ||
                                (f === "UPFRONT" &&
                                  membership.paymentFrequency?.toUpperCase() ===
                                    "YEARLY")
                              }
                              className="accent-red-700 w-3 h-3"
                            />
                            <span>
                              {f === "UPFRONT"
                                ? "Yearly"
                                : f.charAt(0) + f.slice(1).toLowerCase()}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                    {periodInfo && (
                      <div className="flex justify-between font-semibold pt-1 text-red-700">
                        <span>
                          Due per{" "}
                          {periodInfo.label === "Monthly"
                            ? "month"
                            : periodInfo.label === "Quarterly"
                              ? "quarter"
                              : "year"}
                        </span>
                        <span>
                          {money(mainPlan.currency, periodInfo.perPeriod)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                    4. Membership Category
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    <label className="flex items-center gap-1.5 cursor-default text-gray-900">
                      <input
                        type="checkbox"
                        readOnly
                        checked
                        className="accent-red-700 w-3 h-3"
                      />
                      <span className="capitalize">
                        {mainPlan.category.charAt(0) +
                          mainPlan.category.slice(1).toLowerCase()}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 5: Contract Conditions */}
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                  5. Contract Conditions
                </div>
                <div className="p-3">
                  {[
                    {
                      title: "Term",
                      text: "The selected membership begins on the start date and runs for the agreed term. An automatic extension occurs only if no timely cancellation is made.",
                    },
                    {
                      title: "Notice Period",
                      text: "Cancellation must be declared in writing and must be received at least 4 weeks before the end of the respective term.",
                    },
                    {
                      title: "Payment Obligation",
                      text: "The membership fee is to be paid in advance according to the chosen payment method and due date. In case of late payment, we reserve the right to charge reminder fees and suspend the membership.",
                    },
                    {
                      title: "House Rules",
                      text: "The membership is subject to the house rules of the gym. These are posted in the studio and can be viewed on our website. With your signature, you acknowledge these rules.",
                    },
                    {
                      title: "Liability",
                      text: "The gym is not liable for items brought in. Use of the equipment is at your own risk. Parents are liable for their children.",
                    },
                    {
                      title: "Data Protection",
                      text: "Your data will be used exclusively for contract processing and member support. Further information can be found in our privacy policy.",
                    },
                    {
                      title: "Health Responsibility",
                      text: "With your signature, you confirm that you are healthy enough to participate in training. In case of doubt, we recommend a medical clarification.",
                    },
                  ].map(({ title, text }) => (
                    <div
                      key={title}
                      className="py-2 border-b border-gray-200 last:border-0"
                    >
                      <p className="font-bold text-sm text-gray-900 mb-0.5">
                        {title}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: Signatures */}
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                  6. Signatures
                </div>
                <div className="p-5 space-y-5">
                  <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
                    {/* Place & Date */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Place / Date
                      </span>
                      <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col justify-between min-h-[110px]">
                        <p className="text-base font-bold text-gray-900">
                          {signedDate}
                        </p>
                        <p className="text-xs text-gray-400 mt-auto pt-3 border-t border-gray-300">
                          Date of signing
                        </p>
                      </div>
                    </div>
                    {/* Member Signature */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Member Signature
                        {membership.signatureDataUrl ? (
                          <span className="ml-1.5 text-green-600 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="ml-1 text-red-500"> – Missing</span>
                        )}
                      </span>
                      {membership.signatureDataUrl ? (
                        <div className="rounded-lg border-2 border-green-200 bg-green-50 overflow-hidden min-h-[110px] flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={membership.signatureDataUrl}
                            alt="Member signature"
                            className="max-h-[110px] w-full object-contain p-1"
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 min-h-[110px] flex items-center justify-center">
                          <p className="text-xs text-gray-400">
                            No signature captured
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Gym Signature */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Gym Signature
                      </span>
                      <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 min-h-[110px] flex flex-col items-center justify-center">
                        <p className="text-xs font-medium text-gray-400">
                          To be signed by gym staff
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("ALL");
  const [renewTarget, setRenewTarget] = useState<AdminMembership | null>(null);
  const [viewContractTarget, setViewContractTarget] =
    useState<AdminMembership | null>(null);
  const [downloadContractTarget, setDownloadContractTarget] =
    useState<AdminMembership | null>(null);
  const t = useTranslations("admin.memberships");

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

  // For each user, only the membership with the latest createdAt can be renewed.
  // Once renewed, the old record stays but loses the Renew button.
  const latestApprovedIdByUser = useMemo(() => {
    const map = new Map<number, { id: number; createdAt: string }>();
    for (const m of memberships) {
      if (m.status !== "APPROVED") continue;
      const existing = map.get(m.user.id);
      if (!existing || m.createdAt > existing.createdAt) {
        map.set(m.user.id, { id: m.id, createdAt: m.createdAt });
      }
    }
    const ids = new Set<number>();
    map.forEach((v) => ids.add(v.id));
    return ids;
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
      if (expiryFilter !== "ALL") {
        const es = getExpiryStatus(m.endDate);
        if (expiryFilter === "EXPIRING_THIS_MONTH" && es !== "expiring")
          return false;
        if (expiryFilter === "EXPIRED" && es !== "expired") return false;
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
    expiryFilter,
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
          {t("title")}
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
            {t("filters")}
          </div>
          {(filter !== "ALL" ||
            frequencyFilter !== "ALL" ||
            expiryFilter !== "ALL" ||
            planSearch ||
            userSearch ||
            startDateFrom ||
            startDateTo) && (
            <button
              onClick={() => {
                setFilter("ALL");
                setFrequencyFilter("ALL");
                setExpiryFilter("ALL");
                setPlanSearch("");
                setUserSearch("");
                setStartDateFrom("");
                setStartDateTo("");
              }}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <X size={11} /> {t("clearAll")}
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Row 1: Status + Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Status */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                {t("status")}
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
                    {t(
                      f.toLowerCase() as
                        | "all"
                        | "pending"
                        | "approved"
                        | "rejected",
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                {t("paymentFrequency")}
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
                      ? t("all")
                      : t(
                          f.toLowerCase() as
                            | "monthly"
                            | "quarterly"
                            | "annually",
                        )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Row 1b: Expiry filter */}
          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium flex items-center gap-1.5">
              <Clock size={10} />
              {t("subscriptionExpiry")}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setExpiryFilter("ALL")}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                  expiryFilter === "ALL"
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-transparent text-white/35 border-white/8 hover:border-white/20 hover:text-white/70"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setExpiryFilter("EXPIRING_THIS_MONTH")}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium flex items-center gap-1 ${
                  expiryFilter === "EXPIRING_THIS_MONTH"
                    ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                    : "bg-transparent text-white/35 border-white/8 hover:border-white/20 hover:text-white/70"
                }`}
              >
                <Clock size={11} />
                {t("expiringThisMonth")}
              </button>
              <button
                onClick={() => setExpiryFilter("EXPIRED")}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium flex items-center gap-1 ${
                  expiryFilter === "EXPIRED"
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-transparent text-white/35 border-white/8 hover:border-white/20 hover:text-white/70"
                }`}
              >
                <AlertCircle size={11} />
                {t("expired")}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Row 2: Search + Plan + Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User search */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                {t("member")}
              </label>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#161616] border border-white/8 text-white text-xs rounded-xl pl-8 pr-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>
            </div>

            {/* Plan dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                {t("plan")}
              </label>
              <div className="relative">
                <select
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="w-full appearance-none bg-[#161616] border border-white/8 text-white text-xs rounded-xl px-3 pr-8 py-2 focus:outline-none focus:border-white/25 transition-colors scheme-dark"
                >
                  <option value="">{t("allPlans")}</option>
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
                {t("startDateFrom")}
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
                {t("startDateTo")}
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
        <div className="text-white/40 text-sm">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-xl p-10 text-center text-white/30">
          {t("noRecords")}
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
                  {/* Expiry badge */}
                  {m.status === "APPROVED" &&
                    m.endDate &&
                    (() => {
                      const es = getExpiryStatus(m.endDate);
                      if (es === "expired")
                        return (
                          <span className="text-xs border border-red-500/30 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle size={10} /> Expired
                          </span>
                        );
                      if (es === "expiring")
                        return (
                          <span className="text-xs border border-orange-500/30 bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={10} /> Expiring Soon
                          </span>
                        );
                      return null;
                    })()}
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
                {m.signatureDataUrl && (
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => setViewContractTarget(m)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors font-medium"
                    >
                      <FileText size={12} /> View Contract
                    </button>
                    <button
                      onClick={() => setDownloadContractTarget(m)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 border border-white/10 transition-colors font-medium"
                      title="Download PDF"
                    >
                      <Download size={12} /> Download PDF
                    </button>
                  </div>
                )}
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
                    placeholder={t("adminNotePlaceholder")}
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
                      <Check size={13} /> {t("approve")}
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(m.id, "REJECTED")}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/20 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={13} /> {t("reject")}
                    </button>
                  </div>
                </div>
              )}

              {/* Renew button — only for latest per user AND only when expiring/expired */}
              {m.status === "APPROVED" &&
                latestApprovedIdByUser.has(m.id) &&
                (getExpiryStatus(m.endDate) === "expiring" ||
                  getExpiryStatus(m.endDate) === "expired") && (
                  <div className="flex flex-col gap-2 min-w-35">
                    <button
                      onClick={() => setRenewTarget(m)}
                      className="flex items-center justify-center gap-1.5 bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-600/25 text-xs py-2 px-3 rounded-lg transition-colors font-medium"
                    >
                      <RefreshCw size={13} /> {t("renewContract")}
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Renew modal */}
      {renewTarget && (
        <RenewModal
          membership={renewTarget}
          onClose={() => setRenewTarget(null)}
          onRenewed={() => {
            dispatch(
              fetchAdminMemberships(filter === "ALL" ? undefined : filter),
            );
          }}
        />
      )}

      {/* Contract view modal */}
      {viewContractTarget && (
        <ContractViewModal
          membership={viewContractTarget}
          onClose={() => setViewContractTarget(null)}
        />
      )}

      {/* Contract download modal (auto-triggers PDF download) */}
      {downloadContractTarget && (
        <ContractViewModal
          membership={downloadContractTarget}
          onClose={() => setDownloadContractTarget(null)}
          autoDownload
        />
      )}
    </div>
  );
}
