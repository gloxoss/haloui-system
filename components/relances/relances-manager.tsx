"use client";

import * as React from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  ShieldAlert,
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
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<string>("retard_desc");

  // Modals state
  const [activeRelanceInvoice, setActiveRelanceInvoice] = React.useState<FactureImpayeeItem | null>(null);
  const [relanceModalOpened, setRelanceModalOpened] = React.useState<boolean>(false);

  const [activePaymentInvoice, setActivePaymentInvoice] = React.useState<FactureImpayeeItem | null>(null);
  const [paymentModalOpened, setPaymentModalOpened] = React.useState<boolean>(false);

  const [activeHistoryInvoice, setActiveHistoryInvoice] = React.useState<FactureImpayeeItem | null>(null);
  const [historyDrawerOpened, setHistoryDrawerOpened] = React.useState<boolean>(false);

  // Sync with initialInvoices if server refreshes
  React.useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Filter & Sort invoices
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
    <Stack gap="lg">
      <PageHeading
        eyebrow={locale === "ar" ? "الاستخلاص والديون" : "Recouvrement & Impayés"}
        title={locale === "ar" ? "تتبع واستخلاص الديون والإنذارات" : "Relances & Recouvrement des Impayés"}
        description={
          locale === "ar"
            ? "نظام تدبير الديون الذكي، سيناريوهات التذكير الآلي (واتساب / إيميل)، وتحليل ميزان أعمار الديون"
            : "Scénarios automatiques par paliers (J-3, J+7, J+15, J+30), balance âgée des créances et relances directes WhatsApp / Email"
        }
        actions={
          <Group gap="xs">
            <Button
              variant="default"
              size="sm"
              leftSection={<FileSpreadsheet size={15} />}
              onClick={handleExportCsv}
            >
              {locale === "ar" ? "تصدير البيانات (CSV)" : "Exporter (CSV)"}
            </Button>
            {userRole === "admin" || userRole === "superadmin" ? (
              <Button
                component={Link}
                href="/parametres"
                variant="light"
                size="sm"
                leftSection={<Sliders size={15} />}
              >
                {locale === "ar" ? "إعدادات السيناريوهات" : "Paramètres Relances"}
              </Button>
            ) : null}
          </Group>
        }
      />

      {/* KPI Cards Overview */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        {/* Total Créances */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {locale === "ar" ? "مجموع الديون الإجمالية" : "Total Créances à recouvrer"}
              </Text>
              <Text fw={800} size="xl" mt={4}>
                {formatCurrency(totalCreances)}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {invoices.length} {locale === "ar" ? "فاتورة غير مسددة" : "factures en cours"}
              </Text>
            </div>
            <ThemeIcon size={38} radius="md" color="indigo" variant="light">
              <DollarSign size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        {/* Total Échu (En retard) */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {locale === "ar" ? "ديون متجاوزة للأجل (متأخرات)" : "Créances Échues (En retard)"}
              </Text>
              <Text fw={800} size="xl" mt={4} c="red.6">
                {formatCurrency(totalEchu)}
              </Text>
              <Group gap={6} mt={2}>
                <Badge size="xs" color="red" variant="light">
                  {pctEchu}% des créances
                </Badge>
              </Group>
            </div>
            <ThemeIcon size={38} radius="md" color="red" variant="light">
              <AlertTriangle size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        {/* Total Non échu (Futures) */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {locale === "ar" ? "ديون غير حالة الأجل" : "Créances Non Échues"}
              </Text>
              <Text fw={800} size="xl" mt={4} c="teal.6">
                {formatCurrency(totalNonEchu)}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {balanceAgee.tranches.non_echu.count} {locale === "ar" ? "فواتير قيد الاستحقاق" : "échéances à venir"}
              </Text>
            </div>
            <ThemeIcon size={38} radius="md" color="teal" variant="light">
              <Clock size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        {/* Relances envoyées ce mois */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {locale === "ar" ? "تذكيرات هذا الشهر" : "Relances ce mois-ci"}
              </Text>
              <Text fw={800} size="xl" mt={4} c="blue.6">
                {balanceAgee.relances_ce_mois}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {locale === "ar" ? "تواصل ومتابعة فعالة" : "Interventions enregistrées"}
              </Text>
            </div>
            <ThemeIcon size={38} radius="md" color="blue" variant="light">
              <Send size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Balance Âgée Interactive Bar Card */}
      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="xs">
          <div>
            <Text fw={700} size="sm">
              {locale === "ar" ? "ميزان أعمار الديون (Balance Âgée)" : "Répartition par Balance Âgée"}
            </Text>
            <Text size="xs" c="dimmed">
              {locale === "ar"
                ? "توزيع مبالغ الديون حسب مدة التأخير عن تاريخ الاستحقاق"
                : "Ventilation des créances par ancienneté du retard de règlement"}
            </Text>
          </div>
          <Badge variant="light" color="gray" size="sm">
            Total : {formatCurrency(totalCreances)}
          </Badge>
        </Group>

        {/* Visual progress segments */}
        {totalCreances > 0 ? (
          <Progress.Root size={20} radius="md" mt="sm">
            {balanceAgee.tranches.non_echu.montant > 0 && (
              <Progress.Section
                value={(balanceAgee.tranches.non_echu.montant / totalCreances) * 100}
                color="teal"
              >
                <Progress.Label>
                  {Math.round((balanceAgee.tranches.non_echu.montant / totalCreances) * 100)}%
                </Progress.Label>
              </Progress.Section>
            )}
            {balanceAgee.tranches.j1_15.montant > 0 && (
              <Progress.Section
                value={(balanceAgee.tranches.j1_15.montant / totalCreances) * 100}
                color="yellow"
              >
                <Progress.Label>
                  {Math.round((balanceAgee.tranches.j1_15.montant / totalCreances) * 100)}%
                </Progress.Label>
              </Progress.Section>
            )}
            {balanceAgee.tranches.j16_30.montant > 0 && (
              <Progress.Section
                value={(balanceAgee.tranches.j16_30.montant / totalCreances) * 100}
                color="orange"
              >
                <Progress.Label>
                  {Math.round((balanceAgee.tranches.j16_30.montant / totalCreances) * 100)}%
                </Progress.Label>
              </Progress.Section>
            )}
            {balanceAgee.tranches.j31_60.montant > 0 && (
              <Progress.Section
                value={(balanceAgee.tranches.j31_60.montant / totalCreances) * 100}
                color="red.6"
              >
                <Progress.Label>
                  {Math.round((balanceAgee.tranches.j31_60.montant / totalCreances) * 100)}%
                </Progress.Label>
              </Progress.Section>
            )}
            {balanceAgee.tranches.j61_plus.montant > 0 && (
              <Progress.Section
                value={(balanceAgee.tranches.j61_plus.montant / totalCreances) * 100}
                color="red.9"
              >
                <Progress.Label>
                  {Math.round((balanceAgee.tranches.j61_plus.montant / totalCreances) * 100)}%
                </Progress.Label>
              </Progress.Section>
            )}
          </Progress.Root>
        ) : null}

        {/* Tranches legend grid */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xs" mt="md">
          <Paper p="xs" radius="sm" withBorder style={{ borderLeft: "4px solid #14b8a6" }}>
            <Text size="xs" c="dimmed">Non échu (&lt; 0j)</Text>
            <Text fw={700} size="sm">{formatCurrency(balanceAgee.tranches.non_echu.montant)}</Text>
            <Text size="11px" c="dimmed">{balanceAgee.tranches.non_echu.count} factures</Text>
          </Paper>

          <Paper p="xs" radius="sm" withBorder style={{ borderLeft: "4px solid #eab308" }}>
            <Text size="xs" c="dimmed">1 à 15 jours</Text>
            <Text fw={700} size="sm">{formatCurrency(balanceAgee.tranches.j1_15.montant)}</Text>
            <Text size="11px" c="dimmed">{balanceAgee.tranches.j1_15.count} factures</Text>
          </Paper>

          <Paper p="xs" radius="sm" withBorder style={{ borderLeft: "4px solid #f97316" }}>
            <Text size="xs" c="dimmed">16 à 30 jours</Text>
            <Text fw={700} size="sm">{formatCurrency(balanceAgee.tranches.j16_30.montant)}</Text>
            <Text size="11px" c="dimmed">{balanceAgee.tranches.j16_30.count} factures</Text>
          </Paper>

          <Paper p="xs" radius="sm" withBorder style={{ borderLeft: "4px solid #ef4444" }}>
            <Text size="xs" c="dimmed">31 à 60 jours</Text>
            <Text fw={700} size="sm">{formatCurrency(balanceAgee.tranches.j31_60.montant)}</Text>
            <Text size="11px" c="dimmed">{balanceAgee.tranches.j31_60.count} factures</Text>
          </Paper>

          <Paper p="xs" radius="sm" withBorder style={{ borderLeft: "4px solid #991b1b" }}>
            <Text size="xs" c="dimmed">+60 jours</Text>
            <Text fw={700} size="sm">{formatCurrency(balanceAgee.tranches.j61_plus.montant)}</Text>
            <Text size="11px" c="dimmed">{balanceAgee.tranches.j61_plus.count} factures</Text>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Main Tabbed Invoices Management Area */}
      <Card withBorder radius="md" p="md">
        <Tabs value={selectedPalier} onChange={(v) => setSelectedPalier(v || "all")} variant="outline">
          <Tabs.List mb="md">
            <Tabs.Tab value="all" leftSection={<FileText size={14} />}>
              {locale === "ar" ? "كافة الفواتير غير المسددة" : "Toutes les factures"} ({invoices.length})
            </Tabs.Tab>
            <Tabs.Tab
              value="prevenance"
              color="teal"
              leftSection={<Clock size={14} />}
            >
              {locale === "ar" ? "1 : استباقي (J-3)" : "Palier 1 : Prévenance (J-3)"} ({balanceAgee.par_palier.prevenance.count})
            </Tabs.Tab>
            <Tabs.Tab
              value="relance_1"
              color="yellow"
              leftSection={<AlertCircle size={14} />}
            >
              {locale === "ar" ? "2 : تذكير ودي (J+7)" : "Palier 2 : 1ère Relance (J+7)"} ({balanceAgee.par_palier.relance_1.count})
            </Tabs.Tab>
            <Tabs.Tab
              value="relance_2"
              color="orange"
              leftSection={<AlertTriangle size={14} />}
            >
              {locale === "ar" ? "3 : إنذار حازم (J+15)" : "Palier 3 : 2ème Relance (J+15)"} ({balanceAgee.par_palier.relance_2.count})
            </Tabs.Tab>
            <Tabs.Tab
              value="mise_en_demeure"
              color="red"
              leftSection={<ShieldAlert size={14} />}
            >
              {locale === "ar" ? "4 : إنذار قانوني (J+30)" : "Palier 4 : Mise en demeure (J+30)"} ({balanceAgee.par_palier.mise_en_demeure.count})
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Search and Sort controls */}
        <Group justify="space-between" mb="md" wrap="wrap">
          <TextInput
            placeholder={
              locale === "ar"
                ? "بحث برقم الفاتورة، اسم العميل، الهاتف، أو ICE..."
                : "Rechercher client, téléphone, N° facture, ICE..."
            }
            leftSection={<Search size={15} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 260 }}
          />

          <Select
            leftSection={<ArrowUpDown size={14} />}
            value={sortBy}
            onChange={(v) => v && setSortBy(v)}
            data={[
              { value: "retard_desc", label: "Tri : Retard le plus élevé" },
              { value: "retard_asc", label: "Tri : Retard le plus faible" },
              { value: "reste_desc", label: "Tri : Montant reste (Décroissant)" },
              { value: "reste_asc", label: "Tri : Montant reste (Croissant)" },
              { value: "date_desc", label: "Tri : Date d'émission" },
              { value: "client_asc", label: "Tri : Nom du client (A-Z)" },
            ]}
            style={{ minWidth: 220 }}
          />
        </Group>

        {/* Invoices List / Table */}
        {filteredInvoices.length === 0 ? (
          <Paper p="xl" radius="md" withBorder style={{ textAlign: "center", borderColor: "var(--border)" }}>
            <CheckCircle size={40} color="var(--mantine-color-teal-6)" style={{ margin: "0 auto 12px" }} />
            <Text fw={700} size="md">
              {locale === "ar" ? "لا توجد أي فواتير مطابقة لهذا المعيار" : "Aucun impayé trouvé"}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {locale === "ar"
                ? "تهانينا، جميع الفواتير في هذا النطاق تمت تسويتها أو لا توجد نتائج للبحث."
                : "Toutes les factures de cette tranche sont réglées ou aucune facture ne correspond à la recherche."}
            </Text>
          </Paper>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{locale === "ar" ? "العميل (الكليان)" : "Client"}</Table.Th>
                  <Table.Th>{locale === "ar" ? "رقم وتاريخ الفاتورة" : "Facture"}</Table.Th>
                  <Table.Th>{locale === "ar" ? "تاريخ الاستحقاق والتأخير" : "Échéance & Retard"}</Table.Th>
                  <Table.Th>{locale === "ar" ? "المبلغ والباقي" : "Montant & Reste"}</Table.Th>
                  <Table.Th>{locale === "ar" ? "مستوى التذكير المقترح" : "Palier recommandé"}</Table.Th>
                  <Table.Th>{locale === "ar" ? "سجل التذكيرات" : "Historique"}</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>{locale === "ar" ? "إجراءات" : "Actions"}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredInvoices.map((inv) => {
                  const palierMeta = RELANCE_PALIER_LABELS[inv.palier_recommande] || RELANCE_PALIER_LABELS.prevenance;

                  return (
                    <Table.Tr key={inv.id}>
                      {/* Client info */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={700} size="sm">
                            {inv.client_name}
                          </Text>
                          <Group gap={6}>
                            {inv.client_phone ? (
                              <Group gap={4}>
                                <Text size="xs" c="dimmed">
                                  {inv.client_phone}
                                </Text>
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color="teal"
                                  title="Discuter sur WhatsApp"
                                  onClick={() => handleOpenRelance(inv)}
                                >
                                  <MessageCircle size={12} color="#25D366" />
                                </ActionIcon>
                              </Group>
                            ) : (
                              <Text size="xs" c="dimmed">
                                Sans tél
                              </Text>
                            )}
                            {inv.client_ice ? (
                              <Badge size="xs" variant="outline" color="gray">
                                ICE {inv.client_ice}
                              </Badge>
                            ) : null}
                          </Group>
                        </Stack>
                      </Table.Td>

                      {/* Facture info */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Group gap={6}>
                            <Text fw={700} size="sm">
                              FAC-{inv.numero}
                            </Text>
                            <ActionIcon
                              component={Link}
                              href={`/print/facture/${inv.id}`}
                              target="_blank"
                              size="xs"
                              variant="subtle"
                              color="blue"
                              title="Consulter / Imprimer"
                            >
                              <ExternalLink size={12} />
                            </ActionIcon>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {formatDate(inv.date)}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* Due date & Overdue days */}
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="xs" fw={600}>
                            {formatDate(inv.date_echeance)}
                          </Text>
                          {inv.jours_retard <= 0 ? (
                            <Badge size="sm" variant="light" color="teal">
                              {inv.jours_retard === 0 ? "Échéance aujourd'hui" : `Dans ${Math.abs(inv.jours_retard)}j`}
                            </Badge>
                          ) : (
                            <Badge
                              size="sm"
                              variant="light"
                              color={inv.jours_retard > 30 ? "red" : inv.jours_retard > 14 ? "orange" : "yellow"}
                            >
                              +{inv.jours_retard} jours de retard
                            </Badge>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* Financials */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={800} size="sm" c="red.6">
                            {formatCurrency(inv.reste)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Sur {formatCurrency(inv.total_ttc)} {inv.avance > 0 ? `(Avance: ${formatCurrency(inv.avance)})` : ""}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* Recommended Palier */}
                      <Table.Td>
                        <Badge
                          size="md"
                          color={palierMeta.color}
                          variant="filled"
                          style={{ textTransform: "none" }}
                        >
                          {palierMeta.badge}
                        </Badge>
                      </Table.Td>

                      {/* Relances History Count */}
                      <Table.Td>
                        {inv.nombre_relances > 0 ? (
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="indigo"
                            leftSection={<History size={12} />}
                            onClick={() => handleOpenHistory(inv)}
                          >
                            {inv.nombre_relances} {inv.nombre_relances > 1 ? "relances" : "relance"}
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Aucune relance
                          </Text>
                        )}
                      </Table.Td>

                      {/* Quick Actions */}
                      <Table.Td style={{ textAlign: "right" }}>
                        <Group gap="xs" justify="flex-end">
                          <Button
                            size="xs"
                            color="teal"
                            variant="filled"
                            leftSection={<Send size={13} />}
                            onClick={() => handleOpenRelance(inv)}
                          >
                            {locale === "ar" ? "تذكير" : "Relancer"}
                          </Button>

                          <Button
                            size="xs"
                            color="blue"
                            variant="light"
                            leftSection={<DollarSign size={13} />}
                            onClick={() => handleOpenPayment(inv)}
                          >
                            {locale === "ar" ? "استخلاص" : "Encaisser"}
                          </Button>

                          <Menu position="bottom-end" shadow="md">
                            <MenuTarget>
                              <ActionIcon variant="subtle" size="sm" color="gray">
                                <MoreHorizontal size={16} />
                              </ActionIcon>
                            </MenuTarget>
                            <MenuDropdown>
                              <MenuItem
                                leftSection={<History size={14} />}
                                onClick={() => handleOpenHistory(inv)}
                              >
                                {locale === "ar" ? "سجل التذكيرات" : "Historique des relances"}
                              </MenuItem>
                              <MenuItem
                                component={Link}
                                href={`/print/facture/${inv.id}`}
                                target="_blank"
                                leftSection={<Eye size={14} />}
                              >
                                {locale === "ar" ? "معاينة الفاتورة" : "Aperçu de la facture"}
                              </MenuItem>
                            </MenuDropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Relance Action Modal (WhatsApp / Email / Appel) */}
      <RelanceActionModal
        invoice={activeRelanceInvoice}
        settings={settings}
        opened={relanceModalOpened}
        onClose={() => setRelanceModalOpened(false)}
        onSuccess={() => {
          // If needed, can trigger router.refresh or update state
        }}
      />

      {/* Quick Settlement Payment Modal */}
      <RelancePaymentModal
        invoice={activePaymentInvoice}
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        onSuccess={() => {
          // Updates handled through server actions revalidation
        }}
      />

      {/* History Drawer */}
      <RelanceHistoryDrawer
        invoice={activeHistoryInvoice}
        opened={historyDrawerOpened}
        onClose={() => setHistoryDrawerOpened(false)}
      />
    </Stack>
  );
}
