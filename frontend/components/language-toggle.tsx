"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";

export function LanguageToggle() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const next = locale === "de" ? "en" : "de";
    startTransition(async () => {
      await setLocale(next as "de" | "en");
    });
  };

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      title={locale === "de" ? "Switch to English" : "Zu Deutsch wechseln"}
      className="flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      <span className="text-sm">{locale === "de" ? "🇩🇪" : "🇬🇧"}</span>
      <span>{locale === "de" ? "DE" : "EN"}</span>
      <span className="text-white/30">|</span>
      <span className="text-white/40">{locale === "de" ? "EN" : "DE"}</span>
    </button>
  );
}
