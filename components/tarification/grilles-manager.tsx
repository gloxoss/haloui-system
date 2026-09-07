"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
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
  AlertCircle,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileSpreadsheet,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { CLIENT_CATEGORIES_TARIFAIRES } from "@/lib/constants";
import {
  type CalculatedPriceResult,
  type ClientCategorieTarifaire,
  type EntityRecord,
  type GrilleTarifaireLigneRecord,
  type GrilleTarifaireRecord,
  type GrilleTarifaireType,
  type ProductRecord,
} from "@/lib/types";
import {
  calculerPrixArticleClientAction,
  creerGrilleTarifaireAction,
  getGrilleTarifaireByIdAction,
  supprimerGrilleTarifaireAction,
} from "@/app/actions";

interface GrillesManagerProps {
  initialGrilles: GrilleTarifaireRecord[];
  clients: EntityRecord[];
  produits: ProductRecord[];
}

export function GrillesManager({
  initialGrilles,
  clients,
  produits,
}: GrillesManagerProps) {
  const [grilles, setGrilles] = useState<GrilleTarifaireRecord[]>(initialGrilles);
  const [activeTab, setActiveTab] = useState<string>("categories");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newType, setNewType] = useState<GrilleTarifaireType>("categorie");
  const [newCategorie, setNewCategorie] = useState<ClientCategorieTarifaire>("grossiste");
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [newDateDebut, setNewDateDebut] = useState("");
  const [newDateFin, setNewDateFin] = useState("");
  const [newRemiseGlobale, setNewRemiseGlobale] = useState<number>(0);
  const [newNotes, setNewNotes] = useState("");

  // Product specific rows for the modal
  const [modalLignes, setModalLignes] = useState<
    Array<{ produitId: number; prixSpecifiqueHt?: number; remisePourcent?: number }>
  >([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string | null>(null);
  const [selectedProductPrice, setSelectedProductPrice] = useState<number>(0);

  // Price Simulator state
  const [simClient, setSimClient] = useState<string | null>(null);
  const [simProduit, setSimProduit] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<CalculatedPriceResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // View details modal
  const [viewGrille, setViewGrille] = useState<{
    grille: GrilleTarifaireRecord;
    lignes: GrilleTarifaireLigneRecord[];
  } | null>(null);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: String(c.id), label: `${c.name} (${c.phone || "Client"})` })),
    [clients]
  );

  const productOptions = useMemo(
    () =>
      produits.map((p) => ({
        value: String(p.id),
        label: `${p.ref} - ${p.designation} (${(p.prix_ht || 0).toFixed(2)} DH HT)`,
      })),
    [produits]
  );

  const handleAddProductLine = () => {
    if (!selectedProductToAdd) return;
    const pId = Number(selectedProductToAdd);
    if (modalLignes.some((l) => l.produitId === pId)) return;
    setModalLignes((prev) => [
      ...prev,
      { produitId: pId, prixSpecifiqueHt: selectedProductPrice || undefined },
    ]);
    setSelectedProductToAdd(null);
    setSelectedProductPrice(0);
  };

  const handleRemoveProductLine = (pId: number) => {
    setModalLignes((prev) => prev.filter((l) => l.produitId !== pId));
  };

  const handleCreateGrille = () => {
    if (!newNom.trim() || !newCode.trim()) return;

    startTransition(async () => {
      const res = await creerGrilleTarifaireAction({
        code: newCode.trim().toUpperCase(),
        nom: newNom.trim(),
        typeGrille: newType,
        categorieCible: newType === "categorie" ? newCategorie : null,
        clientId: newType === "contrat_client" && newClientId ? Number(newClientId) : null,
        dateDebut: newDateDebut || null,
        dateFin: newDateFin || null,
        remiseGlobalePourcent: newRemiseGlobale || 0,
        notes: newNotes,
        lignes: modalLignes,
      });

      if (res.success && res.grille) {
        setGrilles((prev) => [res.grille!, ...prev]);
        setModalOpen(false);
        setNewCode("");
        setNewNom("");
        setModalLignes([]);
        setNewNotes("");
      }
    });
  };

  const handleDeleteGrille = (id: number) => {
    if (!confirm("Voulez-vous supprimer cette grille tarifaire ?")) return;
    startTransition(async () => {
      const res = await supprimerGrilleTarifaireAction(id);
      if (res.success) {
        setGrilles((prev) => prev.filter((g) => g.id !== id));
        if (viewGrille?.grille.id === id) setViewGrille(null);
      }
    });
  };

  const handleViewGrille = (id: number) => {
    startTransition(async () => {
      const res = await getGrilleTarifaireByIdAction(id);
      if (res.success && res.grille) {
        setViewGrille({ grille: res.grille, lignes: res.lignes || [] });
      }
    });
  };

  const handleSimulatePrice = async () => {
    if (!simProduit) return;
    setSimLoading(true);
    try {
      const res = await calculerPrixArticleClientAction({
        produitId: Number(simProduit),
        clientId: simClient ? Number(simClient) : null,
      });
      if (res.success) {
        setSimResult(res as any);
      }
    } finally {
      setSimLoading(false);
    }
  };

  const filteredGrilles = useMemo(() => {
    return grilles.filter((g) => {
      const matchesType =
        activeTab === "categories"
          ? g.type_grille === "categorie"
          : g.type_grille === "contrat_client";
      const matchesSearch =
        !search ||
        g.nom.toLowerCase().includes(search.toLowerCase()) ||
        g.code.toLowerCase().includes(search.toLowerCase()) ||
        (g.client_nom && g.client_nom.toLowerCase().includes(search.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [grilles, activeTab, search]);

  return (
    <Stack gap="lg">
      <PageHeading
        eyebrow="TARIFICATION"
        title="Tarification Personnalisée & Grilles Tarifaires"
        description="Gérez les barèmes de prix par groupe de clients (Grossistes, Détaillants, Particuliers, VIP) et les contrats négociés avec dates de validité. Testez la résolution des prix en direct."
        actions={
          <Button
            variant="filled"
            leftSection={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          >
            Nouvelle Grille Tarifaire
          </Button>
        }
      />

      {/* Simulator Widget */}
      <Paper p="md" radius="md" withBorder className="bg-card border-primary/20">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue">
              <Calculator className="h-4 w-4" />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Simulateur de Prix en Temps Réel
            </Text>
          </Group>
          <Badge variant="outline" color="blue" size="xs">
            Moteur de Résolution Automatique
          </Badge>
        </Group>

        <Grid align="flex-end">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Sélectionner un Client (Optionnel)"
              placeholder="Tous / Client Comptoir..."
              searchable
              clearable
              data={clientOptions}
              value={simClient}
              onChange={(v) => {
                setSimClient(v);
                setSimResult(null);
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Select
              label="Sélectionner un Produit *"
              placeholder="Rechercher un article..."
              searchable
              data={productOptions}
              value={simProduit}
              onChange={(v) => {
                setSimProduit(v);
                setSimResult(null);
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Button
              fullWidth
              variant="light"
              onClick={handleSimulatePrice}
              disabled={!simProduit || simLoading}
              loading={simLoading}
            >
              Calculer le Tarif Net
            </Button>
          </Grid.Col>
        </Grid>

        {simResult && (
          <Paper p="sm" mt="sm" radius="sm" withBorder className="bg-background/80">
            <Group justify="space-between">
              <div>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Prix Catalogue de Base :
                  </Text>
                  <Text size="xs" td="line-through">
                    {simResult.prix_base_ht.toFixed(2)} DH HT
                  </Text>
                </Group>
                <Group gap="xs" mt={2}>
                  <Text size="sm" fw={700}>
                    Prix Appliqué au Client :
                  </Text>
                  <Text size="md" fw={800} className="text-primary">
                    {simResult.prix_applique_ht.toFixed(2)} DH HT
                  </Text>
                  {simResult.remise_appliquee_pourcent > 0 && (
                    <Badge color="teal" size="sm">
                      -{simResult.remise_appliquee_pourcent}% de remise
                    </Badge>
                  )}
                </Group>
              </div>

              <Badge
                size="md"
                variant="light"
                color={
                  simResult.source === "contrat_client"
                    ? "purple"
                    : simResult.source === "grille_categorie"
                    ? "blue"
                    : "gray"
                }
              >
                Règle appliquée : {simResult.source_nom || simResult.source}
              </Badge>
            </Group>
          </Paper>
        )}
      </Paper>

      {/* Tabs & Search */}
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "categories")}>
        <Group justify="space-between" mb="md">
          <Tabs.List>
            <Tabs.Tab
              value="categories"
              leftSection={<Layers className="h-4 w-4" />}
            >
              Grilles par Catégorie Client
            </Tabs.Tab>
            <Tabs.Tab
              value="contrats"
              leftSection={<Users className="h-4 w-4" />}
            >
              Contrats Spécifiques Négociés
            </Tabs.Tab>
          </Tabs.List>

          <TextInput
            placeholder="Filtrer les grilles tarifaires..."
            leftSection={<Search className="h-4 w-4 text-muted-foreground" />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 280 }}
          />
        </Group>

        {/* Categories Tab Content */}
        <Tabs.Panel value="categories">
          <Grid>
            {filteredGrilles.length === 0 ? (
              <Grid.Col span={12}>
                <Paper p="xl" radius="md" withBorder className="text-center bg-card">
                  <Text c="dimmed">Aucune grille par catégorie configurée.</Text>
                </Paper>
              </Grid.Col>
            ) : (
              filteredGrilles.map((g) => (
                <Grid.Col key={g.id} span={{ base: 12, md: 6, lg: 4 }}>
                  <Card padding="md" radius="md" withBorder className="bg-card hover:border-primary/40 transition-colors">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Badge variant="light" color="blue">
                          {g.code}
                        </Badge>
                        <Group gap={4}>
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            onClick={() => handleViewGrille(g.id)}
                          >
                            Détails & Tarifs
                          </Button>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => handleDeleteGrille(g.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Text fw={700} size="md">
                        {g.nom}
                      </Text>

                      <Group gap="xs">
                        <Badge size="sm" variant="outline" color="cyan">
                          Catégorie : {g.categorie_cible?.toUpperCase() || "TOUS"}
                        </Badge>
                        <Badge size="sm" variant="light" color="teal">
                          {g.lignes_count || 0} article(s) dérogatoire(s)
                        </Badge>
                      </Group>

                      {g.notes && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {g.notes}
                        </Text>
                      )}
                    </Stack>
                  </Card>
                </Grid.Col>
              ))
            )}
          </Grid>
        </Tabs.Panel>

        {/* Contracts Tab Content */}
        <Tabs.Panel value="contrats">
          <Grid>
            {filteredGrilles.length === 0 ? (
              <Grid.Col span={12}>
                <Paper p="xl" radius="md" withBorder className="text-center bg-card">
                  <Text c="dimmed">Aucun contrat client négocié enregistré.</Text>
                </Paper>
              </Grid.Col>
            ) : (
              filteredGrilles.map((g) => (
                <Grid.Col key={g.id} span={{ base: 12, md: 6, lg: 4 }}>
                  <Card padding="md" radius="md" withBorder className="bg-card hover:border-primary/40 transition-colors">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Badge variant="light" color="purple">
                          {g.code}
                        </Badge>
                        <Group gap={4}>
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            onClick={() => handleViewGrille(g.id)}
                          >
                            Détails & Tarifs
                          </Button>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => handleDeleteGrille(g.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Text fw={700} size="md">
                        {g.nom}
                      </Text>

                      <Group gap="xs">
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        <Text size="xs" fw={600} c="primary">
                          {g.client_nom || "Client spécifique"}
                        </Text>
                      </Group>

                      {(g.date_debut || g.date_fin) && (
                        <Group gap="xs">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <Text size="xs" c="dimmed">
                            Validité : {g.date_debut || "Début"} ➔ {g.date_fin || "Indéterminée"}
                          </Text>
                        </Group>
                      )}

                      <Group gap="xs">
                        <Badge size="sm" variant="light" color="teal">
                          {g.lignes_count || 0} prix négociés
                        </Badge>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))
            )}
          </Grid>
        </Tabs.Panel>
      </Tabs>

      {/* Modal: New Grille */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue">
              <Plus className="h-4 w-4" />
            </ThemeIcon>
            <Text fw={700}>Créer une Grille Tarifaire / Contrat</Text>
          </Group>
        }
        size="lg"
      >
        <Stack gap="md">
          <Grid>
            <Grid.Col span={4}>
              <TextInput
                label="Code grille *"
                placeholder="ex: GRI-GROSSISTE"
                value={newCode}
                onChange={(e) => setNewCode(e.currentTarget.value.toUpperCase())}
                required
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <TextInput
                label="Intitulé de la grille *"
                placeholder="ex: Tarification Grossistes & Grands Comptes"
                value={newNom}
                onChange={(e) => setNewNom(e.currentTarget.value)}
                required
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Type d'application *"
                data={[
                  { value: "categorie", label: "Grille par Catégorie de Client" },
                  { value: "contrat_client", label: "Contrat Négocié Client Unique" },
                ]}
                value={newType}
                onChange={(v) => setNewType((v as any) || "categorie")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              {newType === "categorie" ? (
                <Select
                  label="Catégorie Cible *"
                  data={CLIENT_CATEGORIES_TARIFAIRES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                  value={newCategorie}
                  onChange={(v) => setNewCategorie((v as any) || "grossiste")}
                />
              ) : (
                <Select
                  label="Client Bénéficiaire *"
                  placeholder="Sélectionner le client..."
                  searchable
                  data={clientOptions}
                  value={newClientId}
                  onChange={setNewClientId}
                />
              )}
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Date de début de validité"
                type="date"
                value={newDateDebut}
                onChange={(e) => setNewDateDebut(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Date de fin de validité"
                type="date"
                value={newDateFin}
                onChange={(e) => setNewDateFin(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>

          {/* Overrides Table */}
          <div className="pt-2 border-t">
            <Text size="sm" fw={700} mb="xs">
              Prix Dérogatoires Spécifiques par Article
            </Text>
            <Grid align="flex-end" mb="sm">
              <Grid.Col span={7}>
                <Select
                  size="xs"
                  label="Ajouter un article"
                  placeholder="Sélectionner un produit..."
                  searchable
                  data={productOptions}
                  value={selectedProductToAdd}
                  onChange={setSelectedProductToAdd}
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput
                  size="xs"
                  label="Prix Spécial (DH HT)"
                  min={0}
                  value={selectedProductPrice}
                  onChange={(v) => setSelectedProductPrice(Number(v) || 0)}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Button
                  size="xs"
                  variant="light"
                  fullWidth
                  onClick={handleAddProductLine}
                  disabled={!selectedProductToAdd}
                >
                  Ajouter
                </Button>
              </Grid.Col>
            </Grid>

            {modalLignes.length > 0 && (
              <Table striped withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Article</Table.Th>
                    <Table.Th>Prix Catalogue</Table.Th>
                    <Table.Th>Prix Spécial HT</Table.Th>
                    <Table.Th style={{ width: 40 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modalLignes.map((line) => {
                    const prod = produits.find((p) => p.id === line.produitId);
                    return (
                      <Table.Tr key={line.produitId}>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {prod?.designation || `#${line.produitId}`}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {prod?.ref}
                          </Text>
                        </Table.Td>
                        <Table.Td>{(prod?.prix_ht || 0).toFixed(2)} DH</Table.Td>
                        <Table.Td className="font-bold text-primary">
                          {(line.prixSpecifiqueHt || 0).toFixed(2)} DH
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            size="xs"
                            color="red"
                            variant="subtle"
                            onClick={() => handleRemoveProductLine(line.produitId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </div>

          <TextInput
            label="Notes & Justification"
            placeholder="ex: Contrat négocié selon engagement de volume de 5000L/mois"
            value={newNotes}
            onChange={(e) => setNewNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateGrille}
              disabled={!newCode.trim() || !newNom.trim() || isPending}
              loading={isPending}
            >
              Enregistrer la grille
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: View Grille Details */}
      {viewGrille && (
        <Modal
          opened={Boolean(viewGrille)}
          onClose={() => setViewGrille(null)}
          title={
            <Group gap="xs">
              <Badge variant="light" color="blue">
                {viewGrille.grille.code}
              </Badge>
              <Text fw={700}>{viewGrille.grille.nom}</Text>
            </Group>
          }
          size="lg"
        >
          <Stack gap="md">
            <Paper p="sm" radius="md" withBorder className="bg-muted/30">
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">
                    Application
                  </Text>
                  <Text size="sm" fw={600}>
                    {viewGrille.grille.type_grille === "categorie"
                      ? `Catégorie : ${viewGrille.grille.categorie_cible?.toUpperCase()}`
                      : `Client : ${viewGrille.grille.client_nom || "Négocié"}`}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">
                    Période de validité
                  </Text>
                  <Text size="sm">
                    {viewGrille.grille.date_debut || "Permanente"} ➔{" "}
                    {viewGrille.grille.date_fin || "Indéterminée"}
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Text size="sm" fw={700}>
              Articles & Barème ({viewGrille.lignes.length})
            </Text>

            {viewGrille.lignes.length === 0 ? (
              <Text size="xs" c="dimmed">
                Aucun tarif spécifique d'article enregistré dans cette grille.
              </Text>
            ) : (
              <Table striped withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Article</Table.Th>
                    <Table.Th>Prix Catalogue</Table.Th>
                    <Table.Th>Prix Dérogatoire</Table.Th>
                    <Table.Th>Économie</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {viewGrille.lignes.map((l) => {
                    const diff = (l.prix_base_ht || 0) - (l.prix_final_ht || 0);
                    return (
                      <Table.Tr key={l.id || l.produit_id}>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {l.produit_designation}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {l.produit_ref}
                          </Text>
                        </Table.Td>
                        <Table.Td>{(l.prix_base_ht || 0).toFixed(2)} DH</Table.Td>
                        <Table.Td className="font-bold text-primary">
                          {(l.prix_final_ht || 0).toFixed(2)} DH HT
                        </Table.Td>
                        <Table.Td>
                          {diff > 0 ? (
                            <Badge size="xs" color="teal">
                              -{diff.toFixed(2)} DH
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">
                              -
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setViewGrille(null)}>
                Fermer
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
