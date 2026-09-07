"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Kanban,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { CRM_ETAPES_CONFIG } from "@/lib/constants";
import {
  type CRMEtape,
  type CRMOpportuniteRecord,
  type CRMPipelineKPIs,
  type EntityRecord,
  type UserRecord,
} from "@/lib/types";
import {
  ajouterActiviteOpportuniteAction,
  convertirOpportuniteEnDevisAction,
  creerCRMOpportuniteAction,
  deplacerEtapeOpportuniteAction,
  getCRMOpportunitesAction,
  getCRMPipelineKPIsAction,
  supprimerCRMOpportuniteAction,
} from "@/app/actions";

const STAGES_ORDER: CRMEtape[] = [
  "nouveau_contact",
  "qualification",
  "devis_envoye",
  "negociation",
  "gagne",
  "perdu",
];

interface CRMPipelineKanbanProps {
  initialOpportunites: CRMOpportuniteRecord[];
  initialKPIs: CRMPipelineKPIs;
  clients: EntityRecord[];
  commerciaux: UserRecord[];
}

export function CRMPipelineKanban({
  initialOpportunites,
  initialKPIs,
  clients,
  commerciaux,
}: CRMPipelineKanbanProps) {
  const [opportunites, setOpportunites] = useState<CRMOpportuniteRecord[]>(initialOpportunites);
  const [kpis, setKPIs] = useState<CRMPipelineKPIs>(initialKPIs);
  const [search, setSearch] = useState("");
  const [selectedCommercial, setSelectedCommercial] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitre, setNewTitre] = useState("");
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [newContactNom, setNewContactNom] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newCommercialId, setNewCommercialId] = useState<string | null>(null);
  const [newMontant, setNewMontant] = useState<number>(10000);
  const [newDateCloture, setNewDateCloture] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Details Modal
  const [detailsOpp, setDetailsOpp] = useState<CRMOpportuniteRecord | null>(null);
  const [activityType, setActivityType] = useState<"appel" | "reunion" | "email" | "note">("note");
  const [activityTitre, setActivityTitre] = useState("");
  const [activityDesc, setActivityDesc] = useState("");

  const refreshData = () => {
    startTransition(async () => {
      const commId = selectedCommercial ? Number(selectedCommercial) : undefined;
      const [oppsRes, kpiRes] = await Promise.all([
        getCRMOpportunitesAction({ commercialId: commId, search: search || undefined }),
        getCRMPipelineKPIsAction(),
      ]);
      if (oppsRes.success) setOpportunites(oppsRes.opportunites);
      if (kpiRes.success && kpiRes.kpis) setKPIs(kpiRes.kpis);
    });
  };

  const handleCreate = async () => {
    if (!newTitre.trim()) return;
    const selectedClientObj = clients.find((c) => String(c.id) === newClientId);
    const clientNom = selectedClientObj?.name || newContactNom || "Prospect";

    startTransition(async () => {
      const res = await creerCRMOpportuniteAction({
        titre: newTitre,
        clientId: newClientId ? Number(newClientId) : null,
        clientNom,
        contactNom: newContactNom,
        contactTelephone: newContactPhone,
        contactEmail: newContactEmail,
        commercialId: newCommercialId ? Number(newCommercialId) : null,
        montantEstimeHt: Number(newMontant) || 0,
        dateCloturePrevue: newDateCloture || null,
        notes: newNotes,
      });

      if (res.success) {
        setCreateModalOpen(false);
        setNewTitre("");
        setNewClientId(null);
        setNewContactNom("");
        setNewContactPhone("");
        setNewContactEmail("");
        setNewNotes("");
        refreshData();
      }
    });
  };

  const handleMoveStage = (oppId: number, targetStage: CRMEtape) => {
    startTransition(async () => {
      const res = await deplacerEtapeOpportuniteAction(oppId, targetStage);
      if (res.success) {
        setOpportunites((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, etape: targetStage, probabilite_pourcent: res.opportunite?.probabilite_pourcent ?? o.probabilite_pourcent } : o))
        );
        refreshData();
      }
    });
  };

  const handleConvertToDevis = (oppId: number) => {
    startTransition(async () => {
      const res = await convertirOpportuniteEnDevisAction(oppId);
      if (res.success) {
        refreshData();
      }
    });
  };

  const handleDelete = (oppId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette opportunité commerciale ?")) return;
    startTransition(async () => {
      const res = await supprimerCRMOpportuniteAction(oppId);
      if (res.success) {
        setOpportunites((prev) => prev.filter((o) => o.id !== oppId));
        if (detailsOpp?.id === oppId) setDetailsOpp(null);
        refreshData();
      }
    });
  };

  const handleAddActivity = async () => {
    if (!detailsOpp || !activityTitre.trim()) return;
    startTransition(async () => {
      const res = await ajouterActiviteOpportuniteAction(detailsOpp.id, {
        typeActivite: activityType,
        titre: activityTitre,
        description: activityDesc,
      });
      if (res.success) {
        setActivityTitre("");
        setActivityDesc("");
        refreshData();
      }
    });
  };

  // Group by stage
  const groupedOpportunities = useMemo(() => {
    const groups: Record<CRMEtape, CRMOpportuniteRecord[]> = {
      nouveau_contact: [],
      qualification: [],
      devis_envoye: [],
      negociation: [],
      gagne: [],
      perdu: [],
    };

    opportunites.forEach((opp) => {
      const matchSearch =
        !search ||
        opp.titre.toLowerCase().includes(search.toLowerCase()) ||
        (opp.client_nom && opp.client_nom.toLowerCase().includes(search.toLowerCase())) ||
        (opp.contact_nom && opp.contact_nom.toLowerCase().includes(search.toLowerCase()));

      const matchCommercial =
        !selectedCommercial || String(opp.commercial_id) === selectedCommercial;

      if (matchSearch && matchCommercial) {
        if (groups[opp.etape]) {
          groups[opp.etape].push(opp);
        } else {
          groups.nouveau_contact.push(opp);
        }
      }
    });

    return groups;
  }, [opportunites, search, selectedCommercial]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: String(c.id), label: `${c.name} (${c.phone || c.email || "Client"})` })),
    [clients]
  );

  const commercialOptions = useMemo(
    () =>
      commerciaux.map((c) => ({
        value: String(c.id),
        label: `${c.full_name || c.username} ${c.code_commercial ? `[${c.code_commercial}]` : ""}`,
      })),
    [commerciaux]
  );

  return (
    <Stack gap="lg">
      <PageHeading
        eyebrow="CRM"
        title="Pipeline CRM & Opportunités Commerciales"
        description="Suivez vos pistes commerciales en vue Kanban, calculez le chiffre d'affaires prévisionnel pondéré et convertissez directement les opportunités gagnantes en devis officiels."
        actions={
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />}
              onClick={refreshData}
            >
              Actualiser
            </Button>
            <Button
              variant="filled"
              leftSection={<Plus className="h-4 w-4" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Nouvelle Opportunité
            </Button>
          </Group>
        }
      />

      {/* KPI Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Pistes Actives
              </Text>
              <ThemeIcon variant="light" color="blue" size="sm" radius="md">
                <Briefcase className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl">
              {kpis.opportunitesActives}{" "}
              <Text span size="xs" c="dimmed" fw={500}>
                / {kpis.totalOpportunites} total
              </Text>
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Pipeline Brut HT
              </Text>
              <ThemeIcon variant="light" color="cyan" size="sm" radius="md">
                <TrendingUp className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" c="cyan.6">
              {kpis.montantTotalPipelineHT.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}{" "}
              <Text span size="xs">DH</Text>
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Paper p="md" radius="md" withBorder className="bg-card border-primary/30">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="primary" fw={700} tt="uppercase">
                CA Prévisionnel Pondéré
              </Text>
              <ThemeIcon variant="filled" color="blue" size="sm" radius="md">
                <Tag className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={800} size="xl" className="text-primary">
              {kpis.montantPonderePipelineHT.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}{" "}
              <Text span size="xs">DH HT</Text>
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Affaires Gagnées HT
              </Text>
              <ThemeIcon variant="light" color="emerald" size="sm" radius="md">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" className="text-emerald-500">
              {kpis.montantGagneHT.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}{" "}
              <Text span size="xs">DH</Text>
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 2.4 }}>
          <Paper p="md" radius="md" withBorder className="bg-card">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Taux de Transformation
              </Text>
              <ThemeIcon variant="light" color="teal" size="sm" radius="md">
                <FileCheck className="h-4 w-4" />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl">
              {kpis.tauxConversion}%
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Filter Bar */}
      <Paper p="sm" radius="md" withBorder className="bg-card">
        <Group justify="space-between">
          <Group gap="sm" style={{ flex: 1 }}>
            <TextInput
              placeholder="Rechercher une opportunité, client, contact..."
              leftSection={<Search className="h-4 w-4 text-muted-foreground" />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 260 }}
            />
            <Select
              placeholder="Tous les commerciaux"
              clearable
              leftSection={<User className="h-4 w-4 text-muted-foreground" />}
              data={commercialOptions}
              value={selectedCommercial}
              onChange={setSelectedCommercial}
              style={{ width: 240 }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            {opportunites.length} opportunité(s) trouvée(s)
          </Text>
        </Group>
      </Paper>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {STAGES_ORDER.map((stageKey, stageIdx) => {
          const config = CRM_ETAPES_CONFIG[stageKey] || CRM_ETAPES_CONFIG.nouveau_contact;
          const stageOpps = groupedOpportunities[stageKey] || [];
          const totalStageAmount = stageOpps.reduce((sum, o) => sum + (o.montant_estime_ht || 0), 0);

          return (
            <div
              key={stageKey}
              className="flex flex-col rounded-xl border bg-card/60 p-3 min-w-[260px] shadow-sm transition-all hover:border-primary/40"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b mb-3">
                <div>
                  <Group gap={6}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-${config.color}-500`} />
                    <Text fw={700} size="sm">
                      {config.label}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Proba : {config.probabilite}%
                  </Text>
                </div>
                <Badge variant="light" size="sm" color={config.color}>
                  {stageOpps.length}
                </Badge>
              </div>

              {/* Column Amount summary */}
              <div className="bg-background/80 rounded-lg p-2 mb-3 border text-xs flex justify-between">
                <span className="text-muted-foreground">Volume :</span>
                <span className="font-semibold text-foreground">
                  {totalStageAmount.toLocaleString("fr-FR")} DH
                </span>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-2.5 flex-1 min-h-[180px]">
                {stageOpps.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-4 text-center">
                    <Text size="xs" c="dimmed">
                      Aucune piste
                    </Text>
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <Card
                      key={opp.id}
                      padding="xs"
                      radius="md"
                      withBorder
                      className="hover:shadow-md transition-shadow bg-background"
                    >
                      <Stack gap={6}>
                        <div className="flex justify-between items-start gap-2">
                          <Text
                            fw={600}
                            size="sm"
                            className="cursor-pointer hover:text-primary line-clamp-2"
                            onClick={() => setDetailsOpp(opp)}
                          >
                            {opp.titre}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="xs"
                            onClick={() => handleDelete(opp.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </ActionIcon>
                        </div>

                        {/* Client / Prospect */}
                        <Group gap={4}>
                          <User className="h-3 w-3 text-muted-foreground" />
                          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 180 }}>
                            {opp.client_associe_nom || opp.client_nom || "Prospect"}
                          </Text>
                        </Group>

                        {/* Amount & Weighted */}
                        <div className="flex justify-between items-baseline pt-1 border-t">
                          <Text fw={700} size="sm" className="text-primary">
                            {(opp.montant_estime_ht || 0).toLocaleString("fr-FR")} DH
                          </Text>
                          <Text size="10px" c="dimmed">
                            Pondéré: {(opp.montant_pondere_ht || 0).toLocaleString("fr-FR")} DH
                          </Text>
                        </div>

                        {/* Contact details */}
                        {(opp.contact_telephone || opp.commercial_nom) && (
                          <Group gap={6} justify="space-between" mt={2}>
                            {opp.contact_telephone ? (
                              <Group gap={3}>
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <Text size="10px" c="dimmed">
                                  {opp.contact_telephone}
                                </Text>
                              </Group>
                            ) : <span />}
                            {opp.commercial_nom && (
                              <Badge variant="outline" size="xs" color="gray">
                                {opp.commercial_nom.split(" ")[0]}
                              </Badge>
                            )}
                          </Group>
                        )}

                        {/* Linked Devis badge if exists */}
                        {opp.devis_numero && (
                          <Link href="/devis" className="no-underline">
                            <Badge
                              variant="light"
                              color="teal"
                              size="xs"
                              fullWidth
                              leftSection={<FileText className="h-3 w-3" />}
                              rightSection={<ExternalLink className="h-3 w-3" />}
                              className="cursor-pointer"
                            >
                              Devis N° {opp.devis_numero}
                            </Badge>
                          </Link>
                        )}

                        {/* Card Actions: Move left/right or convert */}
                        <div className="flex justify-between items-center pt-2 border-t mt-1">
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            disabled={stageIdx === 0}
                            onClick={() => handleMoveStage(opp.id, STAGES_ORDER[stageIdx - 1])}
                            title="Reculer d'une étape"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </ActionIcon>

                          {!opp.devis_document_id && stageKey !== "gagne" && stageKey !== "perdu" && (
                            <Button
                              size="compact-xs"
                              variant="light"
                              color="blue"
                              leftSection={<FileCheck className="h-3 w-3" />}
                              onClick={() => handleConvertToDevis(opp.id)}
                            >
                              Créer Devis
                            </Button>
                          )}

                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            disabled={stageIdx === STAGES_ORDER.length - 1}
                            onClick={() => handleMoveStage(opp.id, STAGES_ORDER[stageIdx + 1])}
                            title="Avancer d'une étape"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </ActionIcon>
                        </div>
                      </Stack>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: New Opportunity */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue">
              <Plus className="h-4 w-4" />
            </ThemeIcon>
            <Text fw={700}>Créer une Piste Commerciale (CRM)</Text>
          </Group>
        }
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Titre de l'opportunité *"
            placeholder="ex: Fourniture Carburant & Entretien Flotte 2026"
            value={newTitre}
            onChange={(e) => setNewTitre(e.currentTarget.value)}
            required
          />

          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Client existant (facultatif)"
                placeholder="Rechercher un compte client..."
                searchable
                clearable
                data={clientOptions}
                value={newClientId}
                onChange={setNewClientId}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Nom du contact / Prospect *"
                placeholder="ex: M. Tazi (Directeur Logistique)"
                value={newContactNom}
                onChange={(e) => setNewContactNom(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Téléphone du contact"
                placeholder="ex: 06 61 22 33 44"
                leftSection={<Phone className="h-4 w-4 text-muted-foreground" />}
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Email du contact"
                placeholder="contact@entreprise.ma"
                leftSection={<Mail className="h-4 w-4 text-muted-foreground" />}
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <NumberInput
                label="Montant Estimé (DH HT) *"
                min={0}
                thousandSeparator=" "
                value={newMontant}
                onChange={(v) => setNewMontant(Number(v) || 0)}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Commercial responsable"
                placeholder="Assigner un commercial..."
                data={commercialOptions}
                value={newCommercialId}
                onChange={setNewCommercialId}
                clearable
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="Date de clôture prévue"
            type="date"
            leftSection={<Calendar className="h-4 w-4 text-muted-foreground" />}
            value={newDateCloture}
            onChange={(e) => setNewDateCloture(e.currentTarget.value)}
          />

          <Textarea
            label="Besoins exprimés & Notes de qualification"
            placeholder="Détails du projet, volumes attendus, conditions tarifaires négociées..."
            rows={3}
            value={newNotes}
            onChange={(e) => setNewNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitre.trim() || isPending}
              loading={isPending}
            >
              Enregistrer l'opportunité
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Opportunity Details & Activity Log */}
      {detailsOpp && (
        <Modal
          opened={Boolean(detailsOpp)}
          onClose={() => setDetailsOpp(null)}
          title={
            <Group gap="xs">
              <Badge variant="light" color={CRM_ETAPES_CONFIG[detailsOpp.etape]?.color || "blue"}>
                {CRM_ETAPES_CONFIG[detailsOpp.etape]?.label || detailsOpp.etape}
              </Badge>
              <Text fw={700}>{detailsOpp.titre}</Text>
            </Group>
          }
          size="lg"
        >
          <Stack gap="md">
            {/* Top overview card */}
            <Paper p="sm" radius="md" withBorder className="bg-muted/30">
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">
                    Client / Prospect
                  </Text>
                  <Text fw={600} size="sm">
                    {detailsOpp.client_associe_nom || detailsOpp.client_nom}
                  </Text>
                  {detailsOpp.contact_telephone && (
                    <Text size="xs" c="dimmed">
                      Tél: {detailsOpp.contact_telephone}
                    </Text>
                  )}
                  {detailsOpp.contact_email && (
                    <Text size="xs" c="dimmed">
                      Email: {detailsOpp.contact_email}
                    </Text>
                  )}
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">
                    Montant Estimé HT
                  </Text>
                  <Text fw={700} size="md" className="text-primary">
                    {(detailsOpp.montant_estime_ht || 0).toLocaleString("fr-FR")} DH
                  </Text>
                  <Text size="xs" c="dimmed">
                    Pondéré ({detailsOpp.probabilite_pourcent}%) :{" "}
                    {(detailsOpp.montant_pondere_ht || 0).toLocaleString("fr-FR")} DH HT
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Stage Selector */}
            <div>
              <Text size="xs" fw={600} mb={4}>
                Étape du Pipeline :
              </Text>
              <Group gap="xs">
                {STAGES_ORDER.map((stageKey) => {
                  const cfg = CRM_ETAPES_CONFIG[stageKey];
                  const isCurrent = detailsOpp.etape === stageKey;
                  return (
                    <Button
                      key={stageKey}
                      size="xs"
                      variant={isCurrent ? "filled" : "light"}
                      color={cfg?.color || "blue"}
                      onClick={() => handleMoveStage(detailsOpp.id, stageKey)}
                    >
                      {cfg?.label}
                    </Button>
                  );
                })}
              </Group>
            </div>

            {/* Notes */}
            {detailsOpp.notes && (
              <div>
                <Text size="xs" fw={600} c="dimmed">
                  Notes de cadrage :
                </Text>
                <Paper p="xs" withBorder radius="sm" className="bg-background">
                  <Text size="xs">{detailsOpp.notes}</Text>
                </Paper>
              </div>
            )}

            {/* Add Activity Section */}
            <div className="pt-2 border-t">
              <Text size="sm" fw={700} mb="xs">
                Ajouter une activité / Interaction
              </Text>
              <Grid>
                <Grid.Col span={4}>
                  <Select
                    size="xs"
                    label="Type"
                    data={[
                      { value: "note", label: "Note interne" },
                      { value: "appel", label: "Appel téléphonique" },
                      { value: "reunion", label: "Réunion / Visite" },
                      { value: "email", label: "Email envoyé" },
                    ]}
                    value={activityType}
                    onChange={(v) => setActivityType(v as any)}
                  />
                </Grid.Col>
                <Grid.Col span={8}>
                  <TextInput
                    size="xs"
                    label="Objet / Titre de l'activité"
                    placeholder="ex: Relance téléphonique suite devis"
                    value={activityTitre}
                    onChange={(e) => setActivityTitre(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    size="xs"
                    placeholder="Commentaire ou résultat de l'interaction..."
                    value={activityDesc}
                    onChange={(e) => setActivityDesc(e.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>
              <Group justify="flex-end" mt="xs">
                <Button
                  size="xs"
                  variant="light"
                  disabled={!activityTitre.trim() || isPending}
                  onClick={handleAddActivity}
                >
                  Ajouter l'activité
                </Button>
              </Group>
            </div>

            {/* Convert button */}
            <Group justify="space-between" mt="md" className="pt-3 border-t">
              {!detailsOpp.devis_document_id ? (
                <Button
                  variant="filled"
                  color="teal"
                  leftSection={<FileCheck className="h-4 w-4" />}
                  onClick={() => handleConvertToDevis(detailsOpp.id)}
                >
                  Convertir en Devis Officiel
                </Button>
              ) : (
                <Link href="/devis">
                  <Button
                    variant="light"
                    color="teal"
                    leftSection={<ExternalLink className="h-4 w-4" />}
                  >
                    Voir le Devis (N° {detailsOpp.devis_numero})
                  </Button>
                </Link>
              )}
              <Button variant="default" onClick={() => setDetailsOpp(null)}>
                Fermer
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
