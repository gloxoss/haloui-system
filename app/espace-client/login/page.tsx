"use client";

import React, { useState } from "react";
import { loginClientPortalAction } from "@/app/actions";

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
      // Next.js redirect throws NEXT_REDIRECT which is normal
      if (err?.message === "NEXT_REDIRECT") {
        return;
      }
      setError("Une erreur est survenue lors de la connexion.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4 py-12 transition-colors"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Language Switch */}
      <div className="absolute top-6 right-6">
        <button
          type="button"
          onClick={() => setLang(isArabic ? "fr" : "ar")}
          className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          {isArabic ? "Français (FR)" : "العربية (AR)"}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-lg shadow-blue-600/20 mb-2">
            H
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
            {isArabic ? "بوابة الزبون الآمنة" : "Espace Client Sécurisé"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            {isArabic
              ? "الاطلاع الفوري على فواتيرك، عروض الأسعار، وتوقيع طلبات الشراء إلكترونياً."
              : "Consultez vos devis et factures, suivez votre solde et signez vos bons de commande en ligne."}
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone or ICE */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {isArabic ? "رقم الهاتف أو المعرف الموحد (ICE)" : "Téléphone ou N° ICE"}
              </label>
              <input
                type="text"
                name="identifier"
                required
                placeholder={isArabic ? "مثال: 0535662101 أو ICE" : "Ex: 05 35 66 21 01 ou ICE"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--foreground)] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* PIN Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {isArabic ? "الرمز السري (Code PIN مكون من 6 أرقام)" : "Code PIN d'accès (6 chiffres)"}
              </label>
              <input
                type="password"
                name="code"
                required
                maxLength={10}
                placeholder="••••••"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-mono tracking-widest text-[var(--foreground)] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-center text-lg"
              />
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 text-white font-black text-sm shadow-md hover:shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>{isArabic ? "جاري الدخول..." : "Connexion en cours..."}</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span>{isArabic ? "تسجيل الدخول" : "Accéder à mon espace"}</span>
                </>
              )}
            </button>
          </form>

          {/* Help & Support Note */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-xs text-[var(--muted)] space-y-1">
            <p>
              {isArabic
                ? "هل نسيت رمز PIN أو لا تملكه بعد ؟"
                : "Vous n'avez pas encore votre code PIN d'accès ?"}
            </p>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              {isArabic
                ? "تواصل مع مصلحة الزبناء أو المحاسبة لتسلم رابطك المباشر."
                : "Contactez votre responsable commercial pour recevoir votre lien sécurisé."}
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)] font-medium">
          <span>🛡️</span>
          <span>{isArabic ? "اتصال مشفر وآمن 256-bit SSL" : "Connexion sécurisée et chiffrée SSL"}</span>
        </div>
      </div>
    </div>
  );
}
