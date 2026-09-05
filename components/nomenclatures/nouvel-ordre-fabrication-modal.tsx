"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Factory,
  Wrench,
} from "lucide-react";
import { lancerOrdreFabricationAction } from "@/app/actions";
import { type NomenclatureRecord, type OrdreFabricationType } from "@/lib/types";

interface NouvelOrdreFabricationModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kits: NomenclatureRecord[];
  branches: Array<{ id: number; name: string }>;
  currentBranchId?: number;
}

export function NouvelOrdreFabricationModal({
  opened,
  onClose,
  onSuccess,
  kits,
  branches,
  currentBranchId,
}: NouvelOrdreFabricationModalProps) {
  const [branchId, setBranchId] = useState<string>(
    currentBranchId ? String(currentBranchId) : (branches[0] ? String(branches[0].id) : "1")
  );
  const [produitId, setProduitId] = useState<string>("");
  const [typeOperation, setTypeOperation] = useState<OrdreFabricationType>("assemblage");
  const [quantite, setQuantite] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      if (!produitId && kits.length > 0) {
        setProduitId(String(kits[0].produit_id));
      }
      setQuantite(1);
      setError(null);
      setSuccess(null);
    }
  }, [opened, kits]);

  const selectedKit = kits.find((k) => String(k.produit_id) === produitId);

  // Vérification de la faisabilité selon les composants
  let canAssemble = true;
  const componentsCheck = (selectedKit?.composants || []).map((comp) => {
    const perte = 1 + comp.taux_perte_pourcent / 100;
    const besoinTotal = Math.round(comp.quantite * perte * (Number(quantite) || 1) * 100) / 100;
    const disponible = comp.composant_stock_actuel;
    const ok = typeOperation === "desassemblage" || disponible >= besoinTotal;
    if (!ok) canAssemble = false;

    return {
      ...comp,
      besoinTotal,
      disponible,
      ok,
    };
  });

  if (typeOperation === "desassemblage") {
    const kitDispo = selectedKit?.stock_physique_kit || 0;
    if (kitDispo < (Number(quantite) || 1)) {
      canAssemble = false;
    }
  }

  const handleSubmit = async () => {
    if (!produitId) {
      setError("Veuillez sélectionner le kit à fabriquer.");
      return;
    }
    if (!quantite || quantite <= 0) {
      setError("La quantité doit être supérieure à zéro.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await lancerOrdreFabricationAction({
        branchId: Number(branchId),
        produitId: Number(produitId),
        typeOperation,
        quantite: Number(quantite),
        notes,
      });

      if (!res.success) {
        setError(res.error || "Erreur lors de la création de l'ordre de fabrication.");
      } else {
        setSuccess(`Ordre ${res.ofRecord?.numero} exécuté avec succès ! Mouvements de stock appliqués.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="teal" variant="light" size="lg" radius="md">
            <Factory size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Lancer une Fabrication / Assemblage en Atelier
            </Text>
            <Text size="xs" c="dimmed">
              Consommation automatique des composants et entrée en stock du produit fini
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="lg"
      padding="lg"
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<AlertCircle size={16} />} color="red" radius="md" title="Erreur">
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<CheckCircle2 size={16} />} color="teal" radius="md" title="Fabrication Validée">
            {success}
          </Alert>
        )}

        {/* Sélection Dépôt et Kit */}
        <Group grow align="flex-start">
          <Select
            label="Dépôt / Magasin d'Atelier"
            placeholder="Choisir dépôt..."
            data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
            value={branchId}
            onChange={(val) => setBranchId(val || "1")}
            required
          />

          <Select
            label="Pack / Kit à Fabriquer"
            placeholder="Choisir kit..."
            data={kits.map((k) => ({
              value: String(k.produit_id),
              label: `[${k.produit_ref}] ${k.produit_designation}`,
            }))}
            value={produitId}
            onChange={(val) => setProduitId(val || "")}
            required
            searchable
          />
        </Group>

        {/* Type d'opération et quantité */}
        <Paper p="sm" radius="md" withBorder>
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={600} mb={6}>Type d'Opération</Text>
              <RadioGroup
                value={typeOperation}
                onChange={(val) => setTypeOperation(val as OrdreFabricationType)}
              >
                <Group gap="md">
                  <Radio value="assemblage" label="Assemblage (Composants ➔ Kit)" />
                  <Radio value="desassemblage" label="Désassemblage (Kit ➔ Composants)" />
                </Group>
              </RadioGroup>
            </div>

            <div style={{ width: 160 }}>
              <NumberInput
                label="Quantité à produire"
                value={quantite}
                onChange={(val) => setQuantite(Number(val) || 1)}
                min={1}
                step={1}
                required
              />
            </div>
          </Group>
        </Paper>

        {/* Aperçu du stock virtuel disponible */}
        {selectedKit && (
          <Paper p="sm" radius="md" withBorder bg="gray.0">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">Disponibilité actuelle du kit :</Text>
                <Group gap="xs" mt={2}>
                  <Badge color="blue" variant="light">
                    Stock physique en rayon : {selectedKit.stock_physique_kit} u
                  </Badge>
                  <Badge color="teal" variant="light">
                    Stock virtuel fabricable max : {selectedKit.stock_virtuel_fabricable} u
                  </Badge>
                </Group>
              </div>

              <div style={{ textAlign: "right" }}>
                <Text size="xs" c="dimmed">Coût de fabrication estimé :</Text>
                <Text fw={700} size="md" c="indigo.8">
                  {(selectedKit.cout_revient_ht * (Number(quantite) || 1)).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  DH HT
                </Text>
              </div>
            </Group>
          </Paper>
        )}

        {/* Liste des composants et contrôle de stock */}
        {selectedKit && (
          <div>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
              Bilan des Matières & Composants Nécessaires
            </Text>
            <Paper radius="md" withBorder style={{ overflow: "hidden" }}>
              <Table striped verticalSpacing="xs">
                <Table.Thead bg="gray.1">
                  <Table.Tr>
                    <Table.Th>Composant</Table.Th>
                    <Table.Th>Requis / U</Table.Th>
                    <Table.Th>Total Requis</Table.Th>
                    <Table.Th>Stock Actuel</Table.Th>
                    <Table.Th ta="center">Statut</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {componentsCheck.map((comp) => (
                    <Table.Tr key={comp.composant_id}>
                      <Table.Td>
                        <Text size="xs" fw={600}>{comp.composant_designation}</Text>
                        <Text size="10px" c="dimmed">{comp.composant_ref}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          {comp.quantite} {comp.unite}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={600}>
                          {comp.besoinTotal} {comp.unite}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c={comp.ok ? "teal.8" : "red.7"} fw={600}>
                          {comp.disponible} {comp.unite}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        {comp.ok ? (
                          <Badge color="teal" size="xs" variant="light">
                            Disponible
                          </Badge>
                        ) : (
                          <Badge color="red" size="xs" variant="filled">
                            Manquant
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </div>
        )}

        {!canAssemble && (
          <Alert icon={<AlertTriangle size={16} />} color="orange" radius="md">
            {typeOperation === "assemblage"
              ? "Stock insuffisant sur certains composants pour fabriquer cette quantité. Veuillez approvisionner les composants manquants ou réduire la quantité."
              : "Stock physique du produit fini insuffisant pour réaliser ce désassemblage."}
          </Alert>
        )}

        <Textarea
          label="Notes ou Instructions d'Atelier (Optionnel)"
          placeholder="Ex: Assemblage pour commande client urgent..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          size="xs"
        />

        <Divider />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            color="teal"
            onClick={handleSubmit}
            loading={loading}
            disabled={!canAssemble || !produitId || quantite <= 0}
            leftSection={<Wrench size={16} />}
          >
            {typeOperation === "assemblage" ? "Valider la Fabrication" : "Valider le Démontage"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
