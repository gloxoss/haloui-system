"use client";

import React, { useState } from "react";
import { regenerateClientPortalAccessAction } from "@/app/actions";
import { type EntityRecord } from "@/lib/types";

interface ClientPortalAdminActionsProps {
  client: EntityRecord;
  locale?: string;
}

export function ClientPortalAdminActions({
  client,
  locale = "fr",
}: ClientPortalAdminActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentPin, setCurrentPin] = useState(client.portal_access_code || "");
  const [currentToken, setCurrentToken] = useState(client.portal_token || "");

  const isArabic = locale === "ar";

  const getPortalUrl = () => {
    if (typeof window === "undefined") {
      return `/espace-client?token=${currentToken}`;
    }
    return `${window.location.origin}/espace-client?token=${currentToken}`;
  };

  const handleCopy = async () => {
    const url = getPortalUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRegenerate = async () => {
    if (!confirm(isArabic ? "تأكيد إعادة تعيين رمز PIN والرابط ؟" : "Régénérer le code PIN et le lien d'accès de ce client ?")) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await regenerateClientPortalAccessAction(client.id);
      if (res.success && res.portal_access_code && res.portal_token) {
        setCurrentPin(res.portal_access_code);
        setCurrentToken(res.portal_token);
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    isArabic
      ? `السلام عليكم ${client.name}،\nإليكم رابط الدخول الآمن إلى فضاء الزبون الخاص بكم للاطلاع على الفواتير وعروض الأسعار وتوقيع الطلبيات:\n${getPortalUrl()}\nالرمز السري (Code PIN): ${currentPin}`
      : `Bonjour ${client.name},\nVoici votre lien d'accès sécurisé à votre espace client pour consulter vos factures, devis et signer vos bons de commande :\n${getPortalUrl()}\nCode PIN d'accès : ${currentPin}`
  );

  const cleanPhone = (client.phone || "").replace(/[^0-9]/g, "");
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("0") ? "212" + cleanPhone.slice(1) : cleanPhone}?text=${whatsappMessage}`
    : `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="mt-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-900/40">
        <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
          <span>🔐</span>
          <span>{isArabic ? "فضاء الزبون المخصص" : "Espace Client Sécurisé"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">{isArabic ? "رمز PIN:" : "PIN :"}</span>
          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300">
            {currentPin || "—"}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-zinc-900 font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <span>{copied ? "✓" : "🔗"}</span>
          <span>{copied ? (isArabic ? "تم النسخ!" : "Copié !") : (isArabic ? "نسخ الرابط" : "Copier le lien")}</span>
        </button>

        {/* WhatsApp Share */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
        >
          <span>💬</span>
          <span>{isArabic ? "إرسال عبر واتساب" : "Envoyer par WhatsApp"}</span>
        </a>

        {/* Open Portal */}
        <a
          href={`/espace-client?token=${currentToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-zinc-900 font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <span>↗️</span>
          <span>{isArabic ? "فتح الفضاء" : "Ouvrir"}</span>
        </a>

        {/* Regenerate PIN */}
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-auto"
          title={isArabic ? "إعادة توليد الرمز والرابط" : "Régénérer le code PIN et le lien"}
        >
          <span>🔄</span>
          <span className="text-[10px]">{isArabic ? "تجديد" : "Régénérer"}</span>
        </button>
      </div>
    </div>
  );
}
