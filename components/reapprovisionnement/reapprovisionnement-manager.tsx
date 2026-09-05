"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Info,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { ConfigSeuilsModal } from "./config-seuils-modal";
import {
  calculerBesoinsApprovisionnementAction,
  genererBonsCommandeFournisseurAction,
  getReapproKPIsAction,
} from "@/app/actions";
import {
  BranchRecord,
  ReapproKPIs,
  ReapproSuggestionRecord,
  ReapproUrgence,
} from "@/lib/types";
import { REAPPRO_URGENCE_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

interface Props {
  initialSuggestions: ReapproSuggestionRecord[];
  initialKPIs: ReapproKPIs;
  categories: string[];
  fournisseurs: Array<{ id: number; nom: string }>;
  branches: BranchRecord[];
  currentBranchId?: number;
}

export function ReapprovisionnementManager({
  initialSuggestions,
  initialKPIs,
  categories,
  fournisseurs,
  branches,
  currentBranchId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<ReapproSuggestionRecord[]>(initialSuggestions);
  const [kpis, setKpis] = useState<ReapproKPIs>(initialKPIs);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranchId ? String(currentBranchId) : "all"
  );

  // Filters
  const [horizonJours, setHorizonJours] = useState<number>(30);
  const [urgenceFilter, setUrgenceFilter] = useState<string>("all");
  const [categorieFilter, setCategorieFilter] = useState<string | null>(null);
  const [fournisseurFilter, setFournisseurFilter] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Selection for orders
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [customQuantities, setCustomQuantities] = useState<Record<number, number>>({});

  // Editing thresholds modal
  const [editingProduct, setEditingProduct] = useState<ReapproSuggestionRecord | null>(null);

  // Order generation modal
  const [orderModalOpened, setOrderModalOpened] = useState(false);
  const [dateLivraisonSouhaitee, setDateLivraisonSouhaitee] = useState("");
  const [notesCommande, setNotesCommande] = useState("");
  const [generatedResults, setGeneratedResults] = useState<Array<{
    bcId: number;
    bcNumero: number;
    fournisseurNom: string;
    montantHT: number;
    totalArticles: number;
  }> | null>(null);

  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Refresh data based on horizon or filters
  const reloadData = (horizon = horizonJours, branch = selectedBranchId) => {
    startTransition(async () => {
      const bId = branch === "all" ? undefined : Number(branch);
      const resKpis = await getReapproKPIsAction({
        branchId: bId,
        horizonJours: horizon,
      });
      if (resKpis.success) {
        setKpis(resKpis.kpis);
      }

      const resList = await calculerBesoinsApprovisionnementAction({
        branchId: bId,
        horizonJours: horizon,
        categorie: categorieFilter || undefined,
        fournisseurId: fournisseurFilter ? Number(fournisseurFilter) : undefined,
        search: search || undefined,
      });
      if (resList.success) {
        setSuggestions(resList.suggestions);
      }
    });
  };

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (urgenceFilter !== "all" && s.urgence !== urgenceFilter) return false;
      if (categorieFilter && s.categorie !== categorieFilter) return false;
      if (fournisseurFilter && String(s.fournisseur_id) !== fournisseurFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchRef = s.reference.toLowerCase().includes(query);
        const matchDes = s.designation.toLowerCase().includes(query);
        const matchEmp = (s.emplacement_code || "").toLowerCase().includes(query);
        if (!matchRef && !matchDes && !matchEmp) return false;
      }
      return true;
    });
  }, [suggestions, urgenceFilter, categorieFilter, fournisseurFilter, search]);

  const selectAllNeedingOrder = () => {
    const ids = new Set<number>();
    for (const s of filteredSuggestions) {
      if (s.urgence === "rupture" || s.urgence === "critique" || s.urgence === "a_commander") {
        ids.add(s.produit_id);
      }
    }
    setSelectedIds(ids);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.size === filteredSuggestions.length && filteredSuggestions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSuggestions.map((s) => s.produit_id)));
    }
  };

  const handleCreateOrders = async () => {
    if (selectedIds.size === 0) return;

    const itemsToOrder = Array.from(selectedIds).map((id) => {
      const s = suggestions.find((x) => x.produit_id === id);
      const qty = customQuantities[id] !== undefined
        ? customQuantities[id]
        : (s?.quantite_suggeree || s?.stock_minimum || 1);
      return {
        produitId: id,
        quantite: qty > 0 ? qty : 1,
        prixUnitaireHT: s?.prix_achat_ht,
      };
    });

    startTransition(async () => {
      const bId = selectedBranchId === "all" ? undefined : Number(selectedBranchId);
      const res = await genererBonsCommandeFournisseurAction(itemsToOrder, {
        branchId: bId,
        dateLivraisonSouhaitee: dateLivraisonSouhaitee || undefined,
        notes: notesCommande || undefined,
      });

      if (res.success && res.bcs.length > 0) {
        setGeneratedResults(res.bcs);
        setSelectedIds(new Set());
        setBannerMessage({
          type: "success",
          text: `${res.bcs.length} Bon(s) de Commande fournisseur généré(s) avec succès !`,
        });
        reloadData();
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Impossible de générer les bons de commande.",
        });
      }
    });
  };

  return (
    <Stack gap="xl">
      <PageHeading
        eyebrow="Logistique & Achats Fournisseurs"
        title="Réapprovisionnement Intelligent"
        description="Calcul automatique des besoins de réapprovisionnement basé sur les seuils de sécurité, les délais de livraison fournisseurs et la vitesse moyenne d'écoulement (VMJ)."
        actions={
          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<RefreshCw size={16} />}
              loading={isPending}
              onClick={() => reloadData()}
            >
              Recalculer
            </Button>
            <Button
              color="teal"
              leftSection={<ShoppingCart size={16} />}
              disabled={selectedIds.size === 0}
              onClick={() => {
                setGeneratedResults(null);
                setOrderModalOpened(true);
              }}
            >
              Générer les Bons de Commande ({selectedIds.size})
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
        {/* Ruptures */}
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
                  Articles en Rupture
                </Text>
                <Text size="xl" fw={800} c={kpis.articlesEnRupture > 0 ? "red" : "teal"} mt={4}>
                  {kpis.articlesEnRupture}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Stock physique = 0
                </Text>
              </div>
              <ThemeIcon
                size="lg"
                radius="md"
                variant="light"
                color={kpis.articlesEnRupture > 0 ? "red" : "teal"}
              >
                <AlertCircle size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

        {/* À Commander */}
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
                  À Réapprovisionner
                </Text>
                <Text size="xl" fw={800} c="orange" mt={4}>
                  {kpis.articlesACommander}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Stock net ≤ Point de commande
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                <TrendingDown size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

        {/* Budget Estimé */}
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
                  Budget Estimé Achat
                </Text>
                <Text size="xl" fw={800} c="indigo" mt={4}>
                  {formatNumber(kpis.budgetReapproEstimeHT)} <Text span size="sm" fw={600}>DH HT</Text>
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Pour {kpis.fournisseursConcernes} fournisseur(s)
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="indigo">
                <Truck size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>

        {/* Surstock */}
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
                  Articles en Surstock
                </Text>
                <Text size="xl" fw={800} c="blue" mt={4}>
                  {kpis.articlesSurstock}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Stock &gt; Seuil Maximum
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <TrendingUp size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* FILTER & HORIZON BAR */}
      <Paper
        p="md"
        radius="xl"
        withBorder
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Group gap="xs" wrap="wrap">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Horizon Consommation (VMJ) :
              </Text>
              <SegmentedControl
                size="xs"
                radius="xl"
                value={String(horizonJours)}
                onChange={(val) => {
                  const h = Number(val);
                  setHorizonJours(h);
                  reloadData(h);
                }}
                data={[
                  { label: "30 Derniers Jours", value: "30" },
                  { label: "60 Jours", value: "60" },
                  { label: "90 Jours (Trimestre)", value: "90" },
                ]}
              />
            </Group>

            {branches.length > 0 && (
              <Group gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Dépôt / Point de Vente :
                </Text>
                <Select
                  size="xs"
                  radius="xl"
                  w={200}
                  value={selectedBranchId}
                  onChange={(val) => {
                    const b = val || "all";
                    setSelectedBranchId(b);
                    reloadData(horizonJours, b);
                  }}
                  data={[
                    { value: "all", label: "Tous les dépôts (Global)" },
                    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                  ]}
                />
              </Group>
            )}
          </Group>

          <Group justify="space-between" wrap="wrap">
            <Group gap="sm" wrap="wrap">
              <TextInput
                placeholder="Rechercher par réf, désignation, bac..."
                leftSection={<Search size={14} />}
                size="sm"
                radius="xl"
                w={260}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />

              <Select
                placeholder="Toutes les urgences"
                size="sm"
                radius="xl"
                w={180}
                clearable
                value={urgenceFilter === "all" ? null : urgenceFilter}
                onChange={(val) => setUrgenceFilter(val || "all")}
                data={[
                  { value: "all", label: "Toutes les urgences" },
                  { value: "rupture", label: "Rupture de stock" },
                  { value: "critique", label: "Stock critique" },
                  { value: "a_commander", label: "À commander" },
                  { value: "optimal", label: "Optimal" },
                  { value: "surstock", label: "Surstock" },
                ]}
              />

              <Select
                placeholder="Toutes catégories"
                size="sm"
                radius="xl"
                w={180}
                clearable
                value={categorieFilter}
                onChange={setCategorieFilter}
                data={categories.map((c) => ({ value: c, label: c }))}
              />

              <Select
                placeholder="Tous fournisseurs"
                size="sm"
                radius="xl"
                w={200}
                clearable
                value={fournisseurFilter}
                onChange={setFournisseurFilter}
                data={fournisseurs.map((f) => ({ value: String(f.id), label: f.nom }))}
              />
            </Group>

            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="orange"
                onClick={selectAllNeedingOrder}
              >
                Sélectionner urgences ({kpis.articlesACommander})
              </Button>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* SUGGESTIONS TABLE */}
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
              <Table.Th style={{ width: 40 }}>
                <Checkbox
                  checked={
                    selectedIds.size === filteredSuggestions.length &&
                    filteredSuggestions.length > 0
                  }
                  indeterminate={
                    selectedIds.size > 0 &&
                    selectedIds.size < filteredSuggestions.length
                  }
                  onChange={toggleSelectAllVisible}
                />
              </Table.Th>
              <Table.Th>Article & Emplacement</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Stock Actuel</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>
                <Tooltip label="Stock Sécurité (Min) / Stock Max Cible">
                  <Group gap={4} justify="center">
                    <span>Min / Max</span>
                    <Info size={12} />
                  </Group>
                </Tooltip>
              </Table.Th>
              <Table.Th style={{ textAlign: "center" }}>
                <Tooltip label="Vente Moyenne Journalière sur l'horizon sélectionné">
                  <Group gap={4} justify="center">
                    <span>VMJ</span>
                    <Info size={12} />
                  </Group>
                </Tooltip>
              </Table.Th>
              <Table.Th style={{ textAlign: "center" }}>
                <Tooltip label="Point de Commande : (VMJ * Délai) + Stock Sécurité">
                  <Group gap={4} justify="center">
                    <span>ROP</span>
                    <Info size={12} />
                  </Group>
                </Tooltip>
              </Table.Th>
              <Table.Th>Fournisseur & Délai</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Qté Suggérée</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Montant Estimé</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Statut</Table.Th>
              <Table.Th style={{ width: 60, textAlign: "center" }}>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredSuggestions.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={11} style={{ textAlign: "center", padding: "32px" }}>
                  <Text c="dimmed">Aucun article ne correspond aux critères de réapprovisionnement.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredSuggestions.map((item) => {
                const isSelected = selectedIds.has(item.produit_id);
                const customQty = customQuantities[item.produit_id] !== undefined
                  ? customQuantities[item.produit_id]
                  : item.quantite_suggeree;

                const urgenceConfig = REAPPRO_URGENCE_LABELS[item.urgence] || {
                  label: item.urgence,
                  color: "gray",
                };

                return (
                  <Table.Tr
                    key={item.produit_id}
                    style={{
                      background: isSelected ? "var(--muted-accent)" : undefined,
                    }}
                  >
                    <Table.Td>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(item.produit_id)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Stack gap={2}>
                          <Text fw={600} size="sm">
                            {item.designation}
                          </Text>
                          <Group gap="xs">
                            <Badge size="xs" variant="outline" color="gray">
                              {item.reference}
                            </Badge>
                            {item.emplacement_code ? (
                              <Badge size="xs" variant="light" color="cyan">
                                📍 {item.emplacement_code}
                              </Badge>
                            ) : null}
                          </Group>
                        </Stack>
                      </Group>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Text fw={700} size="sm" c={item.stock_actuel <= 0 ? "red" : undefined}>
                        {item.stock_actuel} {item.unite}
                      </Text>
                      {item.quantite_en_commande > 0 && (
                        <Text size="xs" c="teal">
                          +{item.quantite_en_commande} en cmd
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Text size="xs">
                        <Text span c="orange" fw={600}>{item.stock_minimum}</Text> /{" "}
                        <Text span c="dimmed">{item.stock_maximum}</Text>
                      </Text>
                      {item.conditionnement_achat > 1 && (
                        <Text size="xs" c="dimmed">
                          (colis x{item.conditionnement_achat})
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Text size="sm" fw={600}>
                        {item.vmj > 0 ? item.vmj : "0"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.jours_autonomie < 999 ? `~${item.jours_autonomie} j` : "∞"}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Badge size="sm" variant="light" color="indigo">
                        {item.rop}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {item.fournisseur_nom}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Délai : {item.delai_livraison_jours} jours
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "right" }}>
                      {isSelected ? (
                        <NumberInput
                          size="xs"
                          w={90}
                          min={0}
                          step={item.conditionnement_achat || 1}
                          value={customQty}
                          onChange={(val) =>
                            setCustomQuantities((prev) => ({
                              ...prev,
                              [item.produit_id]: Number(val) || 0,
                            }))
                          }
                          styles={{ input: { textAlign: "right", fontWeight: 700 } }}
                        />
                      ) : (
                        <Text fw={700} size="sm" c={item.quantite_suggeree > 0 ? "teal" : "dimmed"}>
                          {item.quantite_suggeree} {item.unite}
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "right" }}>
                      <Text size="sm" fw={600}>
                        {formatNumber(
                          isSelected
                            ? customQty * item.prix_achat_ht
                            : item.montant_estime_ht
                        )}{" "}
                        <Text span size="xs" c="dimmed">DH</Text>
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Badge color={urgenceConfig.color} variant="filled" size="sm">
                        {urgenceConfig.label}
                      </Badge>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Tooltip label="Modifier les seuils et fournisseur">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => setEditingProduct(item)}
                        >
                          <Settings2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Threshold Config Modal */}
      <ConfigSeuilsModal
        opened={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        fournisseurs={fournisseurs}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Seuils du produit mis à jour avec succès !",
          });
          reloadData();
        }}
      />

      {/* GENERATE PURCHASE ORDERS MODAL */}
      <Modal
        opened={orderModalOpened}
        onClose={() => setOrderModalOpened(false)}
        title={
          <Group gap="xs">
            <ShoppingCart size={18} />
            <Text fw={700}>Génération Automatique des Bons de Commande</Text>
          </Group>
        }
        size="lg"
        radius="lg"
      >
        <Stack gap="md">
          {generatedResults ? (
            <Stack gap="md">
              <Alert color="teal" icon={<CheckCircle2 size={18} />} radius="md">
                Bons de commande générés avec succès ! Ils sont enregistrés en brouillon dans le module Bons de Commande.
              </Alert>

              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>N° Bon</Table.Th>
                    <Table.Th>Fournisseur</Table.Th>
                    <Table.Th style={{ textAlign: "center" }}>Articles</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Total HT</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {generatedResults.map((bc) => (
                    <Table.Tr key={bc.bcId}>
                      <Table.Td>
                        <Text fw={700} c="indigo">
                          BC-{String(bc.bcNumero).padStart(4, "0")}
                        </Text>
                      </Table.Td>
                      <Table.Td>{bc.fournisseurNom}</Table.Td>
                      <Table.Td style={{ textAlign: "center" }}>
                        {bc.totalArticles} article(s)
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        {formatNumber(bc.montantHT)} DH
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Group justify="space-between" mt="md">
                <Button
                  variant="default"
                  onClick={() => setOrderModalOpened(false)}
                >
                  Fermer
                </Button>
                <Button
                  component={Link}
                  href="/bons-commande"
                  color="indigo"
                  rightSection={<ArrowRight size={16} />}
                >
                  Voir les Bons de Commande
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              <Text size="sm">
                Vous vous apprêtez à créer des Bons de Commande pour{" "}
                <strong>{selectedIds.size} article(s) sélectionné(s)</strong>.
                Le système va automatiquement grouper les articles par fournisseur principal.
              </Text>

              <TextInput
                label="Date de Livraison Souhaitée"
                type="date"
                value={dateLivraisonSouhaitee}
                onChange={(e) => setDateLivraisonSouhaitee(e.currentTarget.value)}
              />

              <TextInput
                label="Notes / Instructions pour la commande"
                placeholder="Ex: Livraison urgente avant vendredi, commande groupée réappro"
                value={notesCommande}
                onChange={(e) => setNotesCommande(e.currentTarget.value)}
              />

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => setOrderModalOpened(false)}>
                  Annuler
                </Button>
                <Button
                  color="teal"
                  loading={isPending}
                  leftSection={<ShoppingCart size={16} />}
                  onClick={handleCreateOrders}
                >
                  Confirmer la Création
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
