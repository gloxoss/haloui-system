"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Plus,
  Send,
  Trash2,
  Truck,
  Warehouse,
} from "lucide-react";

import {
  expedierStockTransfertAction,
  getBranchStockMapAction,
  saveStockTransfertDraftAction,
} from "@/app/actions";
import {
  type BranchRecord,
  type ProductRecord,
  type StockTransfertRecord,
} from "@/lib/types";

type Props = {
  opened: boolean;
  onClose: () => void;
  transfertToEdit?: StockTransfertRecord | null;
  branches: BranchRecord[];
  products: ProductRecord[];
  currentBranchId?: number;
  onSuccess?: () => void;
};

type TransfertLineInput = {
  produitId: number | null;
  designation: string;
  unite: string;
  quantiteExpediee: number;
};

export function TransfertModal({
  opened,
  onClose,
  transfertToEdit,
  branches,
  products,
  currentBranchId,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const [sourceBranchId, setSourceBranchId] = useState<string>(
    transfertToEdit?.source_branch_id
      ? String(transfertToEdit.source_branch_id)
      : String(currentBranchId || branches[0]?.id || "")
  );
  const [destinationBranchId, setDestinationBranchId] = useState<string>(
    transfertToEdit?.destination_branch_id
      ? String(transfertToEdit.destination_branch_id)
      : String(branches.find((b) => b.id !== (currentBranchId || branches[0]?.id))?.id || "")
  );

  const [dateTransfert, setDateTransfert] = useState(
    transfertToEdit?.date_transfert || new Date().toISOString().slice(0, 10)
  );
  const [chauffeurNom, setChauffeurNom] = useState(transfertToEdit?.chauffeur_nom || "");
  const [vehiculeMatricule, setVehiculeMatricule] = useState(transfertToEdit?.vehicule_matricule || "");
  const [bonTransportRef, setBonTransportRef] = useState(transfertToEdit?.bon_transport_ref || "");
  const [notes, setNotes] = useState(transfertToEdit?.notes || "");

  const [lignes, setLignes] = useState<TransfertLineInput[]>([]);
  const [sourceStockMap, setSourceStockMap] = useState<Record<number, number>>({});

  // Reset or initialize on open
  useEffect(() => {
    if (opened) {
      setFeedback(null);
      if (transfertToEdit) {
        setSourceBranchId(String(transfertToEdit.source_branch_id));
        setDestinationBranchId(String(transfertToEdit.destination_branch_id));
        setDateTransfert(transfertToEdit.date_transfert || new Date().toISOString().slice(0, 10));
        setChauffeurNom(transfertToEdit.chauffeur_nom || "");
        setVehiculeMatricule(transfertToEdit.vehicule_matricule || "");
        setBonTransportRef(transfertToEdit.bon_transport_ref || "");
        setNotes(transfertToEdit.notes || "");
        setLignes(
          (transfertToEdit.lignes || []).map((l) => ({
            produitId: l.produit_id,
            designation: l.designation,
            unite: l.unite || "u",
            quantiteExpediee: Number(l.quantite_expediee),
          }))
        );
      } else {
        const srcId = currentBranchId || branches[0]?.id;
        const dest = branches.find((b) => b.id !== srcId)?.id;
        setSourceBranchId(String(srcId || ""));
        setDestinationBranchId(dest ? String(dest) : "");
        setDateTransfert(new Date().toISOString().slice(0, 10));
        setChauffeurNom("");
        setVehiculeMatricule("");
        setBonTransportRef("");
        setNotes("");
        setLignes([
          {
            produitId: null,
            designation: "",
            unite: "u",
            quantiteExpediee: 1,
          },
        ]);
      }
    }
  }, [opened, transfertToEdit, branches, currentBranchId]);

  // Load live stock for source branch whenever sourceBranchId changes
  useEffect(() => {
    if (!sourceBranchId) return;
    const bid = parseInt(sourceBranchId, 10);
    if (isNaN(bid)) return;

    getBranchStockMapAction(bid).then((res) => {
      if (res.success) {
        setSourceStockMap(res.stockMap);
      }
    });
  }, [sourceBranchId]);

  const handleAddLine = () => {
    setLignes((prev) => [
      ...prev,
      {
        produitId: null,
        designation: "",
        unite: "u",
        quantiteExpediee: 1,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, val: string | null) => {
    if (!val) return;
    const pId = parseInt(val, 10);
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    setLignes((prev) => {
      const copy = [...prev];
      copy[index] = {
        produitId: prod.id,
        designation: prod.designation,
        unite: prod.unite || "u",
        quantiteExpediee: copy[index]?.quantiteExpediee || 1,
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, val: number | string) => {
    const num = Math.max(1, typeof val === "number" ? val : parseFloat(val) || 1);
    setLignes((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index].quantiteExpediee = num;
      }
      return copy;
    });
  };

  const branchOptions = branches.map((b) => ({
    value: String(b.id),
    label: b.name,
  }));

  const productOptions = products.map((p) => {
    const stockDispo = p.id ? sourceStockMap[p.id] ?? 0 : 0;
    return {
      value: String(p.id),
      label: `${p.ref ? `[${p.ref}] ` : ""}${p.designation} (Stock dispo: ${stockDispo} ${p.unite || "u"})`,
    };
  });

  const validLines = lignes.filter((l) => l.produitId && l.quantiteExpediee > 0);
  const totalQuantite = validLines.reduce((sum, l) => sum + l.quantiteExpediee, 0);

  const validate = () => {
    if (!sourceBranchId || !destinationBranchId) {
      setFeedback({
        type: "error",
        message: "Veuillez sélectionner le dépôt de départ et le dépôt d'arrivée.",
      });
      return false;
    }
    if (sourceBranchId === destinationBranchId) {
      setFeedback({
        type: "error",
        message: "Le dépôt source et le dépôt de destination doivent être différents.",
      });
      return false;
    }
    if (validLines.length === 0) {
      setFeedback({
        type: "error",
        message: "Veuillez ajouter au moins un article avec une quantité valide.",
      });
      return false;
    }
    return true;
  };

  // Save Draft
  const handleSaveDraft = () => {
    if (!validate()) return;

    startTransition(async () => {
      const res = await saveStockTransfertDraftAction({
        id: transfertToEdit?.id,
        sourceBranchId: parseInt(sourceBranchId, 10),
        destinationBranchId: parseInt(destinationBranchId, 10),
        chauffeurNom,
        vehiculeMatricule,
        bonTransportRef,
        notes,
        dateTransfert,
        lignes: validLines.map((l) => ({
          produitId: l.produitId!,
          designation: l.designation,
          unite: l.unite,
          quantiteExpediee: l.quantiteExpediee,
        })),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Le bon de transfert a été enregistré en brouillon avec succès.",
        });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 500);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Impossible d'enregistrer le transfert.",
        });
      }
    });
  };

  // Dispatch immediately (Step 1)
  const handleExpedierDirect = () => {
    if (!validate()) return;

    startTransition(async () => {
      const saveRes = await saveStockTransfertDraftAction({
        id: transfertToEdit?.id,
        sourceBranchId: parseInt(sourceBranchId, 10),
        destinationBranchId: parseInt(destinationBranchId, 10),
        chauffeurNom,
        vehiculeMatricule,
        bonTransportRef,
        notes,
        dateTransfert,
        lignes: validLines.map((l) => ({
          produitId: l.produitId!,
          designation: l.designation,
          unite: l.unite,
          quantiteExpediee: l.quantiteExpediee,
        })),
      });

      if (!saveRes.success || !saveRes.id) {
        setFeedback({
          type: "error",
          message: saveRes.error || "Échec lors de la création du bon.",
        });
        return;
      }

      const expRes = await expedierStockTransfertAction(saveRes.id, {
        chauffeurNom,
        vehiculeMatricule,
        bonTransportRef,
        notes,
      });

      if (expRes.success) {
        setFeedback({
          type: "success",
          message: "Expédition validée (Étape 1). Le stock a été débité du magasin de départ et placé 'En transit'.",
        });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 700);
      } else {
        setFeedback({
          type: "error",
          message: expRes.error || "Échec lors de l'expédition.",
        });
      }
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <Boxes size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              {transfertToEdit ? `Modifier le Bon ${transfertToEdit.numero}` : "Nouveau Bon de Transfert Inter-Dépôts"}
            </Text>
            <Text size="xs" c="dimmed">
              Étape 1 : Préparation & Expédition vers un autre magasin
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
        {/* Inline Feedback */}
        {feedback && (
          <Alert
            color={feedback.type === "error" ? "red" : "teal"}
            icon={feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            radius="md"
          >
            {feedback.message}
          </Alert>
        )}

        {/* Depots Configuration */}
        <Paper p="md" radius="md" withBorder style={{ background: "var(--card-subtle, var(--card))" }}>
          <Grid gutter="md" align="flex-end">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Select
                label="Dépôt d'origine (Source) *"
                placeholder="Sélectionner le dépôt source"
                data={branchOptions}
                value={sourceBranchId}
                onChange={(val) => setSourceBranchId(val || "")}
                leftSection={<Warehouse size={16} className="text-blue-500" />}
                searchable
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 2 }} className="text-center pb-2 hidden sm:block">
              <ArrowRight size={20} className="text-gray-400 mx-auto" />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Select
                label="Dépôt de destination (Arrivée) *"
                placeholder="Sélectionner le magasin destinataire"
                data={branchOptions.filter((b) => b.value !== sourceBranchId)}
                value={destinationBranchId}
                onChange={(val) => setDestinationBranchId(val || "")}
                leftSection={<Warehouse size={16} className="text-teal-500" />}
                searchable
                error={sourceBranchId === destinationBranchId ? "Ne peut pas être identique à la source" : undefined}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Transport & Driver metadata */}
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.08em" }}>
            Informations Transporteur & Logistique
          </Text>
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Chauffeur / Transporteur"
                placeholder="Ex: Mohamed Alami"
                value={chauffeurNom}
                onChange={(e) => setChauffeurNom(e.currentTarget.value)}
                leftSection={<Truck size={14} className="text-gray-400" />}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Matricule du véhicule"
                placeholder="Ex: 12345-A-26"
                value={vehiculeMatricule}
                onChange={(e) => setVehiculeMatricule(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Réf. Bon de transport / Lettre de voiture"
                placeholder="Ex: LV-88301"
                value={bonTransportRef}
                onChange={(e) => setBonTransportRef(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Articles Table */}
        <Paper radius="md" withBorder style={{ overflow: "hidden" }}>
          <Group justify="space-between" p="sm" style={{ borderBottom: "1px solid var(--border-light)" }}>
            <Group gap="xs">
              <Text size="sm" fw={700}>
                Articles à Transférer
              </Text>
              <Badge variant="light" color="blue" size="sm">
                {validLines.length} article(s) • Total: {totalQuantite} pièces
              </Badge>
            </Group>
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<Plus size={14} />}
              onClick={handleAddLine}
            >
              Ajouter un article
            </Button>
          </Group>

          <Table verticalSpacing="xs">
            <Table.Thead style={{ background: "var(--bg-subtle, #f8fafc)" }}>
              <Table.Tr>
                <Table.Th style={{ fontSize: "12px", width: "50%" }}>Article du catalogue</Table.Th>
                <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "18%" }}>Stock Disponible</Table.Th>
                <Table.Th style={{ fontSize: "12px", textAlign: "center", width: "22%" }}>Qté à transférer</Table.Th>
                <Table.Th style={{ width: "10%" }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lignes.map((ligne, idx) => {
                const stockDispo = ligne.produitId ? sourceStockMap[ligne.produitId] ?? 0 : 0;
                const isOverStock = ligne.quantiteExpediee > stockDispo;

                return (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Select
                        size="xs"
                        placeholder="Choisir un produit..."
                        data={productOptions}
                        value={ligne.produitId ? String(ligne.produitId) : null}
                        onChange={(val) => handleProductSelect(idx, val)}
                        searchable
                      />
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      {ligne.produitId ? (
                        <Badge
                          variant="light"
                          color={stockDispo > 0 ? "teal" : "red"}
                          size="sm"
                        >
                          {stockDispo} {ligne.unite || "u"}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">-</Text>
                      )}
                    </Table.Td>

                    <Table.Td>
                      <NumberInput
                        size="xs"
                        min={1}
                        value={ligne.quantiteExpediee}
                        onChange={(val) => handleQuantityChange(idx, val)}
                        styles={{
                          input: {
                            textAlign: "center",
                            fontWeight: 700,
                            borderColor: isOverStock ? "var(--mantine-color-amber-6)" : undefined,
                          },
                        }}
                      />
                      {isOverStock && (
                        <Text size="10px" c="orange" ta="center">
                          Dépasse le stock dispo ({stockDispo})
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Tooltip label="Supprimer la ligne">
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lignes.length === 1}
                        >
                          <Trash2 size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Notes */}
        <Textarea
          label="Motif du transfert & Instructions particulières"
          placeholder="Ex: Réapprovisionnement hebdomadaire, demande client prioritaire..."
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Divider />

        {/* Action Buttons */}
        <Group justify="space-between">
          <Button variant="default" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>

          <Group gap="sm">
            <Button
              variant="outline"
              color="gray"
              onClick={handleSaveDraft}
              loading={isPending}
            >
              Enregistrer comme Brouillon
            </Button>
            <Button
              color="blue"
              leftSection={<Send size={16} />}
              onClick={handleExpedierDirect}
              loading={isPending}
            >
              Expédier Immédiatement (Étape 1)
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
