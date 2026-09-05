"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  Badge,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  NumberInput,
  Tooltip,
  Alert,
  Switch,
  ActionIcon,
  Title,
} from "@mantine/core";
import {
  Coins,
  RefreshCw,
  Plus,
  Calculator,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Scale,
  Globe,
  Search,
  ArrowRightLeft,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  CircleDollarSign,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { useTranslation } from "@/lib/i18n";
import {
  syncExchangeRatesAction,
  deleteForexTransactionAction,
  saveExchangeRateAction,
} from "@/app/actions";
import { RateModal } from "./rate-modal";
import {
  type CurrencyRecord,
  type ForexTransactionRecord,
  type ForexSummary,
  type CompanyRecord,
} from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/exchange-rates";

interface ForexDashboardProps {
  company: CompanyRecord;
  rates: CurrencyRecord[];
  transactions: ForexTransactionRecord[];
  summary: ForexSummary;
}

export function ForexDashboard({
  company,
  rates,
  transactions,
  summary,
}: ForexDashboardProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  // Search & Filter for foreign currencies
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Rate Modal State
  const [rateModalOpen, setRateModalOpen] = useState<boolean>(false);
  const [selectedRate, setSelectedRate] = useState<CurrencyRecord | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  // Converter state (Always visible & active)
  const [converterAmount, setConverterAmount] = useState<number>(1000);
  const [converterFrom, setConverterFrom] = useState<string>("EUR");
  const [converterTo, setConverterTo] = useState<string>("MAD");
  const [copied, setCopied] = useState(false);

  // Journal Filter
  const [journalFilter, setJournalFilter] = useState<"all" | "gain" | "perte">("all");

  // Sync handler
  const handleSyncLiveRates = () => {
    startSyncTransition(async () => {
      setSyncStatus(null);
      const res = await syncExchangeRatesAction();
      if (res.success) {
        setSyncStatus(
          isAr
            ? `تم تحديث أسعار الصرف بنجاح (${res.updatedCount} عملة).`
            : `Cours officiels actualisés avec succès (${res.updatedCount} devises synchronisées).`
        );
        setTimeout(() => setSyncStatus(null), 5000);
      } else {
        setSyncStatus(
          isAr
            ? `تعذر التحديث : ${"error" in res ? res.error : "خطأ غير معروف"}`
            : `Erreur de synchronisation : ${"error" in res ? res.error : "Échec"}`
        );
      }
    });
  };

  // Toggle active currency
  const handleToggleActive = async (rate: CurrencyRecord) => {
    setTogglingCode(rate.code);
    const newStatus = rate.est_actif === 1 ? 0 : 1;
    await saveExchangeRateAction({
      code: rate.code,
      nom: rate.nom,
      symbole: rate.symbole,
      taux: Number(rate.taux),
      taux_achat: rate.taux_achat ? Number(rate.taux_achat) : undefined,
      taux_vente: rate.taux_vente ? Number(rate.taux_vente) : undefined,
      source: rate.source,
      est_actif: newStatus,
    });
    setTogglingCode(null);
  };

  // Delete transaction
  const handleDeleteTransaction = (id: number) => {
    const msg = isAr
      ? "هل أنت متأكد من حذف هذه المعاملة من سجل فروقات الصرف؟"
      : "Voulez-vous vraiment supprimer cet enregistrement de gain/perte de change ?";
    if (!confirm(msg)) return;

    startDeleteTransition(async () => {
      await deleteForexTransactionAction(id);
    });
  };

  // Swap converter currencies
  const handleSwapConverter = () => {
    const temp = converterFrom;
    setConverterFrom(converterTo);
    setConverterTo(temp);
  };

  // Choose currency from cards or table
  const handleSelectCurrency = (code: string) => {
    setConverterFrom(code);
    setConverterTo("MAD");
  };

  // Foreign rates without MAD
  const foreignRates = useMemo(() => {
    return rates.filter((r) => r.code !== "MAD");
  }, [rates]);

  // Key primary rates
  const eurRate = useMemo(() => foreignRates.find((r) => r.code === "EUR"), [foreignRates]);
  const usdRate = useMemo(() => foreignRates.find((r) => r.code === "USD"), [foreignRates]);
  const gbpRate = useMemo(() => foreignRates.find((r) => r.code === "GBP"), [foreignRates]);

  // Filtered foreign rates
  const filteredRates = useMemo(() => {
    return foreignRates.filter((r) => {
      if (filterActiveOnly && !r.est_actif) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.code.toLowerCase().includes(q) ||
        r.nom.toLowerCase().includes(q) ||
        (r.nom_ar && r.nom_ar.includes(q)) ||
        r.symbole.toLowerCase().includes(q)
      );
    });
  }, [foreignRates, filterActiveOnly, searchQuery]);

  const activeCount = useMemo(() => {
    return foreignRates.filter((r) => r.est_actif === 1).length;
  }, [foreignRates]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (journalFilter === "all") return transactions;
    return transactions.filter((tx) => tx.type_resultat === journalFilter);
  }, [transactions, journalFilter]);

  const gainCount = useMemo(() => transactions.filter((tx) => tx.type_resultat === "gain").length, [transactions]);
  const perteCount = useMemo(() => transactions.filter((tx) => tx.type_resultat === "perte").length, [transactions]);

  // Converter calculation
  const fromRate = rates.find((r) => r.code === converterFrom)?.taux || 1.0;
  const toRate = rates.find((r) => r.code === converterTo)?.taux || 1.0;
  const effectiveRate = Number(fromRate) / Number(toRate);
  const convertedAmount = Math.round(converterAmount * effectiveRate * 100) / 100;

  // Copy result handler
  const handleCopyResult = () => {
    const textToCopy = `${formatNumber(convertedAmount)} ${converterTo}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export CSV
  const exportJournalCSV = () => {
    if (transactions.length === 0) {
      alert(isAr ? "لا توجد معاملات للتصدير." : "Aucune transaction de change à exporter.");
      return;
    }

    const headers = [
      "ID",
      "Date Operation",
      "Date Reglement",
      "Type",
      "Tiers",
      "Piece Ref",
      "Devise",
      "Montant Devise",
      "Taux Initial",
      "Taux Reglement",
      "Contre-valeur Facture (MAD)",
      "Contre-valeur Reglement (MAD)",
      "Ecart de Change (MAD)",
      "Resultat",
      "Compte Comptable",
    ];

    const rows = transactions.map((tx) => [
      tx.id,
      tx.date_operation,
      tx.date_reglement,
      tx.type_operation,
      `"${(tx.tiers_nom || "").replace(/"/g, '""')}"`,
      `"${(tx.reference_piece || "").replace(/"/g, '""')}"`,
      tx.devise,
      tx.montant_devise,
      tx.taux_initial,
      tx.taux_reglement,
      tx.montant_initial_base,
      tx.montant_regle_base,
      tx.ecart_change,
      tx.type_resultat,
      tx.compte_comptable,
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `journal-gains-pertes-change-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap="lg" className="max-w-7xl mx-auto pb-12">
      {/* 1. Standard Haloui Page Heading */}
      <PageHeading
        eyebrow={isAr ? "العملات والأسعار الرسمية" : "Multi-devises & Taux de change"}
        title={isAr ? "أسعار العملات والتحويل الفوري" : "Devises & Taux de Change"}
        description={
          isAr
            ? "متابعة أسعار صرف العملات بالدرهم المغربي (MAD)، حاسبة تحويل فورية وإدارة العملات المفعلة في فواتيركم."
            : "Consultez les cours du jour en Dirhams (MAD), convertissez vos montants instantanément et activez vos devises de facturation."
        }
        actions={
          <Group gap="xs">
            <Badge
              size="lg"
              radius="md"
              color="teal"
              variant="light"
              className="font-bold hidden sm:inline-flex"
            >
              {isAr ? "العملة الأساسية : الدرهم المغربي (MAD)" : "Devise de référence : Dirham Marocain (MAD)"}
            </Badge>

            <Button
              variant="default"
              radius="md"
              leftSection={<RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />}
              onClick={handleSyncLiveRates}
              loading={isSyncing}
            >
              {isAr ? "تحديث الأسعار" : "Actualiser les cours"}
            </Button>

            <Button
              color="teal"
              radius="md"
              leftSection={<Plus size={15} />}
              onClick={() => {
                setSelectedRate(null);
                setRateModalOpen(true);
              }}
            >
              {isAr ? "عملة جديدة" : "Nouvelle devise"}
            </Button>
          </Group>
        }
      />

      {/* Sync Status Alert */}
      {syncStatus ? (
        <Alert
          color={syncStatus.includes("Erreur") || syncStatus.includes("تعذر") ? "red" : "teal"}
          icon={
            syncStatus.includes("Erreur") || syncStatus.includes("تعذر") ? (
              <AlertTriangle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )
          }
          radius="xl"
          withCloseButton
          onClose={() => setSyncStatus(null)}
        >
          {syncStatus}
        </Alert>
      ) : null}

      {/* 2. Top 4 Authentic Haloui KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Euro */}
        <Paper
          radius="xl"
          withBorder
          p="md"
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
            transition: "all 200ms ease",
            cursor: "pointer",
          }}
          className="hover:-translate-y-0.5 hover:shadow-xs"
          onClick={() => handleSelectCurrency("EUR")}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" fw={700} tt="uppercase" c="amber" style={{ letterSpacing: "0.05em" }}>
                {isAr ? "اليورو (€)" : "Euro (€)"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#d97706" }}>
                {eurRate ? Number(eurRate.taux).toFixed(2) : "10.87"} DH
              </Text>
              <Text size="11px" c="dimmed">
                1 EUR = {eurRate ? Number(eurRate.taux).toFixed(4) : "10.8732"} MAD
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Coins size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Card 2: Dollar US */}
        <Paper
          radius="xl"
          withBorder
          p="md"
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
            transition: "all 200ms ease",
            cursor: "pointer",
          }}
          className="hover:-translate-y-0.5 hover:shadow-xs"
          onClick={() => handleSelectCurrency("USD")}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" fw={700} tt="uppercase" c="blue" style={{ letterSpacing: "0.05em" }}>
                {isAr ? "الدولار الأمريكي ($)" : "Dollar US ($)"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#2563eb" }}>
                {usdRate ? Number(usdRate.taux).toFixed(2) : "9.36"} DH
              </Text>
              <Text size="11px" c="dimmed">
                1 USD = {usdRate ? Number(usdRate.taux).toFixed(4) : "9.3645"} MAD
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(37, 99, 235, 0.12)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircleDollarSign size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Card 3: Livre Sterling (GBP) */}
        <Paper
          radius="xl"
          withBorder
          p="md"
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
            transition: "all 200ms ease",
            cursor: "pointer",
          }}
          className="hover:-translate-y-0.5 hover:shadow-xs"
          onClick={() => handleSelectCurrency("GBP")}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" fw={700} tt="uppercase" c="indigo" style={{ letterSpacing: "0.05em" }}>
                {isAr ? "الجنيه الإسترليني (£)" : "Livre Sterling (£)"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#4f46e5" }}>
                {gbpRate ? Number(gbpRate.taux).toFixed(2) : "12.65"} DH
              </Text>
              <Text size="11px" c="dimmed">
                1 GBP = {gbpRate ? Number(gbpRate.taux).toFixed(4) : "12.6510"} MAD
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(79, 70, 229, 0.12)",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Globe size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Card 4: Net Forex Variance */}
        <Paper
          radius="xl"
          withBorder
          p="md"
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
            transition: "all 200ms ease",
          }}
          className="hover:-translate-y-0.5 hover:shadow-xs"
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                c={summary.resultatNet >= 0 ? "teal" : "rose"}
                style={{ letterSpacing: "0.05em" }}
              >
                {isAr ? "صافي فروقات الصرف" : "Écart de Change Net"}
              </Text>
              <Text
                size="xl"
                fw={900}
                style={{
                  letterSpacing: "-0.03em",
                  color: summary.resultatNet >= 0 ? "#059669" : "#e11d48",
                }}
              >
                {summary.resultatNet > 0 ? "+" : ""}
                {formatCurrency(summary.resultatNet)}
              </Text>
              <Text size="11px" c="dimmed">
                {summary.resultatNet >= 0
                  ? isAr ? "أرباح إضافية عند التحصيل" : "Gains constatés aux règlements"
                  : isAr ? "فوارق سلبية مسجلة" : "Pertes constatées aux règlements"}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background:
                  summary.resultatNet >= 0
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(225, 29, 72, 0.12)",
                color: summary.resultatNet >= 0 ? "#059669" : "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {summary.resultatNet >= 0 ? (
                <TrendingUp size={20} strokeWidth={1.8} />
              ) : (
                <TrendingDown size={20} strokeWidth={1.8} />
              )}
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 3. Main Two-Column Directed Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Express Converter (5 cols on lg) */}
        <div className="lg:col-span-5">
          <Paper
            radius="xl"
            withBorder
            p="lg"
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
            }}
            shadow="sm"
          >
            <Stack gap="md">
              {/* Converter Header */}
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(13, 148, 136, 0.12)",
                      color: "#0d9488",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Calculator size={18} />
                  </div>
                  <div>
                    <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                      {isAr ? "محول فوري للدرهم" : "Convertisseur Express"}
                    </Text>
                    <Text size="11px" c="dimmed">
                      {isAr ? "حساب سريع دون مغادرة الصفحة" : "Calcul instantané en Dirhams (MAD)"}
                    </Text>
                  </div>
                </Group>

                <Badge color="teal" variant="light" size="xs">
                  {isAr ? "مباشر" : "En direct"}
                </Badge>
              </Group>

              {/* Amount Input */}
              <NumberInput
                label={isAr ? "المبلغ المراد تحويله" : "Montant à convertir"}
                placeholder="1000"
                value={converterAmount}
                onChange={(val) => setConverterAmount(typeof val === "number" ? val : 0)}
                min={0.01}
                radius="md"
                size="sm"
                thousandSeparator=" "
              />

              {/* Quick Amount Buttons */}
              <div>
                <Text size="11px" fw={600} c="dimmed" mb={6}>
                  {isAr ? "مبالغ سريعة بنقرة واحدة :" : "Montants fréquents :"}
                </Text>
                <div className="grid grid-cols-3 gap-1.5">
                  {[250, 500, 1000, 2500, 5000, 10000].map((amt) => (
                    <Button
                      key={amt}
                      size="xs"
                      radius="md"
                      variant={converterAmount === amt ? "filled" : "light"}
                      color={converterAmount === amt ? "teal" : "gray"}
                      onClick={() => setConverterAmount(amt)}
                      className="font-semibold"
                    >
                      {formatNumber(amt)} {getCurrencySymbol(converterFrom)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Currency Selectors with Swap */}
              <div className="grid grid-cols-5 items-end gap-2 pt-1">
                <div className="col-span-2">
                  <Select
                    label={isAr ? "من" : "De"}
                    value={converterFrom}
                    onChange={(val) => val && setConverterFrom(val)}
                    data={rates.map((r) => ({
                      value: r.code,
                      label: `${r.code} (${r.symbole})`,
                    }))}
                    radius="md"
                    size="xs"
                  />
                </div>

                <div className="col-span-1 flex justify-center pb-0.5">
                  <ActionIcon
                    variant="default"
                    radius="md"
                    size="input-xs"
                    onClick={handleSwapConverter}
                    title={isAr ? "عكس العملات" : "Inverser"}
                  >
                    <ArrowRightLeft size={14} />
                  </ActionIcon>
                </div>

                <div className="col-span-2">
                  <Select
                    label={isAr ? "إلى" : "Vers"}
                    value={converterTo}
                    onChange={(val) => val && setConverterTo(val)}
                    data={rates.map((r) => ({
                      value: r.code,
                      label: `${r.code} (${r.symbole})`,
                    }))}
                    radius="md"
                    size="xs"
                  />
                </div>
              </div>

              {/* Result Display Box (High contrast, soft emerald) */}
              <Paper
                radius="lg"
                p="md"
                withBorder
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  borderColor: "rgba(16, 185, 129, 0.25)",
                }}
              >
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} c="teal" tt="uppercase" style={{ letterSpacing: "0.04em" }}>
                    {isAr ? "النتيجة المقابلة" : "Contre-valeur calculée"}
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="teal"
                    leftSection={copied ? <Check size={12} /> : <Copy size={12} />}
                    onClick={handleCopyResult}
                  >
                    {copied ? (isAr ? "تم النسخ" : "Copié") : isAr ? "نسخ" : "Copier"}
                  </Button>
                </Group>

                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: "#047857",
                      lineHeight: 1.1,
                    }}
                  >
                    {formatNumber(convertedAmount)}
                  </span>
                  <Text size="sm" fw={800} c="teal">
                    {converterTo === "MAD" ? "DH (MAD)" : converterTo}
                  </Text>
                </div>

                <Text size="11px" c="dimmed" mt={6}>
                  1 {converterFrom} = {effectiveRate.toFixed(4)} {converterTo}
                </Text>
              </Paper>

              {/* Human Guidance Note */}
              <Text size="11px" c="dimmed" style={{ lineHeight: 1.4 }}>
                {isAr
                  ? "💡 تلميح : عند إصدار الفاتورة بالعملة الأجنبية، يتكفل النظام بحساب المعادل بالدرهم تلقائياً للامتثال المحاسبي المغربي."
                  : "💡 Astuce : Lors de la création d'un devis ou d'une facture, choisissez simplement la devise et le système appliquera automatiquement le cours en MAD."}
              </Text>
            </Stack>
          </Paper>
        </div>

        {/* Right Column: Currency Directory & Active Status (7 cols on lg) */}
        <div className="lg:col-span-7">
          <Paper
            radius="xl"
            withBorder
            p="lg"
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
            }}
            shadow="sm"
          >
            <Stack gap="md">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
                <div>
                  <Group gap="xs">
                    <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                      {isAr ? "العملات المعتمدة للفوترة" : "Devises de Facturation"}
                    </Text>
                    <Badge color="teal" variant="light" size="xs">
                      {activeCount} {isAr ? "مفعلة" : "actives"}
                    </Badge>
                  </Group>
                  <Text size="11px" c="dimmed">
                    {isAr
                      ? "فعل أو عطل العملات المتاحة عند إنشاء الفواتير للزبائن"
                      : "Activez les devises utilisables dans vos devis et factures"}
                  </Text>
                </div>

                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<SlidersHorizontal size={13} />}
                    onClick={() => setShowBankDetails(!showBankDetails)}
                  >
                    {showBankDetails
                      ? isAr ? "إخفاء أسعار البنك" : "Masquer banques"
                      : isAr ? "أسعار البنك" : "Cours banques"}
                  </Button>
                </Group>
              </div>

              {/* Search & Active Switch Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <TextInput
                  placeholder={isAr ? "بحث عن عملة (Euro, Dollar...)" : "Rechercher une devise..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftSection={<Search size={14} className="text-[var(--muted)]" />}
                  radius="md"
                  size="xs"
                  className="flex-1 max-w-sm"
                />

                <Switch
                  checked={filterActiveOnly}
                  onChange={(e) => setFilterActiveOnly(e.currentTarget.checked)}
                  label={isAr ? "المفعلة فقط" : "Actives uniquement"}
                  size="xs"
                  color="teal"
                />
              </div>

              {/* Currency Cards List */}
              <div className="space-y-2.5">
                {filteredRates.length === 0 ? (
                  <Paper radius="lg" p="xl" withBorder className="text-center">
                    <Text size="sm" c="dimmed">
                      {isAr ? "لا توجد نتائج مطابقة لبحثك." : "Aucune devise ne correspond à votre recherche."}
                    </Text>
                  </Paper>
                ) : (
                  filteredRates.map((rate) => {
                    const isSelected = converterFrom === rate.code;
                    return (
                      <Paper
                        key={rate.id}
                        radius="lg"
                        withBorder
                        p="sm"
                        style={{
                          background: isSelected ? "rgba(13, 148, 136, 0.04)" : "var(--card)",
                          borderColor: isSelected ? "#0d9488" : "var(--border)",
                          transition: "all 150ms ease",
                        }}
                        className="hover:border-[var(--border-strong)]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Devise identity */}
                          <div className="flex items-center gap-3">
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background:
                                  rate.code === "EUR" || rate.code === "USD"
                                    ? "rgba(245, 158, 11, 0.12)"
                                    : "var(--surface-soft)",
                                color:
                                  rate.code === "EUR" || rate.code === "USD"
                                    ? "#d97706"
                                    : "var(--foreground)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "14px",
                              }}
                            >
                              {rate.symbole}
                            </div>
                            <div>
                              <Group gap={6}>
                                <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                                  {rate.nom}
                                </Text>
                                <Badge size="xs" variant="light" color="gray">
                                  {rate.code}
                                </Badge>
                              </Group>
                              {rate.nom_ar && (
                                <Text size="11px" c="dimmed" className="font-[var(--font-arabic)]">
                                  {rate.nom_ar}
                                </Text>
                              )}
                            </div>
                          </div>

                          {/* Rate display */}
                          <div className="text-left sm:text-right">
                            <div className="flex items-baseline gap-1">
                              <span
                                style={{
                                  fontSize: "1.1rem",
                                  fontWeight: 900,
                                  letterSpacing: "-0.02em",
                                  color: "var(--foreground)",
                                }}
                              >
                                {Number(rate.taux).toFixed(2)}
                              </span>
                              <Text size="xs" fw={700} c="dimmed">
                                DH
                              </Text>
                            </div>
                            <Text size="10px" c="dimmed">
                              1 {rate.code} = {Number(rate.taux).toFixed(4)} MAD
                            </Text>

                            {/* Optional Bank Rates */}
                            {showBankDetails && (rate.taux_achat || rate.taux_vente) && (
                              <Text size="10px" c="dimmed" mt={2}>
                                Achat: {rate.taux_achat ? Number(rate.taux_achat).toFixed(2) : "—"} | Vente:{" "}
                                {rate.taux_vente ? Number(rate.taux_vente).toFixed(2) : "—"}
                              </Text>
                            )}
                          </div>

                          {/* Controls: Switch & Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                            <Tooltip label={isAr ? "تفعيل العملة في الفواتير" : "Disponible pour facturer"}>
                              <Switch
                                size="xs"
                                color="teal"
                                checked={rate.est_actif === 1}
                                disabled={togglingCode === rate.code}
                                onChange={() => handleToggleActive(rate)}
                              />
                            </Tooltip>

                            <Button
                              size="xs"
                              variant={isSelected ? "filled" : "light"}
                              color="teal"
                              radius="md"
                              leftSection={<Calculator size={13} />}
                              onClick={() => handleSelectCurrency(rate.code)}
                            >
                              {isAr ? "تحويل" : "Calculer"}
                            </Button>

                            <ActionIcon
                              variant="subtle"
                              radius="md"
                              size="sm"
                              onClick={() => {
                                setSelectedRate(rate);
                                setRateModalOpen(true);
                              }}
                              title={isAr ? "تعديل" : "Modifier"}
                            >
                              <Edit size={14} />
                            </ActionIcon>
                          </div>
                        </div>
                      </Paper>
                    );
                  })
                )}
              </div>
            </Stack>
          </Paper>
        </div>
      </div>

      {/* 4. Bottom Section: Settlement History & Accounting Gain/Loss Journal */}
      <Paper
        radius="xl"
        withBorder
        p="lg"
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
        }}
        shadow="sm"
      >
        <Stack gap="md">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
            <div>
              <Group gap="xs">
                <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                  {isAr ? "سجل فوارق الصرف عند التحصيل" : "Historique des Règlements & Écarts de Change"}
                </Text>
                <Badge color="blue" variant="light" size="xs">
                  {transactions.length} {isAr ? "معاملات" : "règlements"}
                </Badge>
              </Group>
              <Text size="11px" c="dimmed">
                {isAr
                  ? "مقارنة آلية بين سعر الصرف يوم إصدار الفاتورة ويوم التحصيل البنكي الفعلي (حساب 7331 / 6331)"
                  : "Calcul automatique de la différence constatée entre la facturation et le paiement bancaire"}
              </Text>
            </div>

            <Group gap="xs">
              {/* Filter Pills */}
              <Button.Group>
                <Button
                  size="xs"
                  radius="md"
                  variant={journalFilter === "all" ? "filled" : "default"}
                  color="teal"
                  onClick={() => setJournalFilter("all")}
                >
                  {isAr ? "الكل" : "Tous"} ({transactions.length})
                </Button>
                <Button
                  size="xs"
                  variant={journalFilter === "gain" ? "filled" : "default"}
                  color="teal"
                  onClick={() => setJournalFilter("gain")}
                >
                  {isAr ? "أرباح" : "Gains"} ({gainCount})
                </Button>
                <Button
                  size="xs"
                  radius="md"
                  variant={journalFilter === "perte" ? "filled" : "default"}
                  color="rose"
                  onClick={() => setJournalFilter("perte")}
                >
                  {isAr ? "خسائر" : "Pertes"} ({perteCount})
                </Button>
              </Button.Group>

              <Button
                size="xs"
                variant="default"
                radius="md"
                leftSection={<FileSpreadsheet size={14} />}
                onClick={exportJournalCSV}
                disabled={transactions.length === 0}
              >
                {isAr ? "تصدير CSV" : "Exporter CSV"}
              </Button>
            </Group>
          </div>

          {/* Table of Transactions */}
          {filteredTransactions.length === 0 ? (
            <Paper radius="lg" p="xl" withBorder className="text-center">
              <Coins size={28} className="mx-auto text-amber-500 mb-2 opacity-60" />
              <Text size="sm" fw={700}>
                {isAr ? "لا توجد معاملات مسجلة حالياً" : "Aucun écart de change enregistré"}
              </Text>
              <Text size="xs" c="dimmed" max-w="md" className="mx-auto mt-1">
                {isAr
                  ? "عند تسجيل سداد لفاتورة بالعملة الأجنبية، سيتم احتساب الفرق المالي وإظهاره هنا تلقائياً."
                  : "Lorsqu'une facture en devise est encaissée à un cours différent, le gain ou la perte de change apparaîtra ici."}
              </Text>
            </Paper>
          ) : (
            <div className="overflow-x-auto">
              <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                <TableThead className="bg-[var(--surface-soft)] text-xs uppercase font-extrabold text-[var(--muted)]">
                  <TableTr>
                    <TableTh>{isAr ? "تاريخ الدفع" : "Date règlement"}</TableTh>
                    <TableTh>{isAr ? "العميل / المعاملة" : "Client / Tiers"}</TableTh>
                    <TableTh>{isAr ? "المبلغ بالعملة" : "Montant devise"}</TableTh>
                    <TableTh>{isAr ? "تطور سعر الصرف" : "Taux Facture ➔ Règlement"}</TableTh>
                    <TableTh>{isAr ? "الحساب المحاسبي" : "Imputation comptable"}</TableTh>
                    <TableTh className="text-right">{isAr ? "الأثر المالي (درهم)" : "Écart net (MAD)"}</TableTh>
                    <TableTh className="w-10"></TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {filteredTransactions.map((tx) => {
                    const isGain = tx.type_resultat === "gain";
                    return (
                      <TableTr key={tx.id}>
                        <TableTd>
                          <Text size="xs" fw={700}>
                            {formatDate(tx.date_reglement)}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {isAr ? "حررت في :" : "Facturé le :"} {formatDate(tx.date_operation)}
                          </Text>
                        </TableTd>

                        <TableTd>
                          <Text size="xs" fw={800}>
                            {tx.tiers_nom}
                          </Text>
                          <Text size="11px" c="dimmed" className="font-mono">
                            {tx.reference_piece || "Règlement"}
                          </Text>
                        </TableTd>

                        <TableTd>
                          <Text size="xs" fw={800} className="font-mono">
                            {formatNumber(tx.montant_devise)} {getCurrencySymbol(tx.devise)}
                          </Text>
                        </TableTd>

                        <TableTd>
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-[var(--muted)]">{Number(tx.taux_initial).toFixed(4)}</span>
                            <span className="text-[var(--muted)]">➔</span>
                            <span className={isGain ? "text-teal-600 font-bold" : "text-rose-600 font-bold"}>
                              {Number(tx.taux_reglement).toFixed(4)}
                            </span>
                          </div>
                        </TableTd>

                        <TableTd>
                          <Badge
                            color={isGain ? "teal" : "rose"}
                            variant="light"
                            size="sm"
                            className="font-mono font-bold"
                          >
                            {tx.compte_comptable === "7331"
                              ? isAr ? "7331 - ربح صرف" : "7331 - Gain de change"
                              : isAr ? "6331 - خسارة صرف" : "6331 - Perte de change"}
                          </Badge>
                        </TableTd>

                        <TableTd className="text-right">
                          <span
                            className={`font-mono text-sm font-black ${
                              isGain ? "text-teal-600" : "text-rose-600"
                            }`}
                          >
                            {isGain ? "+" : "-"}
                            {formatCurrency(Math.abs(tx.ecart_change))}
                          </span>
                        </TableTd>

                        <TableTd className="text-right">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            disabled={isDeleting}
                            title={isAr ? "حذف السجل" : "Supprimer"}
                          >
                            <Trash2 size={13} />
                          </ActionIcon>
                        </TableTd>
                      </TableTr>
                    );
                  })}
                </TableTbody>
              </Table>
            </div>
          )}
        </Stack>
      </Paper>

      {/* Rate Edit / Create Modal */}
      <RateModal
        opened={rateModalOpen}
        onClose={() => {
          setRateModalOpen(false);
          setSelectedRate(null);
        }}
        rate={selectedRate}
        locale={locale}
      />
    </Stack>
  );
}
