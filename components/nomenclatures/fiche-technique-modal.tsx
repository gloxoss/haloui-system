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
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertCircle,
  Boxes,
  Calculator,
  CheckCircle2,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { saveNomenclatureAction } from "@/app/actions";
import { MODE_DESTOCKAGE_LABELS } from "@/lib/constants";
import {
  type ModeDestockageKit,
  type NomenclatureRecord,
} from "@/lib/types";

interface FicheTechniqueModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kitProduit?: NomenclatureRecord | null;
  allProducts: Array<{
    id: number;
    ref: string;
    designation: string;
    prix_ht: number;
    unite: string;
    nature_produit?: string;
  }>;
}

interface ComponentRow {
  composantId: string;
  quantite: number;
  unite: string;
  tauxPertePourcent: number;
  notes: string;
}

export function FicheTechniqueModal({
  opened,
  onClose,
  onSuccess,
  kitProduit,
  allProducts,
}: FicheTechniqueModalProps) {
  const [parentProductId, setParentProductId] = useState<string>("");
  const [modeDestockage, setModeDestockage] = useState<ModeDestockageKit>("composants");
  const [composants, setComposants] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (kitProduit) {
      setParentProductId(String(kitProduit.produit_id));
      setModeDestockage(kitProduit.mode_destockage_kit || "composants");
      setComposants(
        kitProduit.composants.map((c) => ({
          composantId: String(c.composant_id),
          quantite: c.quantite,
          unite: c.unite || "u",
          tauxPertePourcent: c.taux_perte_pourcent || 0,
          notes: c.notes || "",
        }))
      );
    } else {
      setParentProductId("");
      setModeDestockage("composants");
      setComposants([]);
    }
    setError(null);
    setSuccess(false);
  }, [kitProduit, opened]);

  const parentProduct = allProducts.find((p) => String(p.id) === parentProductId);

  // Calcul du coût de revient et de la marge en direct
  let coutRevientCalcule = 0;
  for (const c of composants) {
    const prod = allProducts.find((p) => String(p.id) === c.composantId);
    if (prod) {
      const perte = 1 + (Number(c.tauxPertePourcent) || 0) / 100;
      coutRevientCalcule += (Number(c.quantite) || 0) * perte * Number(prod.prix_ht);
    }
  }
  coutRevientCalcule = Math.round(coutRevientCalcule * 100) / 100;

  const prixVenteHt = Number(parentProduct?.prix_ht || 0);
  const margeHt = Math.round((prixVenteHt - coutRevientCalcule) * 100) / 100;
  const margePourcent =
    prixVenteHt > 0 ? Math.round((margeHt / prixVenteHt) * 1000) / 10 : 0;

  const handleAddComponent = () => {
    // Proposer le premier produit disponible qui n'est pas le parent
    const available = allProducts.find(
      (p) => String(p.id) !== parentProductId && !composants.some((c) => c.composantId === String(p.id))
    );
    if (available) {
      setComposants((prev) => [
        ...prev,
        {
          composantId: String(available.id),
          quantite: 1,
          unite: available.unite || "u",
          tauxPertePourcent: 0,
          notes: "",
        },
      ]);
    } else {
      setComposants((prev) => [
        ...prev,
        {
          composantId: "",
          quantite: 1,
          unite: "u",
          tauxPertePourcent: 0,
          notes: "",
        },
      ]);
    }
  };

  const handleRemoveComponent = (index: number) => {
    setComposants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateComponent = (
    index: number,
    field: keyof ComponentRow,
    value: any
  ) => {
    setComposants((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, [field]: value };
        if (field === "composantId") {
          const p = allProducts.find((prod) => String(prod.id) === String(value));
          if (p) updated.unite = p.unite || "u";
        }
        return updated;
      })
    );
  };

  const handleSubmit = async () => {
    if (!parentProductId) {
      setError("Veuillez sélectionner le produit parent (Pack / Kit).");
      return;
    }
    const validComps = composants.filter((c) => Boolean(c.composantId));
    if (validComps.length === 0) {
      setError("Veuillez ajouter au moins un composant dans la nomenclature.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await saveNomenclatureAction({
        produitParentId: Number(parentProductId),
        natureProduit: "kit",
        modeDestockageKit: modeDestockage,
        composants: validComps.map((c, idx) => ({
          composantId: Number(c.composantId),
          quantite: Number(c.quantite),
          unite: c.unite,
          tauxPertePourcent: Number(c.tauxPertePourcent),
          ordre: idx + 1,
          notes: c.notes,
        })),
      });

      if (!res.success) {
        setError(res.error || "Erreur lors de l'enregistrement de la nomenclature.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
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
          <ThemeIcon color="indigo" variant="light" size="lg" radius="md">
            <Layers size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              {kitProduit ? "Modifier la Fiche Technique / Nomenclature" : "Créer une Fiche Technique (Pack / Kit)"}
            </Text>
            <Text size="xs" c="dimmed">
              Définition des composants, quantités requises, perte et marge brute
            </Text>
          </div>
        </Group>
      }
      size="xl"
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
          <Alert icon={<CheckCircle2 size={16} />} color="teal" radius="md" title="Succès">
            Fiche technique enregistrée avec succès ! Coût de revient et marges recalculés.
          </Alert>
        )}

        {/* Produit Parent */}
        <Paper p="sm" radius="md" withBorder bg="gray.0">
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Select
                label="Produit Composé (Pack / Kit Parent)"
                description="Sélectionnez l'article qui sera vendu comme pack ou ensemble"
                placeholder="Choisir un produit..."
                data={allProducts.map((p) => ({
                  value: String(p.id),
                  label: `[${p.ref}] ${p.designation} (${Number(p.prix_ht).toLocaleString("fr-FR")} DH HT)`,
                }))}
                value={parentProductId}
                onChange={(val) => setParentProductId(val || "")}
                disabled={Boolean(kitProduit)}
                searchable
                required
              />
            </div>
            {parentProduct && (
              <Stack gap={2} align="flex-end" pt={24}>
                <Text size="xs" c="dimmed">Prix de Vente Actuel :</Text>
                <Text fw={700} size="lg" c="indigo.8">
                  {Number(parentProduct.prix_ht).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH HT
                </Text>
              </Stack>
            )}
          </Group>
        </Paper>

        {/* Mode de déstockage */}
        <Paper p="sm" radius="md" withBorder>
          <Text size="sm" fw={600} mb="xs">
            Politique de Déstockage du Kit
          </Text>
          <RadioGroup
            value={modeDestockage}
            onChange={(val) => setModeDestockage(val as ModeDestockageKit)}
          >
            <Stack gap="xs">
              <Radio
                value="composants"
                label={
                  <div>
                    <Text size="sm" fw={500}>{MODE_DESTOCKAGE_LABELS.composants.label}</Text>
                    <Text size="xs" c="dimmed">{MODE_DESTOCKAGE_LABELS.composants.description}</Text>
                  </div>
                }
              />
              <Radio
                value="produit_fini"
                label={
                  <div>
                    <Text size="sm" fw={500}>{MODE_DESTOCKAGE_LABELS.produit_fini.label}</Text>
                    <Text size="xs" c="dimmed">{MODE_DESTOCKAGE_LABELS.produit_fini.description}</Text>
                  </div>
                }
              />
            </Stack>
          </RadioGroup>
        </Paper>

        {/* Tableau des composants */}
        <div>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Boxes size={18} className="text-gray-500" />
              <Text fw={600} size="sm">
                Composants Requis ({composants.length})
              </Text>
            </Group>
            <Button
              variant="light"
              color="indigo"
              size="xs"
              leftSection={<Plus size={14} />}
              onClick={handleAddComponent}
            >
              Ajouter un composant
            </Button>
          </Group>

          {composants.length === 0 ? (
            <Paper p="xl" radius="md" withBorder ta="center" bg="gray.0">
              <Text size="sm" c="dimmed">
                Aucun composant ajouté. Cliquez sur "Ajouter un composant" pour composer la fiche technique du kit.
              </Text>
            </Paper>
          ) : (
            <Paper radius="md" withBorder style={{ overflow: "hidden" }}>
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead bg="gray.1">
                  <Table.Tr>
                    <Table.Th style={{ width: "40%" }}>Composant / Article</Table.Th>
                    <Table.Th style={{ width: "15%" }}>Quantité</Table.Th>
                    <Table.Th style={{ width: "15%" }}>Perte (%)</Table.Th>
                    <Table.Th style={{ width: "20%" }}>Coût Est. HT</Table.Th>
                    <Table.Th style={{ width: "10%" }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {composants.map((c, index) => {
                    const prod = allProducts.find((p) => String(p.id) === c.composantId);
                    const coutLigne = prod
                      ? Math.round(
                          (Number(c.quantite) || 0) *
                            (1 + (Number(c.tauxPertePourcent) || 0) / 100) *
                            Number(prod.prix_ht) *
                            100
                        ) / 100
                      : 0;

                    return (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Select
                            placeholder="Choisir composant..."
                            data={allProducts
                              .filter((p) => String(p.id) !== parentProductId)
                              .map((p) => ({
                                value: String(p.id),
                                label: `[${p.ref}] ${p.designation} (${p.prix_ht} DH)`,
                              }))}
                            value={c.composantId}
                            onChange={(val) => handleUpdateComponent(index, "composantId", val)}
                            searchable
                            size="xs"
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={c.quantite}
                            onChange={(val) => handleUpdateComponent(index, "quantite", Number(val) || 0)}
                            min={0.01}
                            step={1}
                            size="xs"
                            rightSection={<Text size="xs" c="dimmed">{c.unite}</Text>}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={c.tauxPertePourcent}
                            onChange={(val) =>
                              handleUpdateComponent(index, "tauxPertePourcent", Number(val) || 0)
                            }
                            min={0}
                            max={100}
                            size="xs"
                            rightSection="%"
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {coutLigne.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                          </Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Tooltip label="Supprimer ce composant">
                            <ThemeIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleRemoveComponent(index)}
                            >
                              <Trash2 size={14} />
                            </ThemeIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </div>

        {/* Bilan financier Coût de Revient & Marge Brute */}
        <Paper p="md" radius="md" withBorder bg="indigo.0">
          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon color="indigo" variant="filled" size="md" radius="md">
                <Calculator size={18} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Analyse de Rentabilité du Kit
                </Text>
                <Text size="xs" c="dimmed">
                  Basée sur le coût d'achat des composants et le prix de vente
                </Text>
              </div>
            </Group>

            <Group gap="xl">
              <div>
                <Text size="xs" c="dimmed">Coût de revient :</Text>
                <Text fw={700} size="md" c="dark.8">
                  {coutRevientCalcule.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH HT
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed">Prix de vente :</Text>
                <Text fw={700} size="md" c="dark.8">
                  {prixVenteHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH HT
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed">Marge brute :</Text>
                <Group gap={4}>
                  <Text fw={700} size="md" c={margeHt >= 0 ? "teal.7" : "red.7"}>
                    {margeHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH HT
                  </Text>
                  <Badge color={margeHt >= 0 ? "teal" : "red"} variant="light" size="sm">
                    {margePourcent}%
                  </Badge>
                </Group>
              </div>
            </Group>
          </Group>
        </Paper>

        <Divider />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            color="indigo"
            onClick={handleSubmit}
            loading={loading}
            disabled={!parentProductId || composants.length === 0}
            leftSection={<CheckCircle2 size={16} />}
          >
            Enregistrer la Fiche Technique
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
