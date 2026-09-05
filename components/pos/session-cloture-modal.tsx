"use client";

import { useEffect, useMemo, useState } from "react";
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
  Table,
  Tabs,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  AlertCircle,
  Banknote,
  Calculator,
  CheckCircle,
  Coins,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
  Receipt,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { cloturerSessionCaisseAction, genererRapportXAction } from "@/app/actions";
import {
  type CaisseSessionRecord,
  type DenominationsComptage,
  type RapportXData,
  type RapportZData,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface SessionClotureModalProps {
  opened: boolean;
  onClose: () => void;
  session: CaisseSessionRecord;
  onSessionClosed: (rapportZ: RapportZData) => void;
}

export function SessionClotureModal({
  opened,
  onClose,
  session,
  onSessionClosed,
}: SessionClotureModalProps) {
  const [activeTab, setActiveTab] = useState<string | null>("rapport_x");
  const [rapportX, setRapportX] = useState<RapportXData | null>(null);
  const [isLoadingX, setIsLoadingX] = useState(false);

  // Comptage physique de fermeture
  const [comptageDirect, setComptageDirect] = useState<number | string>(0);
  const [useDetailedDenominations, setUseDetailedDenominations] = useState(false);
  const [denominations, setDenominations] = useState<DenominationsComptage>({
    billets200: 0,
    billets100: 0,
    billets50: 0,
    billets20: 0,
    pieces10: 0,
    pieces5: 0,
    pieces2: 0,
    pieces1: 0,
    autre: 0,
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Charger le Rapport X dès l'ouverture
  useEffect(() => {
    if (opened && session?.id) {
      setIsLoadingX(true);
      genererRapportXAction(session.id)
        .then((res) => {
          if (res.success && res.rapport) {
            setRapportX(res.rapport);
            // Pré-remplir le comptage avec le théorique pour faciliter la saisie
            setComptageDirect(res.rapport.theorique_especes_en_caisse);
          }
        })
        .finally(() => setIsLoadingX(false));
    }
  }, [opened, session?.id]);

  // Calcul du total dénominations
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

  const reelComptage = useDetailedDenominations
    ? totalDenominations
    : Math.max(0, Number(comptageDirect) || 0);

  const theorique = rapportX?.theorique_especes_en_caisse ?? session.montant_especes_theorique;
  const ecartCaisse = Math.round((reelComptage - theorique) * 100) / 100;

  const handleCloturerDefinitivement = async () => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const res = await cloturerSessionCaisseAction({
        sessionId: session.id,
        comptageReelEspeces: reelComptage,
        detailsComptageJson: useDetailedDenominations ? JSON.stringify(denominations) : undefined,
        notes,
      });

      if (res.success && res.rapport) {
        onSessionClosed(res.rapport);
        onClose();
        // Ouvrir automatiquement le ticket Z d'impression
        window.open(`/print/pos/rapport-z/${session.id}`, "_blank");
      } else {
        setErrorMsg(res.error || "Échec de la clôture de caisse");
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
          <ThemeIcon color="indigo" variant="light" size="lg" radius="md">
            <Scale size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              Gestion de Caisse : Lecture X & Clôture Z
            </Text>
            <Text size="xs" c="dimmed">
              Session N° <strong>{session.numero_session}</strong> · {session.branch_name}
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="lg"
      centered
    >
      <Tabs value={activeTab} onChange={setActiveTab} radius="md">
        <Tabs.List mb="md" grow>
          <Tabs.Tab value="rapport_x" leftSection={<FileText size={16} />}>
            Rapport X (Lecture continue)
          </Tabs.Tab>
          <Tabs.Tab value="cloture_z" color="red" leftSection={<Lock size={16} />}>
            Clôture Définitive (Rapport Z)
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB 1 : RAPPORT X */}
        <Tabs.Panel value="rapport_x">
          <Stack gap="md">
            <Alert icon={<FileText size={16} />} color="blue" variant="light" radius="md">
              Le <strong>Rapport X</strong> est une lecture d&apos;état instantanée de la caisse. Il n&apos;arrête
              pas la journée et permet de vérifier les encaissements à tout moment.
            </Alert>

            {rapportX && (
              <>
                <SimpleGrid cols={2} spacing="xs">
                  <Paper p="sm" radius="md" withBorder bg="gray.0">
                    <Text size="xs" c="dimmed">
                      Fond de Caisse Initial
                    </Text>
                    <Text fw={800} size="md" c="dark.8">
                      {formatNumber(rapportX.fond_initial)} DH
                    </Text>
                  </Paper>

                  <Paper p="sm" radius="md" withBorder bg="gray.0">
                    <Text size="xs" c="dimmed">
                      Total Ventes (TTC)
                    </Text>
                    <Text fw={800} size="md" c="indigo.8">
                      {formatNumber(rapportX.total_ventes_ttc)} DH ({rapportX.nb_tickets} tickets)
                    </Text>
                  </Paper>
                </SimpleGrid>

                {/* Répartition par mode de paiement */}
                <Paper p="md" radius="md" withBorder>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
                    Ventilation des Recettes de la Session :
                  </Text>
                  <Table verticalSpacing={4} fz="xs">
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>
                          <Group gap={6}>
                            <Banknote size={14} className="text-teal-600" />
                            <Text size="xs" fw={600}>
                              Espèces encaissées
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {formatNumber(rapportX.par_mode_reglement.especes)} DH
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Group gap={6}>
                            <CreditCard size={14} className="text-blue-600" />
                            <Text size="xs" fw={600}>
                              Cartes Bancaires (TPE)
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {formatNumber(rapportX.par_mode_reglement.carte)} DH
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Group gap={6}>
                            <Receipt size={14} className="text-amber-600" />
                            <Text size="xs" fw={600}>
                              Chèques
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {formatNumber(rapportX.par_mode_reglement.cheque)} DH
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td>
                          <Group gap={6}>
                            <FileSpreadsheet size={14} className="text-indigo-600" />
                            <Text size="xs" fw={600}>
                              Virements
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {formatNumber(rapportX.par_mode_reglement.virement)} DH
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td c="dimmed">Sorties de caisse (Dépenses)</Table.Td>
                        <Table.Td ta="right" c="red.7" fw={700}>
                          - {formatNumber(rapportX.total_sorties)} DH
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td c="dimmed">Entrées de monnaie (Apports)</Table.Td>
                        <Table.Td ta="right" c="teal.7" fw={700}>
                          + {formatNumber(rapportX.total_entrees)} DH
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Paper>

                {/* Théorique Espèces dans le tiroir */}
                <Paper p="md" radius="md" bg="teal.0" withBorder>
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="xs" c="teal.9" fw={600}>
                        Espèces Théoriques dans le Tiroir :
                      </Text>
                      <Text size="11px" c="teal.8">
                        Fond ({formatNumber(rapportX.fond_initial)}) + Ventes Espèces (
                        {formatNumber(rapportX.par_mode_reglement.especes)}) - Sorties (
                        {formatNumber(rapportX.total_sorties)})
                      </Text>
                    </div>
                    <Text size="xl" fw={900} c="teal.9">
                      {formatNumber(rapportX.theorique_especes_en_caisse)} DH
                    </Text>
                  </Group>
                </Paper>
              </>
            )}

            <Group justify="space-between" mt="xs">
              <Button variant="default" onClick={onClose}>
                Fermer
              </Button>
              <Button
                color="indigo"
                leftSection={<Printer size={16} />}
                onClick={() => window.print()}
              >
                Imprimer Rapport X
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* TAB 2 : CLÔTURE Z DÉFINITIVE */}
        <Tabs.Panel value="cloture_z">
          <Stack gap="md">
            <Alert icon={<ShieldAlert size={16} />} color="red" variant="light" radius="md">
              <strong>Attention :</strong> La clôture Z est une opération irréversible qui verrouille
              définitivement cette session de caisse et génère le rapport officiel journalier.
            </Alert>

            {errorMsg && (
              <Alert icon={<AlertCircle size={16} />} color="red" variant="filled" radius="md">
                {errorMsg}
              </Alert>
            )}

            {/* Espèces théoriques */}
            <Paper p="sm" radius="md" withBorder bg="gray.0">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Montant Théorique Attendu en Espèces :
                  </Text>
                  <Text size="lg" fw={800} c="dark.8">
                    {formatNumber(theorique)} DH
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="subtle"
                  color="indigo"
                  leftSection={<Calculator size={14} />}
                  onClick={() => setUseDetailedDenominations(!useDetailedDenominations)}
                >
                  {useDetailedDenominations ? "Saisie directe" : "Comptage par billets/pièces"}
                </Button>
              </Group>
            </Paper>

            {/* Formulaire de comptage physique */}
            {!useDetailedDenominations ? (
              <div>
                <NumberInput
                  label="Comptage Réel des Espèces (Tiroir-Caisse)"
                  description="Comptez physiquement tout l'argent liquide présent dans le tiroir"
                  value={comptageDirect}
                  onChange={setComptageDirect}
                  min={0}
                  step={10}
                  size="md"
                  radius="md"
                  prefix="DH "
                  styles={{
                    input: { fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" },
                  }}
                />
              </div>
            ) : (
              <Paper p="sm" radius="md" withBorder bg="gray.0">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" fw={700} c="dark.7">
                      Comptage Détaillé par Coupures :
                    </Text>
                    <Badge size="md" color="teal" variant="filled">
                      Total compté : {formatNumber(totalDenominations)} DH
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
                        setDenominations((prev) => ({
                          ...prev,
                          pieces1: Number(v) || 0,
                          pieces2: 0,
                        }))
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

            {/* CALCUL EN TEMPS RÉEL DE L'ÉCART DE CAISSE */}
            <Paper
              p="md"
              radius="md"
              withBorder
              bg={
                ecartCaisse === 0
                  ? "teal.0"
                  : ecartCaisse > 0
                  ? "green.0"
                  : "red.0"
              }
              style={{
                borderColor:
                  ecartCaisse === 0 ? "#14b8a6" : ecartCaisse > 0 ? "#22c55e" : "#ef4444",
              }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c={ecartCaisse === 0 ? "teal.9" : ecartCaisse > 0 ? "green.9" : "red.9"}>
                    {ecartCaisse === 0
                      ? "Caisse Parfaitement Équilibrée"
                      : ecartCaisse > 0
                      ? "Excédent de Caisse (Surplus)"
                      : "Déficit de Caisse (Manquant)"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Compté : {formatNumber(reelComptage)} DH · Attendu : {formatNumber(theorique)} DH
                  </Text>
                </div>

                <Badge
                  size="xl"
                  radius="md"
                  color={ecartCaisse === 0 ? "teal" : ecartCaisse > 0 ? "green" : "red"}
                  variant="filled"
                >
                  {ecartCaisse > 0 ? `+${formatNumber(ecartCaisse)} DH` : `${formatNumber(ecartCaisse)} DH`}
                </Badge>
              </Group>
            </Paper>

            <Textarea
              label="Observations / Justification de l'écart (optionnel)"
              placeholder="Ex: Erreur de rendu de monnaie sur ticket #12, pièces introuvables..."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              radius="md"
              size="xs"
              minRows={2}
            />

            <Button
              fullWidth
              size="lg"
              radius="md"
              color="red"
              leftSection={<Lock size={18} />}
              loading={isSubmitting}
              onClick={handleCloturerDefinitivement}
            >
              Valider la Clôture Définitive (Ticket Z)
            </Button>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
