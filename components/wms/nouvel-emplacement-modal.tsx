"use client";

import { useState } from "react";
import {
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { Check, Grid3X3, MapPin, Plus } from "lucide-react";
import {
  creerEmplacementAction,
  genererMatriceEmplacementsAction,
} from "@/app/actions";
import { BranchRecord, EmplacementType } from "@/lib/types";
import { TYPES_EMPLACEMENT_LABELS, ZONES_ENTREPOT_DEFAULT } from "@/lib/constants";

interface Props {
  opened: boolean;
  onClose: () => void;
  branches: BranchRecord[];
  currentBranchId?: number;
  onSuccess: () => void;
}

export function NouvelEmplacementModal({
  opened,
  onClose,
  branches,
  currentBranchId,
  onSuccess,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single location form
  const [branchId, setBranchId] = useState<string>(
    currentBranchId ? String(currentBranchId) : (branches[0] ? String(branches[0].id) : "1")
  );
  const [zone, setZone] = useState<string>("A");
  const [allee, setAllee] = useState<string>("01");
  const [travee, setTravee] = useState<string>("01");
  const [niveau, setNiveau] = useState<string>("1");
  const [bac, setBac] = useState<string>("A");
  const [typeEmp, setTypeEmp] = useState<EmplacementType>("picking");
  const [capaciteKg, setCapaciteKg] = useState<number>(100);
  const [notes, setNotes] = useState<string>("");

  // Matrix generation form
  const [matrixZone, setMatrixZone] = useState<string>("A");
  const [matrixAllees, setMatrixAllees] = useState<string>("01, 02");
  const [matrixNbTravees, setMatrixNbTravees] = useState<number>(4);
  const [matrixNbNiveaux, setMatrixNbNiveaux] = useState<number>(3);
  const [matrixBacs, setMatrixBacs] = useState<string>("A, B");
  const [matrixTypeEmp, setMatrixTypeEmp] = useState<EmplacementType>("picking");

  const singleCodePreview = `${zone.trim().toUpperCase()}-${allee.trim().toUpperCase().padStart(2, "0")}-${travee.trim().toUpperCase().padStart(2, "0")}-${niveau.trim().toUpperCase()}-${bac.trim().toUpperCase()}`;

  const matrixTotalEstimate = (() => {
    const alleesList = matrixAllees.split(",").map((a) => a.trim()).filter(Boolean);
    const bacsList = matrixBacs.split(",").map((b) => b.trim()).filter(Boolean);
    return alleesList.length * (Number(matrixNbTravees) || 0) * (Number(matrixNbNiveaux) || 0) * bacsList.length;
  })();

  const handleCreateSingle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await creerEmplacementAction({
        branchId: Number(branchId),
        zone,
        allee,
        travee,
        niveau,
        bac,
        type_emplacement: typeEmp,
        capacite_max_kg: Number(capaciteKg) || 100,
        notes,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Erreur lors de la création.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const alleesList = matrixAllees.split(",").map((a) => a.trim()).filter(Boolean);
      const bacsList = matrixBacs.split(",").map((b) => b.trim()).filter(Boolean);

      if (alleesList.length === 0 || bacsList.length === 0) {
        setError("Veuillez renseigner au moins une allée et un bac.");
        setLoading(false);
        return;
      }

      const res = await genererMatriceEmplacementsAction({
        branchId: Number(branchId),
        zone: matrixZone,
        allees: alleesList,
        nbTravees: Number(matrixNbTravees) || 1,
        nbNiveaux: Number(matrixNbNiveaux) || 1,
        bacsParNiveau: bacsList,
        type_emplacement: matrixTypeEmp,
        capacite_max_kg: Number(capaciteKg) || 100,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Erreur lors de la génération.");
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
          <MapPin size={18} />
          <Text fw={700}>Création d&apos;Emplacements de Stockage</Text>
        </Group>
      }
      size="lg"
      radius="lg"
    >
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || "single")}>
        <Tabs.List mb="md">
          <Tabs.Tab value="single" leftSection={<Plus size={14} />}>
            Emplacement Unique
          </Tabs.Tab>
          <Tabs.Tab value="matrix" leftSection={<Grid3X3 size={14} />}>
            Générateur Matriciel (En Masse)
          </Tabs.Tab>
        </Tabs.List>

        {error && (
          <Text size="xs" c="red" fw={500} mb="sm">
            {error}
          </Text>
        )}

        <Tabs.Panel value="single">
          <Stack gap="md">
            {branches.length > 0 && (
              <Select
                label="Dépôt / Entrepôt"
                data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                value={branchId}
                onChange={(val) => setBranchId(val || "1")}
              />
            )}

            <Grid gutter="sm">
              <Grid.Col span={4}>
                <TextInput
                  label="Zone"
                  description="Ex: A, B, C, EXP"
                  value={zone}
                  onChange={(e) => setZone(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Allée"
                  description="Ex: 01, 02"
                  value={allee}
                  onChange={(e) => setAllee(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Travée"
                  description="Ex: 01, 02"
                  value={travee}
                  onChange={(e) => setTravee(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <TextInput
                  label="Niveau"
                  description="1 (Sol), 2, 3..."
                  value={niveau}
                  onChange={(e) => setNiveau(e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Bac / Alvéole"
                  description="A, B, C..."
                  value={bac}
                  onChange={(e) => setBac(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <Select
                  label="Type d'emplacement"
                  value={typeEmp}
                  onChange={(val) => setTypeEmp((val as EmplacementType) || "bac")}
                  data={Object.entries(TYPES_EMPLACEMENT_LABELS).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Capacité Max (Kg)"
                  value={capaciteKg}
                  onChange={(val) => setCapaciteKg(Number(val) || 100)}
                />
              </Grid.Col>

              <Grid.Col span={12}>
                <TextInput
                  label="Remarques / Notes"
                  placeholder="Ex: En face du quai de déchargement"
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                />
              </Grid.Col>
            </Grid>

            <Paper p="xs" radius="md" withBorder bg="var(--muted-surface)">
              <Text size="xs" c="dimmed">
                Aperçu du code généré :
              </Text>
              <Text fw={700} size="md" c="indigo">
                📍 {singleCodePreview}
              </Text>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button
                color="teal"
                leftSection={<Check size={16} />}
                loading={loading}
                onClick={handleCreateSingle}
              >
                Créer l&apos;Emplacement
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="matrix">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Générez automatiquement toute une rangée de racks ou une zone complète en une seule opération.
            </Text>

            {branches.length > 0 && (
              <Select
                label="Dépôt / Entrepôt"
                data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                value={branchId}
                onChange={(val) => setBranchId(val || "1")}
              />
            )}

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="Zone"
                  description="Ex: A"
                  value={matrixZone}
                  onChange={(e) => setMatrixZone(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <TextInput
                  label="Allées (séparées par des virgules)"
                  description="Ex: 01, 02, 03"
                  value={matrixAllees}
                  onChange={(e) => setMatrixAllees(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <NumberInput
                  label="Nombre de Travées par Allée"
                  min={1}
                  max={50}
                  value={matrixNbTravees}
                  onChange={(val) => setMatrixNbTravees(Number(val) || 1)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <NumberInput
                  label="Nombre de Niveaux d'étagère"
                  min={1}
                  max={10}
                  value={matrixNbNiveaux}
                  onChange={(val) => setMatrixNbNiveaux(Number(val) || 1)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <TextInput
                  label="Bacs par Niveau"
                  description="Ex: A, B (séparés par virgule)"
                  value={matrixBacs}
                  onChange={(e) => setMatrixBacs(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <Select
                  label="Type d'emplacement"
                  value={matrixTypeEmp}
                  onChange={(val) => setMatrixTypeEmp((val as EmplacementType) || "bac")}
                  data={Object.entries(TYPES_EMPLACEMENT_LABELS).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </Grid.Col>
            </Grid>

            <Paper p="xs" radius="md" withBorder bg="var(--muted-surface)">
              <Text size="xs" c="dimmed">
                Estimation du volume créé :
              </Text>
              <Text fw={700} size="md" c="teal">
                ✨ {matrixTotalEstimate} emplacements seront créés (ex: {matrixZone}-01-01-1-A ...)
              </Text>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button
                color="indigo"
                leftSection={<Grid3X3 size={16} />}
                loading={loading}
                onClick={handleCreateMatrix}
              >
                Générer les {matrixTotalEstimate} Emplacements
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
