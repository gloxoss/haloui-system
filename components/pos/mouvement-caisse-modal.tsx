"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { ArrowDownLeft, ArrowUpRight, DollarSign, ShieldAlert } from "lucide-react";
import { enregistrerMouvementCaisseAction } from "@/app/actions";
import { type CaisseMouvementRecord, type CaisseMouvementType } from "@/lib/types";

interface MouvementCaisseModalProps {
  opened: boolean;
  onClose: () => void;
  sessionId: number;
  branchId: number;
  onMouvementEnregistre: (mouvement: CaisseMouvementRecord) => void;
}

export function MouvementCaisseModal({
  opened,
  onClose,
  sessionId,
  branchId,
  onMouvementEnregistre,
}: MouvementCaisseModalProps) {
  const [type, setType] = useState<CaisseMouvementType>("sortie");
  const [montant, setMontant] = useState<number | string>(50);
  const [motif, setMotif] = useState("");
  const [beneficiaire, setBeneficiaire] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const motifsCourantsSortie = [
    "Achat pain / viennoiseries café",
    "Fournitures bureau urgentes",
    "Pourboire / Coursier livraison",
    "Carburant dépannage",
    "Nettoyage / Entretien",
  ];

  const motifsCourantsEntree = [
    "Apport de monnaie (Change)",
    "Régularisation fond de caisse",
    "Remboursement avance",
  ];

  const handleSubmit = async () => {
    setErrorMsg("");
    const num = Number(montant);
    if (!num || num <= 0) {
      setErrorMsg("Le montant doit être supérieur à 0 DH.");
      return;
    }
    if (!motif.trim()) {
      setErrorMsg("Veuillez renseigner un motif pour ce mouvement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await enregistrerMouvementCaisseAction({
        sessionId,
        branchId,
        type,
        montant: num,
        motif: motif.trim(),
        beneficiaire: beneficiaire.trim(),
      });

      if (res.success && res.mouvement) {
        onMouvementEnregistre(res.mouvement);
        onClose();
        setMotif("");
        setBeneficiaire("");
        setMontant(50);
      } else {
        setErrorMsg(res.error || "Erreur lors de l'enregistrement du mouvement");
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
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon
            color={type === "sortie" ? "red" : "teal"}
            variant="light"
            size="lg"
            radius="md"
          >
            {type === "sortie" ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              Mouvement de Caisse
            </Text>
            <Text size="xs" c="dimmed">
              Entrée d&apos;appoint ou sortie de fonds exceptionnelle
            </Text>
          </div>
        </Group>
      }
      size="md"
      radius="lg"
      centered
    >
      <Stack gap="md">
        {errorMsg && (
          <Alert icon={<ShieldAlert size={16} />} color="red" variant="filled" radius="md">
            {errorMsg}
          </Alert>
        )}

        <div>
          <Text size="xs" fw={600} mb={6}>
            Sens du mouvement :
          </Text>
          <SegmentedControl
            fullWidth
            size="sm"
            radius="md"
            value={type}
            onChange={(v) => setType(v as CaisseMouvementType)}
            data={[
              { label: "Sortie de Caisse (Dépense)", value: "sortie" },
              { label: "Entrée de Caisse (Apport)", value: "entree" },
            ]}
            color={type === "sortie" ? "red" : "teal"}
          />
        </div>

        <NumberInput
          label="Montant (DH)"
          value={montant}
          onChange={setMontant}
          min={1}
          size="md"
          radius="md"
          prefix="DH "
          styles={{ input: { fontSize: "1.2rem", fontWeight: 700 } }}
        />

        <div>
          <Text size="xs" fw={600} mb={6} c="dimmed">
            Motifs fréquents :
          </Text>
          <Group gap={6}>
            {(type === "sortie" ? motifsCourantsSortie : motifsCourantsEntree).map((m) => (
              <Button
                key={m}
                size="compact-xs"
                variant={motif === m ? "filled" : "light"}
                color={type === "sortie" ? "red" : "teal"}
                onClick={() => setMotif(m)}
              >
                {m}
              </Button>
            ))}
          </Group>
        </div>

        <TextInput
          label="Motif du mouvement *"
          placeholder="Ex: Achat consommables, appoint pièces..."
          value={motif}
          onChange={(e) => setMotif(e.currentTarget.value)}
          radius="md"
          size="sm"
          required
        />

        <TextInput
          label="Bénéficiaire ou émetteur (optionnel)"
          placeholder="Ex: Nom du coursier, magasin..."
          value={beneficiaire}
          onChange={(e) => setBeneficiaire(e.currentTarget.value)}
          radius="md"
          size="sm"
        />

        <Button
          fullWidth
          size="md"
          radius="md"
          color={type === "sortie" ? "red" : "teal"}
          loading={isSubmitting}
          onClick={handleSubmit}
          mt="xs"
        >
          Enregistrer le mouvement ({type === "sortie" ? "Sortie" : "Entrée"})
        </Button>
      </Stack>
    </Modal>
  );
}
