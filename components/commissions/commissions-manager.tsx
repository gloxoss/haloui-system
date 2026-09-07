"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ActionIcon,
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
  Award,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { CATEGORIES_PRODUIT } from "@/lib/constants";
import {
  type CommissionBaseCalcul,
  type CommissionFicheLigneRecord,
  type CommissionFicheRecord,
  type CommissionFicheStatut,
  type CommissionRegleRecord,
  type UserRecord,
} from "@/lib/types";
import {
  assignerCommercialAUserAction,
  changerStatutFicheCommissionAction,
  creerCommissionRegleAction,
  genererFicheCommissionMensuelleAction,
  getCommissionFicheByIdAction,
  getCommissionFichesAction,
  supprimerCommissionRegleAction,
} from "@/app/actions";

interface CommissionsManagerProps {
  initialRegles: CommissionRegleRecord[];
  initialFiches: CommissionFicheRecord[];
  commerciaux: UserRecord[];
}

export function CommissionsManager({
  initialRegles,
  initialFiches,
  commerciaux,
}: CommissionsManagerProps) {
  const [activeTab, setActiveTab] = useState<string>("fiches");
  const [regles, setRegles] = useState<CommissionRegleRecord[]>(initialRegles);
  const [fiches, setFiches] = useState<CommissionFicheRecord[]>(initialFiches);
  const [isPending, startTransition] = useTransition();

  // Generator Modal state
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genCommercialId, setGenCommercialId] = useState<string | null>(
    commerciaux[0] ? String(commerciaux[0].id) : null
  );
  const [genMois, setGenMois] = useState<string>(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [genNotes, setGenNotes] = useState("");

  // Rule Creation Modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [newRuleNom, setNewRuleNom] = useState("");
  const [newRuleUserId, setNewRuleUserId] = useState<string | null>(null);
  const [newRuleBase, setNewRuleBase] = useState<CommissionBaseCalcul>("ca_ht");
  const [newRuleTaux, setNewRuleTaux] = useState<number>(3.0);
  const [newRuleFamille, setNewRuleFamille] = useState<string | null>(null);

  // View Fiche details modal
  const [viewFiche, setViewFiche] = useState<{
    fiche: CommissionFicheRecord;
    lignes: CommissionFicheLigneRecord[];
  } | null>(null);

  const commercialOptions = useMemo(
    () =>
      commerciaux.map((c) => ({
        value: String(c.id),
        label: `${c.full_name || c.username} ${c.code_commercial ? `[${c.code_commercial}]` : ""}`,
      })),
    [commerciaux]
  );

  const refreshFiches = () => {
    startTransition(async () => {
      const res = await getCommissionFichesAction();
      if (res.success) setFiches(res.fiches);
    });
  };

  const handleGenererFiche = () => {
    if (!genCommercialId || !genMois) return;
    startTransition(async () => {
      const res = await genererFicheCommissionMensuelleAction({
        commercialId: Number(genCommercialId),
        periodeMois: genMois,
        notes: genNotes,
      });

      if (res.success && res.fiche) {
        setGenModalOpen(false);
        refreshFiches();
      }
    });
  };

  const handleCreateRule = () => {
    if (!newRuleNom.trim()) return;
    startTransition(async () => {
      const res = await creerCommissionRegleAction({
        nom: newRuleNom.trim(),
        userId: newRuleUserId ? Number(newRuleUserId) : null,
        baseCalcul: newRuleBase,
        tauxPourcent: Number(newRuleTaux) || 0,
        categorieProduit: newRuleFamille || null,
      });

      if (res.success && res.regle) {
        setRegles((prev) => [res.regle!, ...prev]);
        setRuleModalOpen(false);
        setNewRuleNom("");
      }
    });
  };

  const handleDeleteRule = (id: number) => {
    if (!confirm("Voulez-vous supprimer cette règle de commission ?")) return;
    startTransition(async () => {
      const res = await supprimerCommissionRegleAction(id);
      if (res.success) {
        setRegles((prev) => prev.filter((r) => r.id !== id));
      }
    });
  };

  const handleChangerStatut = (ficheId: number, statut: CommissionFicheStatut) => {
    startTransition(async () => {
      const res = await changerStatutFicheCommissionAction(ficheId, statut, {
        datePaiement: statut === "payee" ? new Date().toISOString().slice(0, 10) : undefined,
      });
      if (res.success && res.fiche) {
        setFiches((prev) => prev.map((f) => (f.id === ficheId ? res.fiche! : f)));
        if (viewFiche?.fiche.id === ficheId) {
          setViewFiche((prev) => (prev ? { ...prev, fiche: res.fiche! } : null));
        }
      }
    });
  };

  const handleOpenFicheDetails = (ficheId: number) => {
    startTransition(async () => {
      const res = await getCommissionFicheByIdAction(ficheId);
      if (res.success && res.fiche) {
        setViewFiche({ fiche: res.fiche, lignes: res.lignes || [] });
      }
    });
  };

  // KPIs
  const totalCommissionPayee = useMemo(
    () =>
      fiches
        .filter((f) => f.statut === "payee")
        .reduce((sum, f) => sum + (f.total_commission_nette || 0), 0),
    [fiches]
  );

  const totalCommissionEnAttente = useMemo(
    () =>
      fiches
        .filter((f) => f.statut !== "payee")
        .reduce((sum, f) => sum + (f.total_commission_nette || 0), 0),
    [fiches]
  );

  return (
    <Stack gap="lg">
      <PageHeading
        eyebrow="COMMERCIAL"
        title="Commissionnement des Commerciaux & Vendeurs"
        description="Définissez les taux de commission sur le chiffre d'affaires HT ou la marge brute réalisée. Générez et validez les fiches de commissions mensuelles consolidant factures et tickets de caisse."
        actions={
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />}
              onClick={refreshFiches}
            >
              Actualiser
            </Button>
            <Button
              variant="filled"
              leftSection={<Plus className="h-4 w-4" />}
              onClick={() => setGenModalOpen(true)}
            >
              Générer Fiche Mensuelle
            </Button>
          </Group>
        }
      />

      {/* KPI Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Commerciaux Actifs
              </Text>
              <ThemeIcon variant="light" color="blue" size="sm" radius="md">
                <Users className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl">
              {commerciaux.length}
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Règles de Calcul
              </Text>
              <ThemeIcon variant="light" color="cyan" size="sm" radius="md">
                <Percent className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl">
              {regles.length}
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Commissions En Attente
              </Text>
              <ThemeIcon variant="light" color="amber" size="sm" radius="md">
                <Clock className="h-4 w-4 text-amber-500" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" className="text-amber-500">
              {totalCommissionEnAttente.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
              <Text span size="xs">DH</Text>
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper p="md" radius="md" withBorder className="bg-card border-primary/30">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="primary" fw={700} tt="uppercase">
                Commissions Payées
              </Text>
              <ThemeIcon variant="filled" color="emerald" size="sm" radius="md">
                <Banknote className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={800} size="xl" className="text-emerald-500">
              {totalCommissionPayee.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
              <Text span size="xs">DH</Text>
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "fiches")}>
        <Tabs.List mb="md">
          <Tabs.Tab value="fiches" leftSection={<FileText className="h-4 w-4" />}>
            Fiches de Paie & Commissions Mensuelles ({fiches.length})
          </Tabs.Tab>
          <Tabs.Tab value="regles" leftSection={<Percent className="h-4 w-4" />}>
            Règles & Taux de Commissionnement ({regles.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Fiches */}
        <Tabs.Panel value="fiches">
          <Paper radius="md" withBorder className="overflow-hidden bg-card">
            {fiches.length === 0 ? (
              <div className="p-8 text-center">
                <Text c="dimmed">
                  Aucune fiche de commission générée. Cliquez sur "Générer Fiche Mensuelle" pour calculer le relevé d'un commercial.
                </Text>
              </div>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>N° Fiche</Table.Th>
                    <Table.Th>Commercial</Table.Th>
                    <Table.Th>Période</Table.Th>
                    <Table.Th>CA Réalisé HT</Table.Th>
                    <Table.Th>Marge Réalisée</Table.Th>
                    <Table.Th>Commission Nette</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {fiches.map((f) => {
                    const statusColor =
                      f.statut === "payee"
                        ? "emerald"
                        : f.statut === "validee"
                        ? "blue"
                        : "gray";

                    return (
                      <Table.Tr key={f.id}>
                        <Table.Td>
                          <Text fw={700} size="sm">
                            {f.numero_fiche}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {f.date_generation.slice(0, 10)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {f.commercial_nom}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="outline" size="sm">
                            {f.periode_mois}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {(f.total_ca_realise_ht || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                        </Table.Td>
                        <Table.Td>
                          {(f.total_marge_realisee_ht || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                        </Table.Td>
                        <Table.Td className="font-bold text-primary">
                          {(f.total_commission_nette || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={statusColor} size="sm">
                            {f.statut.toUpperCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <Button
                              size="compact-xs"
                              variant="light"
                              onClick={() => handleOpenFicheDetails(f.id)}
                            >
                              Détail
                            </Button>
                            {f.statut === "brouillon" && (
                              <Button
                                size="compact-xs"
                                color="blue"
                                variant="outline"
                                onClick={() => handleChangerStatut(f.id, "validee")}
                              >
                                Valider
                              </Button>
                            )}
                            {f.statut === "validee" && (
                              <Button
                                size="compact-xs"
                                color="teal"
                                variant="filled"
                                onClick={() => handleChangerStatut(f.id, "payee")}
                              >
                                Payer
                              </Button>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        {/* Tab 2: Rules */}
        <Tabs.Panel value="regles">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Configurez les barèmes de calcul par défaut ou par commercial dédié.
              </Text>
              <Button
                size="sm"
                variant="light"
                leftSection={<Plus className="h-4 w-4" />}
                onClick={() => setRuleModalOpen(true)}
              >
                Nouvelle Règle
              </Button>
            </Group>

            <Paper radius="md" withBorder className="overflow-hidden bg-card">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Intitulé</Table.Th>
                    <Table.Th>Commercial Cible</Table.Th>
                    <Table.Th>Base de Calcul</Table.Th>
                    <Table.Th>Taux (%)</Table.Th>
                    <Table.Th>Famille Produit</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th style={{ width: 60 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {regles.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td fw={600}>{r.nom}</Table.Td>
                      <Table.Td>
                        {r.user_nom ? (
                          <Badge variant="outline" color="blue" size="sm">
                            {r.user_nom}
                          </Badge>
                        ) : (
                          <Badge variant="light" color="gray" size="sm">
                            Général (Tous)
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={r.base_calcul === "marge_brute" ? "purple" : "cyan"}
                          size="sm"
                        >
                          {r.base_calcul === "marge_brute" ? "Marge Brute" : "CA Réalisé HT"}
                        </Badge>
                      </Table.Td>
                      <Table.Td className="font-bold text-primary">
                        {r.taux_pourcent}%
                      </Table.Td>
                      <Table.Td>{r.categorie_produit || "Toutes familles"}</Table.Td>
                      <Table.Td>
                        <Badge variant="dot" color={r.actif ? "teal" : "gray"}>
                          {r.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          onClick={() => handleDeleteRule(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal: Generate Fiche */}
      <Modal
        opened={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        title={
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue">
              <Plus className="h-4 w-4" />
            </ThemeIcon>
            <Text fw={700}>Générer une Fiche de Commission Mensuelle</Text>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Commercial *"
            placeholder="Sélectionner le commercial..."
            data={commercialOptions}
            value={genCommercialId}
            onChange={setGenCommercialId}
            required
          />

          <TextInput
            label="Mois concerné (YYYY-MM) *"
            placeholder="ex: 2026-09"
            value={genMois}
            onChange={(e) => setGenMois(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Notes ou remarques"
            placeholder="ex: Calcul mensuel avec prime objectif"
            value={genNotes}
            onChange={(e) => setGenNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setGenModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleGenererFiche}
              disabled={!genCommercialId || !genMois || isPending}
              loading={isPending}
            >
              Calculer et Générer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: New Rule */}
      <Modal
        opened={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue">
              <Percent className="h-4 w-4" />
            </ThemeIcon>
            <Text fw={700}>Nouvelle Règle de Commission</Text>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Intitulé de la règle *"
            placeholder="ex: Commission 5% Marge Carburants"
            value={newRuleNom}
            onChange={(e) => setNewRuleNom(e.currentTarget.value)}
            required
          />

          <Select
            label="Commercial bénéficiaire"
            placeholder="Tous les commerciaux (Règle générale)"
            clearable
            data={commercialOptions}
            value={newRuleUserId}
            onChange={setNewRuleUserId}
          />

          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Base de calcul *"
                data={[
                  { value: "ca_ht", label: "Chiffre d'affaires HT" },
                  { value: "marge_brute", label: "Marge brute réalisée" },
                ]}
                value={newRuleBase}
                onChange={(v) => setNewRuleBase((v as any) || "ca_ht")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Taux de commission (%) *"
                min={0}
                max={100}
                step={0.5}
                value={newRuleTaux}
                onChange={(v) => setNewRuleTaux(Number(v) || 0)}
              />
            </Grid.Col>
          </Grid>

          <Select
            label="Famille de produits ciblée (Optionnel)"
            placeholder="Toutes les familles"
            clearable
            data={CATEGORIES_PRODUIT.map((c) => ({ value: c, label: c }))}
            value={newRuleFamille}
            onChange={setNewRuleFamille}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setRuleModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={!newRuleNom.trim() || isPending}
              loading={isPending}
            >
              Créer la règle
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: View Fiche Details */}
      {viewFiche && (
        <Modal
          opened={Boolean(viewFiche)}
          onClose={() => setViewFiche(null)}
          title={
            <Group gap="xs">
              <Badge variant="light" color="blue">
                {viewFiche.fiche.numero_fiche}
              </Badge>
              <Text fw={700}>
                Relevé de {viewFiche.fiche.commercial_nom} ({viewFiche.fiche.periode_mois})
              </Text>
            </Group>
          }
          size="xl"
        >
          <Stack gap="md">
            {/* Overview */}
            <Paper p="sm" radius="md" withBorder className="bg-muted/30">
              <Grid>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">
                    CA Réalisé HT
                  </Text>
                  <Text fw={700} size="md">
                    {(viewFiche.fiche.total_ca_realise_ht || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">
                    Marge Réalisée
                  </Text>
                  <Text fw={700} size="md">
                    {(viewFiche.fiche.total_marge_realisee_ht || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">
                    Commission Nette à Payer
                  </Text>
                  <Text fw={800} size="lg" className="text-primary">
                    {(viewFiche.fiche.total_commission_nette || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Text size="sm" fw={700}>
              Justificatifs & Ventes Associées ({viewFiche.lignes.length})
            </Text>

            {viewFiche.lignes.length === 0 ? (
              <Text size="xs" c="dimmed">
                Aucune vente enregistrée pour ce commercial sur cette période.
              </Text>
            ) : (
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Réf Document</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Montant HT</Table.Th>
                    <Table.Th>Taux</Table.Th>
                    <Table.Th>Commission</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {viewFiche.lignes.map((l) => (
                    <Table.Tr key={l.id || `${l.type_source}-${l.source_id}`}>
                      <Table.Td>
                        <Badge
                          size="xs"
                          variant="light"
                          color={l.type_source === "ticket" ? "orange" : "blue"}
                        >
                          {l.type_source.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td fw={600}>{l.source_numero}</Table.Td>
                      <Table.Td>{l.date_source}</Table.Td>
                      <Table.Td>{l.client_nom || "-"}</Table.Td>
                      <Table.Td>{(l.montant_ht || 0).toFixed(2)} DH</Table.Td>
                      <Table.Td>{l.taux_commission}%</Table.Td>
                      <Table.Td className="font-bold text-primary">
                        {(l.montant_commission || 0).toFixed(2)} DH
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}

            <Group justify="space-between" mt="md" className="pt-3 border-t">
              <Group gap="xs">
                {viewFiche.fiche.statut === "brouillon" && (
                  <Button
                    variant="outline"
                    color="blue"
                    onClick={() => handleChangerStatut(viewFiche.fiche.id, "validee")}
                  >
                    Valider la fiche
                  </Button>
                )}
                {viewFiche.fiche.statut === "validee" && (
                  <Button
                    variant="filled"
                    color="teal"
                    onClick={() => handleChangerStatut(viewFiche.fiche.id, "payee")}
                  >
                    Marquer Payée
                  </Button>
                )}
              </Group>
              <Button variant="default" onClick={() => setViewFiche(null)}>
                Fermer
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
