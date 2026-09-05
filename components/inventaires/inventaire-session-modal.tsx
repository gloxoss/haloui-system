"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { AlertCircle, Calendar, Plus, ScanBarcode } from "lucide-react";

import { creerInventaireSessionAction } from "@/app/actions";
import {
  CATEGORIES_PRODUIT,
  INVENTAIRE_TYPE_LABELS,
  RAYONS_MAGASIN,
} from "@/lib/constants";
import { type Branch, type InventaireType } from "@/lib/types";

type Props = {
  opened: boolean;
  onClose: () => void;
  branches: Branch[];
  onSuccess?: () => void;
};

export function InventaireSessionModal({
  opened,
  onClose,
  branches,
  onSuccess,
}: Props) {
  const [branchId, setBranchId] = useState<string>(
    branches.length > 0 ? String(branches[0].id) : ""
  );
  const [typeInventaire, setTypeInventaire] = useState<InventaireType>("tournant_rayon");
  const [critereFiltre, setCritereFiltre] = useState<string>(RAYONS_MAGASIN[0]);
  const [titre, setTitre] = useState<string>(
    `Inventaire Tournant - ${RAYONS_MAGASIN[0]}`
  );
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (val: string | null) => {
    const t = (val as InventaireType) || "general";
    setTypeInventaire(t);
    if (t === "general") {
      setCritereFiltre("");
      setTitre("Inventaire Général Complet du Magasin");
    } else if (t === "tournant_rayon") {
      setCritereFiltre(RAYONS_MAGASIN[0]);
      setTitre(`Inventaire Tournant - ${RAYONS_MAGASIN[0]}`);
    } else if (t === "tournant_famille") {
      setCritereFiltre(CATEGORIES_PRODUIT[0]);
      setTitre(`Inventaire Tournant - ${CATEGORIES_PRODUIT[0]}`);
    }
  };

  const handleCritereChange = (val: string | null) => {
    const c = val || "";
    setCritereFiltre(c);
    if (c) {
      setTitre(`Inventaire Tournant - ${c}`);
    }
  };

  const handleSubmit = async () => {
    if (!branchId) {
      setError("Veuillez sélectionner un magasin / dépôt.");
      return;
    }
    if (!titre.trim()) {
      setError("Veuillez renseigner un titre pour cette session.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await creerInventaireSessionAction({
        branchId: parseInt(branchId, 10),
        titre: titre.trim(),
        typeInventaire,
        critereFiltre: critereFiltre.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Impossible de créer la session d'inventaire.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ScanBarcode size={20} color="var(--mantine-color-blue-6)" />
          <Text fw={700} size="lg">
            Nouvelle Session d'Inventaire
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" icon={<AlertCircle size={16} />} radius="md">
            {error}
          </Alert>
        )}

        <Select
          label="Magasin / Dépôt à inventorier"
          placeholder="Sélectionner le magasin"
          data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
          value={branchId}
          onChange={(val) => setBranchId(val || "")}
          required
        />

        <Select
          label="Type d'inventaire"
          description="Général complet ou tournant partiel par rayon / famille"
          data={[
            {
              value: "tournant_rayon",
              label: `${INVENTAIRE_TYPE_LABELS.tournant_rayon.label} (Recommandé)`,
            },
            {
              value: "tournant_famille",
              label: INVENTAIRE_TYPE_LABELS.tournant_famille.label,
            },
            {
              value: "general",
              label: INVENTAIRE_TYPE_LABELS.general.label,
            },
          ]}
          value={typeInventaire}
          onChange={handleTypeChange}
          required
        />

        {typeInventaire === "tournant_rayon" && (
          <Select
            label="Rayon / Emplacement ciblé"
            placeholder="Sélectionner le rayon"
            data={RAYONS_MAGASIN.map((r) => ({ value: r, label: r }))}
            value={critereFiltre}
            onChange={handleCritereChange}
            required
          />
        )}

        {typeInventaire === "tournant_famille" && (
          <Select
            label="Famille / Catégorie de produits ciblée"
            placeholder="Sélectionner la catégorie"
            data={CATEGORIES_PRODUIT.map((c) => ({ value: c, label: c }))}
            value={critereFiltre}
            onChange={handleCritereChange}
            required
          />
        )}

        <TextInput
          label="Titre descriptif de la session"
          placeholder="Ex: Inventaire Tournant - Boutique Rayon Frais"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          required
        />

        <Textarea
          label="Notes & Consignes d'inventaire"
          placeholder="Ex: Comptage physique contradictoire, vérifier DLC des produits laitiers..."
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            color="blue"
            leftSection={<Plus size={16} />}
            onClick={handleSubmit}
            loading={loading}
          >
            Initialiser la Session & Figer le Théorique
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
