"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPlans,
  clearMembershipMessages,
} from "@/store/slices/membershipSlice";
import {
  openRegistrationModal,
  closeRegistrationModal,
  clearError,
} from "@/store/slices/authSlice";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StepperRegistrationForm } from "@/components/stepper-registration-form";

type PlanCategory = { id: number; name: string; label: string; order: number };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export type PricingText = {
  pricing_section_title: string;
  pricing_section_subtitle: string;
};

export function PricingSectionClient({
  initialPricingText,
}: {
  initialPricingText: PricingText;
}) {
  const dispatch = useAppDispatch();
  const { plans, successMessage, error } = useAppSelector((s) => s.membership);
  const { registrationModalOpen } = useAppSelector((s) => s.auth);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");

  useEffect(() => {
    dispatch(fetchPlans());
    fetch(`${API}/content/plan-categories`)
      .then((r) => r.json())
      .then((cats: PlanCategory[]) => {
        setCategories(cats);
        if (cats.length > 0) setActiveCategory(cats[0].name);
      })
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      setToast({ msg: successMessage, type: "success" });
      const t = setTimeout(() => {
        setToast(null);
        dispatch(clearMembershipMessages());
      }, 3500);
      return () => clearTimeout(t);
    }
    if (error) {
      setToast({ msg: error, type: "error" });
      const t = setTimeout(() => {
        setToast(null);
        dispatch(clearMembershipMessages());
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [successMessage, error, dispatch]);

  const handleGetStarted = (_planId: number) => {
    dispatch(openRegistrationModal());
  };

  const handleModalOpenChange = (val: boolean) => {
    if (!val) {
      dispatch(closeRegistrationModal());
      dispatch(clearError());
    }
  };

  const isMobile = useIsMobile();

  const activePlansForCategory = plans.filter(
    (p) => p.category === activeCategory,
  );
  const activeTab = categories.find((c) => c.name === activeCategory);

  const activePlans = activePlansForCategory;

  // Carousel state — reset to 0 when category or screen size changes
  const [carouselPage, setCarouselPage] = useState(0);
  useEffect(() => {
    setCarouselPage(0);
  }, [activeCategory, isMobile]);

  // On mobile show 1 card per page; on desktop show 4
  const CHUNK = isMobile ? 1 : 4;
  const chunks: (typeof activePlans)[] = [];
  for (let i = 0; i < activePlans.length; i += CHUNK) {
    chunks.push(activePlans.slice(i, i + CHUNK));
  }
  const totalPages = chunks.length;
  const currentChunk = chunks[carouselPage] ?? [];

  // Swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && carouselPage < totalPages - 1)
        setCarouselPage((p) => p + 1);
      else if (diff < 0 && carouselPage > 0) setCarouselPage((p) => p - 1);
    }
    touchStartX.current = null;
  };

  return (
    <section id="membership" className="mb-10 bg-transparent">
      <Dialog open={registrationModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent
          className="max-h-[96vh] w-[94vw] !max-w-[1220px] overflow-y-auto bg-[#08010a] p-0 shadow-[0_24px_90px_rgba(0,0,0,0.75)] sm:!max-w-[1220px] sm:p-0 lg:w-[88vw]"
          style={{ border: "2px solid #733EA6" }}
        >
          <StepperRegistrationForm
            onComplete={() => dispatch(closeRegistrationModal())}
          />
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          className={`fixed top-20 right-4 z-99999 px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-900/90 border border-green-500 text-green-300"
              : "bg-red-900/90 border border-red-500 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {initialPricingText.pricing_section_title}
          </h2>
          <p className="text-white/60 mb-5">
            {initialPricingText.pricing_section_subtitle}
          </p>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_0_28px_rgba(115,62,166,0.18)]">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition sm:text-sm ${
                  activeCategory === cat.name
                    ? "bg-red-700 text-white shadow-[0_0_18px_rgba(220,38,38,0.35)]"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-8 text-center">
            <h3 className="text-xl font-semibold text-white">
              {activeTab?.label ?? ""}
            </h3>
          </div>
          <div
            className="flex gap-6 flex-wrap justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activePlans.length === 0 ? (
              <div className="w-full py-16 text-center text-white/40 text-sm">
                No plans yet for this category.
              </div>
            ) : (
              currentChunk.map((plan, index) => (
                <div
                  key={index}
                  className="plan-card-wrapper w-full sm:w-64 lg:w-[270px]"
                  style={{ flex: isMobile ? "0 0 100%" : "0 0 auto" }}
                >
                  <div
                    className="relative z-10 rounded-[11px] p-6 h-full"
                    style={{ background: "#0300044D" }}
                  >
                    <h4
                      className="text-4xl font-normal text-white mb-2"
                      style={{ fontWeight: 400 }}
                    >
                      {plan.name}
                    </h4>
                    <p
                      className="text-[#A09BAE] text-xl font-normal mb-8"
                      style={{ fontWeight: 400 }}
                    >
                      {"currency" in plan
                        ? `${plan.currency} ${plan.price}`
                        : (plan as any).price}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {(plan.features as string[]).map(
                        (feature: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-white/70 text-sm"
                          >
                            <Check className="w-4 h-4 text-red-500" />
                            {feature}
                          </li>
                        ),
                      )}
                    </ul>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white btn-gradient"
                      disabled={plan.id === 0}
                      onClick={() => plan.id !== 0 && handleGetStarted(plan.id)}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                type="button"
                onClick={() => setCarouselPage((p) => Math.max(0, p - 1))}
                disabled={carouselPage === 0}
                className="mr-1 p-1 rounded-full text-white/40 hover:text-white disabled:opacity-20 transition"
                aria-label="Previous"
              >
                &#8592;
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCarouselPage(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === carouselPage
                      ? "w-6 h-3 bg-red-600"
                      : "w-3 h-3 bg-white/25 hover:bg-white/50"
                  }`}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  setCarouselPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={carouselPage === totalPages - 1}
                className="ml-1 p-1 rounded-full text-white/40 hover:text-white disabled:opacity-20 transition"
                aria-label="Next"
              >
                &#8594;
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
