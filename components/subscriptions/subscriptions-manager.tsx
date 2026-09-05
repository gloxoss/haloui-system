"use client";

import * as React from "react";
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
  AlertCircle,
  CalendarClock,
  CircleDollarSign,
  Edit,
  FileSpreadsheet,
  History,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SubscriptionModal } from "./subscription-modal";
import { SubscriptionHistoryDrawer } from "./subscription-history-drawer";
import { SubscriptionBatchModal } from "./subscription-batch-modal";
import {
  deleteSubscriptionAction,
  generateSubscriptionInvoiceAction,
  toggleSubscriptionStatusAction,
} from "@/app/actions";
import {
  MODE_REGLEMENT_LABELS,
  PERIODICITE_LABELS,
  SUBSCRIPTION_STATUT_LABELS,
} from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import {
  type SubscriptionItem,
  type SubscriptionLine,
  type SubscriptionStats,
} from "@/lib/types";
import { formatCurrency, formatDate, todayIso } from "@/lib/utils";

export function SubscriptionsManager({
  initialSubscriptions,
  initialStats,
  clients,
  products,
}: {
  initialSubscriptions: SubscriptionItem[];
  initialStats: SubscriptionStats;
  clients: Array<{ id: number; name: string; phone: string; ice?: string }>;
  products: Array<{ id: number; ref: string; designation: string; prix_ht: number; tva_rate: number; unite: string }>;
  userRole?: string;
}) {
  const { locale } = useTranslation();

  const [subscriptions, setSubscriptions] = React.useState<SubscriptionItem[]>(initialSubscriptions);
  const [stats, setStats] = React.useState<SubscriptionStats>(initialStats);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<string>("echeance_asc");

  // Modals state
  const [formModalOpened, setFormModalOpened] = React.useState<boolean>(false);
  const [editingSubscription, setEditingSubscription] = React.useState<
    (SubscriptionItem & { lignes?: SubscriptionLine[] }) | null
  >(null);

  const [historyDrawerOpened, setHistoryDrawerOpened] = React.useState<boolean>(false);
  const [historySubscription, setHistorySubscription] = React.useState<SubscriptionItem | null>(null);

  const [batchModalOpened, setBatchModalOpened] = React.useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    setSubscriptions(initialSubscriptions);
    setStats(initialStats);
  }, [initialSubscriptions, initialStats]);

  const today = todayIso();

  // Filter and sort subscriptions
  const filteredSubscriptions = React.useMemo(() => {
    let list = [...subscriptions];

    if (activeTab === "actifs") {
      list = list.filter((s) => s.statut === "actif");
    } else if (activeTab === "echus") {
      list = list.filter((s) => s.est_echu);
    } else if (activeTab === "suspendus") {
      list = list.filter((s) => s.statut === "suspendu");
    } else if (activeTab === "termines") {
      list = list.filter((s) => s.statut === "termine" || s.statut === "brouillon");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.titre.toLowerCase().includes(q) ||
          s.reference.toLowerCase().includes(q) ||
          s.client_name.toLowerCase().includes(q) ||
          s.client_phone.includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "echeance_asc":
          return a.prochaine_echeance.localeCompare(b.prochaine_echeance);
        case "echeance_desc":
          return b.prochaine_echeance.localeCompare(a.prochaine_echeance);
        case "mrr_desc":
          return b.mrr - a.mrr;
        case "mrr_asc":
          return a.mrr - b.mrr;
        case "ttc_desc":
          return b.total_ttc - a.total_ttc;
        case "client_asc":
          return a.client_name.localeCompare(b.client_name);
        default:
          return a.prochaine_echeance.localeCompare(b.prochaine_echeance);
      }
    });

    return list;
  }, [subscriptions, activeTab, searchQuery, sortBy]);

  const dueSubscriptions = React.useMemo(() => {
    return subscriptions.filter((s) => s.est_echu);
  }, [subscriptions]);

  const handleOpenCreate = () => {
    setEditingSubscription(null);
    setFormModalOpened(true);
  };

  const handleOpenEdit = (sub: SubscriptionItem) => {
    setEditingSubscription(sub);
    setFormModalOpened(true);
  };

  const handleOpenHistory = (sub: SubscriptionItem) => {
    setHistorySubscription(sub);
    setHistoryDrawerOpened(true);
  };

  const handleGenerateInvoice = async (sub: SubscriptionItem) => {
    try {
      setActionLoadingId(sub.id);
      const res = await generateSubscriptionInvoiceAction(sub.id);
      if (res.success) {
        // Update local state next echeance
        setSubscriptions((prev) =>
          prev.map((item) =>
            item.id === sub.id
              ? {
                  ...item,
                  prochaine_echeance: res.nextEcheance,
                  factures_count: item.factures_count + 1,
                  est_echu: false,
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Erreur génération facture:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (sub: SubscriptionItem) => {
    const newStatus = sub.statut === "actif" ? "suspendu" : "actif";
    try {
      setActionLoadingId(sub.id);
      await toggleSubscriptionStatusAction(sub.id, newStatus);
      setSubscriptions((prev) =>
        prev.map((item) =>
          item.id === sub.id ? { ...item, statut: newStatus, est_echu: newStatus === "actif" && item.prochaine_echeance <= today } : item
        )
      );
    } catch (err) {
      console.error("Erreur bascule statut:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (sub: SubscriptionItem) => {
    const confirmMsg =
      locale === "ar"
        ? `هل أنت متأكد من رغبتك في حذف عقد "${sub.titre}" ؟`
        : `Supprimer définitivement l'abonnement "${sub.titre}" ?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoadingId(sub.id);
      await deleteSubscriptionAction(sub.id);
      setSubscriptions((prev) => prev.filter((item) => item.id !== sub.id));
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Reference",
      "Client",
      "Telephone",
      "Titre",
      "Periodicite",
      "Date Debut",
      "Date Fin",
      "Prochaine Echeance",
      "Mode Reglement",
      "Total TTC",
      "MRR",
      "ARR",
      "Statut",
      "Factures Emises",
    ];

    const rows = filteredSubscriptions.map((s) => [
      `"${s.reference}"`,
      `"${s.client_name.replace(/"/g, '""')}"`,
      `"${s.client_phone}"`,
      `"${s.titre.replace(/"/g, '""')}"`,
      s.periodicite,
      s.date_debut,
      s.date_fin || "",
      s.prochaine_echeance,
      s.mode_reglement,
      s.total_ttc.toFixed(2),
      s.mrr.toFixed(2),
      s.arr.toFixed(2),
      s.statut,
      s.factures_count,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `abonnements_mrr_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortOptions = [
    { value: "echeance_asc", label: locale === "ar" ? "أقرب تاريخ استحقاق" : "Prochaine échéance (croissant)" },
    { value: "echeance_desc", label: locale === "ar" ? "أبعد تاريخ استحقاق" : "Prochaine échéance (décroissant)" },
    { value: "mrr_desc", label: locale === "ar" ? "الأعلى دخلاً شهرياً (MRR)" : "MRR (décroissant)" },
    { value: "mrr_asc", label: locale === "ar" ? "الأقل دخلاً شهرياً (MRR)" : "MRR (croissant)" },
    { value: "ttc_desc", label: locale === "ar" ? "مبلغ الفاتورة الأكبر" : "Montant par échéance (décroissant)" },
    { value: "client_asc", label: locale === "ar" ? "العميل (أ - ي)" : "Client (A-Z)" },
  ];

  return (
    <Stack gap="md">
      {/* Page Heading adhering to haloui-system design tokens */}
      <PageHeading
        eyebrow={locale === "ar" ? "إدارة الاشتراكات والمداخيل الدورية" : "Revenus Récurrents & Abonnements"}
        title={locale === "ar" ? "الاشتراكات والفوترة الدورية" : "Abonnements & Facturation Récurrente"}
        description={
          locale === "ar"
            ? "إدارة عقود الصيانة والخدمات الدورية، تتبع مؤشرات MRR/ARR، والتوليد الآلي للفواتير في مواعيد الاستحقاق."
            : "Gestion des contrats périodiques (maintenance, loyers, services), pilotage du MRR/ARR et génération automatisée des factures."
        }
        actions={
          <Group gap="xs">
            <Button
              color="teal"
              radius="md"
              leftSection={<Plus size={15} />}
              onClick={handleOpenCreate}
            >
              {locale === "ar" ? "عقد اشتراك جديد" : "Nouvel abonnement"}
            </Button>

            {stats.echus_count > 0 ? (
              <Button
                color="amber"
                variant="light"
                radius="md"
                leftSection={<Zap size={15} />}
                onClick={() => setBatchModalOpened(true)}
              >
                {locale === "ar"
                  ? `توليد الفواتير المستحقة (${stats.echus_count})`
                  : `Générer les échéances (${stats.echus_count})`}
              </Button>
            ) : null}

            <Button
              variant="default"
              radius="md"
              leftSection={<FileSpreadsheet size={15} />}
              onClick={handleExportCsv}
            >
              {locale === "ar" ? "تصدير CSV" : "Exporter CSV"}
            </Button>
          </Group>
        }
      />

      {/* 4 Executive KPI Stat Cards matching Dashboard Paper styling */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* MRR Card */}
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
              <Text size="xs" fw={700} tt="uppercase" c="teal" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "الدخل الشهري القار (MRR)" : "MRR (Revenu Récurrent Mensuel)"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#059669" }}>
                {formatCurrency(stats.total_mrr)}
              </Text>
              <Text size="11px" c="dimmed">
                {locale === "ar" ? "معدل الإيراد الشهري المضمون" : "Revenu récurrent normalisé / mois"}
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
              <CircleDollarSign size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* ARR Card */}
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
              <Text size="xs" fw={700} tt="uppercase" c="indigo" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "الدخل السنوي المتوقع (ARR)" : "ARR (Revenu Récurrent Annuel)"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#4f46e5" }}>
                {formatCurrency(stats.total_arr)}
              </Text>
              <Text size="11px" c="dimmed">
                MRR × 12 {locale === "ar" ? "شهراً" : "mois"}
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
              <TrendingUp size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Actifs Card */}
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
              <Text size="xs" fw={700} tt="uppercase" c="blue" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "العقود النشطة" : "Abonnements Actifs"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#2563eb" }}>
                {stats.actifs_count}
              </Text>
              <Text size="11px" c="dimmed">
                {stats.total_count} {locale === "ar" ? "عقد مسجل إجمالاً" : "contrat(s) au total"}
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
              <CalendarClock size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>

        {/* Échéances à facturer Card */}
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
              <Text size="xs" fw={700} tt="uppercase" c="red" style={{ letterSpacing: "0.08em" }}>
                {locale === "ar" ? "فواتير جاهزة للتوليد" : "Échéances à facturer"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: stats.echus_count > 0 ? "#dc2626" : "var(--foreground)" }}>
                {stats.echus_count} {locale === "ar" ? "فاتورة" : "prête(s)"}
              </Text>
              <Text size="11px" c="dimmed">
                {stats.echus_count > 0
                  ? `Volume : ${formatCurrency(stats.total_echu_ttc)}`
                  : (locale === "ar" ? "جميع العقود مفوترة في موعدها" : "Tous les contrats sont à jour")}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: stats.echus_count > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(100, 116, 139, 0.12)",
                color: stats.echus_count > 0 ? "#dc2626" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertCircle size={20} strokeWidth={1.8} />
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Distribution Track Paper */}
      {stats.total_count > 0 ? (
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
                {locale === "ar" ? "توزيع الإيرادات حسب الدورية وطريقة الأداء" : "Répartition par périodicité & modes de règlement"}
              </Text>
              <Text size="xs" c="dimmed">
                {stats.actifs_count} {locale === "ar" ? "عقد نشط مساهم في MRR" : "contrat(s) actif(s) alimentant le MRR"}
              </Text>
            </Group>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--muted)] pt-0.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                Mensuel : <strong className="text-[var(--foreground)]">{stats.par_periodicite.mensuel.count}</strong> ({formatCurrency(stats.par_periodicite.mensuel.mrr)} MRR)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                Trimestriel : <strong className="text-[var(--foreground)]">{stats.par_periodicite.trimestriel.count}</strong> ({formatCurrency(stats.par_periodicite.trimestriel.mrr)} MRR)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                Semestriel : <strong className="text-[var(--foreground)]">{stats.par_periodicite.semestriel.count}</strong> ({formatCurrency(stats.par_periodicite.semestriel.mrr)} MRR)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                Annuel : <strong className="text-[var(--foreground)]">{stats.par_periodicite.annuel.count}</strong> ({formatCurrency(stats.par_periodicite.annuel.mrr)} MRR)
              </span>
              <span className="text-[var(--border-strong)]">|</span>
              <span className="inline-flex items-center gap-1 text-[var(--foreground)] font-medium">
                Prélèvements : <strong>{stats.par_mode_reglement.prelevement.count}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--foreground)] font-medium">
                Virements : <strong>{stats.par_mode_reglement.virement.count}</strong>
              </span>
            </div>
          </Stack>
        </Paper>
      ) : null}

      {/* Tabs & Search Controls Paper */}
      <Paper
        radius="xl"
        shadow="xs"
        withBorder
        p={{ base: "sm", sm: "md" }}
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Stack gap="sm">
          {/* Mantine Tabs pills */}
          <Tabs
            value={activeTab}
            onChange={(val) => setActiveTab(val || "all")}
            variant="pills"
            radius="xl"
          >
            <Tabs.List className="flex-wrap gap-1.5 border-b border-[var(--border)] pb-2.5">
              <Tabs.Tab value="all" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "جميع العقود" : "Tous les contrats"} ({subscriptions.length})
              </Tabs.Tab>
              <Tabs.Tab value="actifs" color="teal" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "العقود النشطة" : "Actifs"} ({stats.actifs_count})
              </Tabs.Tab>
              <Tabs.Tab value="echus" color="red" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "مستحقة الفوترة الآن" : "À facturer maintenant"} ({stats.echus_count})
              </Tabs.Tab>
              <Tabs.Tab value="suspendus" color="orange" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "معلقة" : "Suspendus"} ({stats.suspendus_count})
              </Tabs.Tab>
              <Tabs.Tab value="termines" color="gray" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "منتهية ومسودات" : "Terminés"}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Search and Sort controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <TextInput
              radius="md"
              placeholder={locale === "ar" ? "بحث بالعميل، العنوان، المرجع..." : "Rechercher client, contrat, référence..."}
              leftSection={<Search size={15} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="w-full sm:w-80"
            />

            <Select
              radius="md"
              data={sortOptions}
              value={sortBy}
              onChange={(val) => setSortBy(val || "echeance_asc")}
              className="w-full sm:w-64"
            />
          </div>
        </Stack>
      </Paper>

      {/* Main Subscriptions Table */}
      <Paper
        radius="xl"
        shadow="sm"
        withBorder
        p={{ base: "xs", sm: "md", lg: "lg" }}
        style={{ background: "var(--card)", borderColor: "var(--border-strong)", overflow: "hidden" }}
      >
        <div className="overflow-x-auto w-full min-w-0">
          <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm" striped style={{ minWidth: 720 }}>
            <TableThead>
              <TableTr>
                <TableTh>{locale === "ar" ? "العميل والعقد" : "Client & Contrat"}</TableTh>
                <TableTh>{locale === "ar" ? "الدورية وطريقة الدفع" : "Périodicité & Mode"}</TableTh>
                <TableTh>{locale === "ar" ? "الفاتورة القادمة" : "Prochaine échéance"}</TableTh>
                <TableTh>{locale === "ar" ? "المبلغ و MRR" : "Montant & MRR"}</TableTh>
                <TableTh>{locale === "ar" ? "الحالة" : "Statut"}</TableTh>
                <TableTh>{locale === "ar" ? "السجل" : "Factures émises"}</TableTh>
                <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                  {locale === "ar" ? "الإجراءات" : "Actions"}
                </TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {filteredSubscriptions.length === 0 ? (
                <TableTr>
                  <TableTd colSpan={7} style={{ padding: "36px", textAlign: "center" }}>
                    <Text c="dimmed">
                      {locale === "ar"
                        ? "ما كاين حتى عقد اشتراك في هاد الفئة حالياً."
                        : "Aucun contrat d'abonnement trouvé pour cette sélection."}
                    </Text>
                  </TableTd>
                </TableTr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const periodMeta = PERIODICITE_LABELS[sub.periodicite] || PERIODICITE_LABELS.mensuel;
                  const statutMeta = SUBSCRIPTION_STATUT_LABELS[sub.statut] || SUBSCRIPTION_STATUT_LABELS.actif;
                  const modeMeta = MODE_REGLEMENT_LABELS[sub.mode_reglement] || MODE_REGLEMENT_LABELS.virement;

                  return (
                    <TableTr key={sub.id}>
                      {/* Client & Contrat */}
                      <TableTd>
                        <Text fw={700} size="sm">
                          {sub.client_name}
                        </Text>
                        <Group gap={6} mt={2}>
                          <Text size="11px" c="dimmed" fw={500}>
                            {sub.titre}
                          </Text>
                          <Badge size="xs" variant="outline" color="gray" radius="sm">
                            {sub.reference}
                          </Badge>
                        </Group>
                      </TableTd>

                      {/* Périodicité & Mode */}
                      <TableTd>
                        <Badge size="sm" variant="light" color="blue" radius="xl">
                          {locale === "ar" ? periodMeta.labelAr : periodMeta.label}
                        </Badge>
                        <Text size="11px" c="dimmed" mt={3}>
                          {locale === "ar" ? modeMeta.labelAr : modeMeta.label}
                        </Text>
                      </TableTd>

                      {/* Prochaine Échéance */}
                      <TableTd>
                        <Text fw={700} size="xs">
                          {formatDate(sub.prochaine_echeance)}
                        </Text>
                        <div className="mt-1">
                          {sub.est_echu ? (
                            <Badge size="xs" color="red" variant="filled" radius="xl">
                              {locale === "ar" ? "مستحقة للفوترة" : "À facturer maintenant"}
                            </Badge>
                          ) : (
                            <Badge size="xs" color="teal" variant="light" radius="xl">
                              {locale === "ar" ? "قيد السريان" : "Échéance à venir"}
                            </Badge>
                          )}
                        </div>
                      </TableTd>

                      {/* Montant & MRR */}
                      <TableTd>
                        <Text fw={800} size="sm" style={{ color: "var(--foreground)" }}>
                          {formatCurrency(sub.total_ttc)} <span className="text-[10px] font-normal text-[var(--muted)]">TTC</span>
                        </Text>
                        <Text size="11px" fw={700} c="teal.7">
                          {formatCurrency(sub.mrr)} <span className="text-[10px] font-normal">MRR</span>
                        </Text>
                      </TableTd>

                      {/* Statut */}
                      <TableTd>
                        <Badge
                          size="sm"
                          color={statutMeta.color}
                          variant="light"
                          radius="xl"
                          style={{ textTransform: "none", fontWeight: 600 }}
                        >
                          {locale === "ar" ? statutMeta.labelAr : statutMeta.label}
                        </Badge>
                      </TableTd>

                      {/* Factures émises */}
                      <TableTd>
                        {sub.factures_count > 0 ? (
                          <Button
                            variant="subtle"
                            size="compact-xs"
                            color="indigo"
                            radius="md"
                            leftSection={<History size={12} />}
                            onClick={() => handleOpenHistory(sub)}
                          >
                            {sub.factures_count} {locale === "ar" ? "فاتورة" : `facture${sub.factures_count > 1 ? "s" : ""}`}
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">
                            {locale === "ar" ? "لم تصدر بعد" : "Aucune"}
                          </Text>
                        )}
                      </TableTd>

                      {/* Actions */}
                      <TableTd>
                        <Group gap="xs" justify={locale === "ar" ? "flex-start" : "flex-end"}>
                          <Button
                            size="xs"
                            radius="md"
                            color={sub.est_echu ? "amber" : "teal"}
                            variant={sub.est_echu ? "filled" : "light"}
                            leftSection={<Play size={12} />}
                            loading={actionLoadingId === sub.id}
                            onClick={() => handleGenerateInvoice(sub)}
                          >
                            {locale === "ar" ? "توليد فاتورة" : "Générer"}
                          </Button>

                          <Menu position={locale === "ar" ? "bottom-start" : "bottom-end"} shadow="md" width={200}>
                            <MenuTarget>
                              <ActionIcon variant="subtle" color="gray" radius="xl" size="lg">
                                <MoreHorizontal size={16} />
                              </ActionIcon>
                            </MenuTarget>
                            <MenuDropdown>
                              <MenuItem
                                leftSection={<Edit size={14} />}
                                onClick={() => handleOpenEdit(sub)}
                              >
                                {locale === "ar" ? "تعديل العقد" : "Modifier le contrat"}
                              </MenuItem>
                              <MenuItem
                                leftSection={<History size={14} />}
                                onClick={() => handleOpenHistory(sub)}
                              >
                                {locale === "ar" ? "سجل الفواتير" : "Historique des factures"}
                              </MenuItem>
                              <MenuItem
                                leftSection={sub.statut === "actif" ? <Pause size={14} /> : <RefreshCw size={14} />}
                                onClick={() => handleToggleStatus(sub)}
                              >
                                {sub.statut === "actif"
                                  ? (locale === "ar" ? "تعليق العقد" : "Mettre en pause")
                                  : (locale === "ar" ? "تفعيل العقد" : "Réactiver le contrat")}
                              </MenuItem>
                              <MenuItem
                                color="red"
                                leftSection={<Trash2 size={14} />}
                                onClick={() => handleDelete(sub)}
                              >
                                {locale === "ar" ? "حذف العقد" : "Supprimer"}
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

      {/* Subscription Creation / Edit Modal */}
      <SubscriptionModal
        opened={formModalOpened}
        onClose={() => setFormModalOpened(false)}
        subscription={editingSubscription}
        clients={clients}
        products={products}
        onSuccess={() => {
          // Re-fetch or rely on Next.js server action revalidate
          window.location.reload();
        }}
      />

      {/* Invoices History Timeline Drawer */}
      <SubscriptionHistoryDrawer
        subscription={historySubscription}
        opened={historyDrawerOpened}
        onClose={() => setHistoryDrawerOpened(false)}
      />

      {/* Batch Invoice Generation Modal */}
      <SubscriptionBatchModal
        opened={batchModalOpened}
        onClose={() => setBatchModalOpened(false)}
        dueSubscriptions={dueSubscriptions}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </Stack>
  );
}
