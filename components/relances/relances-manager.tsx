"use client";

import * as React from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
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
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
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

import { PageHeading } from "@/components/page-heading";
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
  const [searchQuery, setSearchQuery] = React.useState<string>("" );
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

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `relances_impayes_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCreances = balanceAgee.total_creances;
  const totalEchu = balanceAgee.total_echu;
  const totalNonEchu = balanceAgee.total_non_echu;
  const pctEchu = totalCreances > 0 ? Math.round((totalEchu / totalCreances) * 100) : 0;

  const sortOptions = [
    { value: "retard_desc", label: locale === "ar" ? "الأكثر تأخيراً" : "Retard décroissant" },
    { value: "reste_desc", label: locale === "ar" ? "المبلغ المتبقي الأكبر" : "Montant restant décroissant" },
    { value: "date_desc", label: locale === "ar" ? "تاريخ الفاتورة" : "Date d'émission" },
    { value: "client_asc", label: locale === "ar" ? "العميل (أ - ي)" : "Client (A-Z)" },
  ];

  return (
    <Stack gap="md">
      {/* Page Heading matching all other document & management pages */}
      <PageHeading
        eyebrow={locale === "ar" ? "استخلاص الديون والذمم" : "Recouvrement & Impayés"}
        title={locale === "ar" ? "تتبع واستخلاص الديون" : "Relances & Impayés"}
        description={
          locale === "ar"
            ? "متابعة الفواتير غير المسددة، تحليل ميزان أعمار الديون، وتفعيل سيناريوهات التذكير عبر واتساب والإيميل."
            : "Suivez les factures impayées, visualisez la balance âgée et envoyez des relances multi-canaux."
        }
        actions={
          <Group gap="xs">
            <Button
              variant="default"
              radius="md"
              leftSection={<FileSpreadsheet size={15} />}
              onClick={handleExportCsv}
            >
              {locale === "ar" ? "تصدير CSV" : "Exporter CSV"}
            </Button>
            {userRole === "admin" || userRole === "superadmin" ? (
              <Button
                component={Link}
                href="/parametres#relances-studio"
                variant="light"
                radius="md"
                leftSection={<Sliders size={15} />}
              >
                {locale === "ar" ? "الإعدادات" : "Paramètres"}
              </Button>
            ) : null}
          </Group>
        }
      />

      {/* KPI Stats Grid matching Dashboard Paper styling */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Total à recouvrer */}
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
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "إجمالي الديون" : "Total à recouvrer"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "var(--foreground)" }}>
                {formatCurrency(totalCreances)}
              </Text>
              <Text size="11px" c="dimmed">
                {invoices.length} {locale === "ar" ? "فاتورة غير مسددة" : "facture(s) en cours"}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(59, 130, 246, 0.12)",
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

        {/* Créances échues */}
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
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "متأخرات (Échues)" : "Créances échues"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#e11d48" }}>
                {formatCurrency(totalEchu)}
              </Text>
              <Text size="11px" c="dimmed">
                {pctEchu}% {locale === "ar" ? "من إجمالي الديون" : "du total des impayés"}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Échéances à venir */}
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
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "قيد الأجل (Non échues)" : "Échéances à venir"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#059669" }}>
                {formatCurrency(totalNonEchu)}
              </Text>
              <Text size="11px" c="dimmed">
                {balanceAgee.tranches.non_echu.count} {locale === "ar" ? "فاتورة غير مستحقة" : "facture(s) non échue(s)"}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Relances effectuées */}
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
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "تذكيرات هذا الشهر" : "Relances effectuées"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#4f46e5" }}>
                {balanceAgee.relances_ce_mois}
              </Text>
              <Text size="11px" c="dimmed">
                {locale === "ar" ? "إجراءات تذكير مسجلة" : "interventions ce mois-ci"}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(99, 102, 241, 0.12)",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Balance Âgée Visual Track in Paper */}
      {totalCreances > 0 ? (
        <Paper
          radius="xl"
          shadow="xs"
          withBorder
          p="md"
          style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
        >
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={700} style={{ color: "var(--foreground)" }}>
                {locale === "ar" ? "ميزان أعمار الديون (Balance Âgée)" : "Balance Âgée des créances"}
              </Text>
              <Text size="xs" c="dimmed">
                {locale === "ar" ? "توزيع المبالغ حسب أقدمية التأخير" : "Répartition par ancienneté du retard"}
              </Text>
            </Group>

            {/* Visual multi-segment bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[var(--surface-soft)]">
              {balanceAgee.tranches.non_echu.montant > 0 ? (
                <div
                  style={{ width: `${(balanceAgee.tranches.non_echu.montant / totalCreances) * 100}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Non échu: ${formatCurrency(balanceAgee.tranches.non_echu.montant)}`}
                />
              ) : null}
              {balanceAgee.tranches.j1_15.montant > 0 ? (
                <div
                  style={{ width: `${(balanceAgee.tranches.j1_15.montant / totalCreances) * 100}%` }}
                  className="bg-amber-400 h-full transition-all"
                  title={`1-15j: ${formatCurrency(balanceAgee.tranches.j1_15.montant)}`}
                />
              ) : null}
              {balanceAgee.tranches.j16_30.montant > 0 ? (
                <div
                  style={{ width: `${(balanceAgee.tranches.j16_30.montant / totalCreances) * 100}%` }}
                  className="bg-orange-500 h-full transition-all"
                  title={`16-30j: ${formatCurrency(balanceAgee.tranches.j16_30.montant)}`}
                />
              ) : null}
              {balanceAgee.tranches.j31_60.montant > 0 ? (
                <div
                  style={{ width: `${(balanceAgee.tranches.j31_60.montant / totalCreances) * 100}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`31-60j: ${formatCurrency(balanceAgee.tranches.j31_60.montant)}`}
                />
              ) : null}
              {balanceAgee.tranches.j61_plus.montant > 0 ? (
                <div
                  style={{ width: `${(balanceAgee.tranches.j61_plus.montant / totalCreances) * 100}%` }}
                  className="bg-red-700 h-full transition-all"
                  title={`+60j: ${formatCurrency(balanceAgee.tranches.j61_plus.montant)}`}
                />
              ) : null}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                Non échu : <strong className="text-[var(--foreground)]">{formatCurrency(balanceAgee.tranches.non_echu.montant)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                1 à 15j : <strong className="text-[var(--foreground)]">{formatCurrency(balanceAgee.tranches.j1_15.montant)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                16 à 30j : <strong className="text-[var(--foreground)]">{formatCurrency(balanceAgee.tranches.j16_30.montant)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                31 à 60j : <strong className="text-[var(--foreground)]">{formatCurrency(balanceAgee.tranches.j31_60.montant)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-700 shrink-0" />
                +60j : <strong className="text-[var(--foreground)]">{formatCurrency(balanceAgee.tranches.j61_plus.montant)}</strong>
              </span>
            </div>
          </Stack>
        </Paper>
      ) : null}

      {/* Filter Tabs & Search Controls */}
      <Paper
        radius="xl"
        shadow="xs"
        withBorder
        p={{ base: "sm", sm: "md" }}
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Stack gap="sm">
          {/* Mantine Tabs Pills matching CaisseTabsView */}
          <Tabs
            value={selectedPalier}
            onChange={(val) => setSelectedPalier(val || "all")}
            variant="pills"
            radius="xl"
          >
            <Tabs.List className="flex-wrap gap-1.5 border-b border-[var(--border)] pb-2.5">
              <Tabs.Tab value="all" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "جميع الفواتير" : "Toutes"} ({invoices.length})
              </Tabs.Tab>
              <Tabs.Tab value="prevenance" color="teal" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "استباقي (J-3)" : "Prévenance (J-3)"} ({balanceAgee.par_palier.prevenance.count})
              </Tabs.Tab>
              <Tabs.Tab value="relance_1" color="yellow" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "تذكير 1 (J+7)" : "Relance 1 (J+7)"} ({balanceAgee.par_palier.relance_1.count})
              </Tabs.Tab>
              <Tabs.Tab value="relance_2" color="orange" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "إنذار 2 (J+15)" : "Relance 2 (J+15)"} ({balanceAgee.par_palier.relance_2.count})
              </Tabs.Tab>
              <Tabs.Tab value="mise_en_demeure" color="red" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "إنذار قانوني (J+30)" : "Mise en demeure"} ({balanceAgee.par_palier.mise_en_demeure.count})
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <TextInput
              radius="md"
              placeholder={locale === "ar" ? "بحث عن عميل، فاتورة، هاتف..." : "Rechercher client, facture, tél..."}
              leftSection={<Search size={15} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="w-full sm:w-80"
            />

            <Select
              radius="md"
              data={sortOptions}
              value={sortBy}
              onChange={(val) => setSortBy(val || "retard_desc")}
              className="w-full sm:w-60"
            />
          </div>
        </Stack>
      </Paper>

      {/* Main Table Paper matching DocumentModulePage */}
      <Paper
        radius="xl"
        shadow="sm"
        withBorder
        p={{ base: "xs", sm: "md", lg: "lg" }}
        style={{ background: "var(--card)", borderColor: "var(--border-strong)", overflow: "hidden" }}
      >
        <div className="overflow-x-auto w-full min-w-0">
          <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm" striped style={{ minWidth: 680 }}>
            <TableThead>
              <TableTr>
                <TableTh>{locale === "ar" ? "العميل" : "Client"}</TableTh>
                <TableTh>{locale === "ar" ? "الفاتورة" : "Facture"}</TableTh>
                <TableTh>{locale === "ar" ? "الأجل & التأخير" : "Échéance"}</TableTh>
                <TableTh>{locale === "ar" ? "المبلغ المستحق" : "Reste à payer"}</TableTh>
                <TableTh>{locale === "ar" ? "المستوى" : "Niveau"}</TableTh>
                <TableTh>{locale === "ar" ? "السجل" : "Historique"}</TableTh>
                <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                  {locale === "ar" ? "الإجراءات" : "Actions"}
                </TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {filteredInvoices.length === 0 ? (
                <TableTr>
                  <TableTd colSpan={7} style={{ padding: "36px", textAlign: "center" }}>
                    <Text c="dimmed">
                      {locale === "ar"
                        ? "ما كاين حتى فاتورة غير مسددة في هاد الفئة حالياً."
                        : "Aucun impayé trouvé pour cette sélection."}
                    </Text>
                  </TableTd>
                </TableTr>
              ) : (
                filteredInvoices.map((inv) => {
                  const palierMeta =
                    RELANCE_PALIER_LABELS[inv.palier_recommande] || RELANCE_PALIER_LABELS.prevenance;

                  return (
                    <TableTr key={inv.id}>
                      {/* Client */}
                      <TableTd>
                        <Text fw={700} size="sm">
                          {inv.client_name}
                        </Text>
                        <Group gap={6} mt={2}>
                          <Text size="11px" c="dimmed">
                            {inv.client_phone || (locale === "ar" ? "بدون هاتف" : "Sans téléphone")}
                          </Text>
                          {inv.client_phone ? (
                            <ActionIcon
                              variant="subtle"
                              color="teal"
                              size="xs"
                              radius="xl"
                              onClick={() => handleOpenRelance(inv)}
                              title="Ouvrir relance WhatsApp"
                            >
                              <MessageCircle size={12} />
                            </ActionIcon>
                          ) : null}
                        </Group>
                      </TableTd>

                      {/* Facture */}
                      <TableTd>
                        <Group gap={6}>
                          <Text fw={700} size="sm">
                            <Link href={`/print/facture/${inv.id}`} target="_blank" className="hover:underline">
                              FAC-{inv.numero}
                            </Link>
                          </Text>
                          <ActionIcon
                            component={Link}
                            href={`/print/facture/${inv.id}`}
                            target="_blank"
                            variant="subtle"
                            color="gray"
                            size="xs"
                            radius="xl"
                          >
                            <ExternalLink size={12} />
                          </ActionIcon>
                        </Group>
                        <Text size="11px" c="dimmed">
                          {formatDate(inv.date)}
                        </Text>
                      </TableTd>

                      {/* Échéance & Retard */}
                      <TableTd>
                        <Text size="xs" fw={500}>
                          {formatDate(inv.date_echeance)}
                        </Text>
                        <div className="mt-1">
                          {inv.jours_retard <= 0 ? (
                            <Badge size="xs" variant="light" color="teal" radius="xl">
                              {inv.jours_retard === 0 ? "Aujourd'hui" : `Dans ${Math.abs(inv.jours_retard)}j`}
                            </Badge>
                          ) : (
                            <Badge
                              size="xs"
                              variant="light"
                              color={inv.jours_retard > 30 ? "red" : inv.jours_retard > 14 ? "orange" : "yellow"}
                              radius="xl"
                            >
                              +{inv.jours_retard}j retard
                            </Badge>
                          )}
                        </div>
                      </TableTd>

                      {/* Montant Reste */}
                      <TableTd>
                        <Text fw={900} size="sm" style={{ color: "#e11d48" }}>
                          {formatCurrency(inv.reste)}
                        </Text>
                        <Text size="11px" c="dimmed">
                          sur {formatCurrency(inv.total_ttc)}
                        </Text>
                      </TableTd>

                      {/* Palier Badge */}
                      <TableTd>
                        <Badge
                          size="sm"
                          color={palierMeta.color}
                          variant="light"
                          radius="xl"
                          style={{ textTransform: "none", fontWeight: 600 }}
                        >
                          {palierMeta.badge}
                        </Badge>
                      </TableTd>

                      {/* Historique */}
                      <TableTd>
                        {inv.nombre_relances > 0 ? (
                          <Button
                            variant="subtle"
                            size="compact-xs"
                            color="indigo"
                            radius="md"
                            onClick={() => handleOpenHistory(inv)}
                            leftSection={<History size={12} />}
                          >
                            {inv.nombre_relances} {locale === "ar" ? "تذكير" : `relance${inv.nombre_relances > 1 ? "s" : ""}`}
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        )}
                      </TableTd>

                      {/* Actions */}
                      <TableTd>
                        <Group gap="xs" justify={locale === "ar" ? "flex-start" : "flex-end"}>
                          <Button
                            size="xs"
                            radius="md"
                            color="teal"
                            leftSection={<Send size={13} />}
                            onClick={() => handleOpenRelance(inv)}
                          >
                            {locale === "ar" ? "تذكير" : "Relancer"}
                          </Button>

                          <Button
                            size="xs"
                            radius="md"
                            variant="default"
                            onClick={() => handleOpenPayment(inv)}
                          >
                            {locale === "ar" ? "أداء" : "Encaisser"}
                          </Button>

                          <Menu position={locale === "ar" ? "bottom-start" : "bottom-end"} shadow="md" width={210}>
                            <MenuTarget>
                              <ActionIcon variant="subtle" color="gray" radius="xl" size="lg">
                                <MoreHorizontal size={16} />
                              </ActionIcon>
                            </MenuTarget>
                            <MenuDropdown>
                              <MenuItem
                                leftSection={<History size={15} />}
                                onClick={() => handleOpenHistory(inv)}
                              >
                                {locale === "ar" ? "سجل التذكيرات" : "Historique des relances"}
                              </MenuItem>
                              <MenuItem
                                component={Link}
                                href={`/print/facture/${inv.id}`}
                                target="_blank"
                                leftSection={<Eye size={15} />}
                              >
                                {locale === "ar" ? "معاينة الفاتورة" : "Aperçu de la facture"}
                              </MenuItem>
                              <MenuItem
                                component={Link}
                                href={`/factures/${inv.id}/edit`}
                                leftSection={<ExternalLink size={15} />}
                              >
                                {locale === "ar" ? "تعديل الفاتورة" : "Consulter / Modifier"}
                              </MenuItem>
                            </MenuDropdown>
                          </Menu>
                        </Group>
                      </TableTd>
                    </TableTr>
                  );
                })
              )}
            </TableTbody>
          </Table>
        </div>
      </Paper>

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
