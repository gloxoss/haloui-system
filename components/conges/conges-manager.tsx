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
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@/lib/notifications";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  creerDemandeCongeAction,
  validerDemandeCongeAction,
} from "@/app/actions";
import {
  type CongeDemandeRecord,
  type CongeStatut,
  type CongeType,
  type EmployeeRecord,
} from "@/lib/types";
import { formatDateLong } from "@/lib/utils";

type Props = {
  demandes: CongeDemandeRecord[];
  soldes: Array<{
    id: number;
    numero: any;
    nom: string;
    prenom: string;
    solde_payes: number;
    solde_pris: number;
    solde_restant: number;
  }>;
  employes: EmployeeRecord[];
};

export function CongesManager({
  demandes: initialDemandes,
  soldes: initialSoldes,
  employes,
}: Props) {
  const [demandes, setDemandes] = useState(initialDemandes);
  const [soldes, setSoldes] = useState(initialSoldes);
  const [activeTab, setActiveTab] = useState<string | null>("demandes");
  const [statutFilter, setStatutFilter] = useState<string | null>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal Nouvelle Demande
  const [modalOpen, setModalOpen] = useState(false);
  const [employeId, setEmployeId] = useState<string | null>(null);
  const [typeConge, setTypeConge] = useState<CongeType>("conge_paye");
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  const [dateFin, setDateFin] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [nbJours, setNbJours] = useState<number>(5);
  const [motif, setMotif] = useState("");

  // Modal Refus
  const [refusModalOpen, setRefusModalOpen] = useState(false);
  const [targetDemandeId, setTargetDemandeId] = useState<number | null>(null);
  const [motifRefus, setMotifRefus] = useState("");

  const filteredDemandes = useMemo(() => {
    return demandes.filter((d) => {
      const matchStatut = statutFilter === "all" || !statutFilter || d.statut === statutFilter;
      const matchSearch =
        !search ||
        `${d.employe_prenom} ${d.employe_nom}`.toLowerCase().includes(search.toLowerCase()) ||
        (d.motif && d.motif.toLowerCase().includes(search.toLowerCase()));
      return matchStatut && matchSearch;
    });
  }, [demandes, statutFilter, search]);

  const handleCreate = () => {
    if (!employeId) {
      notifications.show({ color: "red", title: "Erreur", message: "Veuillez choisir un employé." });
      return;
    }

    startTransition(async () => {
      const res = await creerDemandeCongeAction({
        employeId: Number(employeId),
        typeConge,
        dateDebut,
        dateFin,
        nbJours: Number(nbJours),
        motif,
      });

      if (res.success && res.demande) {
        notifications.show({
          color: "teal",
          title: "Demande enregistrée",
          message: "La demande de congé a été transmise pour validation.",
        });
        setDemandes([res.demande, ...demandes]);
        setModalOpen(false);
        setMotif("");
      } else {
        notifications.show({
          color: "red",
          title: "Erreur",
          message: res.error || "Impossible d'enregistrer la demande.",
        });
      }
    });
  };

  const handleDecision = (id: number, decision: "approuve" | "refuse", motifR?: string) => {
    startTransition(async () => {
      const res = await validerDemandeCongeAction(id, decision, motifR);

      if (res.success && res.demande) {
        notifications.show({
          color: decision === "approuve" ? "teal" : "orange",
          title: decision === "approuve" ? "Congé Approuvé" : "Demande Refusée",
          message:
            decision === "approuve"
              ? "Le congé a été validé et le solde de l'employé mis à jour."
              : "La demande a été rejetée.",
        });

        setDemandes((prev) => prev.map((d) => (d.id === id ? res.demande : d)));

        // Recalculer soldes localement si approuvé
        if (decision === "approuve" && res.demande.type_conge === "conge_paye") {
          setSoldes((prev) =>
            prev.map((s) => {
              if (s.id === res.demande.employe_id) {
                const pris = s.solde_pris + res.demande.nb_jours;
                return {
                  ...s,
                  solde_pris: pris,
                  solde_restant: Math.round((s.solde_payes - pris) * 10) / 10,
                };
              }
              return s;
            })
          );
        }

        setRefusModalOpen(false);
      } else {
        notifications.show({
          color: "red",
          title: "Erreur",
          message: res.error || "Action impossible.",
        });
      }
    });
  };

  const getBadgeType = (type: CongeType) => {
    switch (type) {
      case "conge_paye":
        return <Badge color="indigo">Congé Payé</Badge>;
      case "maladie":
        return <Badge color="red">Arrêt Maladie</Badge>;
      case "maternite":
        return <Badge color="pink">Maternité</Badge>;
      case "sans_solde":
        return <Badge color="gray">Sans Solde</Badge>;
      case "evenement_familial":
        return <Badge color="cyan">Événement Familial</Badge>;
      default:
        return <Badge color="blue">Autre</Badge>;
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Title order={2} className="tracking-tight">
            Gestion des Congés & Absences
          </Title>
          <Text c="dimmed" size="sm">
            Circuit hiérarchique de validation des absences et suivi du solde légal de congés payés
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<Plus size={16} />}
            color="indigo"
            onClick={() => setModalOpen(true)}
          >
            Nouvelle demande
          </Button>
        </Group>
      </Group>

      {/* KPI Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder radius="md" p="md" className="bg-amber-500/5 border-amber-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              En Attente de Validation
            </Text>
            <Clock size={18} className="text-amber-500" />
          </Group>
          <Title order={2} mt="xs" c="amber">
            {demandes.filter((d) => d.statut === "en_attente").length}
          </Title>
          <Text size="xs" c="dimmed">
            Demandes à traiter
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" className="bg-teal-500/5 border-teal-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Congés Validés
            </Text>
            <CheckCircle2 size={18} className="text-teal-500" />
          </Group>
          <Title order={2} mt="xs" c="teal">
            {demandes.filter((d) => d.statut === "approuve").length}
          </Title>
          <Text size="xs" c="dimmed">
            Approbations accordées
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" className="bg-indigo-500/5 border-indigo-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Jours Posés (Total)
            </Text>
            <CalendarDays size={18} className="text-indigo-500" />
          </Group>
          <Title order={2} mt="xs">
            {demandes
              .filter((d) => d.statut === "approuve")
              .reduce((acc, d) => acc + d.nb_jours, 0)}{" "}
            j
          </Title>
          <Text size="xs" c="dimmed">
            Cumul collaborateurs
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" className="bg-blue-500/5 border-blue-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Solde Moyen Restant
            </Text>
            <UserCheck size={18} className="text-blue-500" />
          </Group>
          <Title order={2} mt="xs" c="blue">
            {soldes.length > 0
              ? `${Math.round((soldes.reduce((acc, s) => acc + s.solde_restant, 0) / soldes.length) * 10) / 10} j`
              : "18.0 j"}
          </Title>
          <Text size="xs" c="dimmed">
            Droit annuel : 18 jours/salarié
          </Text>
        </Card>
      </SimpleGrid>

      {/* Tabs */}
      <Card withBorder radius="md" padding="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="demandes" leftSection={<CalendarCheck size={16} />}>
              Demandes & Circuit de Validation ({demandes.length})
            </Tabs.Tab>
            <Tabs.Tab value="soldes" leftSection={<Users size={16} />}>
              Soldes de Congés Payés ({soldes.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: DEMANDES */}
          <Tabs.Panel value="demandes">
            <Stack gap="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Rechercher par employé ou motif..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 300 }}
                />
                <Select
                  value={statutFilter}
                  onChange={setStatutFilter}
                  data={[
                    { value: "all", label: "Tous les statuts" },
                    { value: "en_attente", label: "En attente" },
                    { value: "approuve", label: "Approuvé" },
                    { value: "refuse", label: "Refusé" },
                  ]}
                  style={{ width: 180 }}
                />
              </Group>

              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Salarié</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Date Début</Table.Th>
                    <Table.Th>Date Fin</Table.Th>
                    <Table.Th>Nb Jours</Table.Th>
                    <Table.Th>Motif</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Décision / Validation</Table.Th>
                    <Table.Th className="text-right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredDemandes.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9} className="text-center py-6 text-neutral-400">
                        Aucune demande trouvée.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredDemandes.map((d) => (
                      <Table.Tr key={d.id}>
                        <Table.Td className="font-semibold">
                          {d.employe_prenom} {d.employe_nom}
                        </Table.Td>
                        <Table.Td>{getBadgeType(d.type_conge)}</Table.Td>
                        <Table.Td className="font-mono text-xs">{d.date_debut}</Table.Td>
                        <Table.Td className="font-mono text-xs">{d.date_fin}</Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light">
                            {d.nb_jours} jours
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ maxWidth: 220 }}>
                          <Text size="xs" lineClamp={2} title={d.motif}>
                            {d.motif || "-"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              d.statut === "approuve"
                                ? "teal"
                                : d.statut === "refuse"
                                ? "red"
                                : "yellow"
                            }
                          >
                            {d.statut === "en_attente"
                              ? "En attente"
                              : d.statut === "approuve"
                              ? "Approuvé"
                              : "Refusé"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {d.valide_par_nom ? (
                            <Text size="xs">
                              Par {d.valide_par_nom}
                              {d.motif_refus && <span className="text-red-500 block">Motif: {d.motif_refus}</span>}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed">En attente admin</Text>
                          )}
                        </Table.Td>
                        <Table.Td className="text-right">
                          {d.statut === "en_attente" && (
                            <Group gap={4} justify="flex-end">
                              <ActionIcon
                                color="teal"
                                variant="light"
                                title="Approuver le congé"
                                loading={isPending}
                                onClick={() => handleDecision(d.id, "approuve")}
                              >
                                <Check size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                variant="light"
                                title="Refuser le congé"
                                onClick={() => {
                                  setTargetDemandeId(d.id);
                                  setRefusModalOpen(true);
                                }}
                              >
                                <X size={16} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* TAB 2: SOLDES */}
          <Tabs.Panel value="soldes">
            <Stack gap="md">
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Matricule</Table.Th>
                    <Table.Th>Salarié</Table.Th>
                    <Table.Th>Droit Annuel (Acquis)</Table.Th>
                    <Table.Th>Congés Pris</Table.Th>
                    <Table.Th>Solde Restant</Table.Th>
                    <Table.Th>Progression Consommation</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {soldes.map((s) => {
                    const pct = Math.min(100, Math.round((s.solde_pris / (s.solde_payes || 18)) * 100));
                    return (
                      <Table.Tr key={s.id}>
                        <Table.Td className="font-mono text-xs text-neutral-500">
                          {s.numero ? `EMP-${s.numero}` : `ID-${s.id}`}
                        </Table.Td>
                        <Table.Td className="font-semibold">
                          {s.prenom} {s.nom}
                        </Table.Td>
                        <Table.Td className="font-mono">{s.solde_payes} j</Table.Td>
                        <Table.Td className="font-mono text-orange-600 font-bold">{s.solde_pris} j</Table.Td>
                        <Table.Td>
                          <Badge
                            color={s.solde_restant > 5 ? "teal" : s.solde_restant > 0 ? "orange" : "red"}
                            size="lg"
                          >
                            {s.solde_restant} jours
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ minWidth: 160 }}>
                          <Group gap="xs">
                            <Progress value={pct} color={pct > 80 ? "red" : "indigo"} size="sm" style={{ flex: 1 }} />
                            <Text size="xs" c="dimmed">
                              {pct}%
                            </Text>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Modal Nouvelle Demande */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700}>Déposer une demande de congé</Text>}
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Employé concerné"
            placeholder="Sélectionner le salarié..."
            required
            searchable
            value={employeId}
            onChange={setEmployeId}
            data={employes.map((e) => ({
              value: String(e.id),
              label: `${e.prenom} ${e.nom} (Solde: ${(e.solde_conges_payes || 18) - (e.solde_conges_pris || 0)} j)`,
            }))}
          />

          <Select
            label="Type de congé"
            value={typeConge}
            onChange={(v) => setTypeConge((v as CongeType) || "conge_paye")}
            data={[
              { value: "conge_paye", label: "Congé Payé Annuel" },
              { value: "maladie", label: "Arrêt Maladie (Certificat Médical)" },
              { value: "maternite", label: "Maternité / Paternité" },
              { value: "evenement_familial", label: "Événement Familial (Mariage, Naissance, Décès)" },
              { value: "sans_solde", label: "Congé Sans Solde" },
              { value: "autre", label: "Autre absence autorisée" },
            ]}
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Date de début"
                type="date"
                required
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Date de fin"
                type="date"
                required
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </Grid.Col>
          </Grid>

          <NumberInput
            label="Nombre de jours ouvrables décomptés"
            min={0.5}
            step={0.5}
            value={nbJours}
            onChange={(v) => setNbJours(Number(v) || 1)}
          />

          <Textarea
            label="Motif / Précisions"
            placeholder="Raison du congé ou informations utiles pour l'administrateur..."
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button color="indigo" loading={isPending} onClick={handleCreate}>
              Transmettre la demande
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Motif Refus */}
      <Modal
        opened={refusModalOpen}
        onClose={() => setRefusModalOpen(false)}
        title={<Text fw={700}>Motif du refus hiérarchique</Text>}
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Veuillez indiquer au collaborateur la raison motivant ce refus :
          </Text>
          <Textarea
            placeholder="Nécessité de service, pic d'activité, etc."
            value={motifRefus}
            onChange={(e) => setMotifRefus(e.target.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRefusModalOpen(false)}>
              Annuler
            </Button>
            <Button
              color="red"
              loading={isPending}
              onClick={() => targetDemandeId && handleDecision(targetDemandeId, "refuse", motifRefus)}
            >
              Confirmer le refus
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
