"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  Modal,
  Paper,
  Progress,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  Grid3X3,
  MapPin,
  Package,
  PackagePlus,
  Plus,
  Printer,
  RefreshCw,
  Route,
  Search,
  Trash2,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { NouvelEmplacementModal } from "./nouvel-emplacement-modal";
import { AssignerEmplacementModal } from "./assigner-emplacement-modal";
import { PickingViewModal } from "./picking-view-modal";
import {
  genererPickingListAction,
  getWmsKPIsAction,
  listEmplacementsAction,
  listProduitsEmplacementsAction,
  retirerProduitEmplacementAction,
} from "@/app/actions";
import {
  BranchRecord,
  EmplacementRecord,
  EmplacementStatut,
  EmplacementType,
  PickingListRecord,
  ProductRecord,
  ProduitEmplacementRecord,
  WmsKPIs,
} from "@/lib/types";
import { TYPES_EMPLACEMENT_LABELS } from "@/lib/constants";

interface Props {
  initialEmplacements: EmplacementRecord[];
  initialProduitsEmplacements: ProduitEmplacementRecord[];
  initialKPIs: WmsKPIs;
  products: ProductRecord[];
  branches: BranchRecord[];
  currentBranchId?: number;
  recentDocuments: Array<{
    id: number;
    type: "bl" | "bs" | "bc" | "bt";
    numero: number;
    date: string;
    client_nom?: string;
    fournisseur_nom?: string;
    total_lignes: number;
  }>;
}

export function EmplacementsManager({
  initialEmplacements,
  initialProduitsEmplacements,
  initialKPIs,
  products,
  branches,
  currentBranchId,
  recentDocuments,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<string>("emplacements");

  const [emplacements, setEmplacements] = useState<EmplacementRecord[]>(initialEmplacements);
  const [produitsEmplacements, setProduitsEmplacements] = useState<ProduitEmplacementRecord[]>(
    initialProduitsEmplacements
  );
  const [kpis, setKpis] = useState<WmsKPIs>(initialKPIs);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranchId ? String(currentBranchId) : "all"
  );

  // Filters for Emplacements
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchEmp, setSearchEmp] = useState<string>("");

  // Filters for Produits-Emplacements
  const [searchProd, setSearchProd] = useState<string>("");

  // Modals
  const [newEmpOpened, setNewEmpOpened] = useState(false);
  const [assignOpened, setAssignOpened] = useState(false);
  const [activePickingList, setActivePickingList] = useState<PickingListRecord | null>(null);

  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const reloadData = () => {
    startTransition(async () => {
      const bId = selectedBranchId === "all" ? undefined : Number(selectedBranchId);
      const resKpis = await getWmsKPIsAction({ branchId: bId });
      if (resKpis.success) setKpis(resKpis.kpis);

      const resEmp = await listEmplacementsAction({
        branchId: bId,
        zone: zoneFilter || undefined,
        type: (typeFilter as EmplacementType) || undefined,
        search: searchEmp || undefined,
      });
      if (resEmp.success) setEmplacements(resEmp.emplacements);

      const resPE = await listProduitsEmplacementsAction({
        branchId: bId,
        search: searchProd || undefined,
      });
      if (resPE.success) setProduitsEmplacements(resPE.list);
    });
  };

  const filteredEmplacements = useMemo(() => {
    return emplacements.filter((e) => {
      if (zoneFilter && e.zone !== zoneFilter) return false;
      if (typeFilter && e.type_emplacement !== typeFilter) return false;
      if (searchEmp.trim()) {
        const q = searchEmp.toLowerCase();
        if (!e.code_emplacement.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [emplacements, zoneFilter, typeFilter, searchEmp]);

  const filteredProduitsEmplacements = useMemo(() => {
    return produitsEmplacements.filter((pe) => {
      if (searchProd.trim()) {
        const q = searchProd.toLowerCase();
        const matchDes = (pe.produit_designation || "").toLowerCase().includes(q);
        const matchRef = (pe.produit_ref || "").toLowerCase().includes(q);
        const matchEmp = pe.emplacement_code.toLowerCase().includes(q);
        if (!matchDes && !matchRef && !matchEmp) return false;
      }
      return true;
    });
  }, [produitsEmplacements, searchProd]);

  const zonesDisponibles = useMemo(() => {
    const set = new Set<string>();
    emplacements.forEach((e) => {
      if (e.zone) set.add(e.zone);
    });
    return Array.from(set).sort();
  }, [emplacements]);

  const handleRetirerAssignation = async (peId: number) => {
    if (!confirm("Retirer cet article de son emplacement ?")) return;
    startTransition(async () => {
      const res = await retirerProduitEmplacementAction(peId);
      if (res.success) {
        setBannerMessage({
          type: "success",
          text: "Article retiré de l'emplacement.",
        });
        reloadData();
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Erreur lors du retrait.",
        });
      }
    });
  };

  const handleOpenPicking = async (docId: number) => {
    startTransition(async () => {
      const res = await genererPickingListAction(docId);
      if (res.success && res.pickingList) {
        setActivePickingList(res.pickingList);
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Impossible de générer la picking list.",
        });
      }
    });
  };

  return (
    <Stack gap="xl">
      <PageHeading
        eyebrow="Entrepôt & Logistique WMS"
        title="Gestion des Emplacements & Picking"
        description="Cartographie détaillée de l'entrepôt par Allée / Travée / Niveau / Bac et optimisation du circuit de préparation de commandes (Picking list en serpentin)."
        actions={
          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<RefreshCw size={16} />}
              loading={isPending}
              onClick={reloadData}
            >
              Actualiser
            </Button>
            <Button
              color="indigo"
              variant="light"
              leftSection={<PackagePlus size={16} />}
              onClick={() => setAssignOpened(true)}
            >
              Assigner un Article
            </Button>
            <Button
              color="teal"
              leftSection={<Plus size={16} />}
              onClick={() => setNewEmpOpened(true)}
            >
              Nouvel Emplacement / Matrice
            </Button>
          </Group>
        }
      />

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

      {/* KPI CARDS */}
      <Grid gutter="md">
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
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Emplacements
                </Text>
                <Text size="xl" fw={800} c="indigo" mt={4}>
                  {kpis.totalEmplacements}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Bacs & Racks configurés
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="indigo">
                <Grid3X3 size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

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
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Taux d&apos;Occupation
                </Text>
                <Group gap="xs" mt={4} align="baseline">
                  <Text size="xl" fw={800} c="teal">
                    {kpis.tauxOccupation}%
                  </Text>
                  <Text size="xs" c="dimmed">
                    ({kpis.emplacementsOccupes} occupés)
                  </Text>
                </Group>
                <Progress value={kpis.tauxOccupation} color="teal" size="sm" radius="xl" mt={6} />
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                <Warehouse size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

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
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Emplacements Disponibles
                </Text>
                <Text size="xl" fw={800} c="blue" mt={4}>
                  {kpis.emplacementsVides}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Bacs prêts à accueillir du stock
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <Boxes size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

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
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Articles Cartographiés
                </Text>
                <Text size="xl" fw={800} c="orange" mt={4}>
                  {kpis.totalProduitsCartographies}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Produits localisés dans l&apos;entrepôt
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                <Package size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* TABS VIEW */}
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || "emplacements")}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="emplacements" leftSection={<Grid3X3 size={16} />}>
            Plan des Bacs & Racks ({emplacements.length})
          </Tabs.Tab>
          <Tabs.Tab value="assignations" leftSection={<Package size={16} />}>
            Articles & Emplacements ({produitsEmplacements.length})
          </Tabs.Tab>
          <Tabs.Tab value="picking" leftSection={<Route size={16} />}>
            Préparateur de Commandes & Picking List
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB 1: EMPLACEMENTS */}
        <Tabs.Panel value="emplacements">
          <Stack gap="md">
            <Paper
              p="sm"
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
              }}
            >
              <Group justify="space-between" wrap="wrap">
                <Group gap="sm" wrap="wrap">
                  <TextInput
                    placeholder="Rechercher code emplacement..."
                    leftSection={<Search size={14} />}
                    size="sm"
                    radius="xl"
                    w={240}
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.currentTarget.value)}
                  />

                  <Select
                    placeholder="Toutes les zones"
                    size="sm"
                    radius="xl"
                    w={160}
                    clearable
                    value={zoneFilter}
                    onChange={setZoneFilter}
                    data={zonesDisponibles.map((z) => ({ value: z, label: `Zone ${z}` }))}
                  />

                  <Select
                    placeholder="Tous types"
                    size="sm"
                    radius="xl"
                    w={180}
                    clearable
                    value={typeFilter}
                    onChange={setTypeFilter}
                    data={Object.entries(TYPES_EMPLACEMENT_LABELS).map(([k, v]) => ({
                      value: k,
                      label: v.label,
                    }))}
                  />
                </Group>

                {branches.length > 0 && (
                  <Select
                    size="sm"
                    radius="xl"
                    w={220}
                    value={selectedBranchId}
                    onChange={(val) => {
                      setSelectedBranchId(val || "all");
                      reloadData();
                    }}
                    data={[
                      { value: "all", label: "Tous les dépôts (Global)" },
                      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                    ]}
                  />
                )}
              </Group>
            </Paper>

            <Paper
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
                overflow: "hidden",
              }}
            >
              <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead style={{ background: "var(--muted-surface)" }}>
                  <Table.Tr>
                    <Table.Th>Code Emplacement</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Zone</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Allée</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Travée</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Niveau</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Bac</Table.Th>
                    <Table.Th>Type de Stockage</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Capacité</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Articles Assignés</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Statut</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredEmplacements.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={10} style={{ textAlign: "center", padding: "32px" }}>
                        <Text c="dimmed">Aucun emplacement trouvé.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredEmplacements.map((e) => {
                      const typeConf = TYPES_EMPLACEMENT_LABELS[e.type_emplacement] || {
                        label: e.type_emplacement,
                        color: "gray",
                      };
                      return (
                        <Table.Tr key={e.id}>
                          <Table.Td>
                            <Group gap="xs">
                              <MapPin size={14} color="var(--primary)" />
                              <Text fw={700} size="sm" c="indigo">
                                {e.code_emplacement}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Badge size="sm" variant="light" color="blue">
                              {e.zone}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Text fw={600} size="sm">{e.allee}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Text size="sm">{e.travee}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Text size="sm">{e.niveau}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Badge size="xs" variant="outline" color="gray">
                              {e.bac}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" variant="dot" color={typeConf.color}>
                              {typeConf.label}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Text size="xs" c="dimmed">
                              {e.capacite_max_kg} kg
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Text fw={700} size="sm" c={Number(e.nb_articles_assignes || 0) > 0 ? "teal" : "dimmed"}>
                              {e.nb_articles_assignes || 0}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Badge size="xs" color={e.statut === "actif" ? "teal" : "red"}>
                              {e.statut}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* TAB 2: PRODUITS ASSIGNÉS */}
        <Tabs.Panel value="assignations">
          <Stack gap="md">
            <Paper
              p="sm"
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
              }}
            >
              <Group justify="space-between">
                <TextInput
                  placeholder="Filtrer par article, référence, code bac..."
                  leftSection={<Search size={14} />}
                  size="sm"
                  radius="xl"
                  w={320}
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.currentTarget.value)}
                />
                <Button
                  size="sm"
                  color="teal"
                  leftSection={<PackagePlus size={16} />}
                  onClick={() => setAssignOpened(true)}
                >
                  Nouvelle Assignation Article
                </Button>
              </Group>
            </Paper>

            <Paper
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
                overflow: "hidden",
              }}
            >
              <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead style={{ background: "var(--muted-surface)" }}>
                  <Table.Tr>
                    <Table.Th>Article & Référence</Table.Th>
                    <Table.Th>Emplacement WMS</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Zone / Allée</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Niveau / Bac</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Quantité en Bac</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Emplacement Principal</Table.Th>
                    <Table.Th style={{ width: 60, textAlign: "center" }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredProduitsEmplacements.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} style={{ textAlign: "center", padding: "32px" }}>
                        <Text c="dimmed">Aucun article assigné à un emplacement pour le moment.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredProduitsEmplacements.map((pe) => (
                      <Table.Tr key={pe.id}>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">
                              {pe.produit_designation}
                            </Text>
                            <Group gap="xs">
                              <Badge size="xs" variant="outline" color="gray">
                                {pe.produit_ref}
                              </Badge>
                              {pe.code_barre && (
                                <Text size="xs" c="dimmed">
                                  {pe.code_barre}
                                </Text>
                              )}
                            </Group>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <MapPin size={14} color="teal" />
                            <Text fw={700} size="sm" c="teal">
                              {pe.emplacement_code}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center" }}>
                          <Text size="sm">
                            Zone <strong>{pe.zone}</strong> - Allée <strong>{pe.allee}</strong>
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center" }}>
                          <Text size="sm">
                            Niv. <strong>{pe.niveau}</strong> - Bac <strong>{pe.bac}</strong>
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center" }}>
                          <Text fw={700} size="sm" c="indigo">
                            {pe.quantite} / {pe.capacite_max}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center" }}>
                          <Badge
                            size="sm"
                            variant={pe.est_principal ? "filled" : "light"}
                            color={pe.est_principal ? "teal" : "gray"}
                          >
                            {pe.est_principal ? "Oui (Par défaut)" : "Secondaire"}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center" }}>
                          <Tooltip label="Retirer cet emplacement">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => handleRetirerAssignation(pe.id)}
                            >
                              <Trash2 size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* TAB 3: PICKING LISTS */}
        <Tabs.Panel value="picking">
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
              <Group gap="xs" align="flex-start">
                <ThemeIcon size="lg" color="indigo" variant="light" radius="md">
                  <Route size={22} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={700} size="md">
                    Générateur & Optimiseur de Picking List (S-Shape)
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Sélectionnez n&apos;importe quel Bon de Livraison (BL), Bon de Sortie (BS) ou Bon de Commande (BC) pour générer automatiquement l&apos;itinéraire de prélèvement en serpentin le plus court et imprimer la feuille de route du magasinier.
                  </Text>
                </div>
              </Group>
            </Paper>

            <Paper
              radius="xl"
              withBorder
              style={{
                background: "var(--card)",
                borderColor: "var(--border-strong)",
                overflow: "hidden",
              }}
            >
              <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead style={{ background: "var(--muted-surface)" }}>
                  <Table.Tr>
                    <Table.Th>Type & N° Document</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Destinataire / Client</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Nb Articles / Lignes</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Action Picking</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentDocuments.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                        <Text c="dimmed">Aucun document actif éligible au picking trouvé.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    recentDocuments.map((doc) => {
                      const badgeColor =
                        doc.type === "bl" ? "blue" : doc.type === "bs" ? "teal" : "orange";
                      const docNumero = `${doc.type.toUpperCase()}-${String(doc.numero).padStart(4, "0")}`;

                      return (
                        <Table.Tr key={doc.id}>
                          <Table.Td>
                            <Group gap="xs">
                              <Badge size="sm" color={badgeColor} variant="filled">
                                {doc.type.toUpperCase()}
                              </Badge>
                              <Text fw={700} size="sm">
                                {docNumero}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{doc.date}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {doc.client_nom || doc.fournisseur_nom || "Magasin Central"}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "center" }}>
                            <Badge size="sm" variant="light" color="indigo">
                              {doc.total_lignes} ligne(s)
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Group gap="xs" justify="flex-end">
                              <Button
                                size="xs"
                                variant="light"
                                color="indigo"
                                leftSection={<Route size={14} />}
                                onClick={() => handleOpenPicking(doc.id)}
                              >
                                Circuit Picking
                              </Button>
                              <Button
                                size="xs"
                                variant="default"
                                leftSection={<Printer size={14} />}
                                onClick={() =>
                                  window.open(`/print/picking/${doc.id}`, "_blank")
                                }
                              >
                                Imprimer
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modals */}
      <NouvelEmplacementModal
        opened={newEmpOpened}
        onClose={() => setNewEmpOpened(false)}
        branches={branches}
        currentBranchId={currentBranchId}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Emplacement(s) créé(s) avec succès !",
          });
          reloadData();
        }}
      />

      <AssignerEmplacementModal
        opened={assignOpened}
        onClose={() => setAssignOpened(false)}
        products={products}
        emplacements={emplacements}
        branches={branches}
        currentBranchId={currentBranchId}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Article assigné à l'emplacement avec succès !",
          });
          reloadData();
        }}
      />

      <PickingViewModal
        opened={Boolean(activePickingList)}
        onClose={() => setActivePickingList(null)}
        pickingList={activePickingList}
      />
    </Stack>
  );
}
