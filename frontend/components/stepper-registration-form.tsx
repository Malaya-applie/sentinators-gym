"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, registerUser } from "@/store/slices/authSlice";
import {
  clearMembershipMessages,
  fetchPlans,
  MembershipPlan,
  purchaseMembership,
} from "@/store/slices/membershipSlice";
import { useRouter } from "next/navigation";
import { Check, Eraser, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Step = 0 | 1 | 2 | 3;

type PlanCategoryItem = {
  id: number;
  name: string;
  label: string;
  order: number;
};

type RegistrationContent = {
  registration_fee?: string;
  registration_currency?: string;
  discount_amount?: string;
  discount_label?: string;
  agreement_text?: string;
  agreement_checkbox_1?: string;
  agreement_checkbox_2?: string;
  terms_text?: string;
  terms_checkbox_1?: string;
  terms_checkbox_2?: string;
  terms_final_checkbox?: string;
};

const STEPS = ["Personal Details", "Plans", "Agreement", "Terms & Conditions"];

const DEFAULT_CONTENT: Required<RegistrationContent> = {
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

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  weight: "",
  height: "",
  goal: "",
  experience: "",
  street: "",
  location: "",
  postalCode: "",
  startDate: "",
  emergencyContact: "",
  address: "",
};

function money(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function planTitle(plan: MembershipPlan) {
  return plan.name || plan.duration;
}

function parseDurationToEndDate(
  startDateStr: string,
  duration: string,
): string {
  if (!startDateStr || !duration) return "";
  const start = new Date(startDateStr + "T00:00:00");
  if (Number.isNaN(start.getTime())) return "";
  const match = duration
    .toLowerCase()
    .trim()
    .match(/^(\d+)\s*(month|year|day|week)/);
  if (!match) return "";
  const num = parseInt(match[1]);
  const unit = match[2];
  const end = new Date(start);
  if (unit === "month") end.setMonth(end.getMonth() + num);
  else if (unit === "year") end.setFullYear(end.getFullYear() + num);
  else if (unit === "day") end.setDate(end.getDate() + num);
  else if (unit === "week") end.setDate(end.getDate() + num * 7);
  return end.toISOString().slice(0, 10);
}

// Converts a duration string (e.g. "6 months", "1 year") to a number of months.
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StepperRegistrationForm({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    plans,
    loading: plansLoading,
    purchaseLoading,
    error: planError,
  } = useAppSelector((s) => s.membership);
  const { loading: authLoading, error: authError } = useAppSelector(
    (s) => s.auth,
  );
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState(initialForm);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedAdditionalPlanIds, setSelectedAdditionalPlanIds] = useState<
    number[]
  >([]);
  const [activePlanCategory, setActivePlanCategory] =
    useState<string>("MEMBERSHIP");
  const [planCategories, setPlanCategories] = useState<PlanCategoryItem[]>([]);
  const [content, setContent] =
    useState<Required<RegistrationContent>>(DEFAULT_CONTENT);
  const [agreementChecks, setAgreementChecks] = useState([false, false]);
  const [termChecks, setTermChecks] = useState([false, false, false]);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const drawingRef = useRef(false);
  const [success, setSuccess] = useState("");
  const [localError, setLocalError] = useState("");
  const formShellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [membershipStartDate, setMembershipStartDate] = useState("");
  const [membershipEndDate, setMembershipEndDate] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState<
    "MONTHLY" | "QUARTERLY" | "YEARLY" | "UPFRONT"
  >("UPFRONT");
  const [contractMemberSig, setContractMemberSig] = useState("");
  const [guardianSig, setGuardianSig] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showGymRulesModal, setShowGymRulesModal] = useState(false);
  const [contractPdfBase64, setContractPdfBase64] = useState<
    string | undefined
  >();
  const [contractNumber] = useState(
    () => "CNT-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
  );
  const [customerNumber] = useState(
    () => "CUS-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
  );

  // Restore state after returning from the contract page.
  // Uses pageshow so it also fires when Next.js restores a cached page on router.back().
  useEffect(() => {
    function restoreContractResult() {
      const contractResultRaw = sessionStorage.getItem("gymContractResult");
      const formStateRaw = sessionStorage.getItem("gymRegState");
      if (!contractResultRaw || !formStateRaw) return;
      try {
        const contractResult = JSON.parse(contractResultRaw);
        const saved = JSON.parse(formStateRaw);
        setForm(saved.form);
        setSelectedPlanId(saved.selectedPlanId);
        setSelectedAdditionalPlanIds(saved.selectedAdditionalPlanIds);
        setActivePlanCategory(saved.activePlanCategory);
        setMembershipStartDate(saved.membershipStartDate);
        setMembershipEndDate(saved.membershipEndDate);
        setPaymentFrequency(saved.paymentFrequency);
        setStep(saved.step);
        setTermChecks(saved.termChecks);

        // Resolve PDF from window (fast) or sessionStorage fallback
        function takePdf(): string | undefined {
          const win = (window as unknown as Record<string, unknown>)
            .__gymContractPdf as string | undefined;
          if (win) {
            delete (window as unknown as Record<string, unknown>)
              .__gymContractPdf;
            return win;
          }
          const ss = sessionStorage.getItem("gymContractPdf") ?? undefined;
          if (ss) sessionStorage.removeItem("gymContractPdf");
          return ss;
        }

        if (
          contractResult.contractAccepted &&
          contractResult.contractMemberSig
        ) {
          setContractMemberSig(contractResult.contractMemberSig);
          if (contractResult.guardianSig)
            setGuardianSig(contractResult.guardianSig);
          const pdf =
            takePdf() ??
            contractResult.contractPdfBase64 ??
            contractResult.pdfBase64 ??
            contractResult.contractImageBase64;
          if (pdf) setContractPdfBase64(pdf);
          setSignatureDataUrl(contractResult.contractMemberSig);
          setAgreementChecks(
            (saved.agreementChecks as boolean[]).map((v, i) =>
              i === 0 ? true : v,
            ),
          );
        } else {
          setAgreementChecks(saved.agreementChecks);
          // Restore signatures and PDF even when just viewing
          if (saved.contractMemberSig) {
            setContractMemberSig(saved.contractMemberSig);
            setSignatureDataUrl(saved.contractMemberSig);
          }
          if (saved.guardianSig) setGuardianSig(saved.guardianSig);
          const pdf = takePdf();
          if (pdf) setContractPdfBase64(pdf);
        }
      } catch {}
      sessionStorage.removeItem("gymContractResult");
      sessionStorage.removeItem("gymRegState");
    }

    restoreContractResult();
    // pageshow fires on bfcache restore (Next.js router.back() cached page)
    window.addEventListener("pageshow", restoreContractResult);
    return () => window.removeEventListener("pageshow", restoreContractResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(fetchPlans());
    api
      .get("/content/text/registration")
      .then((res) => setContent({ ...DEFAULT_CONTENT, ...res.data }))
      .catch(() => {});
    api
      .get("/content/plan-categories")
      .then((res) => setPlanCategories(res.data))
      .catch(() => {});
    return () => {
      dispatch(clearError());
      dispatch(clearMembershipMessages());
    };
  }, [dispatch]);

  useEffect(() => {
    const dialogContent = formShellRef.current?.closest(
      '[data-slot="dialog-content"]',
    );
    dialogContent?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (step !== 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#ffffff";
    };

    const rafId = requestAnimationFrame(initCanvas);
    const ro = new ResizeObserver(initCanvas);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [step]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const registrationFee = Number(content.registration_fee) || 0;
  const discountAmount = Math.max(0, Number(content.discount_amount) || 0);
  const discountLabel = content.discount_label || "Discount";

  const currency = selectedPlan?.currency || content.registration_currency;

  const isMinor = useMemo(() => {
    if (!form.dateOfBirth) return false;
    const birth = new Date(form.dateOfBirth);
    const today = new Date();
    const age =
      today.getFullYear() -
      birth.getFullYear() -
      (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() < birth.getDate())
        ? 1
        : 0);
    return age < 18;
  }, [form.dateOfBirth]);

  const additionalPlans = useMemo(
    () => plans.filter((p) => p.category === "ADDITIONAL"),
    [plans],
  );
  const selectedAdditionalPlans = additionalPlans.filter((p) =>
    selectedAdditionalPlanIds.includes(p.id),
  );

  // Auto-calculate end date when plan, additional plans, or start date changes.
  // Combines durations of main plan + all additional plans.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (membershipStartDate && selectedPlan) {
      const mainMonths = parseDurationToMonths(selectedPlan.duration);
      const addMonths = selectedAdditionalPlans.reduce(
        (sum, p) => sum + parseDurationToMonths(p.duration),
        0,
      );
      const totalMonths = mainMonths + addMonths;
      if (totalMonths > 0) {
        const start = new Date(membershipStartDate + "T00:00:00");
        if (!Number.isNaN(start.getTime())) {
          start.setMonth(start.getMonth() + totalMonths);
          setMembershipEndDate(start.toISOString().slice(0, 10));
        } else {
          setMembershipEndDate("");
        }
      } else {
        // Fallback to main plan's own parsed end date
        setMembershipEndDate(
          parseDurationToEndDate(membershipStartDate, selectedPlan.duration),
        );
      }
    } else {
      setMembershipEndDate("");
    }
  }, [membershipStartDate, selectedPlan, selectedAdditionalPlans]);

  const additionalTotal = selectedAdditionalPlans.reduce(
    (sum, p) => sum + p.price,
    0,
  );
  const subtotal =
    (selectedPlan?.price ?? 0) + additionalTotal + registrationFee;
  const total = Math.max(0, subtotal - discountAmount);

  // Total duration in months: main plan + all additional plans combined
  const totalPlanMonths =
    parseDurationToMonths(selectedPlan?.duration ?? "") +
    selectedAdditionalPlans.reduce(
      (sum, p) => sum + parseDurationToMonths(p.duration),
      0,
    );

  // Membership cost (excluding registration fee, after discount)
  const membershipNetCost = Math.max(0, total - registrationFee);

  // Frequency-adjusted total: if admin set explicit monthly/quarterly prices,
  // the real total the user pays is different (higher) than the upfront price.
  const frequencyAdjustedTotal = (() => {
    if (!selectedPlan || totalPlanMonths <= 0 || paymentFrequency === "UPFRONT")
      return total;
    if (
      paymentFrequency === "MONTHLY" &&
      selectedPlan.monthlyPrice != null &&
      selectedPlan.monthlyPrice > 0
    ) {
      return Math.max(
        0,
        selectedPlan.monthlyPrice * totalPlanMonths +
          additionalTotal +
          registrationFee -
          discountAmount,
      );
    }
    if (
      paymentFrequency === "QUARTERLY" &&
      selectedPlan.quarterlyPrice != null &&
      selectedPlan.quarterlyPrice > 0
    ) {
      const quarters = Math.floor(totalPlanMonths / 3);
      return Math.max(
        0,
        selectedPlan.quarterlyPrice * quarters +
          additionalTotal +
          registrationFee -
          discountAmount,
      );
    }
    return total;
  })();

  // Auto-reset payment frequency if it becomes invalid for the current duration
  useEffect(() => {
    if (
      totalPlanMonths > 0 &&
      totalPlanMonths < 3 &&
      paymentFrequency !== "MONTHLY" &&
      paymentFrequency !== "UPFRONT"
    ) {
      setPaymentFrequency("UPFRONT");
    } else if (
      totalPlanMonths >= 3 &&
      totalPlanMonths < 12 &&
      paymentFrequency === "YEARLY"
    ) {
      setPaymentFrequency("QUARTERLY");
    }
  }, [totalPlanMonths, paymentFrequency]);

  // Per-period payment amount based on frequency and total months
  function calcPerPeriod(
    freq: "MONTHLY" | "QUARTERLY" | "YEARLY" | "UPFRONT",
  ): number | null {
    if (freq === "UPFRONT" || totalPlanMonths <= 0 || !selectedPlan)
      return null;
    const fallbackMonthly = membershipNetCost / totalPlanMonths;

    if (freq === "MONTHLY") {
      // Use plan's explicit monthly price if set by admin
      if (selectedPlan.monthlyPrice != null && selectedPlan.monthlyPrice > 0)
        return selectedPlan.monthlyPrice;
      return fallbackMonthly;
    }
    if (freq === "QUARTERLY") {
      if (totalPlanMonths < 3) return null;
      // Use plan's explicit quarterly price if set by admin
      if (
        selectedPlan.quarterlyPrice != null &&
        selectedPlan.quarterlyPrice > 0
      )
        return selectedPlan.quarterlyPrice;
      return fallbackMonthly * 3;
    }
    // YEARLY
    if (totalPlanMonths < 12) return null;
    return fallbackMonthly * 12;
  }

  const isBusy = authLoading || purchaseLoading;

  // All categories in one tab bar — driven by planCategories so empty ones still show
  const groupedPlans = useMemo(() => {
    return planCategories.map((cat) => ({
      key: cat.name,
      label: cat.label,
      title: cat.label,
      items: plans.filter((p) => p.category === cat.name),
    }));
  }, [plans, planCategories]);
  const selectedPlanGroup =
    groupedPlans.find((group) => group.key === activePlanCategory) ??
    groupedPlans[0];

  // Update activePlanCategory when grouped plans change
  useEffect(() => {
    if (
      !groupedPlans.some((g) => g.key === activePlanCategory) &&
      groupedPlans.length > 0
    ) {
      setActivePlanCategory(groupedPlans[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedPlans]);

  function toggleAdditionalPlan(planId: number) {
    setSelectedAdditionalPlanIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId],
    );
  }

  function updateForm(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validateStep(current: Step) {
    setLocalError("");
    if (current === 0) {
      if (
        !form.firstName ||
        !form.lastName ||
        !form.email ||
        !form.password ||
        !form.phone
      ) {
        setLocalError(
          "First name, last name, email, password, and phone are required.",
        );
        return false;
      }
      if (form.password.length < 6) {
        setLocalError("Password must be at least 6 characters.");
        return false;
      }
    }
    if (current === 1) {
      if (!selectedPlan) {
        setLocalError("Please select a membership plan.");
        return false;
      }
      if (!membershipStartDate) {
        setLocalError("Please select a start date for your membership.");
        return false;
      }
    }
    if (current === 2 && agreementChecks.some((checked) => !checked)) {
      setLocalError("Please accept both agreement confirmations.");
      return false;
    }
    if (current === 3) {
      if (termChecks.some((checked) => !checked)) {
        setLocalError("Please accept all terms and confirmations.");
        return false;
      }
      if (!signatureDataUrl) {
        setLocalError("Please draw your signature.");
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, 3) as Step);
  }

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    drawingRef.current = true;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setSignatureDataUrl(canvasRef.current?.toDataURL("image/png") || "");
  }

  function endDraw() {
    drawingRef.current = false;
    setSignatureDataUrl(canvasRef.current?.toDataURL("image/png") || "");
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
  }

  function openContractPage() {
    const state = {
      form,
      selectedPlanId,
      selectedAdditionalPlanIds,
      membershipStartDate,
      membershipEndDate,
      paymentFrequency,
      periodicAmount: calcPerPeriod(paymentFrequency),
      step,
      activePlanCategory,
      agreementChecks,
      termChecks,
      contractNumber,
      customerNumber,
      isMinor,
      currency,
      registrationFee,
      discountAmount,
      discountLabel,
      total: frequencyAdjustedTotal,
      planCategories,
      contractMemberSig,
      guardianSig,
      selectedPlan: selectedPlan ?? null,
      selectedAdditionalPlans: selectedAdditionalPlans.map((p) => ({
        id: p.id,
        name: p.name,
        duration: p.duration,
        price: p.price,
        currency: p.currency,
        features: p.features,
        category: p.category,
      })),
      plans: plans
        .filter((p) => p.category !== "ADDITIONAL")
        .map((p) => ({
          id: p.id,
          name: p.name,
          duration: p.duration,
          price: p.price,
          currency: p.currency,
          features: p.features,
          category: p.category,
        })),
    };
    sessionStorage.setItem("gymRegState", JSON.stringify(state));
    // Preserve existing PDF across navigation so it survives the round-trip
    if (contractPdfBase64) {
      (window as unknown as Record<string, unknown>).__gymContractPdf =
        contractPdfBase64;
    }
    router.push("/membership/contract");
  }

  function downloadContractPdf() {
    if (contractPdfBase64) {
      // Direct download — PDF was captured during signing
      const link = document.createElement("a");
      link.href = contractPdfBase64;
      link.download = `membership-contract-${contractNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF not cached — open contract page in print mode so browser generates the PDF
      sessionStorage.setItem("gymContractPrintMode", "1");
      openContractPage();
    }
  }

  async function submit() {
    if (!validateStep(3) || !selectedPlan) return;
    setSuccess("");
    const registration = await dispatch(
      registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
        goal: form.goal || undefined,
        experience: form.experience || undefined,
      }),
    );

    if (!registerUser.fulfilled.match(registration)) return;

    const purchase = await dispatch(
      purchaseMembership({
        planId: selectedPlan.id,
        additionalPlanIds: selectedAdditionalPlanIds,
        registrationFee,
        totalAmount: frequencyAdjustedTotal,
        signatureDataUrl,
        paymentFrequency,
        registrationDetails: {
          startDate: membershipStartDate,
          endDate: membershipEndDate,
          emergencyContact: form.emergencyContact,
          address: form.address,
          acceptedAgreement: agreementChecks.every(Boolean),
          acceptedTerms: termChecks.every(Boolean),
          contractNumber,
          customerNumber,
          guardianSignatureDataUrl: guardianSig || undefined,
        },
      }),
    );

    if (purchaseMembership.fulfilled.match(purchase)) {
      // Fire-and-forget: send signed agreement PDF to user + gym owner
      api
        .post("/membership/send-agreement-email", {
          contractNumber,
          customerNumber,
          memberName: `${form.firstName} ${form.lastName}`,
          email: form.email,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          emergencyContact: form.emergencyContact,
          planName: selectedPlan.name || selectedPlan.duration,
          planDuration: selectedPlan.duration,
          planPrice: selectedPlan.price,
          currency,
          additionalPlans: selectedAdditionalPlans.map((p) => ({
            name: p.name || p.duration,
            duration: p.duration,
            price: p.price,
          })),
          registrationFee,
          discountAmount,
          discountLabel,
          total: frequencyAdjustedTotal,
          startDate: membershipStartDate,
          endDate: membershipEndDate,
          paymentFrequency,
          periodicAmount: calcPerPeriod(paymentFrequency),
          signatureDataUrl,
          guardianSignatureDataUrl: guardianSig || undefined,
          isMinor,
          ...(contractPdfBase64?.startsWith("data:application/pdf")
            ? { contractPdfBase64 }
            : { contractImageBase64: contractPdfBase64 }),
        })
        .catch((err) => console.error("Agreement email error:", err));

      setSuccess(
        "Registration submitted successfully. Awaiting admin approval.",
      );
      setTimeout(() => onComplete?.(), 1400);
    }
  }

  const error = localError || authError || planError;

  return (
    <div
      ref={formShellRef}
      className="mx-auto w-full max-w-[1140px] text-white flex flex-col"
    >
      <div className="sticky top-0 z-10 bg-[#08010a] px-2 sm:px-4 md:px-6 lg:px-8 pt-4 pb-3 text-center border-b border-white/5">
        <h2 className="text-xl font-bold tracking-wide sm:text-2xl">
          Membership Registration
        </h2>
        <div className="mx-auto mt-2 grid max-w-3xl grid-cols-4 gap-2">
          {STEPS.map((label, index) => {
            const active = index <= step;
            return (
              <div key={label} className="relative text-center">
                <div
                  className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                    active
                      ? "border-red-500 bg-red-700 text-white"
                      : "border-white/15 bg-white/10 text-white/40"
                  }`}
                >
                  {index < step ? <Check size={15} /> : index + 1}
                </div>
                <p className="text-[10px] leading-tight text-white/60 sm:text-[11px]">
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-3">
        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-green-500/40 bg-green-950/40 px-3 py-2 text-sm text-green-200">
            {success}
          </div>
        )}

        {step === 0 && (
          <div className="flex flex-col md:grid items-stretch gap-3 md:gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)]">
            {/* Hide image on small screens */}
            <div className="hidden md:flex h-full items-stretch justify-center rounded-xl border border-white/10 bg-black/50 overflow-hidden">
              <Image
                src="/about-hero-image.png"
                alt="Member profile"
                width={503}
                height={622}
                className="object-cover w-full h-full rounded-sm"
                priority
              />
            </div>
            <div className="flex flex-col justify-center w-full md:w-auto">
              <div className="space-y-1 w-full max-w-md mx-auto md:w-[80%] md:mx-5">
                <Field
                  label="First Name"
                  name="firstName"
                  value={form.firstName}
                  onChange={updateForm}
                  required
                />
                <Field
                  label="Last Name"
                  name="lastName"
                  value={form.lastName}
                  onChange={updateForm}
                  required
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  required
                />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateForm}
                  required
                />
                <Field
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateForm}
                  required
                />
                <div>
                  <Label className="mb-1 block text-white/70">
                    Date of Birth
                  </Label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={updateForm}
                    style={{ colorScheme: "dark" }}
                    className="h-8 py-0.5 w-full rounded-md border border-white/10 bg-[#18181b] px-3 pr-8 text-sm shadow-xs text-white focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-white/70">Gender</Label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={updateForm}
                    className="h-8 py-0.5 w-full rounded-md border border-white/10 bg-[#18181b] px-3 pr-8 text-sm shadow-xs text-white appearance-none bg-[url('data:image/svg+xml,%3Csvg width='16' height='16' fill='none' stroke='white' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:1.25em_1.25em] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block text-white/70">Street</Label>
                  <input
                    name="street"
                    type="text"
                    value={form.street}
                    onChange={updateForm}
                    className="h-8 py-0.5 w-full rounded-md border border-white/10 bg-[#18181b] px-3 pr-8 text-sm shadow-xs text-white appearance-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </div>
                <div className="mt-2">
                  <Label className="mb-1 block text-white/70">Location</Label>
                  <input
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={updateForm}
                    className="h-8 py-0.5 w-full rounded-md border border-white/10 bg-[#18181b] px-3 pr-8 text-sm shadow-xs text-white appearance-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </div>
                <div className="mt-2">
                  <Label className="mb-1 block text-white/70">
                    Postal Code
                  </Label>
                  <input
                    name="postalCode"
                    type="text"
                    value={form.postalCode}
                    onChange={updateForm}
                    className="h-8 py-0.5 w-full rounded-md border border-white/10 bg-[#18181b] px-3 pr-8 text-sm shadow-xs text-white appearance-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_280px] w-full items-start">
            <div className="space-y-4 min-w-0">
              {plansLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading plans
                </div>
              ) : groupedPlans.every((group) => group.items.length === 0) ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center text-white/60">
                  No active plans are available right now.
                </div>
              ) : (
                <div>
                  {/* Tab bar: Annual | Short Term | Additional */}
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
                            selectedAdditionalPlanIds.length > 0 && (
                              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                                {selectedAdditionalPlanIds.length}
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <h3 className="mb-4 text-center text-base font-semibold sm:text-lg">
                    {selectedPlanGroup?.title ?? "Select a Plan"}
                    {activePlanCategory === "ADDITIONAL" && (
                      <span className="ml-2 text-sm font-normal text-white/40">
                        (optional — select multiple)
                      </span>
                    )}
                  </h3>

                  {!selectedPlanGroup ||
                  selectedPlanGroup.items.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center text-white/60">
                      No plans available in this category.
                    </div>
                  ) : activePlanCategory === "ADDITIONAL" ? (
                    /* Additional tab — multi-select */
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      {selectedPlanGroup.items.map((plan) => {
                        const isSelected = selectedAdditionalPlanIds.includes(
                          plan.id,
                        );
                        return (
                          <button
                            type="button"
                            key={plan.id}
                            onClick={() => toggleAdditionalPlan(plan.id)}
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
                    /* Annual / Short Term tab — single select */
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      {selectedPlanGroup.items.map((plan) => {
                        const selected = selectedPlanId === plan.id;
                        const today = new Date().toISOString().slice(0, 10);
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
                            {selected && (
                              <div
                                className="mt-4 border-t border-white/10 pt-3 space-y-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div>
                                  <p className="mb-1 text-xs text-white/50">
                                    Start Date *
                                  </p>
                                  <input
                                    type="date"
                                    min={today}
                                    value={membershipStartDate}
                                    onChange={(e) =>
                                      setMembershipStartDate(e.target.value)
                                    }
                                    style={{ colorScheme: "dark" }}
                                    className="h-8 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-700/50"
                                  />
                                </div>
                                <div>
                                  <p className="mb-1 text-xs text-white/50">
                                    End Date
                                  </p>
                                  <p
                                    className={`h-8 flex items-center rounded-md border border-white/10 bg-black/40 px-3 text-sm ${
                                      membershipEndDate
                                        ? "text-white/80"
                                        : "text-white/30 italic"
                                    }`}
                                  >
                                    {membershipEndDate
                                      ? formatDate(membershipEndDate)
                                      : "Pick a start date"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
              <TotalBox
                currency={currency}
                plan={selectedPlan}
                additionalPlans={selectedAdditionalPlans}
                registrationFee={registrationFee}
                discountAmount={discountAmount}
                discountLabel={discountLabel}
                total={frequencyAdjustedTotal}
                upfrontTotal={total}
                paymentFrequency={paymentFrequency}
                totalPlanMonths={totalPlanMonths}
              />
              {/* Payment Frequency Selector */}
              <div className="rounded-lg border border-white/10 bg-[#120817] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Payment Frequency
                </p>
                <div className="flex flex-col gap-1.5">
                  {[
                    {
                      value: "UPFRONT" as const,
                      label: "Yearly",
                      unit: "" as const,
                      minMonths: 1,
                    },
                    {
                      value: "MONTHLY" as const,
                      label: "Monthly",
                      unit: "/mo" as const,
                      minMonths: 1,
                    },
                    {
                      value: "QUARTERLY" as const,
                      label: "Quarterly",
                      unit: "/qtr" as const,
                      minMonths: 3,
                    },
                  ]
                    .filter(
                      ({ minMonths }) =>
                        totalPlanMonths === 0 || totalPlanMonths >= minMonths,
                    )
                    .map(({ value, label, unit }) => {
                      const periodAmt =
                        value === "UPFRONT" ? total : calcPerPeriod(value);
                      const displayAmt =
                        value === "UPFRONT" ? total : periodAmt;
                      const displayUnit = value === "UPFRONT" ? "" : unit;
                      return (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition ${
                            paymentFrequency === value
                              ? "border-red-500 bg-red-950/40"
                              : "border-white/10 bg-white/5 hover:border-white/25"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentFrequency"
                            value={value}
                            checked={paymentFrequency === value}
                            onChange={() => setPaymentFrequency(value)}
                            className="sr-only"
                          />
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                              paymentFrequency === value
                                ? "border-red-500 bg-red-600"
                                : "border-white/30"
                            }`}
                          >
                            {paymentFrequency === value && (
                              <span className="h-1 w-1 rounded-full bg-white" />
                            )}
                          </span>
                          <span className="flex-1 text-xs font-medium text-white">
                            {label}
                          </span>
                          {periodAmt !== null && (
                            <span className="text-xs font-semibold text-white/80">
                              {money(currency, displayAmt!)}
                              {displayUnit && (
                                <span className="text-white/40 font-normal ml-0.5">
                                  {displayUnit}
                                </span>
                              )}
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
              <div className="flex gap-3 justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() =>
                    setStep((prev) => Math.max(prev - 1, 0) as Step)
                  }
                  className="border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={goNext}
                  className="btn-gradient text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_320px] w-full max-w-4xl mx-auto">
            {/* Left: agreement */}
            <div className="rounded-lg bg-white/5 p-5">
              <div className="mb-4 inline-flex flex-col gap-2">
                <span className="bg-white/10 px-4 py-2 text-2xl">
                  Client:{" "}
                  {form.firstName ? `${form.firstName} ${form.lastName}` : "-"}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/65">
                {content.agreement_text}
              </p>
              <div className="mt-5 space-y-3 rounded-md bg-white/10 p-4">
                {/* First checkbox: clicking opens the full contract modal */}
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-white/80">
                  <Checkbox
                    checked={agreementChecks[0]}
                    onCheckedChange={() => openContractPage()}
                    className="mt-0.5 border-white/30 data-[state=checked]:bg-red-700"
                  />
                  <span>
                    {content.agreement_checkbox_1}{" "}
                    <button
                      type="button"
                      onClick={() => openContractPage()}
                      className="underline text-red-400 hover:text-red-300 text-xs font-medium ml-1"
                    >
                      {agreementChecks[0]
                        ? "(view contract)"
                        : "View & Sign Contract →"}
                    </button>
                    {agreementChecks[0] && (
                      <button
                        type="button"
                        onClick={downloadContractPdf}
                        className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-green-400 hover:text-green-300 underline transition-colors"
                      >
                        ↓ Download PDF
                      </button>
                    )}
                  </span>
                </label>
                {/* Second checkbox: normal */}
                <CheckRow
                  label={content.agreement_checkbox_2}
                  checked={agreementChecks[1]}
                  onCheckedChange={(checked) =>
                    setAgreementChecks((prev) =>
                      prev.map((item, i) => (i === 1 ? checked : item)),
                    )
                  }
                />
              </div>
            </div>
            {/* Right: total */}
            <div className="flex flex-col justify-start">
              <TotalBox
                currency={currency}
                plan={selectedPlan}
                additionalPlans={selectedAdditionalPlans}
                registrationFee={registrationFee}
                discountAmount={discountAmount}
                discountLabel={discountLabel}
                total={frequencyAdjustedTotal}
                upfrontTotal={total}
                paymentFrequency={paymentFrequency}
                totalPlanMonths={totalPlanMonths}
              />
            </div>
          </div>
        )}

        {showGymRulesModal && (
          <Dialog open={showGymRulesModal} onOpenChange={setShowGymRulesModal}>
            <DialogContent className="bg-[#0f0a14] border border-white/10 text-white max-w-2xl w-full max-h-[75vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                <DialogTitle className="text-lg font-bold text-white">
                  Gym Rules &amp; Health Responsibility Policy
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-white/75 leading-relaxed">
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    1. General Conduct
                  </h3>
                  <p>
                    All members must treat staff, fellow members, and equipment
                    with respect at all times. Harassment, aggressive behaviour,
                    or intimidation of any kind will result in immediate
                    termination of membership without refund.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    2. Dress Code &amp; Hygiene
                  </h3>
                  <p>
                    Appropriate gym attire and closed-toe athletic footwear must
                    be worn at all times on the gym floor. Members are expected
                    to maintain personal hygiene. Use of a personal towel during
                    workouts is mandatory.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    3. Equipment Use
                  </h3>
                  <p>
                    All equipment must be used for its intended purpose and
                    returned to its designated place after use. Weights must be
                    re-racked after every set. Dropping weights carelessly is
                    not permitted. Members must wipe down equipment with the
                    provided disinfectant spray after each use.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    4. Time Limits &amp; Sharing
                  </h3>
                  <p>
                    During peak hours, members may be asked to share equipment
                    or limit their time on a single machine to 30 minutes.
                    Reserving equipment while not actively using it is not
                    permitted.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    5. Mobile Phones &amp; Photography
                  </h3>
                  <p>
                    Phone calls should be taken outside the workout areas.
                    Photography or video recording of other members without
                    their explicit consent is strictly prohibited and may result
                    in membership termination.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    6. Health Responsibility
                  </h3>
                  <p>
                    Members are responsible for their own health and safety
                    during gym use. By accepting this policy, you confirm that
                    you are in a suitable physical condition to participate in
                    exercise and have consulted a qualified medical professional
                    if you have any pre-existing medical conditions, injuries,
                    or health concerns.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    7. Liability Waiver
                  </h3>
                  <p>
                    The gym and its staff shall not be held liable for any
                    injury, illness, accident, or loss of personal property
                    sustained during your use of the facilities. You voluntarily
                    assume all risks associated with gym participation. Members
                    exercise entirely at their own risk.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    8. Emergency Procedures
                  </h3>
                  <p>
                    In case of a medical emergency, notify gym staff
                    immediately. Do not attempt to move an injured person unless
                    trained to do so. First-aid kits and defibrillators are
                    located at the front desk. Emergency exits are clearly
                    marked throughout the facility.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    9. Prohibited Substances
                  </h3>
                  <p>
                    The use of illegal performance-enhancing drugs or any
                    controlled substances on gym premises is strictly
                    prohibited. Members found in violation of this rule will
                    have their membership revoked immediately and the incident
                    may be reported to relevant authorities.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    10. Compliance
                  </h3>
                  <p>
                    All members are expected to follow the instructions of gym
                    staff at all times. Failure to comply with these rules may
                    result in a warning, suspension, or permanent termination of
                    membership at the discretion of management.
                  </p>
                </section>
              </div>
              <div className="px-6 py-4 border-t border-white/10 shrink-0 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGymRulesModal(false)}
                  className="border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTermChecks((prev) =>
                      prev.map((item, i) => (i === 1 ? true : item)),
                    );
                    setShowGymRulesModal(false);
                  }}
                  className="btn-gradient text-white flex-1"
                >
                  I Accept the Gym Rules &amp; Health Responsibility Policy
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showTermsModal && (
          <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
            <DialogContent className="bg-[#0f0a14] border border-white/10 text-white max-w-2xl w-full max-h-[75vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                <DialogTitle className="text-lg font-bold text-white">
                  Membership Terms &amp; Conditions
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-white/75 leading-relaxed">
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    1. Membership Agreement
                  </h3>
                  <p>
                    By joining, you enter into a binding membership agreement
                    with the gym. The membership starts from your selected start
                    date and remains valid for the agreed duration. Membership
                    fees are non-refundable once the membership period begins.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    2. Payment Terms
                  </h3>
                  <p>
                    All fees must be paid in advance according to the selected
                    payment frequency (monthly, quarterly, or yearly). Failure
                    to pay may result in suspension or termination of
                    membership. Late payments may incur additional charges.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    3. Gym Rules &amp; House Rules
                  </h3>
                  <p>
                    Members must conduct themselves respectfully at all times.
                    Proper gym attire and footwear are required. Equipment must
                    be returned to its designated place after use. Aggressive or
                    unsafe behaviour will result in immediate termination of
                    membership without refund.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    4. Health &amp; Safety Responsibility
                  </h3>
                  <p>
                    You confirm that you are in good physical health and have
                    consulted a medical professional if required before
                    commencing any exercise program. The gym will not be held
                    liable for any injury, illness, or loss of personal property
                    during your use of the facilities. You exercise at your own
                    risk.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    5. Cancellation Policy
                  </h3>
                  <p>
                    Memberships may be cancelled with a written notice of at
                    least 30 days before the next billing cycle. Early
                    termination fees may apply. Monthly memberships cannot be
                    cancelled mid-cycle; cancellation takes effect at the end of
                    the current period.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    6. Freeze &amp; Suspension
                  </h3>
                  <p>
                    Members may request a membership freeze for medical reasons
                    with valid documentation. Freeze periods extend the
                    membership end date accordingly. Abuse of freeze requests
                    may result in membership termination.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    7. Guest Policy
                  </h3>
                  <p>
                    Guests are only permitted when accompanied by an active
                    member and subject to a guest fee. Guest visits are limited
                    per month and guests must register at reception. Members are
                    responsible for the behaviour of their guests.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    8. Privacy &amp; Data
                  </h3>
                  <p>
                    Your personal data will be processed in accordance with our
                    Privacy Policy. We collect and store data necessary to
                    manage your membership and may contact you with relevant
                    information about your account or facility updates.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold text-white mb-1">
                    9. Amendments
                  </h3>
                  <p>
                    The gym reserves the right to amend these terms at any time.
                    Members will be notified of significant changes with
                    reasonable notice. Continued use of the facilities after
                    notification constitutes acceptance of the updated terms.
                  </p>
                </section>
              </div>
              <div className="px-6 py-4 border-t border-white/10 shrink-0 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTermsModal(false)}
                  className="border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTermChecks((prev) =>
                      prev.map((item, i) => (i === 0 ? true : item)),
                    );
                    setShowTermsModal(false);
                  }}
                  className="btn-gradient text-white flex-1"
                >
                  I Agree to the Terms &amp; Conditions
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {step === 3 && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_320px] w-full max-w-4xl mx-auto">
            {/* Left: terms + signature */}
            <div className="space-y-4">
              <div className="rounded-lg bg-white/5 p-4">
                <p className="mb-4 text-sm leading-relaxed text-white/65">
                  {content.terms_text}
                </p>
                <div className="space-y-3 rounded-md bg-white/10 p-4">
                  {/* First checkbox opens terms modal */}
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-white/80">
                    <Checkbox
                      checked={termChecks[0]}
                      onCheckedChange={() => {
                        if (!termChecks[0]) {
                          setShowTermsModal(true);
                        } else {
                          setTermChecks((prev) =>
                            prev.map((item, i) => (i === 0 ? false : item)),
                          );
                        }
                      }}
                      className="mt-0.5 border-white/30 data-[state=checked]:bg-red-700"
                    />
                    <span>
                      {content.terms_checkbox_1}{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="underline text-red-400 hover:text-red-300 text-xs font-medium ml-1"
                      >
                        {termChecks[0] ? "(view terms)" : "Read Terms →"}
                      </button>
                    </span>
                  </label>
                  {/* Second checkbox — opens gym rules & health responsibility modal */}
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-white/80">
                    <Checkbox
                      checked={termChecks[1]}
                      onCheckedChange={() => {
                        if (!termChecks[1]) {
                          setShowGymRulesModal(true);
                        } else {
                          setTermChecks((prev) =>
                            prev.map((item, i) => (i === 1 ? false : item)),
                          );
                        }
                      }}
                      className="mt-0.5 border-white/30 data-[state=checked]:bg-red-700"
                    />
                    <span>
                      {content.terms_checkbox_2}{" "}
                      <button
                        type="button"
                        onClick={() => setShowGymRulesModal(true)}
                        className="underline text-red-400 hover:text-red-300 text-xs font-medium ml-1"
                      >
                        {termChecks[1] ? "(view rules)" : "Read Rules →"}
                      </button>
                    </span>
                  </label>
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                {signatureDataUrl ? (
                  <div>
                    <Label className="text-white/70 mb-2 block">
                      Your Signature{" "}
                      <span className="text-green-400 text-xs">
                        (signed via contract)
                      </span>
                    </Label>
                    <div className="h-28 w-full rounded-md border border-white/10 bg-[#111] overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signatureDataUrl}
                        alt="Your signature"
                        className="h-full w-full object-contain"
                        style={{ filter: "invert(1)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-28 w-full rounded-md border border-white/10 bg-[#111] flex items-center justify-center text-white/30 text-sm">
                    No signature found — please complete the contract step.
                  </div>
                )}
                <div className="mt-4 rounded-md bg-white/10 p-3">
                  <CheckRow
                    label={content.terms_final_checkbox}
                    checked={termChecks[2]}
                    onCheckedChange={(checked) =>
                      setTermChecks((prev) =>
                        prev.map((item, i) => (i === 2 ? checked : item)),
                      )
                    }
                  />
                </div>
              </div>
            </div>
            {/* Right: total */}
            <div className="flex flex-col justify-start">
              <TotalBox
                currency={currency}
                plan={selectedPlan}
                additionalPlans={selectedAdditionalPlans}
                registrationFee={registrationFee}
                discountAmount={discountAmount}
                discountLabel={discountLabel}
                total={frequencyAdjustedTotal}
                upfrontTotal={total}
                paymentFrequency={paymentFrequency}
                totalPlanMonths={totalPlanMonths}
              />
            </div>
          </div>
        )}

        <div
          className={`mt-3 flex gap-3 w-full max-w-4xl mx-auto ${step === 1 ? "hidden" : step === 0 ? "justify-end" : "justify-between"}`}
        >
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setStep((prev) => Math.max(prev - 1, 0) as Step)}
              className="border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              className="btn-gradient text-white"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={isBusy || !!success}
              className="btn-gradient text-white"
            >
              {isBusy ? "Submitting..." : "Sign & Confirm"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1 block text-white/70">
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="border-white/10 bg-[#18181b] text-white"
      />
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-white/80">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5 border-white/30 data-[state=checked]:bg-red-700"
      />
      <span>{label}</span>
    </label>
  );
}

function TotalBox({
  currency,
  plan,
  additionalPlans,
  registrationFee,
  discountAmount,
  discountLabel,
  total,
  upfrontTotal,
  paymentFrequency,
  totalPlanMonths,
}: {
  currency: string;
  plan: MembershipPlan | null;
  additionalPlans: MembershipPlan[];
  registrationFee: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  upfrontTotal?: number;
  paymentFrequency?: "MONTHLY" | "QUARTERLY" | "YEARLY" | "UPFRONT";
  totalPlanMonths?: number;
}) {
  const membershipNet = Math.max(0, total - registrationFee);
  const months = totalPlanMonths ?? 0;
  const monthlyRate = months > 0 && plan ? membershipNet / months : null;

  const freqLabel =
    paymentFrequency === "MONTHLY"
      ? "Monthly"
      : paymentFrequency === "QUARTERLY"
        ? "Quarterly"
        : paymentFrequency === "YEARLY"
          ? "Yearly"
          : null;
  const freqUnit =
    paymentFrequency === "MONTHLY"
      ? "/mo"
      : paymentFrequency === "QUARTERLY"
        ? "/qtr"
        : "/yr";
  const freqMultiplier =
    paymentFrequency === "MONTHLY"
      ? 1
      : paymentFrequency === "QUARTERLY"
        ? 3
        : 12;
  const periodAmount = (() => {
    if (monthlyRate === null || !paymentFrequency || !plan) return null;
    if (
      paymentFrequency === "MONTHLY" &&
      plan.monthlyPrice != null &&
      plan.monthlyPrice > 0
    )
      return plan.monthlyPrice;
    if (
      paymentFrequency === "QUARTERLY" &&
      plan.quarterlyPrice != null &&
      plan.quarterlyPrice > 0
    )
      return plan.quarterlyPrice;
    return monthlyRate * freqMultiplier;
  })();

  // Detect if frequency-adjusted total differs from upfront
  const hasFrequencyPremium =
    upfrontTotal !== undefined && Math.abs(total - upfrontTotal) > 0.001;

  const freqPaymentsLabel = (() => {
    if (!hasFrequencyPremium || !paymentFrequency || months === 0) return null;
    if (paymentFrequency === "MONTHLY")
      return `${months} monthly payment${months !== 1 ? "s" : ""}`;
    if (paymentFrequency === "QUARTERLY") {
      const q = Math.floor(months / 3);
      return `${q} quarterly payment${q !== 1 ? "s" : ""}`;
    }
    return null;
  })();

  return (
    <div className="rounded-lg border border-white/10 bg-[#120817] p-4">
      <div className="flex items-center justify-between gap-4 text-sm text-white/65">
        <span>{plan ? planTitle(plan) : "Selected plan"}</span>
        <span>{plan ? money(currency, plan.price) : "-"}</span>
      </div>
      {additionalPlans.map((ap) => (
        <div
          key={ap.id}
          className="mt-2 flex items-center justify-between gap-4 text-sm text-white/65"
        >
          <span>+ {planTitle(ap)}</span>
          <span>{money(ap.currency, ap.price)}</span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between gap-4 text-sm text-white/65">
        <span>Fixed registration fee</span>
        <span>{money(currency, registrationFee)}</span>
      </div>
      {discountAmount > 0 && plan && (
        <div className="mt-2 flex items-center justify-between gap-4 text-sm text-green-400">
          <span>{discountLabel}</span>
          <span>- {money(currency, discountAmount)}</span>
        </div>
      )}

      {hasFrequencyPremium && upfrontTotal !== undefined ? (
        /* Frequency-adjusted pricing: show upfront (muted) + frequency total (highlighted) */
        <div className="mt-3 border-t border-white/10 pt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-sm text-white/30 line-through">
            <span>Upfront total</span>
            <span>{money(currency, upfrontTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-base font-bold text-red-400">
            <span>
              Total
              {freqPaymentsLabel && (
                <span className="text-xs font-normal text-red-400/70 ml-1">
                  ({freqPaymentsLabel})
                </span>
              )}
            </span>
            <span>{money(currency, total)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-base font-bold">
          <span>Total (full duration)</span>
          <span>{money(currency, total)}</span>
        </div>
      )}

      {months > 0 && plan && (
        <div className="mt-1 flex items-center justify-between gap-4 text-xs text-white/35">
          <span>Duration</span>
          <span>
            {months} month{months !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {periodAmount !== null && freqLabel && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-1.5 text-[10px] text-white/35 uppercase tracking-wider font-medium">
            You pay ({freqLabel})
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold text-white">
              {money(currency, periodAmount)}
            </span>
            <span className="text-xs text-white/40">{freqUnit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-xs">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="font-medium text-gray-900 break-all">{value}</span>
    </div>
  );
}
