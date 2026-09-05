"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  Barcode,
  Building2,
  CheckCheck,
  CheckSquare,
  Copy,
  Eye,
  Info,
  Layers,
  MapPin,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Tag,
  ZoomIn,
} from "lucide-react";
import { generateBarcodeSvgAction } from "@/app/actions";
import { ETIQUETTES_FORMATS_PRESETS } from "@/lib/constants";
import {
  type BarcodeSymbology,
  type LabelConfig,
  type LabelDimensionPreset,
  type LabelItemToPrint,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export interface EtiquetteProductItem {
  produit_id: number;
  ref: string;
  designation: string;
  code_barre: string;
  prix_ht: number;
  prix_ttc: number;
  tva_rate: number;
  unite: string;
  categorie: string;
  emplacement_code?: string;
  stock_actuel: number;
}

interface EtiquettesManagerProps {
  initialProducts: EtiquetteProductItem[];
  branches: Array<{ id: number; name: string }>;
  companyName: string;
  currentBranchId: number;
}

export function EtiquettesManager({
  initialProducts,
  branches,
  companyName,
  currentBranchId,
}: EtiquettesManagerProps) {
  // --- ÉTAT SÉLECTION ARTICLES ---
  const [products, setProducts] = useState<EtiquetteProductItem[]>(initialProducts);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(String(currentBranchId));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // --- CONFIGURATION DU FORMAT ET DE L'ÉTIQUETTE ---
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    ETIQUETTES_FORMATS_PRESETS[0]?.id || "zebra_50x30"
  );
  const [symbology, setSymbology] = useState<BarcodeSymbology>("code128");

  const [labelConfig, setLabelConfig] = useState<LabelConfig>({
    presetId: ETIQUETTES_FORMATS_PRESETS[0]?.id || "zebra_50x30",
    symbology: "code128",
    afficherNomEntreprise: true,
    afficherNomProduit: true,
    afficherPrixTTC: true,
    afficherPrixHT: false,
    afficherReference: true,
    afficherCodeBarreChiffre: true,
    afficherEmplacement: true,
    afficherDateOuLot: false,
    taillePrix: "grand",
  });

  // --- APERÇU EN DIRECT (WYSIWYG) ---
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<string>("150"); // '100' | '150' | '200'

  // Trouver le format actif
  const currentPreset = useMemo<LabelDimensionPreset>(() => {
    return (
      ETIQUETTES_FORMATS_PRESETS.find((p) => p.id === selectedPresetId) ||
      ETIQUETTES_FORMATS_PRESETS[0]
    );
  }, [selectedPresetId]);

  // Extraire les catégories uniques
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categorie) set.add(p.categorie);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtrer les produits
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.code_barre && p.code_barre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === "all" || !selectedCategory || p.categorie === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Initialiser les quantités par défaut à 1
  useEffect(() => {
    const initialQty: Record<number, number> = {};
    initialProducts.forEach((p) => {
      initialQty[p.produit_id] = 1;
    });
    setQuantities(initialQty);
  }, [initialProducts]);

  // Premier produit sélectionné ou premier de la liste pour l'aperçu live
  const previewProduct = useMemo(() => {
    if (selectedIds.size > 0) {
      const firstSelectedId = Array.from(selectedIds)[0];
      return products.find((p) => p.produit_id === firstSelectedId) || products[0];
    }
    return filteredProducts[0] || products[0];
  }, [selectedIds, products, filteredProducts]);

  // Générer le code-barre SVG en temps réel pour l'aperçu
  useEffect(() => {
    if (!previewProduct) return;

    let active = true;
    setIsLoadingPreview(true);

    const rawCode =
      symbology === "ean13"
        ? (previewProduct.code_barre && previewProduct.code_barre.replace(/\D/g, "").length >= 12
            ? previewProduct.code_barre.replace(/\D/g, "")
            : `200${String(previewProduct.produit_id).padStart(9, "0")}`)
        : previewProduct.code_barre || previewProduct.ref || `PROD-${previewProduct.produit_id}`;

    generateBarcodeSvgAction(symbology, rawCode, {
      width: currentPreset.largeurMm > 60 ? 220 : 160,
      height: symbology === "qrcode" ? (currentPreset.hauteurMm > 35 ? 70 : 50) : 45,
      includeText: labelConfig.afficherCodeBarreChiffre,
    })
      .then((res) => {
        if (active && res.success) {
          setPreviewSvg(res.svg);
        }
      })
      .finally(() => {
        if (active) setIsLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [previewProduct, symbology, currentPreset, labelConfig.afficherCodeBarreChiffre]);

  // Gestion de la sélection
  const handleToggleProduct = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredProducts.map((p) => p.produit_id));
    setSelectedIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectInStock = () => {
    const inStockIds = new Set(
      filteredProducts.filter((p) => p.stock_actuel > 0).map((p) => p.produit_id)
    );
    setSelectedIds(inStockIds);
  };

  const handleApplyStockQuantities = () => {
    setQuantities((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        if (selectedIds.has(p.produit_id)) {
          next[p.produit_id] = Math.max(1, Math.round(p.stock_actuel || 1));
        }
      });
      return next;
    });
  };

  const handleSetAllQuantities = (qty: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        if (selectedIds.has(p.produit_id)) {
          next[p.produit_id] = qty;
        }
      });
      return next;
    });
  };

  // Calcul du nombre total d'étiquettes à imprimer
  const totalLabelsToPrint = useMemo(() => {
    let count = 0;
    selectedIds.forEach((id) => {
      count += quantities[id] || 1;
    });
    return count;
  }, [selectedIds, quantities]);

  // Impression : enregistrer dans localStorage et ouvrir /print/etiquettes
  const handlePrint = () => {
    if (selectedIds.size === 0) return;

    const itemsToPrint: LabelItemToPrint[] = [];
    selectedIds.forEach((id) => {
      const prod = products.find((p) => p.produit_id === id);
      if (prod) {
        itemsToPrint.push({
          produit_id: prod.produit_id,
          ref: prod.ref,
          designation: prod.designation,
          code_barre: prod.code_barre || prod.ref,
          prix_ht: prod.prix_ht,
          prix_ttc: prod.prix_ttc,
          tva_rate: prod.tva_rate,
          unite: prod.unite || "U",
          emplacement_code: prod.emplacement_code,
          exemplaires: quantities[id] || 1,
        });
      }
    });

    const printPayload = {
      preset: currentPreset,
      config: { ...labelConfig, symbology },
      companyName,
      items: itemsToPrint,
      createdAt: new Date().toISOString(),
    };

    // Sauvegarder dans localStorage pour que la page print puisse charger le payload sans limite d'URL
    try {
      localStorage.setItem("haloui_etiquettes_print_job", JSON.stringify(printPayload));
    } catch (e) {
      console.error("Failed to set localStorage print payload", e);
    }

    // Ouvrir la page d'impression
    window.open("/print/etiquettes", "_blank");
  };

  return (
    <Stack gap="lg">
      {/* En-tête Principal */}
      <Paper p="lg" radius="xl" withBorder className="bg-white">
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="indigo" tt="uppercase" style={{ letterSpacing: 1 }}>
              LOGISTIQUE & POINT DE VENTE
            </Text>
            <Title order={2} fw={800} c="dark.8">
              Édition & Impression d&apos;Étiquettes & Codes-Barres
            </Title>
            <Text size="sm" c="dimmed" mt={2}>
              Génération en masse d&apos;étiquettes de prix et codes-barres configurables pour imprimantes
              thermiques (Zebra, Brother, Dymo) et planches adhésives A4.
            </Text>
          </div>

          <Group gap="sm">
            <Button
              size="md"
              radius="xl"
              leftSection={<Printer size={18} />}
              color="indigo"
              disabled={selectedIds.size === 0}
              onClick={handlePrint}
              style={{
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
              }}
            >
              Imprimer {totalLabelsToPrint > 0 ? `(${totalLabelsToPrint} étiquettes)` : ""}
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Grille 2 Colonnes : Sélection Articles à gauche / Paramètres & Live Preview à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLONNE GAUCHE : SÉLECTION DES ARTICLES (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <Paper p="md" radius="xl" withBorder bg="white">
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="indigo" radius="md">
                    <Tag size={16} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">
                    Articles du Catalogue ({filteredProducts.length})
                  </Text>
                </Group>

                <Badge variant="filled" color={selectedIds.size > 0 ? "indigo" : "gray"}>
                  {selectedIds.size} article(s) sélectionné(s) · {totalLabelsToPrint} étiquette(s)
                </Badge>
              </Group>

              {/* Filtres de Recherche */}
              <Group grow>
                <TextInput
                  placeholder="Rechercher par référence, désignation, code-barre..."
                  leftSection={<Search size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  radius="md"
                  size="sm"
                />

                <Select
                  placeholder="Catégorie"
                  data={[
                    { value: "all", label: "Toutes les catégories" },
                    ...categories.map((c) => ({ value: c, label: c })),
                  ]}
                  value={selectedCategory}
                  onChange={(v) => setSelectedCategory(v || "all")}
                  radius="md"
                  size="sm"
                />
              </Group>

              {/* Barre d'actions rapides sur la sélection */}
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<CheckCheck size={14} />}
                    onClick={handleSelectAll}
                  >
                    Tout cocher
                  </Button>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="gray"
                    onClick={handleDeselectAll}
                    disabled={selectedIds.size === 0}
                  >
                    Désélectionner
                  </Button>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="teal"
                    onClick={handleSelectInStock}
                  >
                    Articles en stock
                  </Button>
                </Group>

                <Group gap="xs">
                  <Tooltip label="Ajuster les exemplaires selon le stock disponible en dépôt">
                    <Button
                      variant="light"
                      size="xs"
                      color="indigo"
                      leftSection={<Copy size={13} />}
                      onClick={handleApplyStockQuantities}
                      disabled={selectedIds.size === 0}
                    >
                      Copier Qté Stock
                    </Button>
                  </Tooltip>
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => handleSetAllQuantities(1)}
                    disabled={selectedIds.size === 0}
                  >
                    1 par art.
                  </Button>
                </Group>
              </Group>

              {/* Tableau des Articles */}
              <div className="overflow-x-auto max-h-[580px]">
                <Table verticalSpacing="xs" fz="xs" highlightOnHover>
                  <Table.Thead className="sticky top-0 bg-white shadow-sm z-10">
                    <Table.Tr>
                      <Table.Th style={{ width: 40 }}>
                        <Checkbox
                          checked={
                            filteredProducts.length > 0 &&
                            filteredProducts.every((p) => selectedIds.has(p.produit_id))
                          }
                          indeterminate={
                            filteredProducts.some((p) => selectedIds.has(p.produit_id)) &&
                            !filteredProducts.every((p) => selectedIds.has(p.produit_id))
                          }
                          onChange={(e) => {
                            if (e.currentTarget.checked) handleSelectAll();
                            else handleDeselectAll();
                          }}
                        />
                      </Table.Th>
                      <Table.Th>Article & Réf</Table.Th>
                      <Table.Th>Code-Barres</Table.Th>
                      <Table.Th>Emplacement</Table.Th>
                      <Table.Th ta="right">Prix TTC</Table.Th>
                      <Table.Th ta="center">Stock</Table.Th>
                      <Table.Th ta="center" style={{ width: 90 }}>
                        Nb Étiquettes
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredProducts.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7} ta="center" py="xl" c="dimmed">
                          Aucun article ne correspond à votre recherche.
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const isSelected = selectedIds.has(prod.produit_id);
                        const isPreview = previewProduct?.produit_id === prod.produit_id;

                        return (
                          <Table.Tr
                            key={prod.produit_id}
                            className={
                              isPreview
                                ? "bg-indigo-50/50"
                                : isSelected
                                ? "bg-slate-50/70"
                                : undefined
                            }
                          >
                            <Table.Td>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleProduct(prod.produit_id)}
                              />
                            </Table.Td>

                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <div>
                                  <Text fw={600} size="xs" lineClamp={1}>
                                    {prod.designation}
                                  </Text>
                                  <Group gap={6} mt={2}>
                                    <Badge size="xs" variant="outline" color="dark">
                                      {prod.ref}
                                    </Badge>
                                    {prod.categorie && (
                                      <Badge size="xs" variant="dot" color="gray">
                                        {prod.categorie}
                                      </Badge>
                                    )}
                                  </Group>
                                </div>
                              </Group>
                            </Table.Td>

                            <Table.Td>
                              {prod.code_barre ? (
                                <Text fz="11px" ff="monospace" c="dark.7">
                                  {prod.code_barre}
                                </Text>
                              ) : (
                                <Badge size="xs" color="orange" variant="light">
                                  Auto (Réf)
                                </Badge>
                              )}
                            </Table.Td>

                            <Table.Td>
                              {prod.emplacement_code ? (
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color="indigo"
                                  leftSection={<MapPin size={10} />}
                                >
                                  {prod.emplacement_code}
                                </Badge>
                              ) : (
                                <Text size="11px" c="dimmed">
                                  -
                                </Text>
                              )}
                            </Table.Td>

                            <Table.Td ta="right">
                              <Text fw={700} size="xs" c="indigo.8">
                                {formatNumber(prod.prix_ttc)} DH
                              </Text>
                            </Table.Td>

                            <Table.Td ta="center">
                              <Badge
                                size="xs"
                                variant="light"
                                color={prod.stock_actuel > 0 ? "teal" : "red"}
                              >
                                {prod.stock_actuel} {prod.unite || "U"}
                              </Badge>
                            </Table.Td>

                            <Table.Td ta="center">
                              <NumberInput
                                min={1}
                                max={500}
                                size="xs"
                                value={quantities[prod.produit_id] || 1}
                                onChange={(val) => {
                                  const num = typeof val === "number" ? val : parseInt(String(val)) || 1;
                                  setQuantities((prev) => ({
                                    ...prev,
                                    [prod.produit_id]: Math.max(1, num),
                                  }));
                                }}
                                disabled={!isSelected}
                                styles={{ input: { textAlign: "center", width: 70 } }}
                              />
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </Stack>
          </Paper>
        </div>

        {/* COLONNE DROITE : FORMAT, PARAMÈTRES & APERÇU LIVE (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Format & Symbologie */}
          <Paper p="md" radius="xl" withBorder bg="white">
            <Stack gap="md">
              <Group gap="xs">
                <ThemeIcon variant="light" color="indigo" radius="md">
                  <Sliders size={16} />
                </ThemeIcon>
                <Text fw={700} size="sm">
                  Format d&apos;Impression & Gabarit
                </Text>
              </Group>

              {/* Sélection Format Prédéfini */}
              <Select
                label="Format / Support d'étiquette"
                description="Sélectionnez le gabarit thermique ou la planche A4"
                data={ETIQUETTES_FORMATS_PRESETS.map((preset) => ({
                  value: preset.id,
                  label: `${preset.imprimanteCible} : ${preset.nom}`,
                }))}
                value={selectedPresetId}
                onChange={(val) => {
                  if (val) {
                    setSelectedPresetId(val);
                    setLabelConfig((prev) => ({ ...prev, presetId: val }));
                  }
                }}
                radius="md"
                size="sm"
              />

              <Group justify="space-between" bg="gray.0" p="xs" className="rounded-lg">
                <div>
                  <Text size="xs" c="dimmed">
                    Dimensions réelles :
                  </Text>
                  <Text size="xs" fw={700} c="dark.7">
                    {currentPreset.largeurMm} mm × {currentPreset.hauteurMm} mm
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Type de support :
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={currentPreset.typeSupport === "thermique_rouleau" ? "teal" : "blue"}
                  >
                    {currentPreset.typeSupport === "thermique_rouleau"
                      ? "Rouleau Thermique Continu"
                      : `Planche A4 (${currentPreset.colonnes}×${currentPreset.lignes})`}
                  </Badge>
                </div>
              </Group>

              <Divider />

              {/* Type de Code-Barre (Symbologie) */}
              <div>
                <Text size="xs" fw={600} mb={6}>
                  Type de Code (Symbologie)
                </Text>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  radius="md"
                  value={symbology}
                  onChange={(val) => {
                    const sym = val as BarcodeSymbology;
                    setSymbology(sym);
                    setLabelConfig((prev) => ({ ...prev, symbology: sym }));
                  }}
                  data={[
                    { label: "Code 128 (Alphanumérique)", value: "code128" },
                    { label: "EAN-13 (13 Chiffres)", value: "ean13" },
                    { label: "QR Code (2D)", value: "qrcode" },
                  ]}
                />
              </div>

              {/* Éléments à afficher sur l'étiquette */}
              <div>
                <Text size="xs" fw={600} mb={8}>
                  Informations imprimées sur l&apos;étiquette :
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Checkbox
                    label="En-tête Société"
                    checked={labelConfig.afficherNomEntreprise}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherNomEntreprise: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                  <Checkbox
                    label="Désignation Produit"
                    checked={labelConfig.afficherNomProduit}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherNomProduit: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                  <Checkbox
                    label="Prix de vente TTC"
                    checked={labelConfig.afficherPrixTTC}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherPrixTTC: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                  <Checkbox
                    label="Prix HT"
                    checked={labelConfig.afficherPrixHT}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherPrixHT: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                  <Checkbox
                    label="Référence / SKU"
                    checked={labelConfig.afficherReference}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherReference: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                  <Checkbox
                    label="Code numérique"
                    checked={labelConfig.afficherCodeBarreChiffre}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherCodeBarreChiffre: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                  <Checkbox
                    label="Emplacement WMS"
                    checked={labelConfig.afficherEmplacement}
                    onChange={(e) =>
                      setLabelConfig((prev) => ({
                        ...prev,
                        afficherEmplacement: e.currentTarget.checked,
                      }))
                    }
                    size="xs"
                  />
                </SimpleGrid>
              </div>

              {/* Taille du Prix */}
              <div>
                <Text size="xs" fw={600} mb={6}>
                  Mise en valeur du Prix
                </Text>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  radius="md"
                  value={labelConfig.taillePrix}
                  onChange={(val: any) =>
                    setLabelConfig((prev) => ({ ...prev, taillePrix: val }))
                  }
                  data={[
                    { label: "Normal", value: "normal" },
                    { label: "Grand", value: "grand" },
                    { label: "Très Grand", value: "tres_grand" },
                  ]}
                />
              </div>
            </Stack>
          </Paper>

          {/* APERÇU EN DIRECT (WYSIWYG) */}
          <Paper p="md" radius="xl" withBorder bg="white">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="teal" radius="md">
                    <Eye size={16} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">
                    Aperçu Temps Réel (WYSIWYG)
                  </Text>
                </Group>

                <Group gap="xs">
                  <ZoomIn size={14} className="text-gray-400" />
                  <SegmentedControl
                    size="xs"
                    radius="md"
                    value={previewZoom}
                    onChange={setPreviewZoom}
                    data={[
                      { label: "100%", value: "100" },
                      { label: "150%", value: "150" },
                      { label: "200%", value: "200" },
                    ]}
                  />
                </Group>
              </Group>

              <Text size="xs" c="dimmed">
                Rendu exact pour l&apos;article : <strong>{previewProduct?.designation || "Aucun article"}</strong>
              </Text>

              {/* Cadre de l'étiquette avec zoom CSS */}
              <div
                className="flex items-center justify-center p-6 bg-slate-100 rounded-xl overflow-auto min-h-[260px]"
                style={{
                  backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
                {previewProduct ? (
                  <div
                    style={{
                      transform: `scale(${parseInt(previewZoom) / 100})`,
                      transformOrigin: "center center",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {/* ÉTIQUETTE PHYSIQUE SIMULÉE */}
                    <div
                      style={{
                        width: `${currentPreset.largeurMm * 3.78}px`,
                        height: `${currentPreset.hauteurMm * 3.78}px`,
                        minWidth: "160px",
                        minHeight: "100px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #1e293b",
                        borderRadius: "4px",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                        overflow: "hidden",
                        color: "#000000",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {/* En-tête : Société & Réf */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: labelConfig.afficherNomEntreprise ? "1px solid #e2e8f0" : "none",
                          paddingBottom: "2px",
                        }}
                      >
                        {labelConfig.afficherNomEntreprise && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {companyName}
                          </span>
                        )}
                        {labelConfig.afficherReference && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              backgroundColor: "#f1f5f9",
                              padding: "1px 4px",
                              borderRadius: "2px",
                              marginLeft: "auto",
                            }}
                          >
                            {previewProduct.ref}
                          </span>
                        )}
                      </div>

                      {/* Désignation Produit */}
                      {labelConfig.afficherNomProduit && (
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            lineHeight: 1.15,
                            margin: "3px 0",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {previewProduct.designation}
                        </div>
                      )}

                      {/* Zone Centrale : Code-barre SVG ou QR Code */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "2px 0",
                          flex: 1,
                        }}
                      >
                        {isLoadingPreview ? (
                          <Text size="xs" c="dimmed">
                            Génération du code...
                          </Text>
                        ) : previewSvg ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: previewSvg }}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              display: "flex",
                              justifyContent: "center",
                            }}
                          />
                        ) : (
                          <Text size="xs" c="red">
                            Erreur rendu code
                          </Text>
                        )}
                      </div>

                      {/* Pied d'étiquette : Prix & Emplacement */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          borderTop: "1px dashed #cbd5e1",
                          paddingTop: "3px",
                          marginTop: "2px",
                        }}
                      >
                        {/* Emplacement WMS */}
                        <div>
                          {labelConfig.afficherEmplacement && previewProduct.emplacement_code && (
                            <span
                              style={{
                                fontSize: "8px",
                                fontWeight: 600,
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                                padding: "1px 4px",
                                borderRadius: "2px",
                              }}
                            >
                              LOC: {previewProduct.emplacement_code}
                            </span>
                          )}
                          {labelConfig.afficherPrixHT && (
                            <div style={{ fontSize: "8px", color: "#64748b" }}>
                              HT: {formatNumber(previewProduct.prix_ht)} DH
                            </div>
                          )}
                        </div>

                        {/* Prix de Vente TTC */}
                        {labelConfig.afficherPrixTTC && (
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize:
                                  labelConfig.taillePrix === "tres_grand"
                                    ? "18px"
                                    : labelConfig.taillePrix === "grand"
                                    ? "14px"
                                    : "11px",
                                fontWeight: 900,
                                lineHeight: 1,
                                color: "#0f172a",
                              }}
                            >
                              {formatNumber(previewProduct.prix_ttc)} <span style={{ fontSize: "9px" }}>DH</span>
                            </div>
                            <span style={{ fontSize: "7px", color: "#64748b", textTransform: "uppercase" }}>
                              TTC
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Text size="sm" c="dimmed">
                    Sélectionnez un produit pour afficher l&apos;aperçu.
                  </Text>
                )}
              </div>

              {/* Bouton de confirmation d'impression */}
              <Button
                fullWidth
                size="md"
                radius="xl"
                color="indigo"
                leftSection={<Printer size={18} />}
                disabled={selectedIds.size === 0}
                onClick={handlePrint}
                mt="xs"
              >
                Imprimer les étiquettes sélectionnées ({totalLabelsToPrint})
              </Button>
            </Stack>
          </Paper>
        </div>
      </div>
    </Stack>
  );
}
