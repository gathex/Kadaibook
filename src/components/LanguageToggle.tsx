"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export function LanguageToggle() {
  const { locale, messages, toggleLocale } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={messages.common.switchLanguage}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
    >
      <Languages className="h-3.5 w-3.5 text-emerald-700" />
      <span>
        {locale === "en" ? messages.common.toggleToTa : messages.common.toggleToEn}
      </span>
    </button>
  );
}
