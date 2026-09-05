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
  CheckCircle2,
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
    { value: "echeance_asc", label: locale === "ar" ? "أقرب موعد فاتورة" : "Prochaine facture (plus proche)" },
    { value: "echeance_desc", label: locale === "ar" ? "أبعد موعد فاتورة" : "Prochaine facture (plus éloignée)" },
    { value: "mrr_desc", label: locale === "ar" ? "المبلغ الأكبر شهرياً" : "Revenu mensuel le plus élevé" },
    { value: "mrr_asc", label: locale === "ar" ? "المبلغ الأقل شهرياً" : "Revenu mensuel le moins élevé" },
    { value: "client_asc", label: locale === "ar" ? "اسم العميل (أ - ي)" : "Nom du client (A-Z)" },
  ];

  return (
    <Stack gap="md">
      {/* Friendly Page Heading */}
      <PageHeading
        eyebrow={locale === "ar" ? "العقود والخدمات الدورية" : "Contrats & Abonnements"}
        title={locale === "ar" ? "الاشتراكات والفوترة الدورية" : "Facturation Récurrente"}
        description={
          locale === "ar"
            ? "إدارة عقود الصيانة، الإيجارات والخدمات المنتظمة، وتوليد الفواتير بنقرة واحدة."
            : "Gérez vos contrats réguliers (maintenance, loyers, services) et générez vos factures en un clic."
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
                  ? `فواتير مستحقة (${stats.echus_count})`
                  : `Facturer les échéances (${stats.echus_count})`}
              </Button>
            ) : null}

            <Button
              variant="default"
              radius="md"
              leftSection={<FileSpreadsheet size={15} />}
              onClick={handleExportCsv}
            >
              {locale === "ar" ? "تصدير" : "Exporter"}
            </Button>
          </Group>
        }
      />

      {/* 4 Clean, Human-Friendly KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Revenu Mensuel Régulier */}
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
              <Text size="xs" fw={700} tt="uppercase" c="teal" style={{ letterSpacing: "0.05em" }}>
                {locale === "ar" ? "المداخيل الشهرية" : "Revenu régulier / mois"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#059669" }}>
                {formatCurrency(stats.total_mrr)}
              </Text>
              <Text size="11px" c="dimmed">
                {locale === "ar" ? "مجموع العقود النشطة شهرياً" : "Total calculé par mois"}
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

        {/* Card 2: Revenu Annuel Estimé */}
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
              <Text size="xs" fw={700} tt="uppercase" c="indigo" style={{ letterSpacing: "0.05em" }}>
                {locale === "ar" ? "المداخيل السنوية المتوقعة" : "Revenu annuel estimé"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#4f46e5" }}>
                {formatCurrency(stats.total_arr)}
              </Text>
              <Text size="11px" c="dimmed">
                {locale === "ar" ? "تقدير على 12 شهراً" : "Projection sur 12 mois"}
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

        {/* Card 3: Contrats Actifs */}
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
              <Text size="xs" fw={700} tt="uppercase" c="blue" style={{ letterSpacing: "0.05em" }}>
                {locale === "ar" ? "العقود الجارية" : "Contrats en cours"}
              </Text>
              <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "#2563eb" }}>
                {stats.actifs_count}
              </Text>
              <Text size="11px" c="dimmed">
                {stats.total_count} {locale === "ar" ? "عقد مسجل" : "contrat(s) au total"}
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

        {/* Card 4: Factures à Émettre */}
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
              <Text size="xs" fw={700} tt="uppercase" c={stats.echus_count > 0 ? "amber.7" : "teal"} style={{ letterSpacing: "0.05em" }}>
                {locale === "ar" ? "فواتير بانتظار الإصدار" : "Factures à émettre"}
              </Text>
              <Text
                size="xl"
                fw={900}
                style={{
                  letterSpacing: "-0.03em",
                  color: stats.echus_count > 0 ? "#d97706" : "#059669",
                }}
              >
                {stats.echus_count > 0
                  ? `${stats.echus_count} ${locale === "ar" ? "مستحقة" : "prête(s)"}`
                  : (locale === "ar" ? "كل شيء محين" : "À jour")}
              </Text>
              <Text size="11px" c="dimmed">
                {stats.echus_count > 0
                  ? `${formatCurrency(stats.total_echu_ttc)} à facturer`
                  : (locale === "ar" ? "لا توجد أي فواتير متأخرة" : "Aucune facture en attente")}
              </Text>
            </Stack>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: stats.echus_count > 0 ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: stats.echus_count > 0 ? "#d97706" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {stats.echus_count > 0 ? <AlertCircle size={20} strokeWidth={1.8} /> : <CheckCircle2 size={20} strokeWidth={1.8} />}
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Helpful Action Banner (Appears only when invoices are due) */}
      {stats.echus_count > 0 && (
        <Paper
          radius="xl"
          withBorder
          p="sm"
          style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "#f59e0b" }}
        >
          <Group justify="space-between" align="center" className="flex-wrap gap-2">
            <Group gap="xs">
              <Zap size={18} className="text-amber-600 shrink-0" />
              <Text size="sm" fw={600} c="amber.9">
                {locale === "ar"
                  ? `هناك ${stats.echus_count} عقد وصل موعد استحقاقه ومستعد للفوترة بمبلغ إجمالي ${formatCurrency(stats.total_echu_ttc)}.`
                  : `${stats.echus_count} contrat(s) sont arrivés à échéance et prêts à être facturés (${formatCurrency(stats.total_echu_ttc)}).`}
              </Text>
            </Group>
            <Button
              color="amber"
              size="xs"
              radius="md"
              leftSection={<Zap size={14} />}
              onClick={() => setBatchModalOpened(true)}
            >
              {locale === "ar" ? "إصدار جميع الفواتير بنقرة واحدة" : "Tout facturer en 1 clic"}
            </Button>
          </Group>
        </Paper>
      )}

      {/* Tabs & Search Controls */}
      <Paper
        radius="xl"
        shadow="xs"
        withBorder
        p={{ base: "sm", sm: "md" }}
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Stack gap="sm">
          {/* Friendly Tabs */}
          <Tabs
            value={activeTab}
            onChange={(val) => setActiveTab(val || "all")}
            variant="pills"
            radius="xl"
          >
            <Tabs.List className="flex-wrap gap-1.5 border-b border-[var(--border)] pb-2.5">
              <Tabs.Tab value="all" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "الكل" : "Tous"} ({subscriptions.length})
              </Tabs.Tab>
              <Tabs.Tab value="actifs" color="teal" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "الجارية" : "En cours"} ({stats.actifs_count})
              </Tabs.Tab>
              <Tabs.Tab value="echus" color="amber" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "جاهزة للفوترة" : "À facturer"} ({stats.echus_count})
              </Tabs.Tab>
              <Tabs.Tab value="suspendus" color="orange" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "موقوفة مؤقتاً" : "En pause"} ({stats.suspendus_count})
              </Tabs.Tab>
              <Tabs.Tab value="termines" color="gray" style={{ fontWeight: 600 }}>
                {locale === "ar" ? "المنتهية" : "Terminés"}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Search and Sort controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <TextInput
              radius="md"
              placeholder={locale === "ar" ? "بحث باسم العميل أو العقد..." : "Rechercher un client ou contrat..."}
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
              className="w-full sm:w-72"
            />
          </div>
        </Stack>
      </Paper>

      {/* Main Clean Table */}
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
                <TableTh>{locale === "ar" ? "العميل والعقد" : "Client & Contrat"}</TableTh>
                <TableTh>{locale === "ar" ? "المبلغ والدورية" : "Tarif & Fréquence"}</TableTh>
                <TableTh>{locale === "ar" ? "الفاتورة القادمة" : "Prochaine facture"}</TableTh>
                <TableTh>{locale === "ar" ? "الحالة والسجل" : "État & Historique"}</TableTh>
                <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                  {locale === "ar" ? "إجراء" : "Action"}
                </TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {filteredSubscriptions.length === 0 ? (
                <TableTr>
                  <TableTd colSpan={5} style={{ padding: "36px", textAlign: "center" }}>
                    <Text c="dimmed" size="sm">
                      {locale === "ar"
                        ? "ما كاين حتى عقد في هاد القائمة حالياً."
                        : "Aucun contrat d'abonnement dans cette liste."}
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
                          <Text size="xs" c="dimmed" fw={500}>
                            {sub.titre}
                          </Text>
                          <Badge size="xs" variant="outline" color="gray" radius="sm">
                            {sub.reference}
                          </Badge>
                        </Group>
                      </TableTd>

                      {/* Tarif & Fréquence (Ultra Intuitive) */}
                      <TableTd>
                        <div>
                          <Text fw={800} size="sm" style={{ color: "var(--foreground)" }}>
                            {formatCurrency(sub.total_ttc)}{" "}
                            <span className="text-xs font-semibold text-teal-700">
                              {locale === "ar" ? periodMeta.perUnitAr : periodMeta.perUnit}
                            </span>
                          </Text>
                          <Text size="11px" c="dimmed" mt={1}>
                            {locale === "ar" ? modeMeta.labelAr : modeMeta.label}
                            {sub.periodicite !== "mensuel" ? ` · (${formatCurrency(sub.mrr)}/mois)` : ""}
                          </Text>
                        </div>
                      </TableTd>

                      {/* Prochaine Facture */}
                      <TableTd>
                        <Text fw={700} size="xs">
                          {formatDate(sub.prochaine_echeance)}
                        </Text>
                        {sub.est_echu ? (
                          <Badge size="xs" color="red" variant="filled" radius="xl" mt={3}>
                            {locale === "ar" ? "مستحقة اليوم" : "À facturer"}
                          </Badge>
                        ) : null}
                      </TableTd>

                      {/* État & Historique */}
                      <TableTd>
                        <Group gap="xs" align="center">
                          <Badge
                            size="sm"
                            color={statutMeta.color}
                            variant="light"
                            radius="xl"
                            style={{ textTransform: "none", fontWeight: 600 }}
                          >
                            {locale === "ar" ? statutMeta.labelAr : statutMeta.label}
                          </Badge>

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
                              {locale === "ar" ? "لم تصدر بعد" : "Aucune émise"}
                            </Text>
                          )}
                        </Group>
                      </TableTd>

                      {/* Actions */}
                      <TableTd>
                        <Group gap="xs" justify={locale === "ar" ? "flex-start" : "flex-end"}>
                          <Button
                            size="xs"
                            radius="md"
                            color={sub.est_echu ? "teal" : "gray"}
                            variant={sub.est_echu ? "filled" : "light"}
                            leftSection={<Play size={12} />}
                            loading={actionLoadingId === sub.id}
                            onClick={() => handleGenerateInvoice(sub)}
                          >
                            {locale === "ar" ? "إنشاء فاتورة" : "Facturer"}
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
                                  ? (locale === "ar" ? "إيقاف مؤقت" : "Mettre en pause")
                                  : (locale === "ar" ? "إعادة التفعيل" : "Réactiver le contrat")}
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
