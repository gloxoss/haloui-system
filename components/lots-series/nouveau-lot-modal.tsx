"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { AlertCircle, Calendar, Package, Plus, Sparkles, Tag } from "lucide-react";

import { creerLotAction } from "@/app/actions";
import { type BranchRecord, type ProductRecord } from "@/lib/types";

type Props = {
  opened: boolean;
  onClose: () => void;
  branches: BranchRecord[];
  products: ProductRecord[];
  onSuccess?: () => void;
};

export function NouveauLotModal({
  opened,
  onClose,
  branches,
  products,
  onSuccess,
}: Props) {
  const [branchId, setBranchId] = useState<string>(
    branches.length > 0 ? String(branches[0].id) : ""
  );
  const [produitId, setProduitId] = useState<string>("");
  const [numeroLot, setNumeroLot] = useState<string>("");
  const [dateFabrication, setDateFabrication] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [datePeremption, setDatePeremption] = useState<string>("");
  const [quantiteInitiale, setQuantiteInitiale] = useState<number>(50);
  const [coutUnitaireHt, setCoutUnitaireHt] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.designation} ${p.code_barre ? `[${p.code_barre}]` : ""} (${p.ref || "REF"})`,
  }));

  const handleProductSelect = (idStr: string | null) => {
    setProduitId(idStr || "");
    if (idStr) {
      const p = products.find((prod) => String(prod.id) === idStr);
      if (p) {
        setCoutUnitaireHt(Number(p.prix_ht || 0));
      }
    }
  };

  const handleGenerateLotNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    setNumeroLot(`LOT-${dateStr}-${rand}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setError("Veuillez sélectionner un magasin ou dépôt.");
      return;
    }
    if (!produitId) {
      setError("Veuillez choisir un article.");
      return;
    }
    if (!numeroLot.trim()) {
      setError("Le numéro de lot est obligatoire.");
      return;
    }
    if (!datePeremption) {
      setError("La date limite de consommation (DLC / DLUO) est obligatoire.");
      return;
    }
    if (quantiteInitiale <= 0) {
      setError("La quantité doit être supérieure à zéro.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await creerLotAction({
        branchId: Number(branchId),
        produitId: Number(produitId),
        numeroLot: numeroLot.trim(),
        dateFabrication: dateFabrication || undefined,
        datePeremption,
        quantiteInitiale,
        coutUnitaireHt,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || "Une erreur est survenue lors de l'enregistrement du lot.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
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
          <Tag size={18} className="text-teal-600" />
          <Text fw={700} size="md">
            Enregistrer un Nouveau Lot & Date DLC/DLUO
          </Text>
        </Group>
      }
      size="lg"
      radius="xl"
      padding="xl"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && (
            <Alert
              icon={<AlertCircle size={16} />}
              color="red"
              radius="md"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Dépôt / Magasin de stockage"
                placeholder="Sélectionner le dépôt"
                data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                value={branchId}
                onChange={(val) => setBranchId(val || "")}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Article / Produit sensible"
                placeholder="Rechercher par nom ou code-barres"
                data={productOptions}
                value={produitId}
                onChange={handleProductSelect}
                searchable
                required
              />
            </Grid.Col>
          </Grid>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                label="Numéro de Lot Fournisseur / Interne"
                placeholder="ex: LOT-2026-COCA-01"
                value={numeroLot}
                onChange={(e) => setNumeroLot(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }} style={{ display: "flex", alignItems: "flex-end" }}>
              <Button
                variant="light"
                color="teal"
                fullWidth
                leftSection={<Sparkles size={14} />}
                onClick={handleGenerateLotNumber}
              >
                Générer N°
              </Button>
            </Grid.Col>
          </Grid>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                type="date"
                label="Date de Péremption (DLC / DLUO)"
                description="Seuil d'alerte et blocage automatique"
                value={datePeremption}
                onChange={(e) => setDatePeremption(e.currentTarget.value)}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                type="date"
                label="Date de Fabrication (Optionnelle)"
                description="Traçabilité usine / conditionnement"
                value={dateFabrication}
                onChange={(e) => setDateFabrication(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Quantité initiale reçue"
                placeholder="50"
                min={1}
                value={quantiteInitiale}
                onChange={(val) => setQuantiteInitiale(Number(val) || 1)}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Coût d'achat unitaire HT (MAD)"
                placeholder="0.00"
                decimalScale={2}
                value={coutUnitaireHt}
                onChange={(val) => setCoutUnitaireHt(Number(val) || 0)}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Notes de traçabilité / Localisation en réserve"
            placeholder="ex: Palette A3 - Chambre froide négative - Fournisseur Sodipral"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" color="teal" loading={loading}>
              Enregistrer le lot
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
