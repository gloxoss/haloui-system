"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Progress,
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
  ArrowLeft,
  Barcode,
  Check,
  CheckCheck,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Package,
  Printer,
  RotateCcw,
  ScanBarcode,
  Search,
} from "lucide-react";

import {
  alignerLignesTheoriqueAction,
  cloturerInventaireAction,
  enregistrerComptageLigneAction,
  scanCodeBarreInventaireAction,
} from "@/app/actions";
import {
  INVENTAIRE_STATUT_LABELS,
  INVENTAIRE_TYPE_LABELS,
  MOTIFS_ECART_INVENTAIRE,
} from "@/lib/constants";
import { type InventaireRecord, type InventaireLigneRecord } from "@/lib/types";

type Props = {
  inventaire: InventaireRecord;
  onBack: () => void;
  onRefresh: () => void;
};

export function InventaireComptageView({
  inventaire,
  onBack,
  onRefresh,
}: Props) {
  const [lignes, setLignes] = useState<InventaireLigneRecord[]>(
    inventaire.lignes || []
  );
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [scanMessage, setScanMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [clotureModalOpened, setClotureModalOpened] = useState(false);
  const [submittingCloture, setSubmittingCloture] = useState(false);
  const [savingLineId, setSavingLineId] = useState<number | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const isClosed = inventaire.statut === "cloture";
  const isCancelled = inventaire.statut === "annule";
  const isReadOnly = isClosed || isCancelled;

  // Real-time calculation of statistics from state
  const totalArticles = lignes.length;
  const articlesComptes = lignes.filter((l) => l.statut_comptage !== "non_compte").length;
  const progressPercent = totalArticles > 0 ? Math.round((articlesComptes / totalArticles) * 100) : 0;

  let totalEcartQte = 0;
  let totalValeurEcartMAD = 0;
  let totalLignesConformes = 0;
  let totalLignesEcarts = 0;

  for (const l of lignes) {
    if (l.statut_comptage !== "non_compte") {
      totalEcartQte += Number(l.ecart_quantite);
      totalValeurEcartMAD += Number(l.valeur_ecart_ht);
      if (l.ecart_quantite === 0) totalLignesConformes++;
      else totalLignesEcarts++;
    }
  }

  // Handle direct barcode scanning
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (!code || isReadOnly) return;

    try {
      const res = await scanCodeBarreInventaireAction(inventaire.id, code, 1);
      if (res.success && res.line) {
        setScanMessage({ type: "success", text: res.message });
        setLignes((prev) =>
          prev.map((l) => (l.id === res.line?.id ? res.line! : l))
        );
      } else {
        setScanMessage({ type: "error", text: res.message });
      }
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
    } catch (err) {
      setScanMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Handle single line quantity update
  const handleQuantityChange = async (
    ligneId: number,
    stockPhysique: number | string
  ) => {
    if (isReadOnly) return;
    const num = Math.max(0, typeof stockPhysique === "number" ? stockPhysique : parseFloat(stockPhysique) || 0);

    const targetLine = lignes.find((l) => l.id === ligneId);
    if (!targetLine) return;

    const ecart = num - Number(targetLine.stock_theorique);
    const valeur = ecart * Number(targetLine.prix_unitaire_ht);

    // Optimistic UI update
    setLignes((prev) =>
      prev.map((l) =>
        l.id === ligneId
          ? {
              ...l,
              stock_physique: num,
              ecart_quantite: ecart,
              valeur_ecart_ht: valeur,
              statut_comptage: ecart === 0 ? "conforme" : "ecart",
            }
          : l
      )
    );

    setSavingLineId(ligneId);
    try {
      await enregistrerComptageLigneAction(ligneId, num, targetLine.motif_ecart);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLineId(null);
    }
  };

  // Handle motif change
  const handleMotifChange = async (ligneId: number, motif: string) => {
    if (isReadOnly) return;
    setLignes((prev) =>
      prev.map((l) => (l.id === ligneId ? { ...l, motif_ecart: motif } : l))
    );

    const target = lignes.find((l) => l.id === ligneId);
    if (target) {
      await enregistrerComptageLigneAction(
        ligneId,
        Number(target.stock_physique),
        motif
      );
    }
  };

  // Align uncounted lines to theoretical
  const handleAlignTheorique = async () => {
    if (isReadOnly) return;
    try {
      await alignerLignesTheoriqueAction(inventaire.id, "non_comptes");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Final closure of inventory
  const handleConfirmCloture = async () => {
    setSubmittingCloture(true);
    try {
      const res = await cloturerInventaireAction(inventaire.id);
      if (res.success) {
        setClotureModalOpened(false);
        onRefresh();
      } else {
        alert(res.error || "Erreur lors de la clôture de l'inventaire.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingCloture(false);
    }
  };

  // Filtered rows for display
  const filteredLignes = lignes.filter((l) => {
    if (statusFilter === "non_compte" && l.statut_comptage !== "non_compte")
      return false;
    if (statusFilter === "conforme" && l.statut_comptage !== "conforme")
      return false;
    if (statusFilter === "ecart" && l.statut_comptage !== "ecart") return false;

    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      const matchDesig = l.designation.toLowerCase().includes(term);
      const matchRef = l.ref.toLowerCase().includes(term);
      const matchCode = (l.code_barre || "").toLowerCase().includes(term);
      if (!matchDesig && !matchRef && !matchCode) return false;
    }

    return true;
  });

  return (
    <Stack gap="lg">
      {/* Top action & back bar */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
          onClick={onBack}
        >
          Retour aux sessions d'inventaire
        </Button>

        <Group gap="xs">
          <Button
            component={Link}
            href={`/print/inventaire/${inventaire.id}`}
            target="_blank"
            variant="default"
            size="sm"
            leftSection={<Printer size={16} />}
          >
            {isClosed ? "Imprimer le Procès-Verbal (PV)" : "Fiche de Comptage"}
          </Button>

          {!isReadOnly && (
            <>
              <Button
                variant="light"
                color="teal"
                size="sm"
                leftSection={<CheckCheck size={16} />}
                onClick={handleAlignTheorique}
              >
                Valider les conformes (Aligner non-compté)
              </Button>

              <Button
                color="blue"
                size="sm"
                leftSection={<Lock size={16} />}
                onClick={() => setClotureModalOpened(true)}
              >
                Clôturer & Régulariser les Stocks
              </Button>
            </>
          )}
        </Group>
      </Group>

      {/* Main Header Banner */}
      <Paper radius="xl" withBorder p="lg" style={{ background: "var(--card)" }}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Group gap="xs" mb={4}>
                <Badge color="blue" variant="light" size="lg">
                  {inventaire.numero}
                </Badge>
                <Badge
                  color={
                    INVENTAIRE_STATUT_LABELS[inventaire.statut]?.color || "gray"
                  }
                  variant="filled"
                  size="lg"
                >
                  {INVENTAIRE_STATUT_LABELS[inventaire.statut]?.label ||
                    inventaire.statut}
                </Badge>
                <Badge color="gray" variant="outline">
                  {INVENTAIRE_TYPE_LABELS[inventaire.type_inventaire]?.label ||
                    inventaire.type_inventaire}
                </Badge>
              </Group>

              <Text size="xl" fw={800}>
                {inventaire.titre}
              </Text>

              <Text size="xs" c="dimmed">
                Dépôt : <strong>{inventaire.branch_name}</strong> · Date début :{" "}
                {inventaire.date_debut}{" "}
                {inventaire.critere_filtre && (
                  <span>
                    · Périmètre : <strong>{inventaire.critere_filtre}</strong>
                  </span>
                )}
              </Text>
            </div>

            {/* Quick Metrics */}
            <Group gap="md">
              <Paper p="xs" radius="md" withBorder style={{ textAlign: "center", minWidth: 100 }}>
                <Text size="10px" c="dimmed" fw={700}>
                  ARTICLES COMPTÉS
                </Text>
                <Text size="lg" fw={800} c="blue">
                  {articlesComptes} / {totalArticles}
                </Text>
              </Paper>

              <Paper p="xs" radius="md" withBorder style={{ textAlign: "center", minWidth: 100 }}>
                <Text size="10px" c="dimmed" fw={700}>
                  AVANCEMENT
                </Text>
                <Text size="lg" fw={800} c={progressPercent === 100 ? "teal" : "blue"}>
                  {progressPercent}%
                </Text>
              </Paper>

              <Paper p="xs" radius="md" withBorder style={{ textAlign: "center", minWidth: 110 }}>
                <Text size="10px" c="dimmed" fw={700}>
                  ÉCART QUANTITÉ
                </Text>
                <Text
                  size="lg"
                  fw={800}
                  c={
                    totalEcartQte === 0
                      ? "teal"
                      : totalEcartQte < 0
                      ? "red"
                      : "blue"
                  }
                >
                  {totalEcartQte > 0 ? `+${totalEcartQte}` : totalEcartQte} pcs
                </Text>
              </Paper>

              <Paper p="xs" radius="md" withBorder style={{ textAlign: "center", minWidth: 130 }}>
                <Text size="10px" c="dimmed" fw={700}>
                  IMPACT FINANCIER NET
                </Text>
                <Text
                  size="lg"
                  fw={800}
                  c={
                    totalValeurEcartMAD === 0
                      ? "teal"
                      : totalValeurEcartMAD < 0
                      ? "red"
                      : "blue"
                  }
                >
                  {totalValeurEcartMAD > 0 ? `+${totalValeurEcartMAD.toFixed(2)}` : totalValeurEcartMAD.toFixed(2)} DH
                </Text>
              </Paper>
            </Group>
          </Group>

          <Progress
            value={progressPercent}
            color={progressPercent === 100 ? "teal" : "blue"}
            size="sm"
            radius="xl"
          />
        </Stack>
      </Paper>

      {/* Barcode scanner quick zone */}
      {!isReadOnly && (
        <Paper
          radius="xl"
          withBorder
          p="md"
          style={{
            background: "linear-gradient(to right, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.05))",
            borderColor: "rgba(59, 130, 246, 0.3)",
          }}
        >
          <form onSubmit={handleBarcodeSubmit}>
            <Group justify="space-between" align="center">
              <Group gap="sm" style={{ flex: 1 }}>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                  <Barcode size={22} />
                </ThemeIcon>
                <div style={{ flex: 1, maxWidth: 600 }}>
                  <TextInput
                    ref={barcodeInputRef}
                    placeholder="Scanner un code-barres (douchette USB/Bluetooth) ou taper la référence..."
                    size="md"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    autoFocus
                    rightSection={
                      <Button size="xs" color="blue" onClick={handleBarcodeSubmit}>
                        Biper
                      </Button>
                    }
                  />
                </div>
              </Group>

              <Text size="xs" c="dimmed">
                Chaque scan incrémente la quantité physique comptée de <strong>+1</strong>
              </Text>
            </Group>
          </form>

          {scanMessage && (
            <Alert
              mt="sm"
              radius="md"
              color={scanMessage.type === "success" ? "teal" : "red"}
              withCloseButton
              onClose={() => setScanMessage(null)}
            >
              {scanMessage.text}
            </Alert>
          )}
        </Paper>
      )}

      {/* Closed Banner */}
      {isClosed && (
        <Alert
          color="teal"
          icon={<CheckCircle2 size={18} />}
          title="Session d'inventaire clôturée et validée"
          radius="md"
        >
          Cet inventaire a été clôturé le {inventaire.date_cloture?.slice(0, 10)} par{" "}
          <strong>{inventaire.cloture_par_nom || "la direction"}</strong>. Tous les écarts
          ont été automatiquement répercutés sur le stock physique du magasin et tracés dans le
          grand livre d'audit.
        </Alert>
      )}

      {/* Table filters */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="xs">
          <Button
            size="xs"
            variant={statusFilter === "tous" ? "filled" : "default"}
            onClick={() => setStatusFilter("tous")}
          >
            Tous ({lignes.length})
          </Button>
          <Button
            size="xs"
            variant={statusFilter === "non_compte" ? "filled" : "default"}
            color="gray"
            onClick={() => setStatusFilter("non_compte")}
          >
            À compter ({lignes.filter((l) => l.statut_comptage === "non_compte").length})
          </Button>
          <Button
            size="xs"
            variant={statusFilter === "conforme" ? "filled" : "default"}
            color="teal"
            onClick={() => setStatusFilter("conforme")}
          >
            Conformes ({totalLignesConformes})
          </Button>
          <Button
            size="xs"
            variant={statusFilter === "ecart" ? "filled" : "default"}
            color="red"
            onClick={() => setStatusFilter("ecart")}
          >
            Écarts ({totalLignesEcarts})
          </Button>
        </Group>

        <TextInput
          placeholder="Rechercher article, réf, code-barres..."
          leftSection={<Search size={14} />}
          size="xs"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ width: 280 }}
        />
      </Group>

      {/* Counting Grid */}
      <Paper radius="xl" withBorder style={{ overflow: "hidden" }}>
        <Table verticalSpacing="xs" striped highlightOnHover>
          <Table.Thead style={{ background: "var(--bg-subtle, #f8fafc)" }}>
            <Table.Tr>
              <Table.Th style={{ fontSize: "12px", width: "32%" }}>Article & Référence</Table.Th>
              <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "13%" }}>
                Stock Théorique
              </Table.Th>
              <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "16%" }}>
                Stock Physique Compté
              </Table.Th>
              <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "12%" }}>
                Écart Constaté
              </Table.Th>
              <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "12%" }}>
                Valeur Écart HT
              </Table.Th>
              <Table.Th style={{ fontSize: "12px", width: "15%" }}>Motif / Justification</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredLignes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ textAlign: "center", padding: 32 }}>
                  <Text size="sm" c="dimmed">
                    Aucun article ne correspond aux critères de filtre.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredLignes.map((line) => {
                const lineId = line.id!;
                const theo = Number(line.stock_theorique);
                const phys = Number(line.stock_physique);
                const ecart = Number(line.ecart_quantite);
                const isNonCompte = line.statut_comptage === "non_compte";
                const isConforme = line.statut_comptage === "conforme";
                const isEcart = line.statut_comptage === "ecart";

                return (
                  <Table.Tr key={lineId}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {line.designation}
                      </Text>
                      <Group gap="xs">
                        <Text size="11px" c="dimmed">
                          Réf: {line.ref}
                        </Text>
                        {line.code_barre && (
                          <Badge size="xs" variant="outline" color="gray">
                            {line.code_barre}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Badge variant="outline" color="gray" size="lg">
                        {theo} {line.unite}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      {isReadOnly ? (
                        <Text style={{ textAlign: "center" }} fw={700} size="sm">
                          {phys} {line.unite}
                        </Text>
                      ) : (
                        <NumberInput
                          size="xs"
                          min={0}
                          value={isNonCompte ? 0 : phys}
                          onChange={(val) => handleQuantityChange(lineId, val)}
                          styles={{
                            input: {
                              textAlign: "center",
                              fontWeight: 700,
                              borderColor: isEcart
                                ? ecart < 0
                                  ? "var(--mantine-color-red-6)"
                                  : "var(--mantine-color-blue-6)"
                                : isConforme
                                ? "var(--mantine-color-teal-6)"
                                : undefined,
                            },
                          }}
                        />
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      {isNonCompte ? (
                        <Badge variant="dot" color="gray" size="sm">
                          Non compté
                        </Badge>
                      ) : isConforme ? (
                        <Badge variant="light" color="teal" size="sm">
                          Conforme (0)
                        </Badge>
                      ) : ecart < 0 ? (
                        <Badge variant="filled" color="red" size="sm">
                          {ecart} {line.unite}
                        </Badge>
                      ) : (
                        <Badge variant="filled" color="blue" size="sm">
                          +{ecart} {line.unite}
                        </Badge>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      {isNonCompte ? (
                        <Text size="xs" c="dimmed">
                          -
                        </Text>
                      ) : (
                        <Text
                          size="xs"
                          fw={700}
                          c={ecart === 0 ? "dimmed" : ecart < 0 ? "red" : "blue"}
                        >
                          {Number(line.valeur_ecart_ht).toFixed(2)} DH
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td>
                      {isEcart ? (
                        isReadOnly ? (
                          <Text size="xs" fw={500}>
                            {line.motif_ecart || "Non spécifié"}
                          </Text>
                        ) : (
                          <Select
                            size="xs"
                            placeholder="Motif de l'écart..."
                            data={MOTIFS_ECART_INVENTAIRE}
                            value={line.motif_ecart || null}
                            onChange={(val) => handleMotifChange(lineId, val || "")}
                          />
                        )
                      ) : (
                        <Text size="xs" c="dimmed">
                          R.A.S.
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Confirmation modal for definitive closure */}
      <Modal
        opened={clotureModalOpened}
        onClose={() => setClotureModalOpened(false)}
        title={
          <Group gap="xs">
            <Lock size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={700} size="md">
              Confirmation de Clôture Définitive d'Inventaire
            </Text>
          </Group>
        }
        radius="md"
      >
        <Stack gap="md">
          <Alert
            color="orange"
            icon={<AlertTriangle size={18} />}
            title="Action de régularisation comptable irréversible"
            radius="md"
          >
            La clôture de cette session d'inventaire appliquera immédiatement les quantités
            physiques comptées dans le stock officiel de <strong>{inventaire.branch_name}</strong>{" "}
            et créera automatiquement les écritures d'ajustement dans le grand livre.
          </Alert>

          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Articles vérifiés :</Text>
                <Text size="xs" fw={700}>{articlesComptes} / {totalArticles}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Lignes avec écart à ajuster :</Text>
                <Text size="xs" fw={700} c={totalLignesEcarts > 0 ? "red" : "teal"}>
                  {totalLignesEcarts} article(s)
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Écart total en pièces :</Text>
                <Text size="xs" fw={700}>
                  {totalEcartQte > 0 ? `+${totalEcartQte}` : totalEcartQte} pcs
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Impact financier net HT :</Text>
                <Text size="sm" fw={800} c={totalValeurEcartMAD < 0 ? "red" : "blue"}>
                  {totalValeurEcartMAD.toFixed(2)} DH
                </Text>
              </Group>
            </Stack>
          </Paper>

          <Group justify="flex-end" mt="sm">
            <Button
              variant="default"
              onClick={() => setClotureModalOpened(false)}
              disabled={submittingCloture}
            >
              Annuler
            </Button>
            <Button
              color="blue"
              onClick={handleConfirmCloture}
              loading={submittingCloture}
            >
              Confirmer la Clôture & Mettre à Jour le Stock
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
