"use client";

import React, { useState } from "react";
import { loginClientPortalAction } from "@/app/actions";
import { Lock, ShieldCheck, ArrowRight, Smartphone, KeyRound, AlertCircle, Loader2 } from "lucide-react";

export default function ClientPortalLoginPage() {
  const [lang, setLang] = useState<"fr" | "ar">("fr");
  const isArabic = lang === "ar";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginClientPortalAction(formData);
      if (res && !res.success) {
        setError(res.error || "Identifiant ou code PIN incorrect.");
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT") {
        return;
      }
      setError("Une erreur est survenue lors de la connexion.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4 py-12 selection:bg-[var(--accent-soft)]"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Top Bar with Language Switcher */}
      <div className="absolute top-6 right-6">
        <button
          type="button"
          onClick={() => setLang(isArabic ? "fr" : "ar")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all shadow-2xs cursor-pointer"
        >
          <span>{isArabic ? "Français" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--background)] font-black text-lg shadow-sm mb-1">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            {isArabic ? "فضاء الزبون" : "Espace Client"}
          </h1>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-xs mx-auto">
            {isArabic
              ? "الاطلاع على الفواتير، عروض الأسعار وتوقيع التوصيل والطلبيات إلكترونياً."
              : "Consultez vos factures et devis, et signez vos bons de livraison ou de commande."}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone or ICE */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
                <Smartphone className="h-3.5 w-3.5 text-[var(--muted)]" />
                <span>{isArabic ? "رقم الهاتف أو المعرف الموحد (ICE)" : "Téléphone ou Identifiant ICE"}</span>
              </label>
              <input
                type="text"
                name="identifier"
                required
                autoFocus
                placeholder={isArabic ? "05 35 66 21 01 أو رقم ICE" : "05 35 66 21 01 ou ICE"}
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background-alt)] px-3.5 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--card)] transition-colors"
              />
            </div>

            {/* PIN Code */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-strong)]">
                <KeyRound className="h-3.5 w-3.5 text-[var(--muted)]" />
                <span>{isArabic ? "الرمز السري (Code PIN)" : "Code PIN confidentiel (6 chiffres)"}</span>
              </label>
              <input
                type="password"
                name="code"
                required
                maxLength={8}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background-alt)] px-3.5 text-sm font-mono tracking-widest text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--card)] text-center text-base transition-colors"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{isArabic ? "الدخول إلى حسابي" : "Accéder à mon espace"}</span>
                  <ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} />
                </>
              )}
            </button>
          </form>

          {/* Footer Assistance */}
          <div className="mt-5 pt-4 border-t border-[var(--border)] text-center text-[11px] text-[var(--muted)] leading-relaxed">
            <p>
              {isArabic
                ? "رمز الدخول PIN يتم تسليمه من طرف مسؤول المبيعات."
                : "Votre code PIN vous est transmis par votre responsable commercial."}
            </p>
          </div>
        </div>

        {/* Trust & Security Tag */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{isArabic ? "ولوج آمن ومشفر بروتوكول SSL 256-bit" : "Session chiffrée & authentifiée de bout en bout"}</span>
        </div>
      </div>
    </div>
  );
}
