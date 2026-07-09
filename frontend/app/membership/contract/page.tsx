"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eraser, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type PlanInfo = {
  id: number;
  name: string;
  duration: string;
  price: number;
  monthlyPrice?: number | null;
  quarterlyPrice?: number | null;
  currency: string;
  features: string[];
  category: string;
};

type PlanCategory = {
  id: number;
  name: string;
  label: string;
  order: number;
};

type SignaturePoint = {
  x: number;
  y: number;
};

type TermsSection = { title: string; content: string };

type RegState = {
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    emergencyContact: string;
    [key: string]: string;
  };
  selectedPlan: PlanInfo | null;
  selectedAdditionalPlans: PlanInfo[];
  plans: PlanInfo[];
  membershipStartDate: string;
  membershipEndDate: string;
  paymentFrequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | "UPFRONT";
  periodicAmount: number | null;
  currency: string;
  registrationFee: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  planCategories: PlanCategory[];
  contractNumber: string;
  customerNumber: string;
  isMinor: boolean;
  selectedPlanId: number | null;
  contractMemberSig?: string;
  guardianSig?: string;
  termsSections?: TermsSection[];
  gymRulesSections?: TermsSection[];
};

function money(currency: string, amount: number) {
  const rounded = Math.round(amount * 10) / 10;
  return `${currency} ${rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function planTitle(plan: PlanInfo) {
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

function getSignatureDataUrl(canvas: HTMLCanvasElement | null): string {
  if (!canvas) return "";
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < imageData.length; i += 4) {
    if (imageData[i] !== 0) {
      return canvas.toDataURL("image/png");
    }
  }
  return "";
}

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-sm">
      <span className="text-gray-600 shrink-0 font-medium">{label}:</span>
      <span className="font-semibold text-gray-900 break-all">{value}</span>
    </div>
  );
}

export default function MembershipContractPage() {
  const router = useRouter();
  const t = useTranslations("registration");
  const [state, setState] = useState<RegState | null>(null);
  const [contractMemberSig, setContractMemberSig] = useState("");
  const [guardianSig, setGuardianSig] = useState("");
  const contractCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guardianCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contractDrawingRef = useRef(false);
  const guardianDrawingRef = useRef(false);
  const [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [canvasHasContent, setCanvasHasContent] = useState(false);
  const contractDocRef = useRef<HTMLDivElement | null>(null);
  const contractLastPointRef = useRef<SignaturePoint | null>(null);
  const contractCurrentPointRef = useRef<SignaturePoint | null>(null);

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("gymRegState");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setState(JSON.parse(raw));
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Pre-populate signatures if returning to view an already-signed contract
  useEffect(() => {
    if (state?.contractMemberSig) {
      setContractMemberSig(state.contractMemberSig);
    }
    if (state?.guardianSig) {
      setGuardianSig(state.guardianSig);
    }
  }, [state?.contractMemberSig, state?.guardianSig]);

  // Print / download mode: triggered by the Download PDF button in the stepper
  useEffect(() => {
    if (!state) return;
    const printFlag = sessionStorage.getItem("gymContractPrintMode");
    if (!printFlag) return;
    sessionStorage.removeItem("gymContractPrintMode");

    function handleAfterPrint() {
      window.removeEventListener("afterprint", handleAfterPrint);
      // Go back to the stepper, marking contract as not re-signed
      sessionStorage.setItem(
        "gymContractResult",
        JSON.stringify({ contractAccepted: false }),
      );
      router.back();
    }
    window.addEventListener("afterprint", handleAfterPrint);

    // Allow the contract to fully render before printing
    const timer = setTimeout(() => window.print(), 800);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [state, router]);

  // Init member signature canvas
  useEffect(() => {
    if (!state || contractMemberSig) return;
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
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      ctx.fillStyle = "#111827";
      ctx.imageSmoothingEnabled = true;
    }, 150);
    return () => clearTimeout(t);
  }, [state, contractMemberSig]);

  function contractPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = contractCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginContractDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const { x, y } = contractPoint(event);

    contractDrawingRef.current = true;
    contractLastPointRef.current = { x, y };
    contractCurrentPointRef.current = { x, y };
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  }

  function drawContractSig(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!contractDrawingRef.current) return;
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const lastPoint = contractLastPointRef.current;
    if (!ctx || !canvas || !lastPoint) return;
    const { x, y } = contractPoint(event);
    const midPoint = {
      x: (lastPoint.x + x) / 2,
      y: (lastPoint.y + y) / 2,
    };
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
    if (getSignatureDataUrl(canvas)) setCanvasHasContent(true);
  }

  function confirmContractSig() {
    const dataUrl = getSignatureDataUrl(contractCanvasRef.current);
    if (dataUrl) {
      setContractMemberSig(dataUrl);
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
  }

  function beginGuardianDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    guardianDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  function drawGuardianSig(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!guardianDrawingRef.current) return;
    const canvas = guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function endGuardianDraw() {
    if (!guardianDrawingRef.current) return;
    guardianDrawingRef.current = false;
    const dataUrl = guardianCanvasRef.current?.toDataURL("image/png") || "";
    if (dataUrl) setGuardianSig(dataUrl);
  }

  function clearGuardianSig() {
    const canvas = guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setGuardianSig("");
  }

  async function acceptContract() {
    setError("");
    const latestContractSig =
      contractMemberSig || getSignatureDataUrl(contractCanvasRef.current);

    if (!latestContractSig) {
      setError(t("contract.errors.memberSignatureRequired"));
      return;
    }
    setCapturing(true);
    try {
      let capturedPdfDataUri: string | undefined;
      if (contractDocRef.current) {
        const { default: html2canvas } = await import("html2canvas");
        // jsPDF v4 uses a named export; v2/v3 used a default export – support both.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsPDFModule = (await import("jspdf")) as any;
        const jsPDF = jsPDFModule.jsPDF ?? jsPDFModule.default;

        // Tailwind v4 uses oklch()/lab() colors that html2canvas v1.4.x can't parse.
        // Use a 1x1 canvas to convert any unsupported color to sRGB hex/rgba.
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 1;
        tempCanvas.height = 1;
        const colorCtx = tempCanvas.getContext("2d");
        function toSafeColor(val: string): string {
          if (!colorCtx) return "#000000";
          colorCtx.clearRect(0, 0, 1, 1);
          try {
            colorCtx.fillStyle = val;
            return colorCtx.fillStyle;
          } catch {
            return "#000000";
          }
        }

        const el = contractDocRef.current;
        // Capture the FULL element height (not just the visible viewport portion)
        const fullWidth = el.scrollWidth;
        const fullHeight = el.scrollHeight;

        const fullCanvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          // Force html2canvas to render the entire element, not just the visible area
          width: fullWidth,
          height: fullHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
          onclone: (_clonedDoc, clonedEl) => {
            // Hide UI-only elements (buttons) that shouldn't appear in the PDF
            clonedEl
              .querySelectorAll<HTMLElement>("[data-pdf-exclude]")
              .forEach((el) => (el.style.display = "none"));
            // Remove overflow-hidden so all sections render fully in the clone
            clonedEl.style.overflow = "visible";
            clonedEl.style.height = "auto";
            // Convert oklch/lab computed colors to plain sRGB
            const colorProps = [
              "color",
              "background-color",
              "border-top-color",
              "border-right-color",
              "border-bottom-color",
              "border-left-color",
              "outline-color",
            ];
            const all = [
              clonedEl,
              ...Array.from(clonedEl.querySelectorAll<HTMLElement>("*")),
            ];
            all.forEach((el) => {
              const cs = window.getComputedStyle(el);
              colorProps.forEach((prop) => {
                const val = cs.getPropertyValue(prop);
                if (val && (val.includes("oklch") || val.includes("lab("))) {
                  el.style.setProperty(prop, toSafeColor(val), "important");
                }
              });
            });
          },
        });

        // Build a multi-page A4 PDF by slicing the full canvas into page-sized chunks
        const A4_WIDTH_PT = 595.28;
        const A4_HEIGHT_PT = 841.89;

        // How many canvas pixels (at scale 2) correspond to one A4 page height
        const pixelsPerPageH = Math.ceil(
          (A4_HEIGHT_PT / A4_WIDTH_PT) * fullCanvas.width,
        );

        const pdf = new jsPDF({
          format: "a4",
          unit: "pt",
          orientation: "portrait",
        });

        let yStart = 0;
        let pageNum = 0;
        while (yStart < fullCanvas.height) {
          if (pageNum > 0) pdf.addPage();

          // Slice the canvas vertically for this page
          const sliceH = Math.min(pixelsPerPageH, fullCanvas.height - yStart);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = fullCanvas.width;
          pageCanvas.height = pixelsPerPageH; // always full page height (remainder is white)
          const ctx = pageCanvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            fullCanvas,
            0,
            yStart,
            fullCanvas.width,
            sliceH,
            0,
            0,
            fullCanvas.width,
            sliceH,
          );

          pdf.addImage(
            pageCanvas.toDataURL("image/jpeg", 0.85),
            "JPEG",
            0,
            0,
            A4_WIDTH_PT,
            A4_HEIGHT_PT,
          );

          yStart += pixelsPerPageH;
          pageNum++;
        }

        // v2/v3 used "datauristring"; v4 uses "datauri" – try both.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        capturedPdfDataUri =
          (pdf as any).output("datauristring") ||
          (pdf as any).output("datauri");
      }

      // Store in window (fast) and sessionStorage (survives bfcache restore)
      if (capturedPdfDataUri) {
        (window as unknown as Record<string, unknown>).__gymContractPdf =
          capturedPdfDataUri;
        try {
          sessionStorage.setItem("gymContractPdf", capturedPdfDataUri);
        } catch {
          // sessionStorage quota exceeded for very large PDFs — window copy is enough
        }
      }
      sessionStorage.setItem(
        "gymContractResult",
        JSON.stringify({
          contractAccepted: true,
          contractMemberSig: latestContractSig,
          guardianSig,
        }),
      );
    } catch (e) {
      console.error("Contract capture error:", e);
      sessionStorage.setItem(
        "gymContractResult",
        JSON.stringify({
          contractAccepted: true,
          contractMemberSig: latestContractSig,
          guardianSig,
        }),
      );
    } finally {
      setCapturing(false);
      router.back();
    }
  }

  function cancelContract() {
    sessionStorage.setItem(
      "gymContractResult",
      JSON.stringify({ contractAccepted: false }),
    );
    router.back();
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-[#08010a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  const {
    form,
    selectedPlan,
    selectedAdditionalPlans,
    plans,
    membershipStartDate,
    membershipEndDate,
    paymentFrequency,
    periodicAmount,
    currency,
    registrationFee,
    discountAmount,
    discountLabel,
    total,
    planCategories,
    contractNumber,
    customerNumber,
    isMinor,
    selectedPlanId,
    termsSections,
    gymRulesSections,
  } = state;

  const selectedPlanPrice = (() => {
    if (!selectedPlan) return null;
    if (paymentFrequency === "MONTHLY") {
      return selectedPlan.monthlyPrice ?? selectedPlan.price;
    }
    if (paymentFrequency === "QUARTERLY") {
      return selectedPlan.quarterlyPrice ?? selectedPlan.price;
    }
    return selectedPlan.price;
  })();

  const memberAddress =
    form.address ||
    [form.street, [form.postalCode, form.location].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

  return (
    <div
      data-contract-page
      className="min-h-screen bg-[#08010a] py-4 sm:py-6 px-3 sm:px-4"
    >
      {/* Print-mode CSS: hide interactive elements and force colors when saving as PDF */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          [data-pdf-exclude] { display: none !important; }
          [data-print-hide] { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .min-h-screen { min-height: unset !important; background: white !important; }
          [data-contract-page] { padding: 0 !important; }
          [data-contract-shell] { max-width: none !important; }
          [data-contract-doc] { box-shadow: none !important; border-radius: 0 !important; }
          [data-print-section] {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          [data-print-avoid],
          [data-print-compact-card] {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          [data-print-section-title] {
            break-after: avoid-page !important;
            page-break-after: avoid !important;
          }
          [data-print-section-content] {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          [data-print-page-start] {
            break-before: page !important;
            page-break-before: always !important;
          }
          [data-print-long-section] {
            border: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          [data-print-long-section] [data-print-section-title] {
            border: 1px solid #d1d5db !important;
            border-radius: 0 !important;
          }
          [data-print-long-section] [data-print-section-content] {
            padding: 6px 0 0 !important;
          }
          [data-print-terms-item] {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          [data-print-terms-item] > p:first-child {
            margin-bottom: 2px !important;
            font-size: 13px !important;
            line-height: 1.25 !important;
          }
          [data-print-terms-item] > p:last-child {
            font-size: 12.5px !important;
            line-height: 1.35 !important;
          }
          [data-contract-body] {
            padding: 12px !important;
            gap: 12px !important;
          }
          [data-contract-body] > div {
            margin-top: 0 !important;
          }
          [data-contract-signatures] {
            padding: 14px !important;
            gap: 14px !important;
          }
          [data-contract-signature-grid] {
            gap: 12px !important;
          }
          [data-contract-signature-box] {
            min-height: 92px !important;
          }
          [data-contract-canvas-wrap] {
            min-height: 120px !important;
          }
          [data-contract-canvas] {
            height: 120px !important;
          }
          [data-contract-stamp] {
            height: 76px !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>
      <div data-contract-shell className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-5 sm:mb-6">
          <Image
            src="/gym_logo.png"
            alt="Gym Logo"
            width={120}
            height={120}
            className="object-contain w-23 h-23 sm:w-30 sm:h-30"
          />
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={cancelContract}
          data-print-hide
          className="mb-4 text-white/60 hover:text-white text-xs sm:text-sm flex items-center gap-2 transition-colors"
        >
          {`← ${t("contract.backToRegistration")}`}
        </button>

        {/* Contract Document */}
        <div
          ref={contractDocRef}
          data-contract-doc
          className="bg-white rounded-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-[#100a0a] text-white px-3 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:flex-wrap items-start gap-3">
            <div className="w-full sm:flex-1 sm:min-w-32.5">
              <p className="text-base font-black tracking-widest text-red-500">
                SENTINATORS
              </p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">
                Keep Pumping Gym
              </p>
            </div>
            <div className="w-full sm:flex-1 text-left sm:text-center sm:min-w-37.5">
              <p className="text-sm font-black tracking-wide uppercase">
                {t("contract.title")}
              </p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                {t("contract.subtitle")}
              </p>
            </div>
            <div className="w-full sm:w-auto text-left sm:text-right text-xs space-y-1 sm:min-w-40">
              <div className="flex items-center justify-start sm:justify-end gap-2">
                <span className="text-white/50">
                  {t("contract.contractNumber")}:
                </span>
                <span className="font-mono font-bold">{contractNumber}</span>
              </div>
              <div className="flex items-center justify-start sm:justify-end gap-2">
                <span className="text-white/50">
                  {t("contract.customerNumber")}:
                </span>
                <span className="font-mono font-bold">{customerNumber}</span>
              </div>
              <div className="flex items-center justify-start sm:justify-end gap-2">
                <span className="text-white/50">
                  {t("contract.dateLabel")}:
                </span>
                <span className="font-semibold">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div
            data-contract-body
            className="p-3 sm:p-4 space-y-4 text-gray-900"
          >
            {/* Sections 1 & 2 */}
            <div
              data-print-section
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div
                data-print-compact-card
                className="border border-gray-300 rounded overflow-hidden"
              >
                <div
                  data-print-section-title
                  className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
                >
                  {`1. ${t("contract.sections.memberDetails")}`}
                </div>
                <div className="p-3 space-y-2">
                  <ContractField
                    label={t("contract.fields.fullName")}
                    value={`${form.firstName} ${form.lastName}`.trim() || "-"}
                  />
                  <ContractField
                    label={t("fields.dateOfBirth")}
                    value={
                      form.dateOfBirth ? formatDate(form.dateOfBirth) : "-"
                    }
                  />
                  <ContractField
                    label={t("fields.address")}
                    value={memberAddress || "-"}
                  />
                  <ContractField
                    label={t("contract.fields.telephone")}
                    value={form.phone || "-"}
                  />
                  <ContractField
                    label={t("contract.fields.email")}
                    value={form.email || "-"}
                  />
                  <ContractField
                    label={t("fields.emergencyContact")}
                    value={form.emergencyContact || "-"}
                  />
                </div>
              </div>

              <div
                data-print-compact-card
                className="border border-gray-300 rounded overflow-hidden"
              >
                <div
                  data-print-section-title
                  className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
                >
                  {`2. ${t("contract.sections.subscriptionSelection")}`}
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-y-2 mb-3">
                    {plans.map((plan) => (
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
                        <span>{plan.name || plan.duration}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-1">
                    <ContractField
                      label={t("fields.startDate")}
                      value={
                        membershipStartDate
                          ? formatDate(membershipStartDate)
                          : "-"
                      }
                    />
                    <ContractField
                      label={t("contract.fields.validUntil")}
                      value={
                        membershipEndDate ? formatDate(membershipEndDate) : "-"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sections 3 & 4 */}
            <div
              data-print-section
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div
                data-print-compact-card
                className="border border-gray-300 rounded overflow-hidden"
              >
                <div
                  data-print-section-title
                  className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
                >
                  3. {t("plan.priceOverviewTitle")}
                </div>
                <div className="p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      {selectedPlan
                        ? planTitle(selectedPlan)
                        : t("plan.selectPlan")}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {selectedPlanPrice != null
                        ? money(currency, selectedPlanPrice)
                        : "-"}
                    </span>
                  </div>
                  {selectedAdditionalPlans.map((ap) => (
                    <div key={ap.id} className="flex justify-between">
                      <span className="text-gray-700">+ {planTitle(ap)}</span>
                      <span className="font-semibold text-gray-900">
                        {money(ap.currency, ap.price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      {t("plan.registrationFeeOneTime")}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {money(currency, registrationFee)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-700 font-medium">
                      <span>{discountLabel}</span>
                      <span>- {money(currency, discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t-2 border-gray-300 text-gray-900">
                    <span>{t("plan.total")}</span>
                    <span>{money(currency, total)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-3">
                    {(["YEARLY", "MONTHLY", "QUARTERLY"] as const).map((f) => (
                      <label
                        key={f}
                        className="flex items-center gap-1.5 cursor-default text-gray-900"
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={
                            f === "YEARLY"
                              ? paymentFrequency === "YEARLY" ||
                                paymentFrequency === "UPFRONT"
                              : paymentFrequency === f
                          }
                          className="accent-red-700 w-3 h-3"
                        />
                        <span>
                          {f === "YEARLY"
                            ? `${t("plan.yearly")} (${t("plan.upfront")})`
                            : f === "MONTHLY"
                              ? t("plan.monthly")
                              : t("plan.quarterly")}
                        </span>
                      </label>
                    ))}
                  </div>
                  {periodicAmount != null &&
                    paymentFrequency !== "UPFRONT" &&
                    paymentFrequency !== "YEARLY" && (
                      <div className="flex justify-between font-semibold pt-1 text-red-700">
                        <span>
                          {t("plan.duePer")}{" "}
                          {paymentFrequency === "MONTHLY"
                            ? t("plan.paymentUnitMonth")
                            : paymentFrequency === "QUARTERLY"
                              ? t("plan.paymentUnitQuarter")
                              : t("plan.paymentUnitYear")}
                        </span>
                        <span>{money(currency, periodicAmount)}</span>
                      </div>
                    )}
                </div>
              </div>

              <div
                data-print-compact-card
                className="border border-gray-300 rounded overflow-hidden"
              >
                <div
                  data-print-section-title
                  className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
                >
                  {`4. ${t("contract.sections.membershipCategory")}`}
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

            {/* Section 5: Membership Terms */}
            {termsSections && termsSections.length > 0 && (
              <div
                data-print-section
                data-print-page-start
                data-print-long-section
                className="border border-gray-300 rounded overflow-hidden"
              >
                <div
                  data-print-section-title
                  className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
                >
                  {`5. ${t("contract.sections.membershipTerms")}`}
                </div>
                <div data-print-section-content className="p-3">
                  {termsSections.map(({ title, content }) => (
                    <div
                      key={title}
                      data-print-terms-item
                      className="py-2 border-b border-gray-200 last:border-0"
                    >
                      <p className="font-bold text-sm text-gray-900 mb-0.5">
                        {title}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 6: Gym Rules & Health Responsibility */}
            {gymRulesSections && gymRulesSections.length > 0 && (
              <div
                data-print-section
                data-print-page-start
                data-print-long-section
                className="border border-gray-300 rounded overflow-hidden"
              >
                <div
                  data-print-section-title
                  className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
                >
                  {`6. ${t("contract.sections.gymRules")}`}
                </div>
                <div data-print-section-content className="p-3">
                  {gymRulesSections.map(({ title, content }) => (
                    <div
                      key={title}
                      data-print-terms-item
                      className="py-2 border-b border-gray-200 last:border-0"
                    >
                      <p className="font-bold text-sm text-gray-900 mb-0.5">
                        {title}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 7: Signatures */}
            <div
              data-print-section
              data-print-page-start
              className="border border-gray-300 rounded overflow-hidden"
            >
              <div
                data-print-section-title
                className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider"
              >
                {`7. ${t("contract.sections.signatures")}`}
              </div>
              <div data-contract-signatures className="p-4 sm:p-5 space-y-6">
                {/* Signature grid */}
                <div
                  data-contract-signature-grid
                  className="grid gap-5 grid-cols-1 sm:grid-cols-3"
                >
                  {/* Place & Date */}
                  <div data-print-avoid className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      {t("contract.placeDate")}
                    </span>
                    <div
                      data-contract-signature-box
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col justify-between min-h-27.5"
                    >
                      <p className="text-base font-bold text-gray-900">
                        {new Date().toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-auto pt-3 border-t border-gray-300">
                        {t("contract.dateOfSigning")}
                      </p>
                    </div>
                  </div>

                  {/* Member Signature */}
                  <div data-print-avoid className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        {t("contract.memberSignature")}
                        {contractMemberSig || canvasHasContent ? (
                          <span className="ml-1.5 text-green-600 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </span>
                      {contractMemberSig ? (
                        <button
                          type="button"
                          onClick={() => {
                            setContractMemberSig("");
                            setCanvasHasContent(false);
                          }}
                          className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors print:hidden"
                        >
                          <Eraser size={11} /> {t("contract.reSign")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={clearContractSig}
                          className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors print:hidden"
                        >
                          <Eraser size={11} /> {t("clearSignature")}
                        </button>
                      )}
                    </div>
                    {contractMemberSig ? (
                      <div
                        data-contract-signature-box
                        className="rounded-lg border-2 border-green-200 bg-green-50 overflow-hidden min-h-27.5 flex items-center justify-center"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={contractMemberSig}
                          alt={t("contract.memberSignature")}
                          className="max-h-27.5 w-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div
                        data-contract-canvas-wrap
                        className={`relative rounded-xl overflow-hidden min-h-40 transition-all border-2 ${
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
                          data-contract-canvas
                          className="h-37.5 sm:h-40 w-full touch-none cursor-crosshair"
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
                              {t("errors.drawSignature")}
                            </p>
                          </div>
                        )}
                        {/* OK button — appears after first stroke, lets user confirm when done */}
                        {canvasHasContent && (
                          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none select-none">
                            <button
                              type="button"
                              onClick={clearContractSig}
                              className="pointer-events-auto px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-400 border border-gray-200 bg-white hover:bg-gray-50 hover:text-red-500 transition-colors"
                            >
                              {t("clearSignature")}
                            </button>
                            <button
                              type="button"
                              onClick={confirmContractSig}
                              className="pointer-events-auto px-3.5 py-1 rounded-md text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                            >
                              {`✓ ${t("contract.ok")}`}
                            </button>
                          </div>
                        )}
                        {/* Bottom hint when blank */}
                        {!canvasHasContent && (
                          <p className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-300 pointer-events-none select-none">
                            {t("contract.signAboveLine")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gym Signature (3rd column — static placeholder) */}
                  <div data-print-avoid className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      {t("contract.gymSignature")}
                    </span>
                    <div
                      data-contract-signature-box
                      className="rounded-lg border-2 border-gray-200 bg-gray-50 min-h-27.5 flex items-center justify-center overflow-hidden p-2"
                    >
                      <Image
                        src="/gym_sign.jpeg"
                        alt={t("contract.gymSignature")}
                        width={320}
                        height={120}
                        className="h-auto max-h-24 w-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Gym Stamp */}
                <div
                  data-print-avoid
                  className="flex flex-col gap-2 sm:max-w-xs"
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    {t("contract.gymStamp")}
                  </span>
                  <div
                    data-contract-stamp
                    className="rounded-lg border-2 border-gray-200 bg-gray-50 h-22.5 flex items-center justify-center overflow-hidden p-2"
                  >
                    <Image
                      src="/gym_stamp.jpeg"
                      alt={t("contract.gymStamp")}
                      width={180}
                      height={90}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                    {error}
                  </div>
                )}

                {/* Action buttons — excluded from PDF capture via data-pdf-exclude */}
                <div
                  data-pdf-exclude
                  className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 justify-between items-stretch sm:items-center pt-2 border-t border-gray-100"
                >
                  <button
                    type="button"
                    onClick={cancelContract}
                    className="px-5 py-2.5 rounded-lg border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors w-full sm:w-auto"
                  >
                    {t("contract.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={acceptContract}
                    disabled={capturing}
                    className="px-6 py-2.5 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {capturing && (
                      <Loader2 size={15} className="animate-spin" />
                    )}
                    {capturing
                      ? t("contract.generatingPdf")
                      : t("contract.acceptSignContract")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
