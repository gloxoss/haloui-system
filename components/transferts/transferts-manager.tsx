"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  Paper,
  SegmentedControl,
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
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  MoreVertical,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Truck,
  Warehouse,
  XCircle,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { TransfertModal } from "@/components/transferts/transfert-modal";
import { ReceptionModal } from "@/components/transferts/reception-modal";
import { StockOverviewDrawer } from "@/components/transferts/stock-overview-drawer";
import {
  annulerStockTransfertAction,
  expedierStockTransfertAction,
} from "@/app/actions";
import {
  type BranchRecord,
  type ProductRecord,
  type StockDepotRecord,
  type StockTransfertKPIs,
  type StockTransfertRecord,
} from "@/lib/types";

type Props = {
  transferts: StockTransfertRecord[];
  kpis: StockTransfertKPIs;
  branches: BranchRecord[];
  products: ProductRecord[];
  allStocks: StockDepotRecord[];
  currentBranchId?: number;
};

export function TransfertsManager({
  transferts,
  kpis,
  branches,
  products,
  allStocks,
  currentBranchId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [bannerMessage, setBannerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Modals state
  const [transfertModalOpen, setTransfertModalOpen] = useState(false);
  const [transfertToEdit, setTransfertToEdit] = useState<StockTransfertRecord | null>(null);

  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [transfertToReceive, setTransfertToReceive] = useState<StockTransfertRecord | null>(null);

  const [stockDrawerOpen, setStockDrawerOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");

  // Filtered transfers
  const filteredTransferts = useMemo(() => {
    return transferts.filter((t) => {
      // Status filter
      if (statusFilter !== "all" && t.statut !== statusFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all" && String(t.source_branch_id) !== sourceFilter) {
        return false;
      }

      // Destination filter
      if (destinationFilter !== "all" && String(t.destination_branch_id) !== destinationFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = t.numero?.toLowerCase().includes(q);
        const matchChauffeur = t.chauffeur_nom?.toLowerCase().includes(q);
        const matchMatricule = t.vehicule_matricule?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchSource = t.source_branch_name?.toLowerCase().includes(q);
        const matchDest = t.destination_branch_name?.toLowerCase().includes(q);

        if (!matchNum && !matchChauffeur && !matchMatricule && !matchNotes && !matchSource && !matchDest) {
          return false;
        }
      }

      return true;
    });
  }, [transferts, statusFilter, sourceFilter, destinationFilter, searchQuery]);

  // Handlers
  const handleOpenNew = () => {
    setTransfertToEdit(null);
    setTransfertModalOpen(true);
  };

  const handleOpenEdit = (transfert: StockTransfertRecord) => {
    setTransfertToEdit(transfert);
    setTransfertModalOpen(true);
  };

  const handleOpenReceive = (transfert: StockTransfertRecord) => {
    setTransfertToReceive(transfert);
    setReceptionModalOpen(true);
  };

  const handleQuickExpedier = (transfert: StockTransfertRecord) => {
    startTransition(async () => {
      const res = await expedierStockTransfertAction(transfert.id, {
        chauffeurNom: transfert.chauffeur_nom,
        vehiculeMatricule: transfert.vehicule_matricule,
        bonTransportRef: transfert.bon_transport_ref,
      });

      if (res.success) {
        setBannerMessage({
          type: "success",
          text: `Expédition confirmée (Étape 1) : Le bon ${transfert.numero} est maintenant en transit vers ${transfert.destination_branch_name}.`,
        });
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Impossible d'expédier ce transfert.",
        });
      }
    });
  };

  const handleAnnuler = (transfert: StockTransfertRecord) => {
    if (!confirm(`Êtes-vous certain de vouloir annuler le bon de transfert ${transfert.numero} ?`)) {
      return;
    }

    startTransition(async () => {
      const res = await annulerStockTransfertAction(transfert.id);
      if (res.success) {
        setBannerMessage({
          type: "success",
          text: `Le bon de transfert ${transfert.numero} a été annulé avec réintégration intégrale des stocks.`,
        });
      } else {
        setBannerMessage({
          type: "error",
          text: res.error || "Impossible d'annuler ce transfert.",
        });
      }
    });
  };

  return (
    <Stack gap="lg" className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <PageHeading
        eyebrow="Logistique & Approvisionnement"
        title="Transferts Inter-Dépôts"
        description="Gestion sécurisée des mouvements de stock entre magasins avec Bons de Transfert (BT) officiels et contrôle contradictoire physique à la réception."
        actions={
          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<Warehouse size={16} className="text-indigo-600" />}
              onClick={() => setStockDrawerOpen(true)}
            >
              Aperçu des Stocks Dépôts
            </Button>
            <Button
              color="blue"
              leftSection={<Plus size={16} />}
              onClick={handleOpenNew}
            >
              Nouveau Bon de Transfert
            </Button>
          </Group>
        }
      />

      {/* Global Action Banner */}
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
        {/* En transit */}
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
                En Transit (Sur la route)
              </Text>
              <ThemeIcon size="md" radius="md" color="blue" variant="light">
                <Truck size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="blue">
                {kpis.enTransitCount}
              </Text>
              <Text size="xs" c="dimmed">
                transfert(s)
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              <strong>{kpis.enTransitArticlesCount}</strong> pièces en cours de transport
            </Text>
          </Paper>
        </Grid.Col>

        {/* En attente réception */}
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
                À Réceptionner
              </Text>
              <ThemeIcon size="md" radius="md" color="amber" variant="light">
                <PackageCheck size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="orange">
                {kpis.enAttenteReceptionCount}
              </Text>
              <Text size="xs" c="dimmed">
                à pointer
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Contrôle physique contradictoire requis
            </Text>
          </Paper>
        </Grid.Col>

        {/* Clôturés / Reçus */}
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
                Transferts Clôturés
              </Text>
              <ThemeIcon size="md" radius="md" color="teal" variant="light">
                <CheckCircle2 size={18} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text size="1.75rem" fw={900} c="teal">
                {kpis.recusCount}
              </Text>
              <Text size="xs" c="dimmed">
                réceptionnés
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              <strong>{kpis.recusConformesCount}</strong> conformes à 100%
            </Text>
          </Paper>
        </Grid.Col>

        {/* Taux de conformité & Pertes */}
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
                Conformité & Pertes
              </Text>
              <ThemeIcon
                size="md"
                radius="md"
                color={kpis.totalPiecesManquantes > 0 ? "red" : "teal"}
                variant="light"
              >
                {kpis.totalPiecesManquantes > 0 ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
              </ThemeIcon>
            </Group>
            <Group align="baseline" gap="xs">
              <Text
                size="1.75rem"
                fw={900}
                c={kpis.totalPiecesManquantes > 0 ? "red" : "teal"}
              >
                {kpis.tauxConformite}%
              </Text>
              <Text size="xs" c="dimmed">
                conformité
              </Text>
            </Group>
            <Text size="xs" c={kpis.totalPiecesManquantes > 0 ? "red" : "dimmed"} mt={4}>
              {kpis.totalPiecesManquantes > 0
                ? `Pertes : ${kpis.totalPiecesManquantes} pièce(s) avariée(s)`
                : "Zéro perte de transport signalée"}
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Main Content Area: Filters + Table */}
      <Paper
        radius="xl"
        withBorder
        p="md"
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
        }}
      >
        <Stack gap="md">
          {/* Status Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <SegmentedControl
              size="xs"
              radius="lg"
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { label: `Tous (${transferts.length})`, value: "all" },
                {
                  label: `En Transit (${transferts.filter((t) => t.statut === "en_transit").length})`,
                  value: "en_transit",
                },
                {
                  label: `Brouillons (${transferts.filter((t) => t.statut === "brouillon").length})`,
                  value: "brouillon",
                },
                {
                  label: `Réceptionnés (${transferts.filter((t) => t.statut === "recu").length})`,
                  value: "recu",
                },
                {
                  label: `Annulés (${transferts.filter((t) => t.statut === "annule").length})`,
                  value: "annule",
                },
              ]}
            />

            {/* Branch filters */}
            <Group gap="xs" wrap="wrap">
              <Select
                size="xs"
                placeholder="Origine..."
                data={[
                  { value: "all", label: "Tous dépôts source" },
                  ...branches.map((b) => ({ value: String(b.id), label: `De: ${b.name}` })),
                ]}
                value={sourceFilter}
                onChange={(val) => setSourceFilter(val || "all")}
                style={{ width: 170 }}
              />
              <Select
                size="xs"
                placeholder="Destination..."
                data={[
                  { value: "all", label: "Tous dépôts arrivée" },
                  ...branches.map((b) => ({ value: String(b.id), label: `Vers: ${b.name}` })),
                ]}
                value={destinationFilter}
                onChange={(val) => setDestinationFilter(val || "all")}
                style={{ width: 170 }}
              />
            </Group>
          </div>

          {/* Search bar */}
          <TextInput
            placeholder="Rechercher par N° de bon (BT-...), chauffeur, véhicule matricule, motif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<Search size={15} className="text-gray-400" />}
            size="sm"
            radius="md"
          />

          {/* Transfers Table */}
          <Paper radius="lg" withBorder style={{ overflow: "hidden" }}>
            <Table verticalSpacing="sm" striped highlightOnHover>
              <Table.Thead style={{ background: "var(--bg-subtle, #f8fafc)" }}>
                <Table.Tr>
                  <Table.Th style={{ fontSize: "12px", width: "16%" }}>N° Bon & Date</Table.Th>
                  <Table.Th style={{ fontSize: "12px", width: "24%" }}>Itinéraire (Origine → Destination)</Table.Th>
                  <Table.Th style={{ fontSize: "12px", width: "14%", textAlign: "center" }}>Statut</Table.Th>
                  <Table.Th style={{ fontSize: "12px", width: "18%" }}>Transport / Chauffeur</Table.Th>
                  <Table.Th style={{ fontSize: "12px", width: "14%", textAlign: "center" }}>Quantités</Table.Th>
                  <Table.Th style={{ fontSize: "12px", width: "14%", textAlign: "right" }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredTransferts.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} style={{ textAlign: "center", padding: "36px" }}>
                      <ThemeIcon size="xl" radius="xl" color="gray" variant="light" mb="sm">
                        <Boxes size={28} />
                      </ThemeIcon>
                      <Text size="sm" fw={600}>
                        Aucun bon de transfert trouvé
                      </Text>
                      <Text size="xs" c="dimmed">
                        Modifiez vos critères de recherche ou créez un nouveau transfert.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredTransferts.map((t) => {
                    const isDraft = t.statut === "brouillon";
                    const isTransit = t.statut === "en_transit";
                    const isRecu = t.statut === "recu";
                    const isAnnule = t.statut === "annule";

                    const ecart = Number(t.total_ecart || 0);

                    return (
                      <Table.Tr key={t.id}>
                        {/* Number & Date */}
                        <Table.Td>
                          <Text size="sm" fw={700} c="blue">
                            {t.numero}
                          </Text>
                          <Text size="11px" c="dimmed">
                            {t.date_transfert}
                          </Text>
                        </Table.Td>

                        {/* Itinerary */}
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Badge variant="light" color="blue" size="sm">
                              {t.source_branch_name || "Dépôt Origine"}
                            </Badge>
                            <ArrowRight size={14} className="text-gray-400 shrink-0" />
                            <Badge variant="light" color="teal" size="sm">
                              {t.destination_branch_name || "Dépôt Arrivée"}
                            </Badge>
                          </Group>
                          {t.notes && (
                            <Text size="11px" c="dimmed" lineClamp={1} mt={2}>
                              {t.notes}
                            </Text>
                          )}
                        </Table.Td>

                        {/* Status */}
                        <Table.Td style={{ textAlign: "center" }}>
                          {isDraft && (
                            <Badge color="gray" variant="light" size="sm">
                              Brouillon
                            </Badge>
                          )}
                          {isTransit && (
                            <Badge color="blue" variant="filled" size="sm" leftSection={<Truck size={12} />}>
                              En Transit
                            </Badge>
                          )}
                          {isRecu && (
                            <Badge color="teal" variant="filled" size="sm" leftSection={<Check size={12} />}>
                              Réceptionné
                            </Badge>
                          )}
                          {isAnnule && (
                            <Badge color="red" variant="light" size="sm">
                              Annulé
                            </Badge>
                          )}
                        </Table.Td>

                        {/* Transport */}
                        <Table.Td>
                          {t.chauffeur_nom ? (
                            <div>
                              <Text size="xs" fw={600}>
                                {t.chauffeur_nom}
                              </Text>
                              {t.vehicule_matricule && (
                                <Text size="11px" c="dimmed">
                                  Matricule: {t.vehicule_matricule}
                                </Text>
                              )}
                            </div>
                          ) : (
                            <Text size="xs" c="dimmed">
                              Non assigné
                            </Text>
                          )}
                        </Table.Td>

                        {/* Quantities */}
                        <Table.Td style={{ textAlign: "center" }}>
                          <Text size="xs" fw={700}>
                            {t.total_quantite_expediee} exp.
                          </Text>
                          {isRecu && (
                            <div>
                              <Text size="11px" c={ecart < 0 ? "red" : "teal"}>
                                {t.total_quantite_recue} reçus
                              </Text>
                              {ecart < 0 && (
                                <Badge color="red" variant="light" size="xs" mt={2}>
                                  {ecart} manquant(s)
                                </Badge>
                              )}
                            </div>
                          )}
                          {isTransit && (
                            <Text size="10px" c="dimmed">
                              En cours de livraison
                            </Text>
                          )}
                        </Table.Td>

                        {/* Actions */}
                        <Table.Td style={{ textAlign: "right" }}>
                          <Group gap="xs" justify="flex-end" wrap="nowrap">
                            {/* Step 1: Expedite directly from draft */}
                            {isDraft && (
                              <Tooltip label="Expédier ce bon de transfert (Étape 1)">
                                <Button
                                  size="xs"
                                  color="blue"
                                  leftSection={<Send size={13} />}
                                  onClick={() => handleQuickExpedier(t)}
                                  loading={isPending}
                                >
                                  Expédier
                                </Button>
                              </Tooltip>
                            )}

                            {/* Step 2: Confirm reception */}
                            {isTransit && (
                              <Tooltip label="Contrôle physique contradictoire & validation entrée stock (Étape 2)">
                                <Button
                                  size="xs"
                                  color="teal"
                                  leftSection={<PackageCheck size={14} />}
                                  onClick={() => handleOpenReceive(t)}
                                >
                                  Réceptionner
                                </Button>
                              </Tooltip>
                            )}

                            {/* Print BT */}
                            <Tooltip label="Imprimer le Bon de Transfert officiel">
                              <ActionIcon
                                component={Link}
                                href={`/print/bon-transfert/${t.id}`}
                                target="_blank"
                                size="sm"
                                variant="light"
                                color="gray"
                              >
                                <Printer size={14} />
                              </ActionIcon>
                            </Tooltip>

                            {/* Menu for extra actions */}
                            <Menu shadow="md" width={180} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon size="sm" variant="subtle" color="gray">
                                  <MoreVertical size={14} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {isDraft && (
                                  <Menu.Item
                                    leftSection={<FileText size={14} />}
                                    onClick={() => handleOpenEdit(t)}
                                  >
                                    Modifier
                                  </Menu.Item>
                                )}
                                {isRecu && (
                                  <Menu.Item
                                    leftSection={<Eye size={14} />}
                                    onClick={() => handleOpenReceive(t)}
                                  >
                                    Rapport réception
                                  </Menu.Item>
                                )}
                                {!isRecu && !isAnnule && (
                                  <Menu.Item
                                    color="red"
                                    leftSection={<XCircle size={14} />}
                                    onClick={() => handleAnnuler(t)}
                                    disabled={isPending}
                                  >
                                    Annuler le transfert
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
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
      </Paper>

      {/* Modals */}
      <TransfertModal
        opened={transfertModalOpen}
        onClose={() => setTransfertModalOpen(false)}
        transfertToEdit={transfertToEdit}
        branches={branches}
        products={products}
        currentBranchId={currentBranchId}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "Le bon de transfert a été enregistré avec succès.",
          });
        }}
      />

      <ReceptionModal
        opened={receptionModalOpen}
        onClose={() => setReceptionModalOpen(false)}
        transfert={transfertToReceive}
        onSuccess={() => {
          setBannerMessage({
            type: "success",
            text: "La réception contradictoire a été confirmée et le stock a été mis à jour.",
          });
        }}
      />

      <StockOverviewDrawer
        opened={stockDrawerOpen}
        onClose={() => setStockDrawerOpen(false)}
        branches={branches}
        allStocks={allStocks}
        onStockUpdated={() => {
          setBannerMessage({
            type: "success",
            text: "Le stock a été ajusté avec succès.",
          });
        }}
      />
    </Stack>
  );
}
