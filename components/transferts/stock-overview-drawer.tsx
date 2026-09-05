"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit,
  Package,
  Search,
  Sliders,
  Truck,
  Warehouse,
} from "lucide-react";

import { ajusterStockDepotAction } from "@/app/actions";
import { type BranchRecord, type StockDepotRecord } from "@/lib/types";

type Props = {
  opened: boolean;
  onClose: () => void;
  branches: BranchRecord[];
  allStocks: StockDepotRecord[];
  onStockUpdated?: () => void;
};

export function StockOverviewDrawer({
  opened,
  onClose,
  branches,
  allStocks,
  onStockUpdated,
}: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0] ? String(branches[0].id) : ""
  );
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  // Adjustment state
  const [adjustTarget, setAdjustTarget] = useState<StockDepotRecord | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [adjustMotif, setAdjustMotif] = useState("");

  const activeBranch = branches.find((b) => String(b.id) === selectedBranchId);

  // Filter stocks for selected branch
  const filteredStocks = useMemo(() => {
    const bid = parseInt(selectedBranchId, 10);
    return allStocks.filter((s) => {
      if (s.branch_id !== bid) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchRef = s.produit_ref?.toLowerCase().includes(q);
        const matchName = s.produit_designation?.toLowerCase().includes(q);
        return matchRef || matchName;
      }
      return true;
    });
  }, [allStocks, selectedBranchId, search]);

  // Statistics
  const totalArticles = filteredStocks.length;
  const totalStockDispo = filteredStocks.reduce((sum, s) => sum + Number(s.quantite || 0), 0);
  const totalStockTransit = filteredStocks.reduce(
    (sum, s) => sum + Number(s.quantite_en_transit || 0),
    0
  );
  const alertesCount = filteredStocks.filter(
    (s) => Number(s.quantite) <= Number(s.seuil_alerte || 5)
  ).length;

  const handleOpenAdjust = (item: StockDepotRecord) => {
    setAdjustTarget(item);
    setNewQuantity(Number(item.quantite));
    setAdjustMotif("Inventaire tournant / Régularisation manuelle");
    setFeedback(null);
  };

  const handleConfirmAdjust = () => {
    if (!adjustTarget) return;

    startTransition(async () => {
      const res = await ajusterStockDepotAction(
        adjustTarget.branch_id,
        adjustTarget.produit_id,
        newQuantity,
        adjustMotif
      );

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Le stock de ${adjustTarget.produit_designation} a été mis à jour à ${newQuantity}.`,
        });
        setAdjustTarget(null);
        onStockUpdated?.();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Impossible d'ajuster le stock.",
        });
      }
    });
  };

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        size="lg"
        title={
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
              <Warehouse size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md">
                État des Stocks par Dépôt
              </Text>
              <Text size="xs" c="dimmed">
                Vue temps réel des niveaux disponibles et en cours d'acheminement
              </Text>
            </div>
          </Group>
        }
        styles={{
          header: {
            borderBottom: "1px solid var(--border-light)",
            paddingBottom: "14px",
          },
          body: {
            paddingTop: "16px",
          },
        }}
      >
        <Stack gap="md">
          {feedback && (
            <Alert
              color={feedback.type === "error" ? "red" : "teal"}
              icon={feedback.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              radius="md"
            >
              {feedback.message}
            </Alert>
          )}

          {/* Branch Selector */}
          <Select
            label="Sélectionner le magasin / dépôt"
            data={branches.map((b) => ({
              value: String(b.id),
              label: b.name,
            }))}
            value={selectedBranchId}
            onChange={(val) => setSelectedBranchId(val || "")}
            leftSection={<Warehouse size={16} className="text-indigo-500" />}
          />

          {/* Quick stats cards */}
          <div className="grid grid-cols-3 gap-2">
            <Paper p="xs" radius="md" withBorder className="text-center">
              <Text size="10px" tt="uppercase" c="dimmed" fw={700}>
                Articles
              </Text>
              <Text size="lg" fw={800} c="indigo">
                {totalArticles}
              </Text>
            </Paper>

            <Paper p="xs" radius="md" withBorder className="text-center">
              <Text size="10px" tt="uppercase" c="dimmed" fw={700}>
                En Stock Dispo
              </Text>
              <Text size="lg" fw={800} c="teal">
                {totalStockDispo}
              </Text>
            </Paper>

            <Paper p="xs" radius="md" withBorder className="text-center">
              <Text size="10px" tt="uppercase" c="dimmed" fw={700}>
                En Transit Arrivant
              </Text>
              <Text size="lg" fw={800} c="blue">
                {totalStockTransit}
              </Text>
            </Paper>
          </div>

          {alertesCount > 0 && (
            <Badge color="red" variant="light" size="md">
              ⚠️ {alertesCount} produit(s) sous le seuil d'alerte dans ce dépôt
            </Badge>
          )}

          {/* Search */}
          <TextInput
            placeholder="Rechercher par nom ou référence..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<Search size={14} className="text-gray-400" />}
            size="xs"
          />

          {/* Table */}
          <Paper radius="md" withBorder style={{ overflow: "hidden" }}>
            <Table verticalSpacing="xs" striped highlightOnHover>
              <Table.Thead style={{ background: "var(--bg-subtle, #f8fafc)" }}>
                <Table.Tr>
                  <Table.Th style={{ fontSize: "12px", width: "45%" }}>Article</Table.Th>
                  <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "22%" }}>
                    Dispo
                  </Table.Th>
                  <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "22%" }}>
                    En Transit
                  </Table.Th>
                  <Table.Th style={{ width: "11%" }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredStocks.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>
                      <Text size="sm" c="dimmed">
                        Aucun article inventorié pour ce dépôt.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredStocks.map((stock) => {
                    const qte = Number(stock.quantite);
                    const transit = Number(stock.quantite_en_transit);
                    const seuil = Number(stock.seuil_alerte || 5);
                    const isLow = qte <= seuil;

                    return (
                      <Table.Tr key={stock.id}>
                        <Table.Td>
                          <Text size="xs" fw={700}>
                            {stock.produit_designation}
                          </Text>
                          {stock.produit_ref && (
                            <Text size="10px" c="dimmed">
                              Réf: {stock.produit_ref}
                            </Text>
                          )}
                        </Table.Td>

                        <Table.Td style={{ textAlign: "center" }}>
                          <Badge
                            variant={isLow ? "filled" : "light"}
                            color={isLow ? "red" : "teal"}
                            size="sm"
                          >
                            {qte} {stock.produit_unite || "u"}
                          </Badge>
                        </Table.Td>

                        <Table.Td style={{ textAlign: "center" }}>
                          {transit > 0 ? (
                            <Badge variant="light" color="blue" size="sm">
                              +{transit} {stock.produit_unite || "u"}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">
                              0
                            </Text>
                          )}
                        </Table.Td>

                        <Table.Td style={{ textAlign: "center" }}>
                          <Tooltip label="Ajuster manuellement le stock">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="gray"
                              onClick={() => handleOpenAdjust(stock)}
                            >
                              <Edit size={14} />
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
        </Stack>
      </Drawer>

      {/* Manual Stock Adjustment Modal */}
      <Modal
        opened={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={
          <Group gap="xs">
            <Sliders size={18} className="text-indigo-600" />
            <Text fw={700} size="sm">
              Ajustement Manuel de Stock
            </Text>
          </Group>
        }
        size="md"
        radius="md"
      >
        {adjustTarget && (
          <Stack gap="sm">
            <Text size="sm">
              Article : <strong>{adjustTarget.produit_designation}</strong>
            </Text>
            <Text size="xs" c="dimmed">
              Dépôt : {activeBranch?.name} • Stock actuel : {adjustTarget.quantite}{" "}
              {adjustTarget.produit_unite || "u"}
            </Text>

            <NumberInput
              label="Nouvelle quantité en stock *"
              min={0}
              value={newQuantity}
              onChange={(val) => setNewQuantity(Number(val) || 0)}
              required
            />

            <TextInput
              label="Motif de la régularisation *"
              placeholder="Ex: Écart d'inventaire, Casse non déclarée..."
              value={adjustMotif}
              onChange={(e) => setAdjustMotif(e.currentTarget.value)}
              required
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setAdjustTarget(null)} disabled={isPending}>
                Annuler
              </Button>
              <Button
                color="indigo"
                onClick={handleConfirmAdjust}
                loading={isPending}
                disabled={!adjustMotif.trim()}
              >
                Confirmer l'Ajustement
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
