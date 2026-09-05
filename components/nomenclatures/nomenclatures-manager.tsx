"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
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
  Title,
  Tooltip,
} from "@mantine/core";
import {
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  Factory,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { supprimerNomenclatureAction } from "@/app/actions";
import {
  MODE_DESTOCKAGE_LABELS,
  ORDRE_FABRICATION_STATUT_LABELS,
} from "@/lib/constants";
import {
  type NomenclatureRecord,
  type NomenclaturesKPIs,
  type OrdreFabricationRecord,
} from "@/lib/types";
import { FicheTechniqueModal } from "./fiche-technique-modal";
import { NouvelOrdreFabricationModal } from "./nouvel-ordre-fabrication-modal";

interface NomenclaturesManagerProps {
  initialKits: NomenclatureRecord[];
  initialOrdres: OrdreFabricationRecord[];
  initialKpis: NomenclaturesKPIs;
  branches: Array<{ id: number; name: string }>;
  allProducts: Array<{
    id: number;
    ref: string;
    designation: string;
    prix_ht: number;
    unite: string;
    nature_produit?: string;
  }>;
  currentBranchId?: number;
}

export function NomenclaturesManager({
  initialKits,
  initialOrdres,
  initialKpis,
  branches,
  allProducts,
  currentBranchId,
}: NomenclaturesManagerProps) {
  const [kits, setKits] = useState<NomenclatureRecord[]>(initialKits);
  const [ordres, setOrdres] = useState<OrdreFabricationRecord[]>(initialOrdres);
  const [kpis, setKpis] = useState<NomenclaturesKPIs>(initialKpis);
  const [activeTab, setActiveTab] = useState<string | null>("fiches");
  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranchId ? String(currentBranchId) : (branches[0] ? String(branches[0].id) : "1")
  );

  // Modals state
  const [ficheModalOpen, setFicheModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<NomenclatureRecord | null>(null);
  const [ofModalOpen, setOfModalOpen] = useState(false);
  const [selectedKitForOf, setSelectedKitForOf] = useState<NomenclatureRecord | null>(null);

  // Expanded rows for components preview
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (prodId: number) => {
    setExpandedRows((prev) => ({ ...prev, [prodId]: !prev[prodId] }));
  };

  const handleRefresh = async () => {
    // Recharger la page pour rafraîchir les serveurs actions
    window.location.reload();
  };

  const handleOpenNewFiche = () => {
    setEditingKit(null);
    setFicheModalOpen(true);
  };

  const handleEditFiche = (kit: NomenclatureRecord) => {
    setEditingKit(kit);
    setFicheModalOpen(true);
  };

  const handleLaunchOf = (kit?: NomenclatureRecord) => {
    setSelectedKitForOf(kit || null);
    setOfModalOpen(true);
  };

  const handleDeleteNomenclature = async (kit: NomenclatureRecord) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir dissoudre la nomenclature de "${kit.produit_designation}" ? Le produit repassera en article simple.`
      )
    ) {
      return;
    }
    await supprimerNomenclatureAction(kit.produit_id);
    setKits((prev) => prev.filter((k) => k.produit_id !== kit.produit_id));
  };

  const filteredKits = kits.filter((k) => {
    const s = search.toLowerCase();
    return (
      k.produit_ref.toLowerCase().includes(s) ||
      k.produit_designation.toLowerCase().includes(s) ||
      k.composants.some(
        (c) =>
          c.composant_ref.toLowerCase().includes(s) ||
          c.composant_designation.toLowerCase().includes(s)
      )
    );
  });

  return (
    <Stack gap="lg">
      {/* En-tête Principal */}
      <Paper p="lg" radius="xl" withBorder className="bg-white">
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="indigo" tt="uppercase" style={{ letterSpacing: 1 }}>
              PRODUCTION & COMPOSITION DE STOCKS (BOM)
            </Text>
            <Title order={2} fw={800} c="dark.8">
              Nomenclatures & Assemblage de Kits
            </Title>
            <Text size="sm" c="dimmed" mt={2}>
              Fiches techniques de produits composés, calcul automatique du coût de revient et déstockage des composants.
            </Text>
          </div>

          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<RefreshCw size={16} />}
              onClick={handleRefresh}
              radius="md"
            >
              Actualiser
            </Button>
            <Button
              variant="light"
              color="teal"
              leftSection={<Wrench size={16} />}
              onClick={() => handleLaunchOf()}
              radius="md"
            >
              Lancer Fabrication
            </Button>
            <Button
              color="indigo"
              leftSection={<Plus size={16} />}
              onClick={handleOpenNewFiche}
              radius="md"
            >
              + Nouvelle Fiche Technique
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* 4 Cartes KPIs */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Paper p="md" radius="xl" withBorder className="bg-white">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Packs & Kits Composés
              </Text>
              <Text size="xl" fw={800} c="indigo.8" mt={4}>
                {kpis.totalKits}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Fiches techniques actives
              </Text>
            </div>
            <ThemeIcon color="indigo" variant="light" size="xl" radius="xl">
              <Layers size={22} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper p="md" radius="xl" withBorder className="bg-white">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Composants Clés
              </Text>
              <Text size="xl" fw={800} c="teal.8" mt={4}>
                {kpis.totalComposants}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Matières et pièces intégrées
              </Text>
            </div>
            <ThemeIcon color="teal" variant="light" size="xl" radius="xl">
              <Boxes size={22} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper p="md" radius="xl" withBorder className="bg-white">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Fabrications en Atelier
              </Text>
              <Text size="xl" fw={800} c="blue.8" mt={4}>
                {kpis.totalOrdresFabrication}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Ordres d'assemblage exécutés
              </Text>
            </div>
            <ThemeIcon color="blue" variant="light" size="xl" radius="xl">
              <Factory size={22} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper p="md" radius="xl" withBorder className="bg-white">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Valeur Stock Kits
              </Text>
              <Text size="xl" fw={800} c="dark.8" mt={4}>
                {kpis.valeurStockKitsHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <Text component="span" size="xs" c="dimmed">DH HT</Text>
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Valorisation des packs en rayon
              </Text>
            </div>
            <ThemeIcon color="orange" variant="light" size="xl" radius="xl">
              <TrendingUp size={22} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Onglets de Navigation */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
        <Tabs.List className="bg-white p-1 rounded-xl border border-gray-200">
          <Tabs.Tab value="fiches" leftSection={<Layers size={16} />}>
            Fiches Techniques & Nomenclatures ({kits.length})
          </Tabs.Tab>
          <Tabs.Tab value="ordres" leftSection={<Factory size={16} />}>
            Ordres de Fabrication & Atelier ({ordres.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* ONGLET 1: FICHES TECHNIQUES */}
        <Tabs.Panel value="fiches" pt="md">
          <Stack gap="md">
            {/* Barre de Recherche et Filtres */}
            <Paper p="sm" radius="lg" withBorder className="bg-white">
              <Group justify="space-between">
                <TextInput
                  placeholder="Rechercher un kit ou un composant (référence, désignation)..."
                  leftSection={<Search size={16} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 380 }}
                  size="xs"
                />

                <Select
                  placeholder="Dépôt d'analyse"
                  data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                  value={selectedBranchId}
                  onChange={(val) => setSelectedBranchId(val || "1")}
                  size="xs"
                  style={{ width: 220 }}
                />
              </Group>
            </Paper>

            {filteredKits.length === 0 ? (
              <Paper p="xl" radius="xl" withBorder ta="center" className="bg-white">
                <ThemeIcon color="indigo" variant="light" size={48} radius="xl" mb="sm">
                  <Layers size={24} />
                </ThemeIcon>
                <Text fw={700} size="md">Aucun pack ou kit configuré</Text>
                <Text size="sm" c="dimmed" mt={4} mb="md">
                  Créez votre première fiche technique pour lier des composants élémentaires à un pack de vente.
                </Text>
                <Button color="indigo" leftSection={<Plus size={16} />} onClick={handleOpenNewFiche}>
                  Créer une Fiche Technique
                </Button>
              </Paper>
            ) : (
              <Paper radius="xl" withBorder className="bg-white overflow-hidden">
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead bg="gray.1">
                    <Table.Tr>
                      <Table.Th style={{ width: 40 }}></Table.Th>
                      <Table.Th>Pack / Kit Composé</Table.Th>
                      <Table.Th>Mode Déstockage</Table.Th>
                      <Table.Th>Coût Revient</Table.Th>
                      <Table.Th>Prix Vente HT</Table.Th>
                      <Table.Th>Marge Brute</Table.Th>
                      <Table.Th>Stock Rayon</Table.Th>
                      <Table.Th>Stock Virtuel Max</Table.Th>
                      <Table.Th ta="right">Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredKits.map((kit) => {
                      const isExpanded = Boolean(expandedRows[kit.produit_id]);
                      return (
                        <Table.Tr key={kit.produit_id} style={{ verticalAlign: "middle" }}>
                          <Table.Td>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => toggleRow(kit.produit_id)}
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </ActionIcon>
                          </Table.Td>

                          <Table.Td>
                            <Group gap="xs" align="flex-start">
                              <div>
                                <Text fw={700} size="sm">{kit.produit_designation}</Text>
                                <Group gap={6} mt={2}>
                                  <Badge color="indigo" variant="light" size="xs">
                                    {kit.produit_ref}
                                  </Badge>
                                  <Badge color="gray" variant="outline" size="xs">
                                    {kit.nb_composants} composant(s)
                                  </Badge>
                                </Group>
                              </div>
                            </Group>

                            {/* Section Dépliable : Détail des Composants */}
                            <Collapse in={isExpanded}>
                              <Paper p="xs" radius="md" withBorder mt="xs" bg="gray.0">
                                <Text size="11px" fw={700} c="dimmed" tt="uppercase" mb={4}>
                                  Formule de composition (BOM) :
                                </Text>
                                <Table verticalSpacing={4} fz="xs">
                                  <Table.Thead>
                                    <Table.Tr>
                                      <Table.Th>Composant</Table.Th>
                                      <Table.Th>Quantité / U</Table.Th>
                                      <Table.Th>Perte</Table.Th>
                                      <Table.Th>Prix Achat</Table.Th>
                                      <Table.Th>Coût Ligne</Table.Th>
                                      <Table.Th>Stock Actuel</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {kit.composants.map((c) => (
                                      <Table.Tr key={c.id}>
                                        <Table.Td>
                                          <Text size="xs" fw={500}>{c.composant_designation}</Text>
                                          <Text size="10px" c="dimmed">{c.composant_ref}</Text>
                                        </Table.Td>
                                        <Table.Td>{c.quantite} {c.unite}</Table.Td>
                                        <Table.Td>{c.taux_perte_pourcent}%</Table.Td>
                                        <Table.Td>{c.composant_prix_achat_ht.toFixed(2)} DH</Table.Td>
                                        <Table.Td fw={600}>{c.cout_ligne_ht.toFixed(2)} DH</Table.Td>
                                        <Table.Td c={c.composant_stock_actuel > 0 ? "teal.8" : "red.7"} fw={600}>
                                          {c.composant_stock_actuel} {c.unite}
                                        </Table.Td>
                                      </Table.Tr>
                                    ))}
                                  </Table.Tbody>
                                </Table>
                              </Paper>
                            </Collapse>
                          </Table.Td>

                          <Table.Td>
                            <Badge
                              color={kit.mode_destockage_kit === "composants" ? "blue" : "violet"}
                              variant="light"
                              size="sm"
                            >
                              {kit.mode_destockage_kit === "composants" ? "À la commande" : "Pré-assemblé"}
                            </Badge>
                          </Table.Td>

                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {kit.cout_revient_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                            </Text>
                          </Table.Td>

                          <Table.Td>
                            <Text size="sm" fw={700} c="dark.8">
                              {kit.prix_vente_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                            </Text>
                          </Table.Td>

                          <Table.Td>
                            <Group gap={4}>
                              <Text size="sm" fw={700} c={kit.marge_brute_ht >= 0 ? "teal.7" : "red.7"}>
                                {kit.marge_brute_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                              </Text>
                              <Badge color={kit.marge_brute_ht >= 0 ? "teal" : "red"} size="xs" variant="light">
                                {kit.marge_pourcent}%
                              </Badge>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            <Badge color="gray" variant="filled" size="sm">
                              {kit.stock_physique_kit} u
                            </Badge>
                          </Table.Td>

                          <Table.Td>
                            <Tooltip label="Nombre maximal de packs assemblables immédiatement avec le stock actuel des composants">
                              <Badge
                                color={kit.stock_virtuel_fabricable > 0 ? "teal" : "red"}
                                variant="light"
                                size="sm"
                              >
                                {kit.stock_virtuel_fabricable} u fabricable(s)
                              </Badge>
                            </Tooltip>
                          </Table.Td>

                          <Table.Td ta="right">
                            <Group gap={6} justify="flex-end">
                              <Tooltip label="Lancer un ordre de fabrication pour ce pack">
                                <ActionIcon
                                  color="teal"
                                  variant="light"
                                  size="sm"
                                  onClick={() => handleLaunchOf(kit)}
                                >
                                  <Wrench size={14} />
                                </ActionIcon>
                              </Tooltip>

                              <Tooltip label="Modifier la fiche technique et les composants">
                                <ActionIcon
                                  color="indigo"
                                  variant="light"
                                  size="sm"
                                  onClick={() => handleEditFiche(kit)}
                                >
                                  <Settings size={14} />
                                </ActionIcon>
                              </Tooltip>

                              <Tooltip label="Dissoudre la nomenclature">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => handleDeleteNomenclature(kit)}
                                >
                                  <Trash2 size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        {/* ONGLET 2: ORDRES DE FABRICATION */}
        <Tabs.Panel value="ordres" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Historique des fabrications (assemblages et désassemblages) réalisés en atelier.
              </Text>
              <Button
                color="teal"
                size="xs"
                leftSection={<Wrench size={14} />}
                onClick={() => handleLaunchOf()}
              >
                + Nouvel Assemblage
              </Button>
            </Group>

            {ordres.length === 0 ? (
              <Paper p="xl" radius="xl" withBorder ta="center" className="bg-white">
                <ThemeIcon color="teal" variant="light" size={48} radius="xl" mb="sm">
                  <Factory size={24} />
                </ThemeIcon>
                <Text fw={700} size="md">Aucun ordre de fabrication enregistré</Text>
                <Text size="sm" c="dimmed" mt={4} mb="md">
                  Les ordres d'assemblage permettent de convertir des composants en produits finis d'avance.
                </Text>
                <Button color="teal" leftSection={<Wrench size={16} />} onClick={() => handleLaunchOf()}>
                  Lancer une Fabrication
                </Button>
              </Paper>
            ) : (
              <Paper radius="xl" withBorder className="bg-white overflow-hidden">
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead bg="gray.1">
                    <Table.Tr>
                      <Table.Th>N° Ordre</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Opération</Table.Th>
                      <Table.Th>Pack / Produit</Table.Th>
                      <Table.Th>Dépôt</Table.Th>
                      <Table.Th>Quantité</Table.Th>
                      <Table.Th>Coût Total HT</Table.Th>
                      <Table.Th>Opérateur</Table.Th>
                      <Table.Th>Statut</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {ordres.map((of) => (
                      <Table.Tr key={of.id}>
                        <Table.Td>
                          <Text fw={700} size="sm" c="indigo.8">{of.numero}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{of.date_ordre}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={of.type_operation === "assemblage" ? "teal" : "orange"}
                            variant="light"
                            size="sm"
                          >
                            {of.type_operation === "assemblage" ? "Assemblage" : "Désassemblage"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={600}>{of.produit_designation}</Text>
                          <Text size="10px" c="dimmed">{of.produit_ref}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{of.branch_nom || "Dépôt Principal"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700}>{of.quantite_realisee} u</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {of.cout_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{of.responsable_nom || "Système"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="teal" variant="filled" size="sm">
                            {ORDRE_FABRICATION_STATUT_LABELS[of.statut]?.label || of.statut}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modals */}
      <FicheTechniqueModal
        opened={ficheModalOpen}
        onClose={() => setFicheModalOpen(false)}
        onSuccess={handleRefresh}
        kitProduit={editingKit}
        allProducts={allProducts}
      />

      <NouvelOrdreFabricationModal
        opened={ofModalOpen}
        onClose={() => setOfModalOpen(false)}
        onSuccess={handleRefresh}
        kits={kits}
        branches={branches}
        currentBranchId={Number(selectedBranchId)}
      />
    </Stack>
  );
}
