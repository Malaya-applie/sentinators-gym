"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type PlanCategory = { id: number; name: string; label: string; order: number };

export function PricingSection() {
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

  const activePlansForCategory = plans.filter(
    (p) => p.category === activeCategory,
  );
  const activeTab = categories.find((c) => c.name === activeCategory);

  const activePlans = activePlansForCategory;

  return (
    <section id="membership" className="mb-10 bg-transparent">
      {/* Registration Stepper Modal */}
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

      {/* Toast notification */}
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
            OUR PLANS & PRICING
          </h2>
          <p className="text-white/60 mb-5">
            Choose a membership that fits your goals
          </p>
        </div>

        {/* Separation line */}
        {/* <div
          className="w-full flex justify-center items-center mb-5 relative"
          style={{ height: "40px" }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "30%",
              height: "40px",
              background:
                "radial-gradient(ellipse at center, #733EA6 0%, transparent 70%)",
              opacity: 0.45,
              filter: "blur(12px)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              border: "0",
              height: "4px",
              width: "50%",
              borderRadius: "2px",
              background:
                "linear-gradient(90deg, #48215A 0%, #5D225E 50%, #48215A 100%)",
              boxShadow: "0 0 24px 0 #733EA6AA",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div> */}

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
            className="flex gap-6 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 sm:justify-center"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {activePlans.length === 0 ? (
              <div className="w-full py-16 text-center text-white/40 text-sm">
                No plans yet for this category.
              </div>
            ) : (
              activePlans.map((plan, index) => (
                <div
                  key={index}
                  className="plan-card-wrapper min-w-[85vw] max-w-[90vw] snap-center sm:min-w-0 sm:max-w-none sm:w-64 lg:w-[270px]"
                  style={{ flex: "0 0 auto" }}
                >
                  <div
                    className="relative z-10 rounded-[11px] p-6 h-full"
                    style={{ background: "#0300044D" }}
                  >
                    <h4
                      className="text-4xl font-normal text-white mb-2"
                      style={{ fontWeight: 400 }}
                    >
                      {"duration" in plan ? plan.duration : ""}
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
        </div>
      </div>
    </section>
  );
}
