"use client";

import { useState } from "react";
import {
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Check, Settings } from "lucide-react";
import { mettreAJourSeuilsProduitAction } from "@/app/actions";
import { ReapproSuggestionRecord } from "@/lib/types";

interface Props {
  opened: boolean;
  onClose: () => void;
  product: ReapproSuggestionRecord | null;
  fournisseurs: Array<{ id: number; nom: string }>;
  onSuccess: () => void;
}

export function ConfigSeuilsModal({
  opened,
  onClose,
  product,
  fournisseurs,
  onSuccess,
}: Props) {
  if (!product) return null;

  const [stockMin, setStockMin] = useState<number>(product.stock_minimum);
  const [stockMax, setStockMax] = useState<number>(product.stock_maximum);
  const [delaiJours, setDelaiJours] = useState<number>(product.delai_livraison_jours);
  const [fournisseurId, setFournisseurId] = useState<string | null>(
    product.fournisseur_id ? String(product.fournisseur_id) : null
  );
  const [conditionnement, setConditionnement] = useState<number>(
    product.conditionnement_achat || 1
  );
  const [emplacementCode, setEmplacementCode] = useState<string>(
    product.emplacement_code || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mettreAJourSeuilsProduitAction(product.produit_id, {
        stock_minimum: Number(stockMin),
        stock_maximum: Number(stockMax),
        delai_livraison_jours: Number(delaiJours),
        fournisseur_principal_id: fournisseurId ? Number(fournisseurId) : null,
        conditionnement_achat: Number(conditionnement),
        emplacement_code: emplacementCode.trim(),
      });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Erreur lors de la mise à jour");
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
          <Settings size={18} />
          <Text fw={700}>Paramètres de Réapprovisionnement</Text>
        </Group>
      }
      size="lg"
      radius="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Ajustement des seuils de réapprovisionnement pour :{" "}
          <strong>
            {product.reference} - {product.designation}
          </strong>
        </Text>

        {error && (
          <Text size="xs" c="red" fw={500}>
            {error}
          </Text>
        )}

        <Grid gutter="sm">
          <Grid.Col span={6}>
            <NumberInput
              label="Stock Minimum (Sécurité)"
              description="Seuil d'alerte critique"
              min={0}
              value={stockMin}
              onChange={(val) => setStockMin(Number(val) || 0)}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Stock Maximum Cible"
              description="Niveau max de stockage"
              min={stockMin}
              value={stockMax}
              onChange={(val) => setStockMax(Number(val) || 0)}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <NumberInput
              label="Délai Fournisseur (Jours)"
              description="Délai moyen d'approvisionnement"
              min={1}
              value={delaiJours}
              onChange={(val) => setDelaiJours(Number(val) || 1)}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <NumberInput
              label="Colisage d'Achat (Conditionnement)"
              description="Arrondi aux multiples (ex: carton de 6 ou 12)"
              min={1}
              value={conditionnement}
              onChange={(val) => setConditionnement(Number(val) || 1)}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Select
              label="Fournisseur Principal"
              description="Fournisseur par défaut pour les bons de commande automatiques"
              placeholder="Sélectionner un fournisseur"
              clearable
              data={fournisseurs.map((f) => ({
                value: String(f.id),
                label: f.nom,
              }))}
              value={fournisseurId}
              onChange={setFournisseurId}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <TextInput
              label="Code Emplacement WMS"
              description="Emplacement de stockage habituel (ex: A-01-02-1-A)"
              placeholder="Zone-Allée-Travée-Niveau-Bac"
              value={emplacementCode}
              onChange={(e) => setEmplacementCode(e.currentTarget.value)}
            />
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            color="teal"
            leftSection={<Check size={16} />}
            loading={loading}
            onClick={handleSave}
          >
            Enregistrer les Seuils
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
