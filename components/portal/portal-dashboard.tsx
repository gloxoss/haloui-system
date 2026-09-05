"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutClientPortalAction } from "@/app/actions";
import { formatNumber } from "@/lib/utils";
import { type ClientPortalData, type PortalDocumentItem } from "@/lib/types";
import { PortalSignatureModal } from "./portal-signature-modal";

interface PortalDashboardProps {
  data: ClientPortalData;
}

type TabType = "factures" | "bc" | "devis" | "bl" | "abonnements";

export function PortalDashboard({ data }: PortalDashboardProps) {
  const router = useRouter();
  const [lang, setLang] = useState<"fr" | "ar">("fr");
  const isArabic = lang === "ar";

  const [activeTab, setActiveTab] = useState<TabType>("factures");
  const [selectedBcToSign, setSelectedBcToSign] = useState<PortalDocumentItem | null>(null);

  const { client, company, stats, factures, bons_commande, devis, bons_livraison, abonnements } = data;

  const handleLogout = async () => {
    await logoutClientPortalAction();
  };

  const handleSignSuccess = () => {
    router.refresh();
  };

  return (
    <div
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased transition-colors duration-200"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo / Company Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-sm">
                {company.name ? company.name.charAt(0).toUpperCase() : "H"}
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base leading-tight">
                  {company.name || "HALOUI SYSTEM"}
                </div>
                <div className="text-[11px] text-[var(--muted)] font-medium">
                  {isArabic ? "بوابة الزبون الآمنة" : "Espace Client Sécurisé"}
                </div>
              </div>
            </div>

            {/* Client Info & Header Actions */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLang(isArabic ? "fr" : "ar")}
                className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-xs font-bold hover:bg-[var(--accent-soft)] transition-colors"
                title="Changer de langue / تغيير اللغة"
              >
                {isArabic ? "FR" : "العربية"}
              </button>

              {/* Client Tag */}
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-bold text-[var(--foreground)]">{client.name}</span>
                {client.ice && (
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    ICE : {client.ice}
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs font-semibold text-[var(--muted)] hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-900 transition-colors"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">{isArabic ? "خروج" : "Déconnexion"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome & Balance Overview Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Client Greeting & Balance */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {isArabic ? `مرحباً بك، ${client.name}` : `Bienvenue, ${client.name}`}
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--foreground)]">
                  {formatNumber(stats.solde_du_ttc)} <span className="text-xl font-bold text-[var(--muted)]">DH</span>
                </span>
                {stats.solde_du_ttc > 0.01 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/40">
                    {isArabic ? "مبلغ مستحق للدفع" : "Solde en attente"}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40">
                    {isArabic ? "الحساب مسوى بالكامل" : "Compte à jour"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {isArabic
                  ? "المبلغ الصافي المتبقي للأداء على كافة المعاملات والعمليات التجارية."
                  : "Solde net restant dû sur l'ensemble de vos factures et livraisons."}
              </p>
            </div>

            {/* Right: Quick Stats Breakdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 min-w-[130px]">
                <div className="text-[11px] font-medium text-[var(--muted)]">
                  {isArabic ? "مجموع الفواتير" : "Total Facturé"}
                </div>
                <div className="text-sm sm:text-base font-black text-[var(--foreground)]">
                  {formatNumber(stats.total_facture_ttc)} DH
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 min-w-[130px]">
                <div className="text-[11px] font-medium text-[var(--muted)]">
                  {isArabic ? "مجموع الأداءات" : "Total Réglé"}
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatNumber(stats.total_regle_ttc)} DH
                </div>
              </div>

              {stats.bc_en_attente_count > 0 && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-3 min-w-[130px]">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {isArabic ? "طلبات للشراء" : "Bons à signer"}
                  </div>
                  <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                    {stats.bc_en_attente_count} {isArabic ? "في الانتظار" : "en attente"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border)] scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("factures")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "factures"
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>📄</span>
            <span>{isArabic ? "الفواتير" : "Factures"}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                activeTab === "factures"
                  ? "bg-[var(--background)] text-[var(--foreground)]"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {factures.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bc")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "bc"
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>✍️</span>
            <span>{isArabic ? "طلبات الشراء (BC)" : "Bons de Commande"}</span>
            {stats.bc_en_attente_count > 0 ? (
              <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-black animate-pulse">
                {stats.bc_en_attente_count}
              </span>
            ) : (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  activeTab === "bc"
                    ? "bg-[var(--background)] text-[var(--foreground)]"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {bons_commande.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("devis")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "devis"
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>📋</span>
            <span>{isArabic ? "عروض الأسعار" : "Devis"}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                activeTab === "devis"
                  ? "bg-[var(--background)] text-[var(--foreground)]"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {devis.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bl")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "bl"
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>🚚</span>
            <span>{isArabic ? "وصولات التسليم" : "Livraisons (BL)"}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                activeTab === "bl"
                  ? "bg-[var(--background)] text-[var(--foreground)]"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {bons_livraison.length}
            </span>
          </button>

          {abonnements.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("abonnements")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "abonnements"
                  ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                  : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
              }`}
            >
              <span>🔄</span>
              <span>{isArabic ? "العقود والاشتراكات" : "Abonnements"}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  activeTab === "abonnements"
                    ? "bg-[var(--background)] text-[var(--foreground)]"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {abonnements.length}
              </span>
            </button>
          )}
        </div>

        {/* Tab 1: Factures */}
        {activeTab === "factures" && (
          <div className="space-y-4">
            {factures.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted)]">
                {isArabic ? "لا توجد فواتير مسجلة حالياً." : "Aucune facture enregistrée pour le moment."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm" dir={isArabic ? "rtl" : "ltr"}>
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-[var(--border)] text-[11px] font-black uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">{isArabic ? "رقم الفاتورة" : "N° Facture"}</th>
                        <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3">{isArabic ? "الأجل" : "Échéance"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "المبلغ TTC" : "Montant TTC"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "الباقي" : "Reste à payer"}</th>
                        <th className="px-4 py-3 text-center">{isArabic ? "الحالة" : "Statut"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "تحميل" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {factures.map((f) => {
                        const isFullyPaid = (f.reste || 0) <= 0.01;
                        const isPartial = (f.avance || 0) > 0 && !isFullyPaid;

                        return (
                          <tr key={f.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="px-4 py-3.5 font-black text-[var(--foreground)]">
                              Facture #{f.numero}
                            </td>
                            <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                              {f.date}
                            </td>
                            <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                              {f.date_echeance || "—"}
                            </td>
                            <td className="px-4 py-3.5 text-right font-black text-[var(--foreground)]">
                              {formatNumber(f.total_ttc)} DH
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold">
                              {isFullyPaid ? (
                                <span className="text-emerald-600 dark:text-emerald-400">0.00 DH</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {formatNumber(f.reste)} DH
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {isArabic ? "مؤداة" : "Payée"}
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  {isArabic ? "أداء جزئي" : "Partielle"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                  {isArabic ? "في الانتظار" : "En attente"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Link
                                href={`/print/factures/${f.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)] font-bold text-xs transition-all"
                              >
                                <span>🖨️</span>
                                <span>{isArabic ? "معاينة / PDF" : "Voir PDF"}</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bons de Commande (with online signature) */}
        {activeTab === "bc" && (
          <div className="space-y-4">
            {bons_commande.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted)]">
                {isArabic ? "لا توجد طلبات شراء مسجلة." : "Aucun bon de commande pour le moment."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm" dir={isArabic ? "rtl" : "ltr"}>
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-[var(--border)] text-[11px] font-black uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">{isArabic ? "رقم الطلب" : "N° Bon"}</th>
                        <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "المبلغ TTC" : "Montant TTC"}</th>
                        <th className="px-4 py-3 text-center">{isArabic ? "وضعية التوقيع" : "Signature"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "الإجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {bons_commande.map((bc) => {
                        const isSigned = Boolean(bc.signed_at);

                        return (
                          <tr key={bc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="px-4 py-3.5 font-black text-[var(--foreground)]">
                              BC #{bc.numero}
                            </td>
                            <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                              {bc.date}
                            </td>
                            <td className="px-4 py-3.5 text-right font-black text-[var(--foreground)]">
                              {formatNumber(bc.total_ttc)} DH
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isSigned ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <span>✓</span>
                                    <span>{isArabic ? "موقع إلكترونياً" : "Signé"}</span>
                                  </span>
                                  {bc.signed_by_name && (
                                    <span className="text-[10px] text-[var(--muted)] mt-0.5">
                                      {bc.signed_by_name}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <span>✍️</span>
                                  <span>{isArabic ? "في انتظار التوقيع" : "À signer"}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                {!isSigned && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBcToSign(bc)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                                  >
                                    <span>✍️</span>
                                    <span>{isArabic ? "توقيع الآن" : "Signer"}</span>
                                  </button>
                                )}
                                <Link
                                  href={`/print/bc/${bc.id}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)] font-bold text-xs transition-all"
                                >
                                  <span>🖨️</span>
                                  <span>{isArabic ? "عرض" : "Voir"}</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Devis */}
        {activeTab === "devis" && (
          <div className="space-y-4">
            {devis.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted)]">
                {isArabic ? "لا توجد عروض أسعار مسجلة." : "Aucun devis pour le moment."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm" dir={isArabic ? "rtl" : "ltr"}>
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-[var(--border)] text-[11px] font-black uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">{isArabic ? "رقم العرض" : "N° Devis"}</th>
                        <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "المبلغ TTC" : "Montant TTC"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "تحميل" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {devis.map((d) => (
                        <tr key={d.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-3.5 font-black text-[var(--foreground)]">
                            Devis #{d.numero}
                          </td>
                          <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                            {d.date}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-[var(--foreground)]">
                            {formatNumber(d.total_ttc)} DH
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Link
                              href={`/print/devis/${d.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)] font-bold text-xs transition-all"
                            >
                              <span>🖨️</span>
                              <span>{isArabic ? "معاينة / PDF" : "Voir PDF"}</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Bons de Livraison */}
        {activeTab === "bl" && (
          <div className="space-y-4">
            {bons_livraison.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted)]">
                {isArabic ? "لا توجد وصولات تسليم مسجلة." : "Aucun bon de livraison pour le moment."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm" dir={isArabic ? "rtl" : "ltr"}>
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-[var(--border)] text-[11px] font-black uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">{isArabic ? "رقم التوصيل" : "N° BL"}</th>
                        <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "المبلغ TTC" : "Montant TTC"}</th>
                        <th className="px-4 py-3 text-right">{isArabic ? "تحميل" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {bons_livraison.map((bl) => (
                        <tr key={bl.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-3.5 font-black text-[var(--foreground)]">
                            BL #{bl.numero}
                          </td>
                          <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                            {bl.date}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-[var(--foreground)]">
                            {formatNumber(bl.total_ttc)} DH
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Link
                              href={`/print/bl/${bl.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)] font-bold text-xs transition-all"
                            >
                              <span>🖨️</span>
                              <span>{isArabic ? "معاينة / PDF" : "Voir PDF"}</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Abonnements */}
        {activeTab === "abonnements" && (
          <div className="space-y-4">
            {abonnements.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted)]">
                {isArabic ? "لا توجد عقود اشتراك نشطة." : "Aucun contrat d'abonnement actif."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {abonnements.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[var(--muted)]">
                          {sub.reference}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {sub.periodicite.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="mt-2 text-base font-black text-[var(--foreground)]">
                        {sub.titre}
                      </h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {isArabic ? "الموعد القادم للفوترة :" : "Prochaine échéance :"}{" "}
                        <strong className="text-[var(--foreground)]">{sub.prochaine_echeance}</strong>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)]">
                        {isArabic ? "المبلغ الدوري" : "Montant périodique"}
                      </span>
                      <span className="text-base font-black text-[var(--foreground)]">
                        {formatNumber(sub.total_ttc)} DH
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Signature Modal */}
      {selectedBcToSign && (
        <PortalSignatureModal
          document={selectedBcToSign}
          clientName={client.name}
          isOpen={Boolean(selectedBcToSign)}
          onClose={() => setSelectedBcToSign(null)}
          onSuccess={handleSignSuccess}
          isArabic={isArabic}
        />
      )}
    </div>
  );
}
