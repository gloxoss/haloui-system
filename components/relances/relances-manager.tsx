"use client";

import * as React from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Button,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Stack,
  Text,
} from "@mantine/core";
import {
  CheckCircle,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  History,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Sliders,
} from "lucide-react";

import { RelanceActionModal } from "./relance-action-modal";
import { RelanceHistoryDrawer } from "./relance-history-drawer";
import { RelancePaymentModal } from "./relance-payment-modal";
import { RELANCE_PALIER_LABELS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import {
  type BalanceAgeeStats,
  type FactureImpayeeItem,
  type RelanceSettings,
  type Role,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function RelancesManager({
  initialInvoices,
  balanceAgee,
  settings,
  userRole,
}: {
  initialInvoices: FactureImpayeeItem[];
  balanceAgee: BalanceAgeeStats;
  settings: RelanceSettings;
  userRole: Role;
}) {
  const { locale } = useTranslation();

  const [invoices, setInvoices] = React.useState<FactureImpayeeItem[]>(initialInvoices);
  const [selectedPalier, setSelectedPalier] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<string>("retard_desc");

  // Modals state
  const [activeRelanceInvoice, setActiveRelanceInvoice] = React.useState<FactureImpayeeItem | null>(null);
  const [relanceModalOpened, setRelanceModalOpened] = React.useState<boolean>(false);

  const [activePaymentInvoice, setActivePaymentInvoice] = React.useState<FactureImpayeeItem | null>(null);
  const [paymentModalOpened, setPaymentModalOpened] = React.useState<boolean>(false);

  const [activeHistoryInvoice, setActiveHistoryInvoice] = React.useState<FactureImpayeeItem | null>(null);
  const [historyDrawerOpened, setHistoryDrawerOpened] = React.useState<boolean>(false);

  React.useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const filteredInvoices = React.useMemo(() => {
    let list = [...invoices];

    if (selectedPalier !== "all") {
      list = list.filter((item) => item.palier_recommande === selectedPalier);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          String(item.numero).includes(q) ||
          item.client_name.toLowerCase().includes(q) ||
          item.client_phone.includes(q) ||
          (item.client_ice && item.client_ice.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "retard_desc":
          return b.jours_retard - a.jours_retard;
        case "retard_asc":
          return a.jours_retard - b.jours_retard;
        case "reste_desc":
          return b.reste - a.reste;
        case "reste_asc":
          return a.reste - b.reste;
        case "date_desc":
          return b.date.localeCompare(a.date);
        case "client_asc":
          return a.client_name.localeCompare(b.client_name);
        default:
          return b.jours_retard - a.jours_retard;
      }
    });

    return list;
  }, [invoices, selectedPalier, searchQuery, sortBy]);

  const handleOpenRelance = (item: FactureImpayeeItem) => {
    setActiveRelanceInvoice(item);
    setRelanceModalOpened(true);
  };

  const handleOpenPayment = (item: FactureImpayeeItem) => {
    setActivePaymentInvoice(item);
    setPaymentModalOpened(true);
  };

  const handleOpenHistory = (item: FactureImpayeeItem) => {
    setActiveHistoryInvoice(item);
    setHistoryDrawerOpened(true);
  };

  const handleExportCsv = () => {
    const headers = [
      "Numero",
      "Client",
      "Telephone",
      "Date Emission",
      "Date Echeance",
      "Jours Retard",
      "Total TTC",
      "Avance",
      "Reste a Payer",
      "Palier Recommande",
      "Nombre Relances",
      "Derniere Relance Date",
    ];

    const rows = filteredInvoices.map((inv) => [
      `FAC-${inv.numero}`,
      `"${inv.client_name.replace(/"/g, '""')}"`,
      `"${inv.client_phone}"`,
      inv.date,
      inv.date_echeance,
      inv.jours_retard,
      inv.total_ttc.toFixed(2),
      inv.avance.toFixed(2),
      inv.reste.toFixed(2),
      inv.palier_recommande,
      inv.nombre_relances,
      inv.derniere_relance_date || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relances_impayes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCreances = balanceAgee.total_creances;
  const totalEchu = balanceAgee.total_echu;
  const totalNonEchu = balanceAgee.total_non_echu;
  const pctEchu = totalCreances > 0 ? Math.round((totalEchu / totalCreances) * 100) : 0;

  return (
    <Stack gap="md" className="max-w-7xl mx-auto">
      {/* Sleek Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            {locale === "ar" ? "تتبع واستخلاص الديون" : "Relances & Impayés"}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {locale === "ar"
              ? "متابعة الفواتير غير المسددة وإرسال التذكيرات بالواتساب والإيميل"
              : "Suivi des créances en attente et scénarios de relances par WhatsApp & Email"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="xs"
            leftSection={<FileSpreadsheet size={13} />}
            onClick={handleExportCsv}
          >
            {locale === "ar" ? "تصدير CSV" : "Exporter CSV"}
          </Button>
          {userRole === "admin" || userRole === "superadmin" ? (
            <Button
              component={Link}
              href="/parametres#relances-studio"
              variant="light"
              size="xs"
              leftSection={<Sliders size={13} />}
            >
              {locale === "ar" ? "الإعدادات" : "Paramètres"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Clean KPI Summary Bar (4 sleek minimalist stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            {locale === "ar" ? "إجمالي الديون" : "Total à recouvrer"}
          </span>
          <span className="text-lg font-bold text-[var(--foreground)] mt-1">
            {formatCurrency(totalCreances)}
          </span>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">
            {invoices.length} {locale === "ar" ? "فاتورة غير مسددة" : "facture(s) en cours"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            {locale === "ar" ? "متأخرات (Échues)" : "Créances échues"}
          </span>
          <span className="text-lg font-bold text-rose-600 mt-1">
            {formatCurrency(totalEchu)}
          </span>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">
            {pctEchu}% {locale === "ar" ? "من إجمالي الديون" : "du total des impayés"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            {locale === "ar" ? "قيد الأجل (Non échues)" : "Échéances à venir"}
          </span>
          <span className="text-lg font-bold text-emerald-600 mt-1">
            {formatCurrency(totalNonEchu)}
          </span>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">
            {balanceAgee.tranches.non_echu.count} {locale === "ar" ? "فاتورة" : "facture(s) non échue(s)"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
            {locale === "ar" ? "تذكيرات هذا الشهر" : "Relances effectuées"}
          </span>
          <span className="text-lg font-bold text-sky-600 mt-1">
            {balanceAgee.relances_ce_mois}
          </span>
          <span className="text-[11px] text-[var(--muted)] mt-0.5">
            {locale === "ar" ? "إجراءات مسجلة" : "interventions ce mois-ci"}
          </span>
        </div>
      </div>

      {/* Thin, Elegant Balance Âgée Line */}
      {totalCreances > 0 && (
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--foreground)]">
              {locale === "ar" ? "ميزان أعمار الديون" : "Balance Âgée"}
            </span>
            <span className="text-[var(--muted)] text-[11px]">
              {locale === "ar" ? "توزيع المبالغ حسب مدة التأخير" : "Répartition par ancienneté"}
            </span>
          </div>

          {/* Thin progress track */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-[var(--surface-soft)]">
            {balanceAgee.tranches.non_echu.montant > 0 && (
              <div
                style={{ width: `${(balanceAgee.tranches.non_echu.montant / totalCreances) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Non échu: ${formatCurrency(balanceAgee.tranches.non_echu.montant)}`}
              />
            )}
            {balanceAgee.tranches.j1_15.montant > 0 && (
              <div
                style={{ width: `${(balanceAgee.tranches.j1_15.montant / totalCreances) * 100}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`1-15j: ${formatCurrency(balanceAgee.tranches.j1_15.montant)}`}
              />
            )}
            {balanceAgee.tranches.j16_30.montant > 0 && (
              <div
                style={{ width: `${(balanceAgee.tranches.j16_30.montant / totalCreances) * 100}%` }}
                className="bg-orange-500 h-full transition-all"
                title={`16-30j: ${formatCurrency(balanceAgee.tranches.j16_30.montant)}`}
              />
            )}
            {balanceAgee.tranches.j31_60.montant > 0 && (
              <div
                style={{ width: `${(balanceAgee.tranches.j31_60.montant / totalCreances) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`31-60j: ${formatCurrency(balanceAgee.tranches.j31_60.montant)}`}
              />
            )}
            {balanceAgee.tranches.j61_plus.montant > 0 && (
              <div
                style={{ width: `${(balanceAgee.tranches.j61_plus.montant / totalCreances) * 100}%` }}
                className="bg-red-700 h-full transition-all"
                title={`+60j: ${formatCurrency(balanceAgee.tranches.j61_plus.montant)}`}
              />
            )}
          </div>

          {/* Minimalist Legend Pills */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--muted)] pt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              Non échu : <strong>{formatCurrency(balanceAgee.tranches.non_echu.montant)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              1 à 15j : <strong>{formatCurrency(balanceAgee.tranches.j1_15.montant)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              16 à 30j : <strong>{formatCurrency(balanceAgee.tranches.j16_30.montant)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              31 à 60j : <strong>{formatCurrency(balanceAgee.tranches.j31_60.montant)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-700 shrink-0" />
              +60j : <strong>{formatCurrency(balanceAgee.tranches.j61_plus.montant)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main Panel with Filter Pills, Search and Invoices List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedPalier("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedPalier === "all"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              {locale === "ar" ? "الكل" : "Toutes"} ({invoices.length})
            </button>
            <button
              onClick={() => setSelectedPalier("prevenance")}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedPalier === "prevenance"
                  ? "bg-teal-600 text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              {locale === "ar" ? "استباقي (J-3)" : "Prévenance (J-3)"} ({balanceAgee.par_palier.prevenance.count})
            </button>
            <button
              onClick={() => setSelectedPalier("relance_1")}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedPalier === "relance_1"
                  ? "bg-amber-500 text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              {locale === "ar" ? "تذكير (J+7)" : "Relance 1 (J+7)"} ({balanceAgee.par_palier.relance_1.count})
            </button>
            <button
              onClick={() => setSelectedPalier("relance_2")}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedPalier === "relance_2"
                  ? "bg-orange-600 text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              {locale === "ar" ? "إنذار (J+15)" : "Relance 2 (J+15)"} ({balanceAgee.par_palier.relance_2.count})
            </button>
            <button
              onClick={() => setSelectedPalier("mise_en_demeure")}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedPalier === "mise_en_demeure"
                  ? "bg-rose-600 text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              {locale === "ar" ? "إنذار قانوني (J+30)" : "Mise en demeure"} ({balanceAgee.par_palier.mise_en_demeure.count})
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder={locale === "ar" ? "بحث عن عميل، فاتورة..." : "Rechercher client, facture..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-hidden focus:ring-1 focus:ring-[var(--foreground)]"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Trier par"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-hidden"
            >
              <option value="retard_desc">Tri : Retard décroissant</option>
              <option value="reste_desc">Tri : Montant décroissant</option>
              <option value="date_desc">Tri : Date d'émission</option>
              <option value="client_asc">Tri : Client (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Clean, Spacious Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={36} className="mx-auto text-teal-600 mb-2.5 opacity-80" />
            <Text fw={600} size="sm">
              {locale === "ar" ? "لا توجد فواتير مطابقة" : "Aucun impayé trouvé"}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {locale === "ar"
                ? "جميع الفواتير مسددة أو لا توجد نتائج مطابقة للبحث."
                : "Toutes les factures de cette catégorie sont réglées."}
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] font-medium">
                  <th className="py-3 px-2 font-medium">{locale === "ar" ? "العميل" : "Client"}</th>
                  <th className="py-3 px-2 font-medium">{locale === "ar" ? "الفاتورة" : "Facture"}</th>
                  <th className="py-3 px-2 font-medium">{locale === "ar" ? "الأجل & التأخير" : "Échéance"}</th>
                  <th className="py-3 px-2 font-medium">{locale === "ar" ? "المبلغ المستحق" : "Reste à payer"}</th>
                  <th className="py-3 px-2 font-medium">{locale === "ar" ? "المستوى" : "Niveau"}</th>
                  <th className="py-3 px-2 font-medium">{locale === "ar" ? "السجل" : "Historique"}</th>
                  <th className="py-3 px-2 text-right font-medium">{locale === "ar" ? "إجراء" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredInvoices.map((inv) => {
                  const palierMeta = RELANCE_PALIER_LABELS[inv.palier_recommande] || RELANCE_PALIER_LABELS.prevenance;

                  return (
                    <tr key={inv.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                      {/* Client */}
                      <td className="py-3 px-2">
                        <div className="font-semibold text-sm text-[var(--foreground)]">
                          {inv.client_name}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
                          {inv.client_phone || "Sans téléphone"}
                          {inv.client_phone ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRelance(inv)}
                              title="Ouvrir relance WhatsApp"
                              className="text-teal-600 hover:text-teal-700 inline-flex items-center"
                            >
                              <MessageCircle size={11} />
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* Facture */}
                      <td className="py-3 px-2">
                        <div className="font-medium text-[var(--foreground)] flex items-center gap-1">
                          FAC-{inv.numero}
                          <Link
                            href={`/print/facture/${inv.id}`}
                            target="_blank"
                            className="text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {formatDate(inv.date)}
                        </div>
                      </td>

                      {/* Échéance & Retard */}
                      <td className="py-3 px-2">
                        <div className="font-medium text-[var(--foreground)]">
                          {formatDate(inv.date_echeance)}
                        </div>
                        <div className="mt-0.5">
                          {inv.jours_retard <= 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {inv.jours_retard === 0 ? "Aujourd'hui" : `Dans ${Math.abs(inv.jours_retard)}j`}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                inv.jours_retard > 30
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                                  : inv.jours_retard > 14
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              }`}
                            >
                              +{inv.jours_retard}j retard
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Montant Reste */}
                      <td className="py-3 px-2">
                        <div className="font-bold text-sm text-rose-600">
                          {formatCurrency(inv.reste)}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          sur {formatCurrency(inv.total_ttc)}
                        </div>
                      </td>

                      {/* Palier Badge */}
                      <td className="py-3 px-2">
                        <Badge
                          size="sm"
                          color={palierMeta.color}
                          variant="light"
                          style={{ textTransform: "none", fontWeight: 600 }}
                        >
                          {palierMeta.badge}
                        </Badge>
                      </td>

                      {/* Historique Relances */}
                      <td className="py-3 px-2">
                        {inv.nombre_relances > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(inv)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline underline-offset-2"
                          >
                            <History size={11} />
                            {inv.nombre_relances} relance{inv.nombre_relances > 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            size="xs"
                            color="teal"
                            variant="filled"
                            leftSection={<Send size={12} />}
                            onClick={() => handleOpenRelance(inv)}
                            style={{ height: 28, fontSize: "11px", fontWeight: 600 }}
                          >
                            {locale === "ar" ? "تذكير" : "Relancer"}
                          </Button>

                          <Button
                            size="xs"
                            variant="default"
                            onClick={() => handleOpenPayment(inv)}
                            style={{ height: 28, fontSize: "11px", fontWeight: 500 }}
                          >
                            {locale === "ar" ? "أداء" : "Encaisser"}
                          </Button>

                          <Menu position="bottom-end" shadow="md">
                            <MenuTarget>
                              <ActionIcon variant="subtle" size="sm" color="gray">
                                <MoreHorizontal size={14} />
                              </ActionIcon>
                            </MenuTarget>
                            <MenuDropdown>
                              <MenuItem
                                leftSection={<History size={13} />}
                                onClick={() => handleOpenHistory(inv)}
                              >
                                {locale === "ar" ? "سجل التذكيرات" : "Historique des relances"}
                              </MenuItem>
                              <MenuItem
                                component={Link}
                                href={`/print/facture/${inv.id}`}
                                target="_blank"
                                leftSection={<Eye size={13} />}
                              >
                                {locale === "ar" ? "معاينة الفاتورة" : "Aperçu de la facture"}
                              </MenuItem>
                            </MenuDropdown>
                          </Menu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Relance Action Modal */}
      <RelanceActionModal
        invoice={activeRelanceInvoice}
        settings={settings}
        opened={relanceModalOpened}
        onClose={() => setRelanceModalOpened(false)}
      />

      {/* Payment Settlement Modal */}
      <RelancePaymentModal
        invoice={activePaymentInvoice}
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
      />

      {/* History Timeline Drawer */}
      <RelanceHistoryDrawer
        invoice={activeHistoryInvoice}
        opened={historyDrawerOpened}
        onClose={() => setHistoryDrawerOpened(false)}
      />
    </Stack>
  );
}
