"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  PackageCheck,
  Truck,
} from "lucide-react";

import { receptionnerStockTransfertAction } from "@/app/actions";
import { type StockTransfertRecord } from "@/lib/types";

type Props = {
  opened: boolean;
  onClose: () => void;
  transfert: StockTransfertRecord | null;
  onSuccess?: () => void;
};

const MOTIFS_ECART_COMMUNS = [
  { value: "Casse / Avarie transport", label: "Casse / Avarie constatée au déchargement" },
  { value: "Colis manquant au chargement", label: "Colis manquant / Non chargé à l'origine" },
  { value: "Produit non conforme / Défectueux", label: "Produit défectueux / Périmé / Rejeté" },
  { value: "Erreur de comptage / Inventaire", label: "Erreur de saisie initiale" },
  { value: "Autre motif", label: "Autre justification" },
];

export function ReceptionModal({ opened, onClose, transfert, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  // State per line
  const [receptionMap, setReceptionMap] = useState<
    Record<
      number,
      {
        quantiteRecue: number;
        motifEcart: string;
      }
    >
  >({});
  const [motifGlobal, setMotifGlobal] = useState("");

  const lines = transfert?.lignes || [];

  // Reset and initialize line items when modal opens
  useEffect(() => {
    if (opened && transfert) {
      setFeedback(null);
      setMotifGlobal(transfert.motif_ecart_global || "");
      const initialMap: Record<number, { quantiteRecue: number; motifEcart: string }> = {};
      for (const line of transfert.lignes || []) {
        if (line.id != null) {
          initialMap[line.id] = {
            quantiteRecue: line.quantite_recue ? Number(line.quantite_recue) : Number(line.quantite_expediee),
            motifEcart: line.motif_ecart || "",
          };
        }
      }
      setReceptionMap(initialMap);
    }
  }, [opened, transfert]);

  // Quick 100% compliant fill
  const handleFill100Percent = () => {
    const updated: Record<number, { quantiteRecue: number; motifEcart: string }> = {};
    for (const line of lines) {
      if (line.id != null) {
        updated[line.id] = {
          quantiteRecue: Number(line.quantite_expediee),
          motifEcart: "",
        };
      }
    }
    setReceptionMap(updated);
    setFeedback({
      type: "success",
      message: "Toutes les quantités reçues ont été calquées sur les quantités expédiées (100% conforme).",
    });
  };

  const handleQuantityChange = (lineId: number, val: number | string) => {
    const num = Math.max(0, typeof val === "number" ? val : parseFloat(val) || 0);
    setReceptionMap((prev) => ({
      ...prev,
      [lineId]: {
        quantiteRecue: num,
        motifEcart: prev[lineId]?.motifEcart || "",
      },
    }));
  };

  const handleMotifChange = (lineId: number, motif: string) => {
    setReceptionMap((prev) => ({
      ...prev,
      [lineId]: {
        quantiteRecue: prev[lineId]?.quantiteRecue ?? 0,
        motifEcart: motif,
      },
    }));
  };

  // Calculate totals and variances
  let totalExpedie = 0;
  let totalRecu = 0;
  let totalEcart = 0;
  let hasNegativeVarianceWithoutMotif = false;

  for (const line of lines) {
    if (line.id == null) continue;
    const exp = Number(line.quantite_expediee);
    const rec = receptionMap[line.id]?.quantiteRecue ?? exp;
    const ecart = rec - exp;
    totalExpedie += exp;
    totalRecu += rec;
    totalEcart += ecart;

    if (ecart < 0 && !receptionMap[line.id]?.motifEcart?.trim()) {
      hasNegativeVarianceWithoutMotif = true;
    }
  }

  const handleSubmit = () => {
    if (!transfert) return;

    if (hasNegativeVarianceWithoutMotif) {
      setFeedback({
        type: "error",
        message: "Veuillez préciser le motif de l'écart pour chaque article manquant ou avarié.",
      });
      return;
    }

    const payload = lines
      .filter((l) => l.id != null)
      .map((l) => ({
        lineId: l.id!,
        quantiteRecue: receptionMap[l.id!]?.quantiteRecue ?? Number(l.quantite_expediee),
        motifEcart: receptionMap[l.id!]?.motifEcart || undefined,
      }));

    startTransition(async () => {
      const res = await receptionnerStockTransfertAction(transfert.id, payload, motifGlobal);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Le bon de transfert ${transfert.numero} a été clôturé et le stock de ${transfert.destination_branch_name} a été mis à jour.`,
        });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 600);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Impossible d'enregistrer la réception.",
        });
      }
    });
  };

  if (!transfert) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="lg" radius="md" color="teal" variant="light">
            <PackageCheck size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Contrôle Physique & Réception Contradictoire
            </Text>
            <Text size="xs" c="dimmed">
              Étape 2 : Confirmation d'arrivée pour {transfert.numero}
            </Text>
          </div>
        </Group>
      }
      size="xl"
      radius="lg"
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
        {/* Feedback alert */}
        {feedback && (
          <Alert
            color={feedback.type === "error" ? "red" : "teal"}
            icon={feedback.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            radius="md"
          >
            {feedback.message}
          </Alert>
        )}

        {/* Logistics itinerary banner */}
        <Paper p="sm" radius="md" withBorder style={{ background: "var(--card-subtle, var(--card))" }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <Badge variant="light" color="blue" size="md">
                {transfert.source_branch_name || "Dépôt d'origine"}
              </Badge>
              <ArrowRight size={16} className="text-gray-400" />
              <Badge variant="light" color="teal" size="md">
                {transfert.destination_branch_name || "Dépôt destinataire"}
              </Badge>
            </Group>

            <Group gap="md">
              {transfert.chauffeur_nom && (
                <Group gap={4}>
                  <Truck size={14} className="text-gray-400" />
                  <Text size="xs" fw={600}>
                    {transfert.chauffeur_nom}
                    {transfert.vehicule_matricule ? ` (${transfert.vehicule_matricule})` : ""}
                  </Text>
                </Group>
              )}
            </Group>
          </Group>
        </Paper>

        {/* Quick action: 100% conformity */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" fw={600}>
              Articles expédiés ({lines.length})
            </Text>
            <Text size="xs" c="dimmed">
              Vérifiez physiquement les quantités déchargées avant de valider l'entrée en stock.
            </Text>
          </div>
          <Button
            size="xs"
            variant="light"
            color="teal"
            leftSection={<Check size={14} />}
            onClick={handleFill100Percent}
          >
            Tout conforme (100%)
          </Button>
        </Group>

        {/* Verification table */}
        <Paper radius="md" withBorder style={{ overflow: "hidden" }}>
          <Table verticalSpacing="xs" striped highlightOnHover>
            <Table.Thead style={{ background: "var(--bg-subtle, #f8fafc)" }}>
              <Table.Tr>
                <Table.Th style={{ fontSize: "12px", width: "38%" }}>Article</Table.Th>
                <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "16%" }}>
                  Qté Expédiée
                </Table.Th>
                <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "18%" }}>
                  Qté Reçue
                </Table.Th>
                <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "12%" }}>
                  Écart
                </Table.Th>
                <Table.Th style={{ fontSize: "12px", width: "26%" }}>Motif / Avarie</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line) => {
                const lineId = line.id!;
                const qteExp = Number(line.quantite_expediee);
                const qteRec = receptionMap[lineId]?.quantiteRecue ?? qteExp;
                const ecart = qteRec - qteExp;
                const isShortage = ecart < 0;
                const isSurplus = ecart > 0;

                return (
                  <Table.Tr key={lineId}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {line.designation}
                      </Text>
                      {line.produit_ref && (
                        <Text size="11px" c="dimmed">
                          Réf: {line.produit_ref}
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Badge variant="outline" color="gray" size="lg">
                        {qteExp} {line.unite || "u"}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <NumberInput
                        size="xs"
                        min={0}
                        value={qteRec}
                        onChange={(val) => handleQuantityChange(lineId, val)}
                        styles={{
                          input: {
                            textAlign: "center",
                            fontWeight: 700,
                            borderColor: isShortage
                              ? "var(--mantine-color-red-6)"
                              : isSurplus
                              ? "var(--mantine-color-blue-6)"
                              : undefined,
                          },
                        }}
                      />
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      {ecart === 0 ? (
                        <Badge variant="light" color="teal" size="sm">
                          Conforme
                        </Badge>
                      ) : isShortage ? (
                        <Badge variant="filled" color="red" size="sm">
                          {ecart} {line.unite || "u"}
                        </Badge>
                      ) : (
                        <Badge variant="filled" color="blue" size="sm">
                          +{ecart} {line.unite || "u"}
                        </Badge>
                      )}
                    </Table.Td>

                    <Table.Td>
                      {isShortage ? (
                        <Select
                          size="xs"
                          placeholder="Motif manquant/avarie *"
                          data={MOTIFS_ECART_COMMUNS}
                          value={receptionMap[lineId]?.motifEcart || null}
                          onChange={(val) => handleMotifChange(lineId, val || "")}
                          error={!receptionMap[lineId]?.motifEcart?.trim()}
                        />
                      ) : (
                        <Text size="xs" c="dimmed">
                          R.A.S.
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Shortage or damage alert */}
        {totalEcart < 0 && (
          <Alert
            color="red"
            icon={<AlertTriangle size={18} />}
            title={`Écart global constaté : ${Math.abs(totalEcart)} pièce(s) manquante(s)`}
            radius="md"
          >
            Une écriture de type <strong>Perte de Transport</strong> sera automatiquement consignée
            dans le grand livre de stock pour tracer la responsabilité du transporteur.
          </Alert>
        )}

        {/* Global notes / observations */}
        <Textarea
          label="Observations contradictoires du réceptionnaire"
          placeholder="Remarques éventuelles sur l'état de l'emballage, le scellé, l'horaire de livraison..."
          minRows={2}
          value={motifGlobal}
          onChange={(e) => setMotifGlobal(e.currentTarget.value)}
        />

        <Divider />

        {/* Footer actions */}
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Expédié : <strong>{totalExpedie}</strong> | Reçu :{" "}
              <strong className={totalEcart < 0 ? "text-red-600" : "text-teal-600"}>
                {totalRecu}
              </strong>
            </Text>
          </Group>

          <Group gap="sm">
            <Button variant="default" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              color="teal"
              leftSection={<CheckCircle2 size={16} />}
              onClick={handleSubmit}
              loading={isPending}
            >
              Valider la Réception Physique
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
