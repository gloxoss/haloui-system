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
  Paper,
  Progress,
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
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreVertical,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  ScanBarcode,
  Search,
  TrendingDown,
  Warehouse,
  XCircle,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { InventaireSessionModal } from "@/components/inventaires/inventaire-session-modal";
import { InventaireComptageView } from "@/components/inventaires/inventaire-comptage-view";
import { annulerInventaireAction } from "@/app/actions";
import {
  INVENTAIRE_STATUT_LABELS,
  INVENTAIRE_TYPE_LABELS,
} from "@/lib/constants";
import {
  type BranchRecord,
  type InventaireKPIs,
  type InventaireRecord,
} from "@/lib/types";

type Props = {
  inventaires: InventaireRecord[];
  kpis: InventaireKPIs;
  branches: BranchRecord[];
  currentBranchId?: number;
};

export function InventairesManager({
  inventaires,
  kpis,
  branches,
  currentBranchId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bannerMessage, setBannerMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Modals & Active view
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [activeInventaireId, setActiveInventaireId] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>(
    currentBranchId ? String(currentBranchId) : "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeInventaire = useMemo(() => {
    if (!activeInventaireId) return null;
    return inventaires.find((inv) => inv.id === activeInventaireId) || null;
  }, [activeInventaireId, inventaires]);

  const filteredInventaires = useMemo(() => {
    return inventaires.filter((inv) => {
      if (statusFilter !== "all" && inv.statut !== statusFilter) {
        return false;
      }
      if (branchFilter !== "all" && String(inv.branch_id) !== branchFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.numero?.toLowerCase().includes(q);
        const matchTitre = inv.titre?.toLowerCase().includes(q);
        const matchBranch = inv.branch_name?.toLowerCase().includes(q);
        const matchFiltre = inv.critere_filtre?.toLowerCase().includes(q);
        if (!matchNum && !matchTitre && !matchBranch && !matchFiltre) {
          return false;
        }
      }
      return true;
    });
  }, [inventaires, statusFilter, branchFilter, searchQuery]);

  const handleAnnuler = (id: number, numero: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir annuler la session d'inventaire ${numero} ? Aucun ajustement ne sera appliqué.`)) {
      return;
    }
    startTransition(async () => {
      const res = await annulerInventaireAction(id);
      if (res.success) {
        setBannerMessage({ type: "success", text: `L'inventaire ${numero} a été annulé avec succès.` });
        router.refresh();
      } else {
        setBannerMessage({ type: "error", text: res.error || "Échec de l'annulation." });
      }
    });
  };

  // If a counting session is open, display full-screen comptage view
  if (activeInventaire) {
    return (
      <InventaireComptageView
        inventaire={activeInventaire}
        onBack={() => setActiveInventaireId(null)}
        onRefresh={() => {
          router.refresh();
        }}
      />
    );
  }

  return (
    <Stack gap="xl">
      <PageHeading
        eyebrow="Logistique & Magasin"
        title="Inventaires Tournants & Clôtures"
        description="Organisation des comptages physiques par rayon/famille ou code-barres, calcul automatique des écarts de stock et génération automatique des écritures d'ajustement."
        actions={
          <Group gap="sm">
            <Button
              color="blue"
              leftSection={<Plus size={16} />}
              onClick={() => setSessionModalOpen(true)}
            >
              Lancer un Inventaire
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

      {/* KPI Cards */}
      <Grid gutter="md">
        {/* Sessions en cours */}
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
                En Cours de Comptage
              </Text>
              <ThemeIcon size="md" radius="md" color="blue" variant="light">
                <ScanBarcode size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="blue">
                {kpis.sessionsEnCours}
              </Text>
              <Text size="xs" c="dimmed">
                session(s) active(s)
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Saisie directe par douchette ou manuelle
            </Text>
          </Paper>
        </Grid.Col>

        {/* Sessions clôturées */}
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
                Inventaires Clôturés
              </Text>
              <ThemeIcon size="md" radius="md" color="teal" variant="light">
                <CheckCircle2 size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="teal">
                {kpis.sessionsCloturees}
              </Text>
              <Text size="xs" c="dimmed">
                validé(s) & ajusté(s)
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Mouvements d'ajustement intégrés au stock
            </Text>
          </Paper>
        </Grid.Col>

        {/* Taux de conformité */}
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
                Conformité Théorique/Réel
              </Text>
              <ThemeIcon size="md" radius="md" color="indigo" variant="light">
                <PackageCheck size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="indigo">
                {kpis.tauxConformiteMoyen}%
              </Text>
              <Text size="xs" c="dimmed">
                taux moyen
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Articles sans écart physique vs stock système
            </Text>
          </Paper>
        </Grid.Col>

        {/* Écart de valorisation */}
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
                Écart Net Constaté (HT)
              </Text>
              <ThemeIcon
                size="md"
                radius="md"
                color={kpis.totalValeurEcartsMAD < 0 ? "red" : kpis.totalValeurEcartsMAD > 0 ? "teal" : "gray"}
                variant="light"
              >
                <TrendingDown size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text
                size="1.5rem"
                fw={900}
                c={kpis.totalValeurEcartsMAD < 0 ? "red" : kpis.totalValeurEcartsMAD > 0 ? "teal" : "gray"}
              >
                {kpis.totalValeurEcartsMAD > 0 ? `+${kpis.totalValeurEcartsMAD.toFixed(2)}` : kpis.totalValeurEcartsMAD.toFixed(2)} DH
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Écart net cumulé de <strong>{kpis.totalEcartsQuantite}</strong> unité(s)
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Filters Bar */}
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
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { label: "Tous", value: "all" },
                { label: "En cours", value: "en_cours" },
                { label: "Clôturés", value: "cloture" },
                { label: "Annulés", value: "annule" },
              ]}
              radius="lg"
              size="sm"
            />

            {branches.length > 1 && (
              <Select
                placeholder="Filtrer par Dépôt / Magasin"
                value={branchFilter}
                onChange={(val) => setBranchFilter(val || "all")}
                data={[
                  { label: "Tous les magasins / dépôts", value: "all" },
                  ...branches.map((b) => ({ label: b.name, value: String(b.id) })),
                ]}
                radius="md"
                size="sm"
                style={{ width: 220 }}
              />
            )}
          </Group>

          <TextInput
            placeholder="Rechercher numéro, rayon, titre..."
            leftSection={<Search size={15} className="text-gray-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            radius="md"
            size="sm"
            style={{ width: 280 }}
          />
        </Group>
      </Paper>

      {/* Sessions Table */}
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
        {filteredInventaires.length === 0 ? (
          <Stack align="center" justify="center" p="xl" gap="sm" style={{ minHeight: 220 }}>
            <Boxes size={42} className="text-gray-400" />
            <Text fw={600} size="md" c="dimmed">
              Aucune session d'inventaire trouvée
            </Text>
            <Text size="xs" c="dimmed">
              Lancez un inventaire tournant (par rayon ou famille) ou général pour démarrer le comptage.
            </Text>
            <Button
              variant="light"
              color="blue"
              size="sm"
              leftSection={<Plus size={14} />}
              onClick={() => setSessionModalOpen(true)}
              mt="xs"
            >
              Créer une session
            </Button>
          </Stack>
        ) : (
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead style={{ background: "var(--surface-soft)" }}>
              <Table.Tr>
                <Table.Th>N° & Date</Table.Th>
                <Table.Th>Titre & Périmètre</Table.Th>
                <Table.Th>Magasin / Emplacement</Table.Th>
                <Table.Th>Avancement Comptage</Table.Th>
                <Table.Th>Écarts Détectés</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredInventaires.map((inv) => {
                const typeConfig = INVENTAIRE_TYPE_LABELS[inv.type_inventaire] || {
                  label: inv.type_inventaire,
                  color: "gray",
                };
                const statutConfig = INVENTAIRE_STATUT_LABELS[inv.statut] || {
                  label: inv.statut,
                  color: "gray",
                };

                const progressPct =
                  inv.total_articles > 0
                    ? Math.round((inv.total_comptes / inv.total_articles) * 100)
                    : 0;

                return (
                  <Table.Tr key={inv.id}>
                    <Table.Td>
                      <Text size="sm" fw={700}>
                        {inv.numero}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {inv.date_debut ? new Date(inv.date_debut).toLocaleDateString("fr-FR") : "-"}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {inv.titre}
                      </Text>
                      <Group gap={4} mt={2}>
                        <Badge size="xs" variant="light" color={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                        {inv.critere_filtre && (
                          <Badge size="xs" variant="outline" color="gray">
                            {inv.critere_filtre}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <Group gap={6}>
                        <Warehouse size={14} className="text-gray-500" />
                        <Text size="sm">{inv.branch_name || "Dépôt Principal"}</Text>
                      </Group>
                    </Table.Td>

                    <Table.Td style={{ minWidth: 150 }}>
                      <Group justify="space-between" mb={2}>
                        <Text size="xs" c="dimmed">
                          {inv.total_comptes} / {inv.total_articles} saisis
                        </Text>
                        <Text size="xs" fw={700}>
                          {progressPct}%
                        </Text>
                      </Group>
                      <Progress
                        value={progressPct}
                        color={progressPct === 100 ? "teal" : "blue"}
                        size="sm"
                        radius="xl"
                      />
                    </Table.Td>

                    <Table.Td>
                      {inv.total_comptes === 0 ? (
                        <Text size="xs" c="dimmed">
                          En attente comptage
                        </Text>
                      ) : inv.total_ecarts_qte === 0 ? (
                        <Badge size="sm" variant="light" color="teal">
                          Parfait (0 écart)
                        </Badge>
                      ) : (
                        <div>
                          <Text
                            size="xs"
                            fw={700}
                            c={inv.total_ecarts_qte > 0 ? "teal" : "red"}
                          >
                            {inv.total_ecarts_qte > 0 ? `+${inv.total_ecarts_qte}` : inv.total_ecarts_qte} unités
                          </Text>
                          <Text size="11px" c="dimmed">
                            {inv.total_valeur_ecart_ht > 0 ? `+${inv.total_valeur_ecart_ht.toFixed(2)}` : inv.total_valeur_ecart_ht.toFixed(2)} DH
                          </Text>
                        </div>
                      )}
                    </Table.Td>

                    <Table.Td>
                      <Badge size="sm" variant="light" color={statutConfig.color}>
                        {statutConfig.label}
                      </Badge>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "right" }}>
                      <Group gap="xs" justify="flex-end">
                        {inv.statut === "en_cours" ? (
                          <Button
                            size="xs"
                            variant="filled"
                            color="blue"
                            leftSection={<ScanBarcode size={13} />}
                            onClick={() => setActiveInventaireId(inv.id)}
                          >
                            Compter / Scanner
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="light"
                            color="gray"
                            leftSection={<Eye size={13} />}
                            onClick={() => setActiveInventaireId(inv.id)}
                          >
                            Consulter PV
                          </Button>
                        )}

                        <Tooltip label="Imprimer feuille de comptage ou PV">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            component={Link}
                            href={`/print/inventaire/${inv.id}`}
                            target="_blank"
                          >
                            <Printer size={15} />
                          </ActionIcon>
                        </Tooltip>

                        {inv.statut === "en_cours" && (
                          <Menu position="bottom-end" shadow="md">
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray">
                                <MoreVertical size={15} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                color="red"
                                leftSection={<XCircle size={14} />}
                                onClick={() => handleAnnuler(inv.id, inv.numero)}
                              >
                                Annuler cet inventaire
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
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

      {/* Modal Lancement Session */}
      <InventaireSessionModal
        opened={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        branches={branches}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Nouvelle session d'inventaire créée avec succès. Vous pouvez démarrer le comptage.",
          });
          router.refresh();
        }}
      />
    </Stack>
  );
}
