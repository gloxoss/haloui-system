"use client";

import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  AlertCircle,
  Banknote,
  Barcode,
  Check,
  CheckCircle2,
  CornerUpLeft,
  CreditCard,
  Printer,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  enregistrerRetourCaisseAction,
  getTicketPourRetourAction,
} from "@/app/actions";
import {
  type BonAchatRecord,
  type CaisseRetourCompensation,
  type CaisseRetourRecord,
  type CaisseTicketRecord,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface RetourModalProps {
  opened: boolean;
  onClose: () => void;
  sessionId: number;
  branchId: number;
}

interface ReturnItemDraft {
  produitId?: number | null;
  ref: string;
  designation: string;
  prixUnitaireHt: number;
  prixUnitaireTtc: number;
  tvaRate: number;
  quantiteAchetee: number;
  quantiteRetour: number;
  restitueStock: boolean;
  motifLigne: string;
}

export function RetourModal({
  opened,
  onClose,
  sessionId,
  branchId,
}: RetourModalProps) {
  const [searchTicketQuery, setSearchTicketQuery] = useState("");
  const [isSearchingTicket, setIsSearchingTicket] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loadedTicket, setLoadedTicket] = useState<CaisseTicketRecord | null>(null);

  const [returnItems, setReturnItems] = useState<ReturnItemDraft[]>([]);
  const [compensationMode, setCompensationMode] = useState<CaisseRetourCompensation>("bon_achat");
  const [validiteMois, setValiditeMois] = useState<number>(6);
  const [motifGeneral, setMotifGeneral] = useState("Retour client au comptoir");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Résultat après enregistrement réussi
  const [completedRetour, setCompletedRetour] = useState<CaisseRetourRecord | null>(null);
  const [completedBonAchat, setCompletedBonAchat] = useState<BonAchatRecord | null>(null);

  // Recherche du ticket d'origine
  const handleSearchTicket = async () => {
    if (!searchTicketQuery.trim()) return;
    setIsSearchingTicket(true);
    setSearchError("");
    setLoadedTicket(null);
    setReturnItems([]);

    try {
      const res = await getTicketPourRetourAction(searchTicketQuery.trim());
      if (res.success && res.ticket) {
        setLoadedTicket(res.ticket);
        setReturnItems(
          res.ticket.lignes.map((l) => ({
            produitId: l.produit_id || null,
            ref: l.ref,
            designation: l.designation,
            prixUnitaireHt: l.prix_unitaire_ht,
            prixUnitaireTtc: l.prix_unitaire_ttc,
            tvaRate: l.tva_rate,
            quantiteAchetee: l.quantite,
            quantiteRetour: 0,
            restitueStock: true,
            motifLigne: "Ne convient pas",
          }))
        );
      } else {
        setSearchError(res.error || "Ticket introuvable. Vérifiez le numéro ou scannez le code-barres.");
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSearchingTicket(false);
    }
  };

  // Calcul du montant total retourné
  const totalRetourTtc = returnItems.reduce(
    (acc, it) => acc + (it.quantiteRetour > 0 ? it.quantiteRetour * it.prixUnitaireTtc : 0),
    0
  );
  const totalRetourHt = returnItems.reduce(
    (acc, it) => acc + (it.quantiteRetour > 0 ? it.quantiteRetour * it.prixUnitaireHt : 0),
    0
  );
  const nbArticlesRetournes = returnItems.filter((i) => i.quantiteRetour > 0).length;

  // Validation du retour
  const handleSubmitRetour = async () => {
    if (nbArticlesRetournes === 0 || totalRetourTtc <= 0) {
      setSubmitError("Veuillez renseigner au moins une quantité à retourner supérieure à 0.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const selectedLignes = returnItems
        .filter((it) => it.quantiteRetour > 0)
        .map((it) => ({
          produitId: it.produitId,
          ref: it.ref,
          designation: it.designation,
          prixUnitaireHt: it.prixUnitaireHt,
          prixUnitaireTtc: it.prixUnitaireTtc,
          quantite: it.quantiteRetour,
          tvaRate: it.tvaRate,
          restitueStock: it.restitueStock,
          motifLigne: it.motifLigne,
        }));

      const res = await enregistrerRetourCaisseAction({
        sessionId,
        branchId,
        ticketOrigineId: loadedTicket?.id || null,
        ticketOrigineNumero: loadedTicket?.numero_ticket || "",
        clientId: loadedTicket?.client_id || null,
        clientNom: loadedTicket?.client_nom || "Client Comptoir",
        modeCompensation: compensationMode,
        motifGeneral,
        lignes: selectedLignes,
        validiteMois: Number(validiteMois) || 6,
      });

      if (res.success && res.retour) {
        setCompletedRetour(res.retour);
        setCompletedBonAchat(res.bonAchat || null);
      } else {
        setSubmitError(res.error || "Échec de l'enregistrement du retour.");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setSearchTicketQuery("");
    setLoadedTicket(null);
    setReturnItems([]);
    setCompletedRetour(null);
    setCompletedBonAchat(null);
    setSearchError("");
    setSubmitError("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleResetModal}
      title={
        <Group gap="xs">
          <ThemeIcon color="orange" size="lg" radius="md">
            <Undo2 size={20} />
          </ThemeIcon>
          <div>
            <Text fw={800} size="sm">
              Gestion des Retours Articles & Émission d&apos;Avoirs
            </Text>
            <Text size="xs" c="dimmed">
              Remise en stock immédiate & Bon d&apos;Achat ou Remboursement Espèces
            </Text>
          </div>
        </Group>
      }
      size="xl"
      radius="lg"
      centered
    >
      {completedRetour ? (
        /* ÉCRAN DE CONFIRMATION APRÈS RETOUR RÉUSSI */
        <Stack gap="md" align="center" ta="center" py="md">
          <ThemeIcon color="teal" size={60} radius="xl" variant="light">
            <CheckCircle2 size={36} />
          </ThemeIcon>

          <div>
            <Title order={3} fw={900}>
              Retour Enregistré avec Succès !
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Bordereau N° <strong>{completedRetour.numero_retour}</strong> · Montant :{" "}
              <strong className="text-emerald-500 font-black">{formatNumber(completedRetour.total_ttc)} DH</strong>
            </Text>
          </div>

          {completedBonAchat ? (
            /* AFFICHAGE DU BON D'ACHAT ÉMIS */
            <Paper p="md" radius="lg" withBorder bg="purple.0" w="100%" className="border-purple-300">
              <Stack gap="xs" align="center">
                <Badge size="lg" color="grape" variant="filled">
                  BON D&apos;ACHAT ÉMIS
                </Badge>
                <div className="font-mono text-2xl font-black tracking-wider text-purple-950">
                  {completedBonAchat.code}
                </div>
                <div className="text-xl font-black text-emerald-600">
                  {formatNumber(completedBonAchat.montant_initial)} DH
                </div>
                <Text size="xs" c="dimmed">
                  Valable jusqu&apos;au <strong>{new Date(completedBonAchat.date_expiration).toLocaleDateString("fr-FR")}</strong> (utilisable en caisse sur prochain achat).
                </Text>
              </Stack>
            </Paper>
          ) : (
            <Alert color="teal" title="Remboursement Espèces Effectué">
              Le montant de {formatNumber(completedRetour.total_ttc)} DH a été déduit du tiroir-caisse physique (mouvement de sortie enregistré).
            </Alert>
          )}

          <Group justify="center" gap="md" mt="xs" w="100%">
            {completedBonAchat && (
              <Button
                size="md"
                radius="md"
                color="grape"
                leftSection={<Printer size={18} />}
                onClick={() => window.open(`/print/pos/bon-achat/${completedBonAchat.id}`, "_blank")}
              >
                Imprimer Bon d&apos;Achat (80mm)
              </Button>
            )}

            <Button
              size="md"
              radius="md"
              variant="default"
              leftSection={<Printer size={18} />}
              onClick={() => window.open(`/print/pos/retour/${completedRetour.id}`, "_blank")}
            >
              Imprimer Justificatif Retour
            </Button>

            <Button size="md" radius="md" color="indigo" onClick={handleResetModal}>
              Nouveau Retour / Fermer
            </Button>
          </Group>
        </Stack>
      ) : (
        /* ÉCRAN DE SAISIE DU RETOUR */
        <Stack gap="md">
          {/* Recherche du ticket par scan ou référence */}
          <Paper p="xs" radius="md" withBorder bg="slate.9">
            <Group align="flex-end" gap="xs">
              <TextInput
                label="Rechercher le Ticket Vendu (Douchette code-barres ou N° Ticket) :"
                placeholder="Ex: TK-2026-0003 ou scanner le code..."
                value={searchTicketQuery}
                onChange={(e) => setSearchTicketQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchTicket();
                }}
                leftSection={<Barcode size={18} className="text-slate-400" />}
                className="flex-1"
                size="sm"
                radius="md"
              />
              <Button
                size="sm"
                radius="md"
                color="indigo"
                leftSection={<Search size={16} />}
                loading={isSearchingTicket}
                onClick={handleSearchTicket}
              >
                Trouver Ticket
              </Button>
            </Group>
            {searchError && (
              <Text size="xs" c="red.4" mt={6} fw={600}>
                ⚠️ {searchError}
              </Text>
            )}
          </Paper>

          {/* En-tête Ticket Retrouvé */}
          {loadedTicket && (
            <Paper p="xs" radius="md" withBorder bg="dark.7" className="text-xs">
              <Group justify="space-between">
                <div>
                  <Text size="xs" fw={700} c="white">
                    Ticket N° {loadedTicket.numero_ticket} · Client : {loadedTicket.client_nom || "Comptoir"}
                  </Text>
                  <Text size="11px" c="dimmed">
                    Date : {new Date(loadedTicket.created_at).toLocaleString("fr-FR")} · Total initial :{" "}
                    <strong>{formatNumber(loadedTicket.total_ttc)} DH</strong>
                  </Text>
                </div>
                <Badge size="md" color="teal" variant="light">
                  {loadedTicket.lignes.length} article(s)
                </Badge>
              </Group>
            </Paper>
          )}

          {/* Tableau des articles du ticket à retourner */}
          {returnItems.length > 0 && (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr className="bg-slate-900 text-[11px] text-slate-400">
                    <Table.Th>Article</Table.Th>
                    <Table.Th>PU TTC</Table.Th>
                    <Table.Th>Acheté</Table.Th>
                    <Table.Th style={{ width: 100 }}>Qté Retour</Table.Th>
                    <Table.Th>Total Remb.</Table.Th>
                    <Table.Th>Remise Stock</Table.Th>
                    <Table.Th>Motif</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {returnItems.map((item, idx) => {
                    const lineTotal = item.quantiteRetour * item.prixUnitaireTtc;
                    return (
                      <Table.Tr key={idx} className="text-xs">
                        <Table.Td>
                          <div className="font-bold text-white text-xs">{item.designation}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.ref}</div>
                        </Table.Td>
                        <Table.Td>{formatNumber(item.prixUnitaireTtc)} DH</Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="default">
                            {item.quantiteAchetee}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            min={0}
                            max={item.quantiteAchetee}
                            step={1}
                            value={item.quantiteRetour}
                            onChange={(v) => {
                              const val = Math.min(item.quantiteAchetee, Math.max(0, Number(v) || 0));
                              setReturnItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, quantiteRetour: val } : it))
                              );
                            }}
                          />
                        </Table.Td>
                        <Table.Td className="font-bold text-emerald-400">
                          {formatNumber(lineTotal)} DH
                        </Table.Td>
                        <Table.Td>
                          <Checkbox
                            size="xs"
                            checked={item.restitueStock}
                            onChange={(e) => {
                              const checked = e.currentTarget.checked;
                              setReturnItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, restitueStock: checked } : it))
                              );
                            }}
                            label="Réintégrer"
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            size="xs"
                            value={item.motifLigne}
                            onChange={(v) => {
                              if (v) {
                                setReturnItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, motifLigne: v } : it))
                                );
                              }
                            }}
                            data={[
                              { value: "Ne convient pas", label: "Ne convient pas" },
                              { value: "Défectueux / Avarié", label: "Défectueux / Avarié" },
                              { value: "Erreur d'achat", label: "Erreur d'achat" },
                              { value: "Autre", label: "Autre" },
                            ]}
                          />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          )}

          {/* Choix du Mode de Compensation */}
          {returnItems.length > 0 && (
            <Paper p="md" radius="md" withBorder bg="slate.9">
              <Text size="xs" fw={700} mb="xs">
                Mode de Compensation / Dédommagement Client :
              </Text>
              <SimpleGrid cols={3} spacing="xs">
                <Button
                  size="sm"
                  variant={compensationMode === "bon_achat" ? "filled" : "light"}
                  color="grape"
                  leftSection={<Tag size={16} />}
                  onClick={() => setCompensationMode("bon_achat")}
                >
                  Bon d&apos;Achat (Avoir)
                </Button>
                <Button
                  size="sm"
                  variant={compensationMode === "especes" ? "filled" : "light"}
                  color="teal"
                  leftSection={<Banknote size={16} />}
                  onClick={() => setCompensationMode("especes")}
                >
                  Remboursement Espèces
                </Button>
                <Button
                  size="sm"
                  variant={compensationMode === "carte" ? "filled" : "light"}
                  color="blue"
                  leftSection={<CreditCard size={16} />}
                  onClick={() => setCompensationMode("carte")}
                >
                  Carte Bancaire TPE
                </Button>
              </SimpleGrid>

              {compensationMode === "bon_achat" && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Durée de validité du Bon d&apos;Achat :</span>
                  <Select
                    size="xs"
                    value={String(validiteMois)}
                    onChange={(v) => v && setValiditeMois(Number(v))}
                    data={[
                      { value: "1", label: "1 Mois" },
                      { value: "3", label: "3 Mois" },
                      { value: "6", label: "6 Mois (Standard)" },
                      { value: "12", label: "1 An" },
                    ]}
                    w={140}
                  />
                </div>
              )}
            </Paper>
          )}

          {submitError && (
            <Alert color="red" icon={<AlertCircle size={16} />}>
              {submitError}
            </Alert>
          )}

          {/* Total et Validation Finale */}
          {returnItems.length > 0 && (
            <Group justify="space-between" align="center" mt="xs">
              <div>
                <Text size="xs" c="dimmed">
                  Total Remboursement Accordé :
                </Text>
                <Text size="xl" fw={900} className="text-emerald-400">
                  {formatNumber(totalRetourTtc)} <span className="text-xs">DH TTC</span>
                </Text>
              </div>

              <Button
                size="lg"
                radius="md"
                color="orange"
                leftSection={<RotateCcw size={18} />}
                loading={isSubmitting}
                disabled={nbArticlesRetournes === 0 || totalRetourTtc <= 0}
                onClick={handleSubmitRetour}
              >
                Valider le Retour ({formatNumber(totalRetourTtc)} DH)
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}
