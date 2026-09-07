"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Drawer,
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
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  FileDown,
  FileText,
  HandCoins,
  History,
  Plus,
  Printer,
  Receipt,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

import {
  changerStatutBulletinAction,
  creerPretAvanceAction,
  genererBulletinsPaieMensuelsAction,
} from "@/app/actions";
import {
  type BulletinPaieRecord,
  type BulletinPaieStatut,
  type EmployeeRecord,
  type PretAvanceRecord,
  type PretType,
} from "@/lib/types";
import { formatCurrency, formatDateLong } from "@/lib/utils";

type Props = {
  bulletins: BulletinPaieRecord[];
  prets: PretAvanceRecord[];
  employes: EmployeeRecord[];
  currentMonth: string;
};

export function PaieManager({
  bulletins: initialBulletins,
  prets: initialPrets,
  employes,
  currentMonth,
}: Props) {
  const [bulletins, setBulletins] = useState(initialBulletins);
  const [prets, setPrets] = useState(initialPrets);
  const [activeTab, setActiveTab] = useState<string | null>("bulletins");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal Nouveau Prêt
  const [pretModalOpen, setPretModalOpen] = useState(false);
  const [pretEmpId, setPretEmpId] = useState<string | null>(null);
  const [pretType, setPretType] = useState<PretType>("pret_personnel");
  const [pretMontant, setPretMontant] = useState<number>(6000);
  const [pretNbMois, setPretNbMois] = useState<number>(6);
  const [pretDate, setPretDate] = useState(new Date().toISOString().slice(0, 10));
  const [pretMode, setPretMode] = useState("virement");
  const [pretNotes, setPretNotes] = useState("");

  // Drawer Échéancier
  const [selectedPret, setSelectedPret] = useState<PretAvanceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modal Bulletin Print/View
  const [selectedBulletin, setSelectedBulletin] = useState<BulletinPaieRecord | null>(null);
  const [bulletinModalOpen, setBulletinModalOpen] = useState(false);

  const filteredBulletins = useMemo(() => {
    return bulletins.filter((b) => {
      const matchMonth = !selectedMonth || b.periode_mois === selectedMonth;
      const matchSearch =
        !search ||
        `${b.employe_prenom} ${b.employe_nom}`.toLowerCase().includes(search.toLowerCase()) ||
        b.numero_bulletin.toLowerCase().includes(search.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [bulletins, selectedMonth, search]);

  const handleGenererBulletins = () => {
    startTransition(async () => {
      const res = await genererBulletinsPaieMensuelsAction(selectedMonth);
      if (res.success && res.bulletins) {
        setBulletins(res.bulletins);
        notifications.show({
          color: "teal",
          title: "Bulletins générés",
          message: `${res.bulletins.length} bulletins de paie calculés pour la période ${selectedMonth}.`,
        });
      } else {
        notifications.show({
          color: "red",
          title: "Erreur",
          message: res.error || "Impossible de générer les bulletins.",
        });
      }
    });
  };

  const handleCreatePret = () => {
    if (!pretEmpId) {
      notifications.show({ color: "red", title: "Erreur", message: "Veuillez choisir un employé." });
      return;
    }

    startTransition(async () => {
      const res = await creerPretAvanceAction({
        employeId: Number(pretEmpId),
        type: pretType,
        montantTotal: Number(pretMontant),
        dateOctroi: pretDate,
        nbMensualites: Number(pretNbMois),
        modePaiement: pretMode,
        notes: pretNotes,
      });

      if (res.success && res.pret) {
        setPrets([res.pret, ...prets]);
        notifications.show({
          color: "teal",
          title: "Prêt accordé",
          message: `Échéancier de ${res.pret.nb_mensualites} mensualités de ${res.pret.montant_mensualite} DH généré avec succès.`,
        });
        setPretModalOpen(false);
        setPretNotes("");
      } else {
        notifications.show({
          color: "red",
          title: "Erreur",
          message: res.error || "Impossible de créer le prêt.",
        });
      }
    });
  };

  const handleChangeStatutBulletin = (bulletinId: number, statut: BulletinPaieStatut) => {
    startTransition(async () => {
      const res = await changerStatutBulletinAction(bulletinId, statut);
      if (res.success && res.bulletin) {
        setBulletins((prev) => prev.map((b) => (b.id === bulletinId ? res.bulletin : b)));
        notifications.show({
          color: "teal",
          title: "Statut mis à jour",
          message:
            statut === "paye"
              ? "Bulletin marqué comme payé et échéances de prêts prélevées."
              : `Bulletin passé à l'état ${statut}.`,
        });
      } else {
        notifications.show({ color: "red", title: "Erreur", message: res.error || "Action impossible." });
      }
    });
  };

  // KPIs
  const totalMasseSalariale = useMemo(() => {
    return filteredBulletins.reduce((acc, b) => acc + b.salaire_net, 0);
  }, [filteredBulletins]);

  const totalPrelevementsPrets = useMemo(() => {
    return filteredBulletins.reduce((acc, b) => acc + b.retenue_prets_avances, 0);
  }, [filteredBulletins]);

  const totalHeuresSup = useMemo(() => {
    return filteredBulletins.reduce((acc, b) => acc + b.heures_sup, 0);
  }, [filteredBulletins]);

  const totalEncoursPrets = useMemo(() => {
    return prets.filter((p) => p.statut === "actif").reduce((acc, p) => acc + p.solde_restant, 0);
  }, [prets]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Title order={2} className="tracking-tight">
            Paie, Prêts & Amortissements Mensuels
          </Title>
          <Text c="dimmed" size="sm">
            Génération des fiches de paie avec décompte automatique des heures sup et retenues de prêts
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<HandCoins size={16} />}
            variant="light"
            color="indigo"
            onClick={() => setPretModalOpen(true)}
          >
            Accorder un prêt / avance
          </Button>
          <Button
            leftSection={<Receipt size={16} />}
            color="teal"
            loading={isPending}
            onClick={handleGenererBulletins}
          >
            Calculer les bulletins ({selectedMonth})
          </Button>
        </Group>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder radius="md" p="md" className="bg-teal-500/5 border-teal-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Masse Salariale Nette
            </Text>
            <Wallet size={18} className="text-teal-500" />
          </Group>
          <Title order={2} mt="xs" c="teal">
            {formatCurrency(totalMasseSalariale)}
          </Title>
          <Text size="xs" c="dimmed">
            {filteredBulletins.length} salariés sur {selectedMonth}
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" className="bg-orange-500/5 border-orange-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Retenues Prêts & Avances
            </Text>
            <HandCoins size={18} className="text-orange-500" />
          </Group>
          <Title order={2} mt="xs" c="orange">
            {formatCurrency(totalPrelevementsPrets)}
          </Title>
          <Text size="xs" c="dimmed">
            Amorti automatiquement
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" className="bg-indigo-500/5 border-indigo-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Heures Supplémentaires
            </Text>
            <Clock size={18} className="text-indigo-500" />
          </Group>
          <Title order={2} mt="xs" c="indigo">
            {Math.round(totalHeuresSup * 10) / 10} h
          </Title>
          <Text size="xs" c="dimmed">
            Importées de la pointeuse
          </Text>
        </Card>

        <Card withBorder radius="md" p="md" className="bg-blue-500/5 border-blue-500/20">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed">
              Encours Total des Prêts
            </Text>
            <CreditCard size={18} className="text-blue-500" />
          </Group>
          <Title order={2} mt="xs" c="blue">
            {formatCurrency(totalEncoursPrets)}
          </Title>
          <Text size="xs" c="dimmed">
            {prets.filter((p) => p.statut === "actif").length} prêts en cours
          </Text>
        </Card>
      </SimpleGrid>

      {/* Tabs */}
      <Card withBorder radius="md" padding="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="bulletins" leftSection={<FileText size={16} />}>
              Bulletins de Paie ({filteredBulletins.length})
            </Tabs.Tab>
            <Tabs.Tab value="prets" leftSection={<HandCoins size={16} />}>
              Prêts & Avances Accordés ({prets.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: BULLETINS */}
          <Tabs.Panel value="bulletins">
            <Stack gap="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Rechercher salarié ou N° bulletin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 280 }}
                />
                <Group>
                  <Text size="xs" fw={600} c="dimmed">
                    Mois de paie :
                  </Text>
                  <TextInput
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ width: 170 }}
                  />
                </Group>
              </Group>

              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>N° Bulletin</Table.Th>
                    <Table.Th>Salarié</Table.Th>
                    <Table.Th>Salaire Base</Table.Th>
                    <Table.Th>Heures Sup</Table.Th>
                    <Table.Th>Salaire Brut</Table.Th>
                    <Table.Th>Retenues Sociales</Table.Th>
                    <Table.Th>Retenue Prêt</Table.Th>
                    <Table.Th>Net à Payer</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th className="text-right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredBulletins.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={10} className="text-center py-6 text-neutral-400">
                        Aucun bulletin calculé pour ce mois. Cliquez sur "Calculer les bulletins".
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredBulletins.map((b) => (
                      <Table.Tr key={b.id}>
                        <Table.Td className="font-mono text-xs font-bold text-neutral-600 dark:text-neutral-400">
                          {b.numero_bulletin}
                        </Table.Td>
                        <Table.Td className="font-semibold">
                          {b.employe_prenom} {b.employe_nom}
                        </Table.Td>
                        <Table.Td className="font-mono">{formatCurrency(b.salaire_base)}</Table.Td>
                        <Table.Td>
                          {b.heures_sup > 0 ? (
                            <Badge color="orange" variant="light" size="sm">
                              +{b.heures_sup}h ({formatCurrency(b.montant_heures_sup)})
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">0h</Text>
                          )}
                        </Table.Td>
                        <Table.Td className="font-mono font-medium">{formatCurrency(b.salaire_brut)}</Table.Td>
                        <Table.Td className="font-mono text-xs text-red-500">
                          -{formatCurrency(b.retenue_cnss + b.retenue_amo)}
                        </Table.Td>
                        <Table.Td>
                          {b.retenue_prets_avances > 0 ? (
                            <Badge color="red" variant="filled" size="sm">
                              -{formatCurrency(b.retenue_prets_avances)}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td className="font-mono font-black text-teal-600 dark:text-teal-400">
                          {formatCurrency(b.salaire_net)}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              b.statut === "paye"
                                ? "teal"
                                : b.statut === "valide"
                                ? "blue"
                                : "yellow"
                            }
                          >
                            {b.statut === "paye"
                              ? "Payé"
                              : b.statut === "valide"
                              ? "Validé"
                              : "Brouillon"}
                          </Badge>
                        </Table.Td>
                        <Table.Td className="text-right">
                          <Group gap={4} justify="flex-end">
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              title="Voir / Imprimer le bulletin"
                              onClick={() => {
                                setSelectedBulletin(b);
                                setBulletinModalOpen(true);
                              }}
                            >
                              <Printer size={16} />
                            </ActionIcon>
                            {b.statut === "brouillon" && (
                              <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                onClick={() => handleChangeStatutBulletin(b.id, "valide")}
                              >
                                Valider
                              </Button>
                            )}
                            {b.statut === "valide" && (
                              <Button
                                size="xs"
                                variant="filled"
                                color="teal"
                                onClick={() => handleChangeStatutBulletin(b.id, "paye")}
                              >
                                Payer
                              </Button>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* TAB 2: PRÊTS & AVANCES */}
          <Tabs.Panel value="prets">
            <Stack gap="md">
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Salarié</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Montant Total</Table.Th>
                    <Table.Th>Date Octroi</Table.Th>
                    <Table.Th>Mensualités</Table.Th>
                    <Table.Th>Remboursé</Table.Th>
                    <Table.Th>Solde Restant</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th className="text-right">Échéancier</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {prets.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9} className="text-center py-6 text-neutral-400">
                        Aucun prêt ou avance accordé pour le moment.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    prets.map((p) => {
                      const pct = Math.min(100, Math.round((p.montant_rembourse / p.montant_total) * 100));
                      return (
                        <Table.Tr key={p.id}>
                          <Table.Td className="font-semibold">
                            {p.employe_prenom} {p.employe_nom}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={p.type === "avance_salaire" ? "cyan" : "indigo"}>
                              {p.type === "avance_salaire" ? "Avance sur salaire" : "Prêt personnel"}
                            </Badge>
                          </Table.Td>
                          <Table.Td className="font-mono font-bold">{formatCurrency(p.montant_total)}</Table.Td>
                          <Table.Td className="font-mono text-xs">{p.date_octroi}</Table.Td>
                          <Table.Td>
                            {p.nb_mensualites} × {formatCurrency(p.montant_mensualite)}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Text size="xs" className="font-mono text-teal-600 font-bold">
                                {formatCurrency(p.montant_rembourse)}
                              </Text>
                              <Text size="xs" c="dimmed">({pct}%)</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td className="font-mono font-black text-orange-600">
                            {formatCurrency(p.solde_restant)}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={p.statut === "solde" ? "teal" : p.statut === "actif" ? "blue" : "gray"}>
                              {p.statut === "solde" ? "Soldé" : p.statut === "actif" ? "En cours" : p.statut}
                            </Badge>
                          </Table.Td>
                          <Table.Td className="text-right">
                            <Button
                              size="xs"
                              variant="light"
                              color="indigo"
                              leftSection={<History size={14} />}
                              onClick={() => {
                                setSelectedPret(p);
                                setDrawerOpen(true);
                              }}
                            >
                              Échéances
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Drawer Échéancier */}
      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Text fw={700}>
            Échéancier d'Amortissement : {selectedPret?.employe_prenom} {selectedPret?.employe_nom}
          </Text>
        }
        position="right"
        size="md"
      >
        {selectedPret && (
          <Stack gap="md">
            <Card withBorder radius="md" p="sm" className="bg-neutral-50 dark:bg-neutral-900">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">Montant Total</Text>
                  <Text fw={700}>{formatCurrency(selectedPret.montant_total)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Remboursé</Text>
                  <Text fw={700} c="teal">{formatCurrency(selectedPret.montant_rembourse)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Reste à Amortir</Text>
                  <Text fw={700} c="orange">{formatCurrency(selectedPret.solde_restant)}</Text>
                </div>
              </Group>
            </Card>

            <Text size="sm" fw={600}>
              Détail des mensualités déductibles sur bulletin :
            </Text>

            <Table striped verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>N°</Table.Th>
                  <Table.Th>Mois Prélèvement</Table.Th>
                  <Table.Th>Échéance</Table.Th>
                  <Table.Th>Statut</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {selectedPret.echeances?.map((ech) => (
                  <Table.Tr key={ech.id}>
                    <Table.Td className="font-mono text-xs">{ech.numero_mensualite}</Table.Td>
                    <Table.Td className="font-mono text-xs font-bold">{ech.mois_prelevement}</Table.Td>
                    <Table.Td className="font-mono">{formatCurrency(ech.montant_echeance)}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          ech.statut === "preleve"
                            ? "teal"
                            : ech.statut === "a_prelever"
                            ? "orange"
                            : "gray"
                        }
                        size="sm"
                      >
                        {ech.statut === "preleve" ? "Prélevé" : "À prélever"}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Drawer>

      {/* Modal Nouveau Prêt */}
      <Modal
        opened={pretModalOpen}
        onClose={() => setPretModalOpen(false)}
        title={<Text fw={700}>Accorder un prêt ou une avance</Text>}
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Bénéficiaire"
            placeholder="Sélectionner le salarié..."
            required
            searchable
            value={pretEmpId}
            onChange={setPretEmpId}
            data={employes.map((e) => ({
              value: String(e.id),
              label: `${e.prenom} ${e.nom} (Salaire: ${formatCurrency(e.salaire)})`,
            }))}
          />

          <Select
            label="Type d'aide accordée"
            value={pretType}
            onChange={(v) => setPretType((v as PretType) || "pret_personnel")}
            data={[
              { value: "pret_personnel", label: "Prêt Personnel (remboursable sur plusieurs mois)" },
              { value: "avance_salaire", label: "Avance sur salaire (déductible sur paie du mois)" },
            ]}
          />

          <Grid>
            <Grid.Col span={6}>
              <NumberInput
                label="Montant Total (DH)"
                required
                min={100}
                step={500}
                value={pretMontant}
                onChange={(v) => setPretMontant(Number(v) || 0)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Nombre de mensualités"
                required
                min={1}
                max={36}
                value={pretNbMois}
                onChange={(v) => setPretNbMois(Number(v) || 1)}
              />
            </Grid.Col>
          </Grid>

          <Card withBorder radius="md" p="xs" className="bg-indigo-50 dark:bg-indigo-950/20">
            <Group justify="space-between">
              <Text size="xs" fw={600} c="indigo">
                Retenue mensuelle calculée :
              </Text>
              <Text fw={800} size="sm" c="indigo" className="font-mono">
                {formatCurrency(Math.round((pretMontant / Math.max(1, pretNbMois)) * 100) / 100)} / mois
              </Text>
            </Group>
          </Card>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Date d'octroi"
                type="date"
                value={pretDate}
                onChange={(e) => setPretDate(e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Mode de versement"
                value={pretMode}
                onChange={(v) => setPretMode(v || "virement")}
                data={[
                  { value: "virement", label: "Virement Bancaire" },
                  { value: "cheque", label: "Chèque" },
                  { value: "especes", label: "Espèces (Caisse)" },
                ]}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Notes / Motif du prêt"
            placeholder="Ex : Avance pour frais médicaux, rentrée scolaire..."
            rows={2}
            value={pretNotes}
            onChange={(e) => setPretNotes(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setPretModalOpen(false)}>
              Annuler
            </Button>
            <Button color="indigo" loading={isPending} onClick={handleCreatePret}>
              Valider le prêt & Générer l'échéancier
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Fiche de Paie Imprimable */}
      <Modal
        opened={bulletinModalOpen}
        onClose={() => setBulletinModalOpen(false)}
        size="lg"
        title={<Text fw={700}>Bulletin de Paie Officiel</Text>}
      >
        {selectedBulletin && (
          <Stack gap="md" className="print:p-0">
            <div className="border border-neutral-300 rounded-lg p-6 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
              {/* En-tête Bulletin */}
              <Group justify="space-between" className="border-b pb-4 mb-4">
                <div>
                  <Title order={3} className="tracking-tight">
                    PÂTISSERIE & STATION HALOUI
                  </Title>
                  <Text size="xs" c="dimmed">
                    Société de Commerce & Services SARL • RC 12345 • IF 67890 • ICE 001928374000088
                  </Text>
                  <Text size="xs" c="dimmed">
                    Boulevard Hassan II, Ouarzazate, Maroc
                  </Text>
                </div>
                <div className="text-right">
                  <Badge size="lg" color="indigo">
                    BULLETIN DE PAIE
                  </Badge>
                  <Text size="xs" fw={700} className="font-mono mt-1">
                    N° {selectedBulletin.numero_bulletin}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Période : {selectedBulletin.periode_mois}
                  </Text>
                </div>
              </Group>

              {/* Salarié */}
              <Grid className="border-b pb-4 mb-4 text-xs">
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">Nom et Prénom :</Text>
                  <Text fw={700} size="sm">{selectedBulletin.employe_prenom} {selectedBulletin.employe_nom}</Text>
                  <Text size="xs" c="dimmed" mt={2}>Matricule : {selectedBulletin.employe_numero || "EMP"}</Text>
                </Grid.Col>
                <Grid.Col span={6} className="text-right">
                  <Text size="xs" c="dimmed">N° CNSS :</Text>
                  <Text fw={700} className="font-mono">{selectedBulletin.employe_cnss || "En cours"}</Text>
                  <Text size="xs" c="dimmed" mt={2}>Mode : {selectedBulletin.mode_paiement.toUpperCase()}</Text>
                </Grid.Col>
              </Grid>

              {/* Tableau Rubriques */}
              <Table className="text-xs mb-4">
                <Table.Thead>
                  <Table.Tr className="bg-neutral-100 dark:bg-neutral-800">
                    <Table.Th>Rubrique</Table.Th>
                    <Table.Th>Base / Heures</Table.Th>
                    <Table.Th className="text-right">Gains (DH)</Table.Th>
                    <Table.Th className="text-right">Retenues (DH)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>Salaire de base</Table.Td>
                    <Table.Td>191.00 h</Table.Td>
                    <Table.Td className="text-right font-mono">{formatCurrency(selectedBulletin.salaire_base)}</Table.Td>
                    <Table.Td className="text-right">-</Table.Td>
                  </Table.Tr>
                  {selectedBulletin.heures_sup > 0 && (
                    <Table.Tr>
                      <Table.Td>Heures supplémentaires (majoration 25%)</Table.Td>
                      <Table.Td>{selectedBulletin.heures_sup} h</Table.Td>
                      <Table.Td className="text-right font-mono">{formatCurrency(selectedBulletin.montant_heures_sup)}</Table.Td>
                      <Table.Td className="text-right">-</Table.Td>
                    </Table.Tr>
                  )}
                  <Table.Tr>
                    <Table.Td>Cotisation CNSS (4.48%)</Table.Td>
                    <Table.Td>{formatCurrency(Math.min(6000, selectedBulletin.salaire_brut))}</Table.Td>
                    <Table.Td className="text-right">-</Table.Td>
                    <Table.Td className="text-right font-mono text-red-500">{formatCurrency(selectedBulletin.retenue_cnss)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Assurance Maladie Obligatoire AMO (2.26%)</Table.Td>
                    <Table.Td>{formatCurrency(selectedBulletin.salaire_brut)}</Table.Td>
                    <Table.Td className="text-right">-</Table.Td>
                    <Table.Td className="text-right font-mono text-red-500">{formatCurrency(selectedBulletin.retenue_amo)}</Table.Td>
                  </Table.Tr>
                  {selectedBulletin.retenue_prets_avances > 0 && (
                    <Table.Tr className="bg-orange-50 dark:bg-orange-950/20 font-bold">
                      <Table.Td>Retenue remboursement prêt / avance personnel</Table.Td>
                      <Table.Td>Échéance mensuelle</Table.Td>
                      <Table.Td className="text-right">-</Table.Td>
                      <Table.Td className="text-right font-mono text-orange-600">{formatCurrency(selectedBulletin.retenue_prets_avances)}</Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>

              {/* Totaux & Net */}
              <div className="border-t pt-3">
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed">Total Brut : {formatCurrency(selectedBulletin.salaire_brut)}</Text>
                    <Text size="xs" c="dimmed">Total Retenues : {formatCurrency(selectedBulletin.total_retenues)}</Text>
                  </div>
                  <div className="text-right">
                    <Text size="xs" fw={700} c="dimmed">NET À PAYER :</Text>
                    <Text size="xl" fw={900} className="font-mono text-teal-600 dark:text-teal-400">
                      {formatCurrency(selectedBulletin.salaire_net)}
                    </Text>
                  </div>
                </Group>
              </div>
            </div>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setBulletinModalOpen(false)}>
                Fermer
              </Button>
              <Button color="indigo" leftSection={<Printer size={16} />} onClick={() => window.print()}>
                Imprimer le bulletin
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
