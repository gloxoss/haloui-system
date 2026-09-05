"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { AlertCircle, QrCode, Sparkles } from "lucide-react";

import { creerSerieAction } from "@/app/actions";
import { type BranchRecord, type ProductRecord } from "@/lib/types";

type Props = {
  opened: boolean;
  onClose: () => void;
  branches: BranchRecord[];
  products: ProductRecord[];
  onSuccess?: () => void;
};

export function NouvelleSerieModal({
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
  const [numeroSerie, setNumeroSerie] = useState<string>("");
  const [documentAchatRef, setDocumentAchatRef] = useState<string>("");
  const [garantieFinDate, setGarantieFinDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.designation} ${p.code_barre ? `[${p.code_barre}]` : ""} (${p.ref || "REF"})`,
  }));

  const handleGenerateSerial = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(100000 + Math.random() * 900000);
    setNumeroSerie(`SN-${dateStr}-${rand}`);
  };

  const handleSetWarranty1Year = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setGarantieFinDate(d.toISOString().slice(0, 10));
  };

  const handleSetWarranty2Years = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    setGarantieFinDate(d.toISOString().slice(0, 10));
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
    if (!numeroSerie.trim()) {
      setError("Le numéro de série (S/N) est obligatoire.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await creerSerieAction({
        branchId: Number(branchId),
        produitId: Number(produitId),
        numeroSerie: numeroSerie.trim(),
        documentAchatRef: documentAchatRef.trim() || undefined,
        garantieFinDate: garantieFinDate || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || "Une erreur est survenue lors de l'enregistrement du numéro de série.");
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
          <QrCode size={18} className="text-indigo-600" />
          <Text fw={700} size="md">
            Enregistrer un Numéro de Série Individuel (S/N)
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
                label="Dépôt / Magasin de rattachement"
                placeholder="Sélectionner le dépôt"
                data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                value={branchId}
                onChange={(val) => setBranchId(val || "")}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Article / Appareil traçable"
                placeholder="Batterie, Compresseur, Pompe..."
                data={productOptions}
                value={produitId}
                onChange={(val) => setProduitId(val || "")}
                searchable
                required
              />
            </Grid.Col>
          </Grid>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                label="Numéro de Série Constructeur (S/N)"
                placeholder="ex: SN-BOSCH-7729103"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }} style={{ display: "flex", alignItems: "flex-end" }}>
              <Button
                variant="light"
                color="indigo"
                fullWidth
                leftSection={<Sparkles size={14} />}
                onClick={handleGenerateSerial}
              >
                Générer S/N
              </Button>
            </Grid.Col>
          </Grid>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Référence Document Achat / Facture Fournisseur"
                placeholder="ex: FACT-FOURN-2026-044"
                value={documentAchatRef}
                onChange={(e) => setDocumentAchatRef(e.currentTarget.value)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                type="date"
                label="Date d'Échéance de Garantie"
                value={garantieFinDate}
                onChange={(e) => setGarantieFinDate(e.currentTarget.value)}
              />
              <Group gap={6} mt={4}>
                <Button variant="subtle" size="compact-xs" color="gray" onClick={handleSetWarranty1Year}>
                  +1 an
                </Button>
                <Button variant="subtle" size="compact-xs" color="gray" onClick={handleSetWarranty2Years}>
                  +2 ans
                </Button>
              </Group>
            </Grid.Col>
          </Grid>

          <Textarea
            label="Informations techniques / Spécifications"
            placeholder="ex: Version firmware 2.4, testé conforme en atelier"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" color="indigo" loading={loading}>
              Enregistrer l'unité S/N
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
