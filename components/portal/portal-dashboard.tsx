"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutClientPortalAction } from "@/app/actions";
import { formatNumber } from "@/lib/utils";
import { type ClientPortalData, type PortalDocumentItem } from "@/lib/types";
import { PortalSignatureModal } from "./portal-signature-modal";
import {
  FileText,
  FileCheck2,
  Truck,
  ShoppingCart,
  CalendarClock,
  Printer,
  PenTool,
  CheckCircle2,
  Clock,
  LogOut,
  Building2,
  Check,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface PortalDashboardProps {
  data: ClientPortalData;
}

type TabType = "factures" | "devis" | "bl" | "bc" | "abonnements";

export function PortalDashboard({ data }: PortalDashboardProps) {
  const router = useRouter();
  const [lang, setLang] = useState<"fr" | "ar">("fr");
  const isArabic = lang === "ar";

  const [activeTab, setActiveTab] = useState<TabType>("factures");
  const [selectedDocToSign, setSelectedDocToSign] = useState<PortalDocumentItem | null>(null);

  const { client, company, stats, factures, bons_commande, devis, bons_livraison, abonnements } = data;

  const handleLogout = async () => {
    await logoutClientPortalAction();
  };

  const handleSignSuccess = () => {
    router.refresh();
  };

  const tabs: Array<{ id: TabType; labelFr: string; labelAr: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "factures", labelFr: "Factures", labelAr: "الفواتير", count: factures.length, icon: FileText },
    { id: "devis", labelFr: "Devis", labelAr: "عروض الأسعار", count: devis.length, icon: FileCheck2 },
    { id: "bl", labelFr: "Bons de Livraison", labelAr: "وصولات التسليم", count: bons_livraison.length, icon: Truck },
    { id: "bc", labelFr: "Bons de Commande", labelAr: "طلبيات الشراء", count: bons_commande.length, icon: ShoppingCart },
    ...(abonnements && abonnements.length > 0
      ? [{ id: "abonnements" as TabType, labelFr: "Abonnements", labelAr: "الاشتراكات", count: abonnements.length, icon: CalendarClock }]
      : []),
  ];

  const getStatusBadge = (status: string, signedAt?: string) => {
    if (signedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          <span>{isArabic ? "موقع إلكترونياً" : "Signé"}</span>
        </span>
      );
    }

    const s = status.toLowerCase();
    if (s === "payee" || s === "valide" || s === "livre") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Check className="h-3 w-3" />
          <span>{isArabic ? "مكتمل" : "Validé"}</span>
        </span>
      );
    }

    if (s === "partiel") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <span>{isArabic ? "مؤدى جزئياً" : "Règlement partiel"}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <Clock className="h-3 w-3" />
        <span>{isArabic ? "قيد الانتظار" : "En attente"}</span>
      </span>
    );
  };

  return (
    <div
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-soft)]"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Top Minimalist Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Company identity */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)] font-black text-xs">
                {company.name ? company.name.charAt(0).toUpperCase() : "H"}
              </div>
              <div>
                <span className="font-bold text-xs sm:text-sm text-[var(--foreground)] block leading-tight">
                  {company.name || "HALOUI SYSTEM"}
                </span>
                <span className="text-[10px] text-[var(--muted)] block">
                  {isArabic ? "بوابة الزبون الآمنة" : "Portail Client Sécurisé"}
                </span>
              </div>
            </div>

            {/* Actions: Client name, Language Switch, Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--background-alt)] border border-[var(--border)] text-[11px] font-medium text-[var(--foreground)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold truncate max-w-[140px]">{client.name}</span>
              </div>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => setLang(isArabic ? "fr" : "ar")}
                className="px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] text-[11px] font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-2xs"
                title="Changer de langue"
              >
                <span>{isArabic ? "Français" : "العربية"}</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-medium text-[var(--muted)] hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                title="Déconnexion"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">{isArabic ? "خروج" : "Quitter"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Account Statement & Solde Dû Banner */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block">
                {isArabic ? `كشف الحساب • ${client.name}` : `Relevé de compte • ${client.name}`}
              </span>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)]">
                  {formatNumber(stats.solde_du_ttc)} <span className="text-base font-semibold text-[var(--muted)]">DH</span>
                </span>
                {stats.solde_du_ttc > 0.01 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                    {isArabic ? "مبلغ مستحق" : "Reste à régler"}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                    {isArabic ? "الحساب مسوى بالكامل" : "Compte à jour"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {isArabic
                  ? "المبلغ الإجمالي المتبقي في ذمة الحساب بعد خصم التسبيقات والدفعات المسجلة."
                  : "Solde net exigible calculé sur l'ensemble de vos factures et règlements enregistrés."}
              </p>
            </div>

            {/* Micro Stats */}
            <div className="flex items-center gap-4 sm:border-s sm:border-[var(--border)] sm:ps-6 pt-3 sm:pt-0 border-t border-[var(--border)] sm:border-t-0">
              <div>
                <span className="text-[11px] text-[var(--muted)] block">{isArabic ? "مجموع الفواتير" : "Total facturé"}</span>
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {formatNumber(stats.total_facture_ttc)} DH
                </span>
              </div>
              <div className="w-px h-6 bg-[var(--border)]" />
              <div>
                <span className="text-[11px] text-[var(--muted)] block">{isArabic ? "المبالغ المؤداة" : "Total réglé"}</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {formatNumber(stats.total_regle_ttc)} DH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[var(--border)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-xs"
                    : "bg-[var(--card)] text-[var(--muted-strong)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--muted)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{isArabic ? tab.labelAr : tab.labelFr}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--background-alt)] text-[var(--muted)]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="space-y-4">
          {/* TAB: FACTURES */}
          {activeTab === "factures" && (
            <DocumentList
              documents={factures}
              kind="facture"
              isArabic={isArabic}
              emptyMessageFr="Aucune facture émise pour le moment."
              emptyMessageAr="لا توجد أي فاتورة صادرة حالياً."
              getStatusBadge={getStatusBadge}
            />
          )}

          {/* TAB: DEVIS (SUPPORT CERTIFIED SIGNATURE) */}
          {activeTab === "devis" && (
            <DocumentList
              documents={devis}
              kind="devis"
              isArabic={isArabic}
              canSign={true}
              signButtonTextFr="✍️ Signer (Bon pour accord)"
              signButtonTextAr="✍️ توقيع وقبول العرض"
              emptyMessageFr="Aucun devis en cours."
              emptyMessageAr="لا يوجد أي عرض سعر متاح حالياً."
              getStatusBadge={getStatusBadge}
              onSign={(doc) => setSelectedDocToSign(doc)}
            />
          )}

          {/* TAB: BONS DE LIVRAISON (SUPPORT RECEPTION SIGNATURE) */}
          {activeTab === "bl" && (
            <DocumentList
              documents={bons_livraison}
              kind="bl"
              isArabic={isArabic}
              canSign={true}
              signButtonTextFr="✍️ Émarger la réception"
              signButtonTextAr="✍️ توقيع استلام الطلبية"
              emptyMessageFr="Aucun bon de livraison enregistré."
              emptyMessageAr="لا يوجد أي وصل تسليم مسجل حالياً."
              getStatusBadge={getStatusBadge}
              onSign={(doc) => setSelectedDocToSign(doc)}
            />
          )}

          {/* TAB: BONS DE COMMANDE (SUPPORT CERTIFIED SIGNATURE) */}
          {activeTab === "bc" && (
            <DocumentList
              documents={bons_commande}
              kind="bc"
              isArabic={isArabic}
              canSign={true}
              signButtonTextFr="✍️ Valider et signer"
              signButtonTextAr="✍️ توقيع والمصادقة"
              emptyMessageFr="Aucun bon de commande en attente."
              emptyMessageAr="لا توجد أي طلبية شراء مسجلة حالياً."
              getStatusBadge={getStatusBadge}
              onSign={(doc) => setSelectedDocToSign(doc)}
            />
          )}

          {/* TAB: ABONNEMENTS */}
          {activeTab === "abonnements" && abonnements && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] shadow-xs">
              {abonnements.map((sub) => (
                <div key={sub.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[var(--foreground)]">{sub.titre}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--background-alt)] text-[var(--muted-strong)] border">
                        {sub.reference}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {isArabic ? "الدورية :" : "Périodicité :"} <b>{sub.periodicite}</b> • {isArabic ? "الإشعال القادم :" : "Prochaine échéance :"}{" "}
                      <b>{sub.prochaine_echeance}</b>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-sm sm:text-base font-black text-[var(--foreground)]">
                      {formatNumber(sub.total_ttc)} DH TTC
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {sub.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Signature Modal */}
      {selectedDocToSign && (
        <PortalSignatureModal
          document={selectedDocToSign}
          clientName={client.name}
          isOpen={Boolean(selectedDocToSign)}
          onClose={() => setSelectedDocToSign(null)}
          onSuccess={handleSignSuccess}
          isArabic={isArabic}
        />
      )}
    </div>
  );
}

// Subcomponent: Document List Table & Mobile Cards
function DocumentList({
  documents,
  kind,
  isArabic,
  canSign = false,
  signButtonTextFr = "✍️ Signer",
  signButtonTextAr = "✍️ توقيع",
  emptyMessageFr,
  emptyMessageAr,
  getStatusBadge,
  onSign,
}: {
  documents: PortalDocumentItem[];
  kind: string;
  isArabic: boolean;
  canSign?: boolean;
  signButtonTextFr?: string;
  signButtonTextAr?: string;
  emptyMessageFr: string;
  emptyMessageAr: string;
  getStatusBadge: (status: string, signedAt?: string) => React.ReactNode;
  onSign?: (doc: PortalDocumentItem) => void;
}) {
  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted)] shadow-xs">
        {isArabic ? emptyMessageAr : emptyMessageFr}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-alt)] text-[var(--muted-strong)] font-semibold">
              <th className="py-2.5 px-4 text-start">{isArabic ? "الرقم المرجعي" : "N° Document"}</th>
              <th className="py-2.5 px-4 text-start">{isArabic ? "التاريخ" : "Date"}</th>
              <th className="py-2.5 px-4 text-end">{isArabic ? "المبلغ الإجمالي" : "Montant TTC"}</th>
              <th className="py-2.5 px-4 text-center">{isArabic ? "الحالة" : "État"}</th>
              <th className="py-2.5 px-4 text-end">{isArabic ? "الإجراء" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] font-medium">
            {documents.map((doc) => {
              const printUrl = `/print/${kind}/${doc.id}`;
              const isSigned = Boolean(doc.signed_at);

              return (
                <tr key={doc.id} className="hover:bg-[var(--background-alt)]/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[var(--foreground)]">{doc.numero}</span>
                    {doc.signed_by_name && (
                      <span className="block text-[10px] text-[var(--muted)] truncate max-w-[180px]">
                        {isArabic ? `الموقع: ${doc.signed_by_name}` : `Signé par: ${doc.signed_by_name}`}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[var(--muted-strong)]">{doc.date}</td>
                  <td className="py-3 px-4 text-end font-bold text-[var(--foreground)]">
                    {formatNumber(doc.total_ttc)} DH
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(doc.status, doc.signed_at)}</td>
                  <td className="py-3 px-4 text-end space-x-2 rtl:space-x-reverse">
                    {/* View / Print button */}
                    <a
                      href={printUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[11px] font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-2xs"
                      title="Consulter le document officiel"
                    >
                      <Printer className="h-3 w-3" />
                      <span>{isArabic ? "معاينة" : "Voir"}</span>
                    </a>

                    {/* Certified Sign Button */}
                    {canSign && !isSigned && onSign && (
                      <button
                        type="button"
                        onClick={() => onSign(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <PenTool className="h-3 w-3" />
                        <span>{isArabic ? signButtonTextAr : signButtonTextFr}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-[var(--border)]">
        {documents.map((doc) => {
          const printUrl = `/print/${kind}/${doc.id}`;
          const isSigned = Boolean(doc.signed_at);

          return (
            <div key={doc.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-sm text-[var(--foreground)]">{doc.numero}</span>
                  <span className="text-[11px] text-[var(--muted)] block mt-0.5">{doc.date}</span>
                </div>
                <div>{getStatusBadge(doc.status, doc.signed_at)}</div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--muted)]">{isArabic ? "المبلغ الصافي :" : "Montant :"}</span>
                <span className="text-sm font-black text-[var(--foreground)]">
                  {formatNumber(doc.total_ttc)} DH TTC
                </span>
              </div>

              {doc.signed_by_name && (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{isArabic ? `تم التوقيع بواسطة ${doc.signed_by_name}` : `Signé par ${doc.signed_by_name}`}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                <a
                  href={printUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background-alt)] text-xs font-semibold text-[var(--foreground)] cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{isArabic ? "عرض الوثيقة" : "Consulter / Imprimer"}</span>
                </a>

                {canSign && !isSigned && onSign && (
                  <button
                    type="button"
                    onClick={() => onSign(doc)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-xs font-bold cursor-pointer"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>{isArabic ? signButtonTextAr : signButtonTextFr}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
