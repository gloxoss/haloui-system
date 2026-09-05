"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Check, Loader2, RefreshCw, Scale, Usb, Zap } from "lucide-react";
import { type PosProductItem } from "@/components/pos/pos-terminal";
import { formatNumber } from "@/lib/utils";

interface BalanceModalProps {
  opened: boolean;
  onClose: () => void;
  products: PosProductItem[];
  preselectedProduct?: PosProductItem | null;
  onAddWeighedItem: (product: PosProductItem, weightKg: number) => void;
}

export function BalanceModal({
  opened,
  onClose,
  products,
  preselectedProduct,
  onAddWeighedItem,
}: BalanceModalProps) {
  // Liste des produits vendus au poids (ou ayant unité kg/g)
  const weightProducts = products.filter(
    (p) =>
      (p as any).vendu_au_poids === 1 ||
      ["kg", "g", "kilo", "kilogramme", "vrac"].includes((p.unite || "").toLowerCase()) ||
      (p as any).code_plu
  );

  const [selectedProdId, setSelectedProdId] = useState<string>(
    preselectedProduct ? String(preselectedProduct.id) : weightProducts[0] ? String(weightProducts[0].id) : ""
  );

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProdId(String(preselectedProduct.id));
    } else if (weightProducts[0] && !selectedProdId) {
      setSelectedProdId(String(weightProducts[0].id));
    }
  }, [preselectedProduct, weightProducts]);

  const selectedProduct = products.find((p) => String(p.id) === selectedProdId);

  // --- ÉTAT BALANCE ---
  const [currentWeight, setCurrentWeight] = useState<number>(0.0);
  const [tare, setTare] = useState<number>(0.0);
  const [isStable, setIsStable] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReadingSerial, setIsReadingSerial] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string>("");

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  // Déconnexion lors de la fermeture
  useEffect(() => {
    if (!opened) {
      // Réinitialiser le poids si non connecté physiquement
      if (!isConnected) {
        setCurrentWeight(0);
        setTare(0);
      }
    }
  }, [opened, isConnected]);

  // Poids net = Max(0, Poids brut - Tare)
  const netWeight = Math.max(0, Math.round((currentWeight - tare) * 1000) / 1000);
  const unitPrice = selectedProduct?.prix_ttc || 0;
  const totalPrice = Math.round(netWeight * unitPrice * 100) / 100;

  // --- CONNEXION SÉRIE PHYSIQUE (Web Serial API) ---
  const handleConnectSerial = async () => {
    if (!("serial" in navigator)) {
      setSerialError("L'API Web Serial n'est pas supportée par ce navigateur. Utilisez Chrome ou Edge.");
      return;
    }

    try {
      setSerialError("");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" });
      portRef.current = port;
      setIsConnected(true);
      setIsReadingSerial(true);

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            // Extraction regex classique protocole NCI / Toledo / Dibal : "ST,GS,+  1.250kg" ou "1.250"
            const match = line.match(/([+-]?\s*\d+\.\d{2,3})/);
            if (match) {
              const weightParsed = parseFloat(match[1].replace(/\s+/g, ""));
              if (!isNaN(weightParsed)) {
                setCurrentWeight(Math.max(0, weightParsed));
                setIsStable(line.includes("ST") || !line.includes("US"));
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        setSerialError(err.message || "Erreur de communication avec la balance");
      }
      setIsConnected(false);
      setIsReadingSerial(false);
    }
  };

  const handleDisconnectSerial = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch {
      // Ignorer
    }
    setIsConnected(false);
    setIsReadingSerial(false);
  };

  // --- SIMULATION / AJUSTEMENT MANUEL DU POIDS ---
  const handleAddWeight = (deltaGrams: number) => {
    setCurrentWeight((prev) => Math.max(0, Math.round((prev + deltaGrams / 1000) * 1000) / 1000));
  };

  const handleZero = () => {
    setCurrentWeight(0);
    setTare(0);
  };

  const handleTare = () => {
    setTare(currentWeight);
  };

  // --- VALIDATION DE LA PESÉE ---
  const handleConfirm = () => {
    if (!selectedProduct || netWeight <= 0) return;
    onAddWeighedItem(selectedProduct, netWeight);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="cyan" size="lg" radius="md">
            <Scale size={20} />
          </ThemeIcon>
          <div>
            <Text fw={800} size="sm">
              Balance Connectée & Pesée au Comptoir
            </Text>
            <Text size="xs" c="dimmed">
              Fruits, légumes, vrac, épicerie fine et découpe boucherie
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="lg"
      centered
    >
      <Stack gap="md">
        {/* STATUT CONNEXION SÉRIE */}
        <Paper p="xs" radius="md" withBorder className="bg-slate-50 flex items-center justify-between">
          <Group gap="xs">
            <Badge
              color={isConnected ? "teal" : "gray"}
              variant="filled"
              leftSection={isConnected ? <Check size={12} /> : <Usb size={12} />}
            >
              {isConnected ? "Balance USB / RS-232 Connectée" : "Mode Simulation Tactile"}
            </Badge>
            {isStable ? (
              <Badge color="green" variant="light">
                POIDS STABLE
              </Badge>
            ) : (
              <Badge color="yellow" variant="light">
                EN MOUVEMENT...
              </Badge>
            )}
          </Group>

          {!isConnected ? (
            <Button
              size="xs"
              variant="light"
              color="cyan"
              leftSection={<Usb size={14} />}
              onClick={handleConnectSerial}
            >
              Connecter Balance (USB / COM)
            </Button>
          ) : (
            <Button size="xs" variant="subtle" color="red" onClick={handleDisconnectSerial}>
              Déconnecter
            </Button>
          )}
        </Paper>

        {serialError && (
          <Text size="xs" c="red" fw={600}>
            {serialError}
          </Text>
        )}

        {/* SÉLECTION DU PRODUIT AU POIDS */}
        <div>
          <Text size="xs" fw={700} mb={4} c="slate.7">
            Article à peser :
          </Text>
          <Select
            data={weightProducts.map((p) => ({
              value: String(p.id),
              label: `${p.designation} (${formatNumber(p.prix_ttc)} DH / ${p.unite || "kg"}) - Réf: ${p.ref}${(p as any).code_plu ? ` [PLU ${(p as any).code_plu}]` : ""}`,
            }))}
            value={selectedProdId}
            onChange={(val) => setSelectedProdId(val || "")}
            searchable
            placeholder="Sélectionner ou chercher un article au poids..."
            nothingFoundMessage="Aucun article configuré au poids trouvé"
            radius="md"
          />
        </div>

        {/* CADRAN LCD DIGITAL HAUTE LISIBILITÉ (TYPE BALANCE COMMERCIALE) */}
        <Paper
          p="md"
          radius="lg"
          withBorder
          className="bg-gradient-to-b from-slate-900 to-black text-emerald-400 font-mono shadow-inner border-slate-700"
        >
          <div className="grid grid-cols-3 gap-3 text-center border-b border-slate-800 pb-3 mb-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">
                Poids Brut
              </div>
              <div className="text-xl font-black text-slate-300">
                {currentWeight.toFixed(3)} <span className="text-xs">kg</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">
                Tare (T)
              </div>
              <div className="text-xl font-black text-amber-400">
                {tare.toFixed(3)} <span className="text-xs">kg</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">
                Prix / kg
              </div>
              <div className="text-xl font-black text-slate-300">
                {formatNumber(unitPrice)} <span className="text-xs">DH</span>
              </div>
            </div>
          </div>

          {/* POIDS NET & TOTAL À PAYER */}
          <div className="flex items-center justify-between px-3">
            <div>
              <div className="text-xs text-emerald-400/70 font-sans font-bold uppercase tracking-wider">
                Poids Net Pesé
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-400">
                {netWeight.toFixed(3)}{" "}
                <span className="text-xl font-normal text-emerald-500 font-sans">kg</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-emerald-400/70 font-sans font-bold uppercase tracking-wider">
                Prix Total TTC
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {formatNumber(totalPrice)}{" "}
                <span className="text-xl font-normal text-slate-400 font-sans">DH</span>
              </div>
            </div>
          </div>
        </Paper>

        {/* COMMANDES TACTILES & TARE */}
        <Group grow gap="xs">
          <Button
            size="sm"
            variant="outline"
            color="gray"
            radius="md"
            onClick={handleZero}
            className="font-bold"
          >
            &gt;0&lt; Zéro
          </Button>

          <Button
            size="sm"
            variant="outline"
            color="amber"
            radius="md"
            onClick={handleTare}
            className="font-bold"
          >
            &gt;T&lt; Tare ({tare.toFixed(3)} kg)
          </Button>
        </Group>

        {/* RACCOURCIS DE PESÉE MANUELLE (SI SIMULATION OU BALANCER MANUELLEMENT) */}
        {!isConnected && (
          <div>
            <Text size="xs" fw={700} c="dimmed" mb={6}>
              Simulateur de poids (Ajouter sur le plateau) :
            </Text>
            <Group gap="xs">
              {[100, 250, 500, 1000, 2000, 5000].map((g) => (
                <Button
                  key={g}
                  size="xs"
                  variant="light"
                  color="cyan"
                  radius="md"
                  onClick={() => handleAddWeight(g)}
                >
                  +{g >= 1000 ? `${g / 1000} kg` : `${g} g`}
                </Button>
              ))}
            </Group>

            <div className="mt-3">
              <NumberInput
                size="xs"
                label="Saisie directe du poids (kg)"
                value={currentWeight}
                onChange={(val) => setCurrentWeight(Math.max(0, Number(val) || 0))}
                decimalScale={3}
                step={0.05}
                min={0}
                radius="md"
              />
            </div>
          </div>
        )}

        <Divider />

        {/* VALIDATION FINALE ET AJOUT AU TICKET */}
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={onClose} radius="md">
            Annuler
          </Button>
          <Button
            size="md"
            color="teal"
            radius="md"
            leftSection={<Check size={18} />}
            onClick={handleConfirm}
            disabled={!selectedProduct || netWeight <= 0}
            className="shadow-md shadow-teal-900/20 font-bold"
          >
            Valider la Pesée ({netWeight.toFixed(3)} kg · {formatNumber(totalPrice)} DH)
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
