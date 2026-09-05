"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { Check, PackagePlus } from "lucide-react";
import { assignerProduitEmplacementAction } from "@/app/actions";
import { BranchRecord, EmplacementRecord, ProductRecord } from "@/lib/types";

interface Props {
  opened: boolean;
  onClose: () => void;
  products: ProductRecord[];
  emplacements: EmplacementRecord[];
  branches: BranchRecord[];
  currentBranchId?: number;
  onSuccess: () => void;
}

export function AssignerEmplacementModal({
  opened,
  onClose,
  products,
  emplacements,
  branches,
  currentBranchId,
  onSuccess,
}: Props) {
  const [branchId, setBranchId] = useState<string>(
    currentBranchId ? String(currentBranchId) : (branches[0] ? String(branches[0].id) : "1")
  );
  const [produitId, setProduitId] = useState<string | null>(null);
  const [emplacementId, setEmplacementId] = useState<string | null>(null);
  const [quantite, setQuantite] = useState<number>(0);
  const [capaciteMax, setCapaciteMax] = useState<number>(100);
  const [estPrincipal, setEstPrincipal] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!produitId || !emplacementId) {
      setError("Veuillez sélectionner un article et un emplacement.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await assignerProduitEmplacementAction({
        branchId: Number(branchId),
        produitId: Number(produitId),
        emplacementId: Number(emplacementId),
        quantite: Number(quantite) || 0,
        capaciteMax: Number(capaciteMax) || 100,
        estPrincipal,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Erreur lors de l'assignation.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
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
          <PackagePlus size={18} />
          <Text fw={700}>Assigner un Article à un Emplacement WMS</Text>
        </Group>
      }
      size="md"
      radius="lg"
    >
      <Stack gap="md">
        {error && (
          <Text size="xs" c="red" fw={500}>
            {error}
          </Text>
        )}

        {branches.length > 0 && (
          <Select
            label="Dépôt"
            data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
            value={branchId}
            onChange={(val) => setBranchId(val || "1")}
          />
        )}

        <Select
          label="Article / Produit"
          placeholder="Rechercher par référence ou nom..."
          searchable
          clearable
          data={products.map((p) => ({
            value: String(p.id),
            label: `${p.ref} - ${p.designation} (${p.categorie})`,
          }))}
          value={produitId}
          onChange={setProduitId}
        />

        <Select
          label="Emplacement / Bac de Stockage"
          placeholder="Sélectionner un emplacement..."
          searchable
          clearable
          data={emplacements.map((e) => ({
            value: String(e.id),
            label: `📍 ${e.code_emplacement} (Zone ${e.zone}, Allée ${e.allee} - ${e.type_emplacement})`,
          }))}
          value={emplacementId}
          onChange={setEmplacementId}
        />

        <Grid gutter="sm">
          <Grid.Col span={6}>
            <NumberInput
              label="Quantité Actuelle en Bac"
              min={0}
              value={quantite}
              onChange={(val) => setQuantite(Number(val) || 0)}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Capacité Max du Bac"
              min={1}
              value={capaciteMax}
              onChange={(val) => setCapaciteMax(Number(val) || 100)}
            />
          </Grid.Col>
        </Grid>

        <Checkbox
          label="Définir comme emplacement principal de picking"
          description="Cet emplacement s'affichera par défaut sur les bons de livraison et factures"
          checked={estPrincipal}
          onChange={(e) => setEstPrincipal(e.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            color="teal"
            leftSection={<Check size={16} />}
            loading={loading}
            onClick={handleAssign}
          >
            Assigner l&apos;Article
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
