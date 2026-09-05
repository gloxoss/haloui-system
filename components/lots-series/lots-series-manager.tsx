"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  Menu,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MoreVertical,
  PackageCheck,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Warehouse,
  Wrench,
  XCircle,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { NouveauLotModal } from "@/components/lots-series/nouveau-lot-modal";
import { NouvelleSerieModal } from "@/components/lots-series/nouvelle-serie-modal";
import {
  bloquerLotQuarantaineAction,
  changerStatutSerieAction,
} from "@/app/actions";
import {
  type BranchRecord,
  type LotsSeriesKPIs,
  type ProductRecord,
  type ProduitLotRecord,
  type ProduitSerieRecord,
  type SerieStatut,
} from "@/lib/types";

type Props = {
  lots: ProduitLotRecord[];
  series: ProduitSerieRecord[];
  kpis: LotsSeriesKPIs;
  branches: BranchRecord[];
  products: ProductRecord[];
  currentBranchId?: number;
};

export function LotsSeriesManager({
  lots,
  series,
  kpis,
  branches,
  products,
  currentBranchId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bannerMessage, setBannerMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Modals
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [serieModalOpen, setSerieModalOpen] = useState(false);

  // Quarantine modal
  const [quarantineLot, setQuarantineLot] = useState<ProduitLotRecord | null>(null);
  const [quarantineMotif, setQuarantineMotif] = useState("Date DLC dépassée / Retrait du rayon pour destruction");

  // Tabs
  const [activeTab, setActiveTab] = useState<string | null>("lots");

  // Filters for Lots
  const [lotStatutFilter, setLotStatutFilter] = useState<string>("all");
  const [lotBranchFilter, setLotBranchFilter] = useState<string>(
    currentBranchId ? String(currentBranchId) : "all"
  );
  const [lotSearchQuery, setLotSearchQuery] = useState<string>("");

  // Filters for Series
  const [serieStatutFilter, setSerieStatutFilter] = useState<string>("all");
  const [serieBranchFilter, setSerieBranchFilter] = useState<string>(
    currentBranchId ? String(currentBranchId) : "all"
  );
  const [serieSearchQuery, setSerieSearchQuery] = useState<string>("");

  // Filtered Lots
  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      if (lotStatutFilter === "alerte_only") {
        if (lot.statut !== "perime" && lot.statut !== "alerte_peremption") return false;
      } else if (lotStatutFilter !== "all" && lot.statut !== lotStatutFilter) {
        return false;
      }
      if (lotBranchFilter !== "all" && String(lot.branch_id) !== lotBranchFilter) {
        return false;
      }
      if (lotSearchQuery.trim()) {
        const q = lotSearchQuery.toLowerCase();
        const matchNum = lot.numero_lot?.toLowerCase().includes(q);
        const matchProd = lot.produit_designation?.toLowerCase().includes(q);
        const matchBarre = lot.code_barre?.toLowerCase().includes(q);
        const matchRef = lot.produit_ref?.toLowerCase().includes(q);
        if (!matchNum && !matchProd && !matchBarre && !matchRef) {
          return false;
        }
      }
      return true;
    });
  }, [lots, lotStatutFilter, lotBranchFilter, lotSearchQuery]);

  // Filtered Series
  const filteredSeries = useMemo(() => {
    return series.filter((s) => {
      if (serieStatutFilter !== "all" && s.statut !== serieStatutFilter) {
        return false;
      }
      if (serieBranchFilter !== "all" && String(s.branch_id) !== serieBranchFilter) {
        return false;
      }
      if (serieSearchQuery.trim()) {
        const q = serieSearchQuery.toLowerCase();
        const matchNum = s.numero_serie?.toLowerCase().includes(q);
        const matchProd = s.produit_designation?.toLowerCase().includes(q);
        const matchBarre = s.code_barre?.toLowerCase().includes(q);
        const matchDoc = String(s.document_vente_numero || "").toLowerCase().includes(q);
        if (!matchNum && !matchProd && !matchBarre && !matchDoc) {
          return false;
        }
      }
      return true;
    });
  }, [series, serieStatutFilter, serieBranchFilter, serieSearchQuery]);

  const handleQuarantineConfirm = () => {
    if (!quarantineLot) return;
    startTransition(async () => {
      const res = await bloquerLotQuarantaineAction(quarantineLot.id, quarantineMotif);
      if (res.success) {
        setBannerMessage({
          type: "success",
          text: `Le lot ${quarantineLot.numero_lot} a été placé en quarantaine et déduit du stock disponible.`,
        });
        setQuarantineLot(null);
        router.refresh();
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Impossible de bloquer le lot.",
        });
      }
    });
  };

  const handleChangerStatutSerie = (id: number, statut: SerieStatut, label: string) => {
    startTransition(async () => {
      const res = await changerStatutSerieAction(id, statut);
      if (res.success) {
        setBannerMessage({
          type: "success",
          text: `Statut de la série mis à jour : ${label}.`,
        });
        router.refresh();
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Échec de la mise à jour du statut.",
        });
      }
    });
  };

  return (
    <Stack gap="xl">
      <PageHeading
        eyebrow="Traçabilité & Hygiène Qualité"
        title="Lots, Dates DLC & Séries (S/N)"
        description="Traçabilité amont/aval complète des produits sensibles (alimentaire, boissons, lubrifiants, batteries, outillage) avec alertes d'expiration et suivi des numéros de série."
        actions={
          <Group gap="sm">
            <Button
              color="teal"
              variant="light"
              leftSection={<Tag size={16} />}
              onClick={() => setLotModalOpen(true)}
            >
              Nouveau Lot & DLC
            </Button>
            <Button
              color="indigo"
              leftSection={<QrCode size={16} />}
              onClick={() => setSerieModalOpen(true)}
            >
              Nouveau N° de Série
            </Button>
          </Group>
        }
      />

      {/* Critical Expiration Banner if expired lots exist */}
      {kpis.lotsPerimes > 0 && (
        <Alert
          color="red"
          icon={<AlertOctagon size={18} />}
          radius="lg"
          title="Attention : Lots périmés en rayon / stock"
        >
          <Group justify="space-between" align="center">
            <Text size="sm">
              Il y a actuellement <strong>{kpis.lotsPerimes} lot(s) dont la DLC est dépassée</strong>. Veuillez les isoler immédiatement en quarantaine pour empêcher toute vente aux clients.
            </Text>
            <Button
              size="xs"
              color="red"
              variant="outline"
              onClick={() => {
                setActiveTab("lots");
                setLotStatutFilter("perime");
              }}
            >
              Afficher les lots périmés
            </Button>
          </Group>
        </Alert>
      )}

      {bannerMessage && (
        <Alert
          color={bannerMessage.type === "error" ? "red" : "teal"}
          icon={bannerMessage.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          withCloseButton
          onClose={() => setBannerMessage(null)}
          radius="md"
        >
          {bannerMessage.text}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid gutter="md">
        {/* Lots Actifs */}
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper
            p="md"
            radius="xl"
            withBorder
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
            }}
          >
            <Group justify="space-between" align="flex-start" mb="xs">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                Lots Actifs Sains
              </Text>
              <ThemeIcon size="md" radius="md" color="teal" variant="light">
                <Boxes size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="teal">
                {kpis.totalLotsActifs}
              </Text>
              <Text size="xs" c="dimmed">
                lots traçables
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              En stock et validité conforme
            </Text>
          </Paper>
        </Grid.Col>

        {/* Lots Périmés */}
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper
            p="md"
            radius="xl"
            withBorder
            style={{
              background: "var(--card)",
              borderColor: kpis.lotsPerimes > 0 ? "var(--mantine-color-red-6)" : "var(--border-strong)",
            }}
          >
            <Group justify="space-between" align="flex-start" mb="xs">
              <Text size="xs" fw={700} tt="uppercase" c={kpis.lotsPerimes > 0 ? "red" : "dimmed"} style={{ letterSpacing: "0.08em" }}>
                DLC Dépassée (Périmés)
              </Text>
              <ThemeIcon size="md" radius="md" color="red" variant="light">
                <AlertTriangle size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c={kpis.lotsPerimes > 0 ? "red" : "gray"}>
                {kpis.lotsPerimes}
              </Text>
              <Text size="xs" c="dimmed">
                lot(s) critique(s)
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Retrait et mise en quarantaine requis
            </Text>
          </Paper>
        </Grid.Col>

        {/* Alerte DLC Imminente */}
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper
            p="md"
            radius="xl"
            withBorder
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
            }}
          >
            <Group justify="space-between" align="flex-start" mb="xs">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                Alerte DLC Imminente
              </Text>
              <ThemeIcon size="md" radius="md" color="orange" variant="light">
                <Clock size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="orange">
                {kpis.lotsAlerteUrgent + kpis.lotsAlerteAttention}
              </Text>
              <Text size="xs" c="dimmed">
                lots sous surveillance
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Expire dans moins de 15 à 60 jours
            </Text>
          </Paper>
        </Grid.Col>

        {/* Séries sous garantie */}
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper
            p="md"
            radius="xl"
            withBorder
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
            }}
          >
            <Group justify="space-between" align="flex-start" mb="xs">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                Séries sous Garantie (S/N)
              </Text>
              <ThemeIcon size="md" radius="md" color="indigo" variant="light">
                <ShieldCheck size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="indigo">
                {kpis.seriesSousGarantie}
              </Text>
              <Text size="xs" c="dimmed">
                appareils couverts
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Sur <strong>{kpis.totalSeriesActives}</strong> unités actuellement en stock
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Main Tabs View */}
      <Tabs value={activeTab} onChange={setActiveTab} radius="lg">
        <Tabs.List mb="md">
          <Tabs.Tab value="lots" leftSection={<Tag size={16} />}>
            Lots & Dates Limites de Consommation ({lots.length})
          </Tabs.Tab>
          <Tabs.Tab value="series" leftSection={<QrCode size={16} />}>
            Numéros de Série & Garanties SAV ({series.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* ============================================================ */}
        {/* TAB 1: LOTS & DATES DE PÉREMPTION (DLC / DLUO)               */}
        {/* ============================================================ */}
        <Tabs.Panel value="lots">
          <Stack gap="md">
            <Paper
              p="md"
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Group gap="sm" wrap="wrap">
                  <SegmentedControl
                    value={lotStatutFilter}
                    onChange={setLotStatutFilter}
                    data={[
                      { label: "Tous les lots", value: "all" },
                      { label: "Alertes / Périmés", value: "alerte_only" },
                      { label: "Actifs sains", value: "actif" },
                      { label: "Quarantaine", value: "quarantaine" },
                      { label: "Épuisés", value: "epuise" },
                    ]}
                    radius="lg"
                    size="sm"
                  />

                  {branches.length > 1 && (
                    <Select
                      placeholder="Dépôt / Magasin"
                      value={lotBranchFilter}
                      onChange={(val) => setLotBranchFilter(val || "all")}
                      data={[
                        { label: "Tous les magasins", value: "all" },
                        ...branches.map((b) => ({ label: b.name, value: String(b.id) })),
                      ]}
                      radius="md"
                      size="sm"
                      style={{ width: 200 }}
                    />
                  )}
                </Group>

                <TextInput
                  placeholder="Rechercher lot, article, code-barres..."
                  leftSection={<Search size={15} className="text-gray-400" />}
                  value={lotSearchQuery}
                  onChange={(e) => setLotSearchQuery(e.currentTarget.value)}
                  radius="md"
                  size="sm"
                  style={{ width: 280 }}
                />
              </Group>
            </Paper>

            <Paper
              p={0}
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
                overflow: "hidden",
              }}
            >
              {filteredLots.length === 0 ? (
                <Stack align="center" justify="center" p="xl" gap="sm" style={{ minHeight: 200 }}>
                  <Tag size={40} className="text-gray-400" />
                  <Text fw={600} size="md" c="dimmed">
                    Aucun lot ne correspond aux critères
                  </Text>
                  <Button
                    variant="light"
                    color="teal"
                    size="sm"
                    leftSection={<Plus size={14} />}
                    onClick={() => setLotModalOpen(true)}
                  >
                    Enregistrer un lot
                  </Button>
                </Stack>
              ) : (
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                  <Table.Thead style={{ background: "var(--surface-soft)" }}>
                    <Table.Tr>
                      <Table.Th>Article & Code-barre</Table.Th>
                      <Table.Th>N° de Lot</Table.Th>
                      <Table.Th>Dépôt / Emplacement</Table.Th>
                      <Table.Th>Date DLC & Échéance</Table.Th>
                      <Table.Th>Stock Restant</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredLots.map((lot) => {
                      const j = lot.jours_restants ?? 999;
                      let badgeColor = "teal";
                      let badgeText = `Valide (${j}j restants)`;

                      if (lot.statut === "quarantaine") {
                        badgeColor = "red";
                        badgeText = "En Quarantaine";
                      } else if (lot.statut === "epuise") {
                        badgeColor = "gray";
                        badgeText = "Épuisé (0 en stock)";
                      } else if (j <= 0) {
                        badgeColor = "red";
                        badgeText = `PÉRIMÉ depuis ${Math.abs(j)}j`;
                      } else if (j <= 15) {
                        badgeColor = "red";
                        badgeText = `URGENT (Expire dans ${j}j)`;
                      } else if (j <= 60) {
                        badgeColor = "orange";
                        badgeText = `Alerte (${j}j restants)`;
                      }

                      return (
                        <Table.Tr key={lot.id}>
                          <Table.Td>
                            <Text size="sm" fw={700}>
                              {lot.produit_designation}
                            </Text>
                            <Group gap={6} mt={2}>
                              {lot.code_barre && (
                                <Badge size="xs" variant="outline" color="gray">
                                  {lot.code_barre}
                                </Badge>
                              )}
                              <Text size="xs" c="dimmed">
                                {lot.produit_ref}
                              </Text>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            <Text size="sm" fw={700} style={{ fontFamily: "monospace" }}>
                              {lot.numero_lot}
                            </Text>
                            {lot.notes && (
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {lot.notes}
                              </Text>
                            )}
                          </Table.Td>

                          <Table.Td>
                            <Group gap={6}>
                              <Warehouse size={14} className="text-gray-500" />
                              <Text size="sm">{lot.branch_name}</Text>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {new Date(lot.date_peremption).toLocaleDateString("fr-FR")}
                            </Text>
                            <Badge size="xs" color={badgeColor} variant="light" mt={2}>
                              {badgeText}
                            </Badge>
                          </Table.Td>

                          <Table.Td>
                            <Text size="sm" fw={700}>
                              {lot.quantite_restante} {lot.unite || "u"}
                            </Text>
                            <Text size="xs" c="dimmed">
                              sur {lot.quantite_initiale} initiaux
                            </Text>
                          </Table.Td>

                          <Table.Td>
                            <Badge
                              size="sm"
                              variant="filled"
                              color={
                                lot.statut === "actif"
                                  ? "teal"
                                  : lot.statut === "alerte_peremption"
                                  ? "orange"
                                  : lot.statut === "quarantaine" || lot.statut === "perime"
                                  ? "red"
                                  : "gray"
                              }
                            >
                              {lot.statut === "actif"
                                ? "Conforme"
                                : lot.statut === "alerte_peremption"
                                ? "À Déstocker"
                                : lot.statut === "perime"
                                ? "Périmé"
                                : lot.statut === "quarantaine"
                                ? "Quarantaine"
                                : "Épuisé"}
                            </Badge>
                          </Table.Td>

                          <Table.Td style={{ textAlign: "right" }}>
                            {lot.statut !== "quarantaine" && lot.quantite_restante > 0 ? (
                              <Button
                                size="xs"
                                variant="light"
                                color="red"
                                leftSection={<Lock size={12} />}
                                onClick={() => setQuarantineLot(lot)}
                              >
                                Quarantaine
                              </Button>
                            ) : lot.statut === "quarantaine" ? (
                              <Badge size="xs" color="red" variant="outline">
                                Bloqué vente
                              </Badge>
                            ) : null}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ============================================================ */}
        {/* TAB 2: NUMÉROS DE SÉRIE INDIVIDUELS (S/N)                    */}
        {/* ============================================================ */}
        <Tabs.Panel value="series">
          <Stack gap="md">
            <Paper
              p="md"
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Group gap="sm" wrap="wrap">
                  <SegmentedControl
                    value={serieStatutFilter}
                    onChange={setSerieStatutFilter}
                    data={[
                      { label: "Toutes les séries", value: "all" },
                      { label: "En stock", value: "en_stock" },
                      { label: "Vendu", value: "vendu" },
                      { label: "En SAV", value: "sav" },
                      { label: "Défectueux", value: "defectueux" },
                    ]}
                    radius="lg"
                    size="sm"
                  />

                  {branches.length > 1 && (
                    <Select
                      placeholder="Dépôt / Magasin"
                      value={serieBranchFilter}
                      onChange={(val) => setSerieBranchFilter(val || "all")}
                      data={[
                        { label: "Tous les dépôts", value: "all" },
                        ...branches.map((b) => ({ label: b.name, value: String(b.id) })),
                      ]}
                      radius="md"
                      size="sm"
                      style={{ width: 200 }}
                    />
                  )}
                </Group>

                <TextInput
                  placeholder="Rechercher S/N, appareil, bon de vente..."
                  leftSection={<Search size={15} className="text-gray-400" />}
                  value={serieSearchQuery}
                  onChange={(e) => setSerieSearchQuery(e.currentTarget.value)}
                  radius="md"
                  size="sm"
                  style={{ width: 280 }}
                />
              </Group>
            </Paper>

            <Paper
              p={0}
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
                overflow: "hidden",
              }}
            >
              {filteredSeries.length === 0 ? (
                <Stack align="center" justify="center" p="xl" gap="sm" style={{ minHeight: 200 }}>
                  <QrCode size={40} className="text-gray-400" />
                  <Text fw={600} size="md" c="dimmed">
                    Aucun numéro de série enregistré
                  </Text>
                  <Button
                    variant="light"
                    color="indigo"
                    size="sm"
                    leftSection={<Plus size={14} />}
                    onClick={() => setSerieModalOpen(true)}
                  >
                    Enregistrer une unité S/N
                  </Button>
                </Stack>
              ) : (
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                  <Table.Thead style={{ background: "var(--surface-soft)" }}>
                    <Table.Tr>
                      <Table.Th>Appareil & Réf</Table.Th>
                      <Table.Th>Numéro de Série (S/N)</Table.Th>
                      <Table.Th>Dépôt / Magasin</Table.Th>
                      <Table.Th>Garantie Constructeur</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th>Traçabilité Documentaire</Table.Th>
                      <Table.Th style={{ textAlign: "right" }}>Changer Statut</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredSeries.map((s) => {
                      const hasWarranty = Boolean(s.garantie_fin_date);
                      const daysLeft = s.jours_garantie_restants ?? 0;

                      return (
                        <Table.Tr key={s.id}>
                          <Table.Td>
                            <Text size="sm" fw={700}>
                              {s.produit_designation}
                            </Text>
                            <Group gap={6} mt={2}>
                              {s.code_barre && (
                                <Badge size="xs" variant="outline" color="gray">
                                  {s.code_barre}
                                </Badge>
                              )}
                              <Text size="xs" c="dimmed">
                                {s.produit_ref}
                              </Text>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            <Badge size="md" variant="light" color="indigo" style={{ fontFamily: "monospace", letterSpacing: "0.04em" }}>
                              {s.numero_serie}
                            </Badge>
                            {s.notes && (
                              <Text size="xs" c="dimmed" mt={2} lineClamp={1}>
                                {s.notes}
                              </Text>
                            )}
                          </Table.Td>

                          <Table.Td>
                            <Group gap={6}>
                              <Warehouse size={14} className="text-gray-500" />
                              <Text size="sm">{s.branch_name}</Text>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            {hasWarranty ? (
                              <div>
                                <Text size="xs" fw={600}>
                                  Jusqu'au {new Date(s.garantie_fin_date!).toLocaleDateString("fr-FR")}
                                </Text>
                                <Badge
                                  size="xs"
                                  color={daysLeft > 0 ? "teal" : "gray"}
                                  variant="light"
                                  mt={2}
                                >
                                  {daysLeft > 0 ? `${daysLeft}j restants` : "Garantie expirée"}
                                </Badge>
                              </div>
                            ) : (
                              <Text size="xs" c="dimmed">
                                Non renseignée
                              </Text>
                            )}
                          </Table.Td>

                          <Table.Td>
                            <Badge
                              size="sm"
                              variant="filled"
                              color={
                                s.statut === "en_stock"
                                  ? "teal"
                                  : s.statut === "vendu"
                                  ? "blue"
                                  : s.statut === "sav"
                                  ? "orange"
                                  : "red"
                              }
                            >
                              {s.statut === "en_stock"
                                ? "En Stock"
                                : s.statut === "vendu"
                                ? "Vendu"
                                : s.statut === "sav"
                                ? "En SAV"
                                : "Défectueux"}
                            </Badge>
                          </Table.Td>

                          <Table.Td>
                            {s.document_vente_numero ? (
                              <Group gap={4}>
                                <ExternalLink size={13} className="text-blue-500" />
                                <Text size="xs" fw={600} c="blue">
                                  {s.document_vente_numero}
                                </Text>
                              </Group>
                            ) : s.document_achat_ref ? (
                              <Text size="xs" c="dimmed">
                                Achat : {s.document_achat_ref}
                              </Text>
                            ) : (
                              <Text size="xs" c="dimmed">
                                -
                              </Text>
                            )}
                          </Table.Td>

                          <Table.Td style={{ textAlign: "right" }}>
                            <Menu position="bottom-end" shadow="md">
                              <Menu.Target>
                                <Button size="xs" variant="default" rightSection={<MoreVertical size={13} />}>
                                  Action
                                </Button>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {s.statut !== "en_stock" && (
                                  <Menu.Item
                                    leftSection={<Boxes size={14} />}
                                    onClick={() => handleChangerStatutSerie(s.id, "en_stock", "En stock")}
                                  >
                                    Remettre en stock
                                  </Menu.Item>
                                )}
                                {s.statut !== "sav" && (
                                  <Menu.Item
                                    leftSection={<Wrench size={14} />}
                                    onClick={() => handleChangerStatutSerie(s.id, "sav", "En SAV")}
                                  >
                                    Envoyer en SAV / Réparation
                                  </Menu.Item>
                                )}
                                {s.statut !== "defectueux" && (
                                  <Menu.Item
                                    color="red"
                                    leftSection={<AlertTriangle size={14} />}
                                    onClick={() => handleChangerStatutSerie(s.id, "defectueux", "Défectueux")}
                                  >
                                    Déclarer défectueux / HS
                                  </Menu.Item>
                                )}
                                {s.statut !== "vendu" && (
                                  <Menu.Item
                                    color="blue"
                                    leftSection={<PackageCheck size={14} />}
                                    onClick={() => handleChangerStatutSerie(s.id, "vendu", "Vendu au client")}
                                  >
                                    Marquer comme Vendu
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal Quarantaine */}
      <Modal
        opened={Boolean(quarantineLot)}
        onClose={() => setQuarantineLot(null)}
        title={
          <Group gap="xs">
            <Lock size={18} className="text-red-600" />
            <Text fw={700} size="md" c="red">
              Placer le Lot en Quarantaine Immédiate
            </Text>
          </Group>
        }
        radius="xl"
      >
        {quarantineLot && (
          <Stack gap="md">
            <Alert color="red" icon={<AlertTriangle size={16} />}>
              Ce lot (<strong>{quarantineLot.numero_lot}</strong> - {quarantineLot.produit_designation}) contient <strong>{quarantineLot.quantite_restante} unités</strong>. Le blocage déduira immédiatement ce stock du disponible commercial.
            </Alert>

            <Textarea
              label="Motif du blocage / Quarantaine"
              value={quarantineMotif}
              onChange={(e) => setQuarantineMotif(e.currentTarget.value)}
              rows={3}
              required
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setQuarantineLot(null)}>
                Annuler
              </Button>
              <Button color="red" onClick={handleQuarantineConfirm} loading={isPending}>
                Confirmer la mise en quarantaine
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Modals Création */}
      <NouveauLotModal
        opened={lotModalOpen}
        onClose={() => setLotModalOpen(false)}
        branches={branches}
        products={products}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Nouveau lot de traçabilité enregistré avec succès.",
          });
          router.refresh();
        }}
      />

      <NouvelleSerieModal
        opened={serieModalOpen}
        onClose={() => setSerieModalOpen(false)}
        branches={branches}
        products={products}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Numéro de série individuel enregistré avec succès.",
          });
          router.refresh();
        }}
      />
    </Stack>
  );
}
