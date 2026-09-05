"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Banknote, Calculator, Coins, DoorOpen, Info, ShieldAlert } from "lucide-react";
import { ouvrirSessionCaisseAction } from "@/app/actions";
import { type CaisseSessionRecord, type DenominationsComptage } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface SessionOuvertureModalProps {
  opened: boolean;
  onClose: () => void;
  branchId: number;
  branchName: string;
  onSessionOpened: (session: CaisseSessionRecord) => void;
}

export function SessionOuvertureModal({
  opened,
  onClose,
  branchId,
  branchName,
  onSessionOpened,
}: SessionOuvertureModalProps) {
  const [fondDirect, setFondDirect] = useState<number | string>(500);
  const [showDenominations, setShowDenominations] = useState(false);
  const [denominations, setDenominations] = useState<DenominationsComptage>({
    billets200: 1,
    billets100: 2,
    billets50: 2,
    billets20: 0,
    pieces10: 0,
    pieces5: 0,
    pieces2: 0,
    pieces1: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Calcul du total via les dénominations
  const totalDenominations = useMemo(() => {
    return (
      (denominations.billets200 || 0) * 200 +
      (denominations.billets100 || 0) * 100 +
      (denominations.billets50 || 0) * 50 +
      (denominations.billets20 || 0) * 20 +
      (denominations.pieces10 || 0) * 10 +
      (denominations.pieces5 || 0) * 5 +
      (denominations.pieces2 || 0) * 2 +
      (denominations.pieces1 || 0) * 1 +
      (denominations.autre || 0)
    );
  }, [denominations]);

  const finalFondInitial = showDenominations ? totalDenominations : Number(fondDirect) || 0;

  const handleQuickPreset = (amount: number) => {
    setFondDirect(amount);
    setShowDenominations(false);
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    if (finalFondInitial < 0) {
      setErrorMsg("Le fond de caisse initial ne peut pas être négatif.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ouvrirSessionCaisseAction({
        branchId,
        fondInitial: finalFondInitial,
        detailsFondJson: showDenominations ? JSON.stringify(denominations) : undefined,
      });

      if (res.success && res.session) {
        onSessionOpened(res.session);
        onClose();
      } else {
        setErrorMsg(res.error || "Impossible d'ouvrir la session.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      title={
        <Group gap="xs">
          <ThemeIcon color="teal" variant="light" size="lg" radius="md">
            <DoorOpen size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              Ouverture de Session de Caisse
            </Text>
            <Text size="xs" c="dimmed">
              Point de vente : <strong>{branchName}</strong>
            </Text>
          </div>
        </Group>
      }
      size="md"
      radius="lg"
      centered
    >
      <Stack gap="md">
        <Alert icon={<Info size={16} />} color="blue" variant="light" radius="md">
          Veuillez déclarer le <strong>fond de caisse initial</strong> présent dans le tiroir-caisse
          pour débuter la journée de vente.
        </Alert>

        {errorMsg && (
          <Alert icon={<ShieldAlert size={16} />} color="red" variant="filled" radius="md">
            {errorMsg}
          </Alert>
        )}

        {/* Raccourcis Rapides de Fond de Caisse */}
        <div>
          <Text size="xs" fw={600} mb={6} c="dimmed">
            Montants prédéfinis courants :
          </Text>
          <Group gap="xs">
            {[200, 300, 500, 1000].map((amt) => (
              <Button
                key={amt}
                size="xs"
                variant={!showDenominations && Number(fondDirect) === amt ? "filled" : "light"}
                color="teal"
                onClick={() => handleQuickPreset(amt)}
              >
                {amt} DH
              </Button>
            ))}
            <Button
              size="xs"
              variant={showDenominations ? "filled" : "subtle"}
              color="indigo"
              leftSection={<Calculator size={14} />}
              onClick={() => setShowDenominations(!showDenominations)}
            >
              Comptage détaillé
            </Button>
          </Group>
        </div>

        {!showDenominations ? (
          <div>
            <NumberInput
              label="Montant Total du Fond de Caisse (DH)"
              description="Saisissez la valeur totale des espèces au démarrage"
              value={fondDirect}
              onChange={setFondDirect}
              min={0}
              step={50}
              size="md"
              radius="md"
              prefix="DH "
              styles={{
                input: { fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" },
              }}
            />
          </div>
        ) : (
          /* Décompte tactile détaillé par coupures */
          <Paper p="sm" radius="md" withBorder bg="gray.0">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs" fw={700} c="dark.7">
                  Décompte des Billets & Pièces
                </Text>
                <Badge size="md" color="teal" variant="filled">
                  Total : {formatNumber(totalDenominations)} DH
                </Badge>
              </Group>

              <SimpleGrid cols={2} spacing="xs">
                <NumberInput
                  size="xs"
                  label="Billets 200 DH"
                  value={denominations.billets200 || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, billets200: Number(v) || 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Billets 100 DH"
                  value={denominations.billets100 || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, billets100: Number(v) || 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Billets 50 DH"
                  value={denominations.billets50 || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, billets50: Number(v) || 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Billets 20 DH"
                  value={denominations.billets20 || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, billets20: Number(v) || 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Pièces 10 DH"
                  value={denominations.pieces10 || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, pieces10: Number(v) || 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Pièces 5 DH"
                  value={denominations.pieces5 || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, pieces5: Number(v) || 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Pièces 1 & 2 DH"
                  value={(denominations.pieces1 || 0) + (denominations.pieces2 || 0) * 2}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, pieces1: Number(v) || 0, pieces2: 0 }))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Autre monnaie"
                  value={denominations.autre || 0}
                  min={0}
                  onChange={(v) =>
                    setDenominations((prev) => ({ ...prev, autre: Number(v) || 0 }))
                  }
                />
              </SimpleGrid>
            </Stack>
          </Paper>
        )}

        <Paper p="md" radius="md" bg="teal.0" withBorder>
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="teal.9" fw={600}>
                Fond Initial Enregistré :
              </Text>
              <Text size="xl" fw={900} c="teal.9">
                {formatNumber(finalFondInitial)} DH
              </Text>
            </div>
            <ThemeIcon color="teal" size={44} radius="xl" variant="filled">
              <Banknote size={24} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Button
          fullWidth
          size="lg"
          radius="md"
          color="teal"
          leftSection={<DoorOpen size={20} />}
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          Valider & Ouvrir la Caisse
        </Button>
      </Stack>
    </Modal>
  );
}
