"use client";

import * as React from "react";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { Plus, Trash2, CalendarClock } from "lucide-react";

import { saveSubscriptionAction } from "@/app/actions";
import { PERIODICITE_LABELS, MODE_REGLEMENT_LABELS, SUBSCRIPTION_STATUT_LABELS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import {
  type Periodicite,
  type SubscriptionItem,
  type SubscriptionLine,
  type SubscriptionModeReglement,
  type SubscriptionStatut,
} from "@/lib/types";
import { formatCurrency, todayIso } from "@/lib/utils";

export function SubscriptionModal({
  opened,
  onClose,
  onSuccess,
  subscription,
  clients,
  products = [],
}: {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription?: (SubscriptionItem & { lignes?: SubscriptionLine[] }) | null;
  clients: Array<{ id: number; name: string; phone: string; ice?: string }>;
  products?: Array<{ id: number; ref: string; designation: string; prix_ht: number; tva_rate: number; unite: string }>;
}) {
  const { locale } = useTranslation();

  const [clientId, setClientId] = React.useState<string>("");
  const [titre, setTitre] = React.useState<string>("");
  const [reference, setReference] = React.useState<string>("");
  const [periodicite, setPeriodicite] = React.useState<Periodicite>("mensuel");
  const [dateDebut, setDateDebut] = React.useState<string>(todayIso());
  const [dateFin, setDateFin] = React.useState<string>("");
  const [prochaineEcheance, setProchaineEcheance] = React.useState<string>(todayIso());
  const [statut, setStatut] = React.useState<SubscriptionStatut>("actif");
  const [modeReglement, setModeReglement] = React.useState<SubscriptionModeReglement>("prelevement");
  const [autoGenerer, setAutoGenerer] = React.useState<boolean>(true);
  const [genererStatut, setGenererStatut] = React.useState<"brouillon" | "valide">("valide");
  const [termePaiementJours, setTermePaiementJours] = React.useState<number>(30);
  const [notes, setNotes] = React.useState<string>("");

  const [lines, setLines] = React.useState<
    Array<{
      produit_id?: number | null;
      designation: string;
      quantite: number;
      unite: string;
      prix_unitaire_ht: number;
      tva_rate: number;
      remise: number;
    }>
  >([
    {
      produit_id: null,
      designation: "",
      quantite: 1,
      unite: "mois",
      prix_unitaire_ht: 0,
      tva_rate: 20,
      remise: 0,
    },
  ]);

  const [saving, setSaving] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  // Sync state when opening with an existing subscription
  React.useEffect(() => {
    if (subscription) {
      setClientId(String(subscription.client_id));
      setTitre(subscription.titre);
      setReference(subscription.reference);
      setPeriodicite(subscription.periodicite);
      setDateDebut(subscription.date_debut);
      setDateFin(subscription.date_fin || "");
      setProchaineEcheance(subscription.prochaine_echeance);
      setStatut(subscription.statut);
      setModeReglement(subscription.mode_reglement);
      setAutoGenerer(subscription.auto_generer === 1);
      setGenererStatut(subscription.generer_statut);
      setTermePaiementJours(subscription.terme_paiement_jours);
      setNotes(subscription.notes || "");

      if (subscription.lignes && subscription.lignes.length > 0) {
        setLines(
          subscription.lignes.map((l) => ({
            produit_id: l.produit_id,
            designation: l.designation,
            quantite: l.quantite,
            unite: l.unite || "mois",
            prix_unitaire_ht: l.prix_unitaire_ht,
            tva_rate: l.tva_rate,
            remise: l.remise || 0,
          }))
        );
      } else {
        setLines([
          {
            produit_id: null,
            designation: subscription.titre,
            quantite: 1,
            unite: "mois",
            prix_unitaire_ht: subscription.total_ht,
            tva_rate: 20,
            remise: 0,
          },
        ]);
      }
    } else {
      // New subscription defaults
      const today = todayIso();
      setClientId("");
      setTitre("");
      setReference(`ABO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
      setPeriodicite("mensuel");
      setDateDebut(today);
      setDateFin("");
      setProchaineEcheance(today);
      setStatut("actif");
      setModeReglement("prelevement");
      setAutoGenerer(true);
      setGenererStatut("valide");
      setTermePaiementJours(30);
      setNotes("");
      setLines([
        {
          produit_id: null,
          designation: "",
          quantite: 1,
          unite: "mois",
          prix_unitaire_ht: 0,
          tva_rate: 20,
          remise: 0,
        },
      ]);
    }
    setErrorMsg("");
  }, [subscription, opened]);

  // Live calculations
  const totals = React.useMemo(() => {
    let totalHt = 0;
    let totalTva = 0;

    for (const l of lines) {
      const qte = Number(l.quantite) || 0;
      const pu = Number(l.prix_unitaire_ht) || 0;
      const rem = Number(l.remise) || 0;
      const tva = Number(l.tva_rate) || 0;

      const base = qte * pu;
      const remiseVal = (base * rem) / 100;
      const ht = Math.max(base - remiseVal, 0);
      const tvaVal = (ht * tva) / 100;

      totalHt += ht;
      totalTva += tvaVal;
    }

    const totalTtc = totalHt + totalTva;

    let mrr = 0;
    if (periodicite === "mensuel") mrr = totalTtc;
    else if (periodicite === "trimestriel") mrr = totalTtc / 3;
    else if (periodicite === "semestriel") mrr = totalTtc / 6;
    else if (periodicite === "annuel") mrr = totalTtc / 12;

    const arr = mrr * 12;

    return {
      totalHt: Math.round(totalHt * 100) / 100,
      totalTva: Math.round(totalTva * 100) / 100,
      totalTtc: Math.round(totalTtc * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
    };
  }, [lines, periodicite]);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        produit_id: null,
        designation: "",
        quantite: 1,
        unite: periodicite === "annuel" ? "an" : "mois",
        prix_unitaire_ht: 0,
        tva_rate: 20,
        remise: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleProductSelect = (idx: number, prodIdStr: string | null) => {
    if (!prodIdStr) {
      handleLineChange(idx, "produit_id", null);
      return;
    }
    const prod = products.find((p) => String(p.id) === prodIdStr);
    if (prod) {
      setLines((prev) => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          produit_id: prod.id,
          designation: prod.designation,
          prix_unitaire_ht: prod.prix_ht,
          tva_rate: prod.tva_rate,
          unite: prod.unite || "u",
        };
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg(locale === "ar" ? "يرجى اختيار العميل." : "Veuillez sélectionner un client.");
      return;
    }
    if (!titre.trim()) {
      setErrorMsg(locale === "ar" ? "يرجى إدخال عنوان العقد." : "Veuillez saisir l'intitulé du contrat.");
      return;
    }
    if (lines.some((l) => !l.designation.trim())) {
      setErrorMsg(
        locale === "ar" ? "يرجى تحديد وصف لجميع بنود العقد." : "Toutes les lignes doivent avoir une désignation."
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");

      await saveSubscriptionAction({
        id: subscription?.id,
        client_id: Number(clientId),
        titre: titre.trim(),
        reference: reference.trim(),
        periodicite,
        date_debut: dateDebut,
        date_fin: dateFin || undefined,
        prochaine_echeance: prochaineEcheance,
        statut,
        mode_reglement: modeReglement,
        auto_generer: autoGenerer ? 1 : 0,
        generer_statut: genererStatut,
        terme_paiement_jours: termePaiementJours,
        notes: notes.trim(),
        lignes: lines,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement de l'abonnement.");
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = clients.map((c) => ({
    value: String(c.id),
    label: `${c.name} ${c.phone ? `(${c.phone})` : ""}`,
  }));

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.ref} - ${p.designation} (${p.prix_ht} MAD HT)`,
  }));

  const periodiciteOptions = Object.entries(PERIODICITE_LABELS).map(([key, val]) => ({
    value: key,
    label: locale === "ar" ? val.labelAr : val.label,
  }));

  const modeReglementOptions = Object.entries(MODE_REGLEMENT_LABELS).map(([key, val]) => ({
    value: key,
    label: locale === "ar" ? val.labelAr : val.label,
  }));

  const statutOptions = Object.entries(SUBSCRIPTION_STATUT_LABELS).map(([key, val]) => ({
    value: key,
    label: locale === "ar" ? val.labelAr : val.label,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <CalendarClock size={20} className="text-teal-600" />
          <Text fw={800} size="md">
            {subscription
              ? (locale === "ar" ? "تعديل عقد الاشتراك" : "Modifier l'abonnement récurrent")
              : (locale === "ar" ? "إنشاء عقد اشتراك جديد" : "Nouvel abonnement récurrent")}
          </Text>
        </Group>
      }
      size="xl"
      radius="xl"
      padding="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {errorMsg ? (
            <Paper radius="md" p="xs" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444" }}>
              <Text size="xs" c="red.7" fw={600}>
                {errorMsg}
              </Text>
            </Paper>
          ) : null}

          {/* Top Contract Parameters */}
          <Paper radius="xl" withBorder p="md" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                required
                searchable
                radius="md"
                label={locale === "ar" ? "العميل *" : "Client *"}
                placeholder={locale === "ar" ? "اختر العميل..." : "Sélectionner un client..."}
                data={clientOptions}
                value={clientId}
                onChange={(val) => setClientId(val || "")}
              />

              <TextInput
                required
                radius="md"
                label={locale === "ar" ? "عنوان العقد *" : "Intitulé du contrat / Objet *"}
                placeholder="Ex: Maintenance IT Annuelle, Loyer bureau #4..."
                value={titre}
                onChange={(e) => setTitre(e.currentTarget.value)}
              />

              <TextInput
                radius="md"
                label={locale === "ar" ? "المرجع Contractuel" : "Référence contrat"}
                value={reference}
                onChange={(e) => setReference(e.currentTarget.value)}
              />

              <Select
                required
                radius="md"
                label={locale === "ar" ? "الدورية (Périodicité) *" : "Périodicité de facturation *"}
                data={periodiciteOptions}
                value={periodicite}
                onChange={(val) => setPeriodicite((val as Periodicite) || "mensuel")}
              />

              <TextInput
                required
                type="date"
                radius="md"
                label={locale === "ar" ? "تاريخ البداية *" : "Date de début *"}
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.currentTarget.value);
                  if (!subscription) setProchaineEcheance(e.currentTarget.value);
                }}
              />

              <TextInput
                type="date"
                radius="md"
                label={locale === "ar" ? "تاريخ النهاية (اختياري)" : "Date de fin (Optionnel)"}
                value={dateFin}
                onChange={(e) => setDateFin(e.currentTarget.value)}
              />

              <TextInput
                required
                type="date"
                radius="md"
                label={locale === "ar" ? "تاريخ الفاتورة القادمة *" : "Prochaine facture à émettre *"}
                value={prochaineEcheance}
                onChange={(e) => setProchaineEcheance(e.currentTarget.value)}
              />

              <Select
                radius="md"
                label={locale === "ar" ? "طريقة الدفع" : "Mode de règlement prévu"}
                data={modeReglementOptions}
                value={modeReglement}
                onChange={(val) => setModeReglement((val as SubscriptionModeReglement) || "prelevement")}
              />
            </SimpleGrid>
          </Paper>

          {/* Line items table */}
          <Paper radius="xl" withBorder p="md" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={700} size="sm">
                    {locale === "ar" ? "بنود وخدمات العقد" : "Lignes de prestations et articles"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {locale === "ar"
                      ? "المبالغ المفوترة في كل دورة دورية"
                      : "Montants facturés à chaque renouvellement"}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  radius="md"
                  leftSection={<Plus size={14} />}
                  onClick={handleAddLine}
                >
                  {locale === "ar" ? "إضافة سطر" : "Ajouter une ligne"}
                </Button>
              </Group>

              <div className="overflow-x-auto w-full">
                <Table highlightOnHover horizontalSpacing="xs" verticalSpacing="xs" style={{ minWidth: 600 }}>
                  <TableThead>
                    <TableTr>
                      <TableTh style={{ width: 140 }}>{locale === "ar" ? "كتالوج (اختياري)" : "Catalogue"}</TableTh>
                      <TableTh>{locale === "ar" ? "الوصف *" : "Désignation *"}</TableTh>
                      <TableTh style={{ width: 70 }}>{locale === "ar" ? "الكمية" : "Qté"}</TableTh>
                      <TableTh style={{ width: 100 }}>{locale === "ar" ? "سعر الوحدة HT" : "Prix HT"}</TableTh>
                      <TableTh style={{ width: 80 }}>{locale === "ar" ? "TVA %" : "TVA %"}</TableTh>
                      <TableTh style={{ width: 80 }}>{locale === "ar" ? "خصم %" : "Rem. %"}</TableTh>
                      <TableTh style={{ width: 90 }}>{locale === "ar" ? "المجموع HT" : "Total HT"}</TableTh>
                      <TableTh style={{ width: 40 }} />
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {lines.map((line, idx) => {
                      const qte = Number(line.quantite) || 0;
                      const pu = Number(line.prix_unitaire_ht) || 0;
                      const rem = Number(line.remise) || 0;
                      const lineTotal = Math.max(qte * pu * (1 - rem / 100), 0);

                      return (
                        <TableTr key={idx}>
                          <TableTd>
                            <Select
                              size="xs"
                              radius="sm"
                              placeholder="Article..."
                              searchable
                              clearable
                              data={productOptions}
                              value={line.produit_id ? String(line.produit_id) : null}
                              onChange={(val) => handleProductSelect(idx, val)}
                            />
                          </TableTd>
                          <TableTd>
                            <TextInput
                              size="xs"
                              radius="sm"
                              required
                              placeholder="Désignation..."
                              value={line.designation}
                              onChange={(e) => handleLineChange(idx, "designation", e.currentTarget.value)}
                            />
                          </TableTd>
                          <TableTd>
                            <NumberInput
                              size="xs"
                              radius="sm"
                              min={0.1}
                              step={1}
                              value={line.quantite}
                              onChange={(val) => handleLineChange(idx, "quantite", Number(val) || 1)}
                            />
                          </TableTd>
                          <TableTd>
                            <NumberInput
                              size="xs"
                              radius="sm"
                              min={0}
                              step={10}
                              value={line.prix_unitaire_ht}
                              onChange={(val) => handleLineChange(idx, "prix_unitaire_ht", Number(val) || 0)}
                            />
                          </TableTd>
                          <TableTd>
                            <NumberInput
                              size="xs"
                              radius="sm"
                              min={0}
                              max={100}
                              value={line.tva_rate}
                              onChange={(val) => handleLineChange(idx, "tva_rate", Number(val) || 0)}
                            />
                          </TableTd>
                          <TableTd>
                            <NumberInput
                              size="xs"
                              radius="sm"
                              min={0}
                              max={100}
                              value={line.remise}
                              onChange={(val) => handleLineChange(idx, "remise", Number(val) || 0)}
                            />
                          </TableTd>
                          <TableTd>
                            <Text size="xs" fw={700}>
                              {formatCurrency(lineTotal)}
                            </Text>
                          </TableTd>
                          <TableTd>
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="subtle"
                              disabled={lines.length <= 1}
                              onClick={() => handleRemoveLine(idx)}
                            >
                              <Trash2 size={13} />
                            </ActionIcon>
                          </TableTd>
                        </TableTr>
                      );
                    })}
                  </TableTbody>
                </Table>
              </div>
            </Stack>
          </Paper>

          {/* Financial Summary & MRR / ARR live preview */}
          <Paper radius="xl" withBorder p="md" style={{ background: "var(--surface-soft)", borderColor: "var(--border)" }}>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <div>
                <Text size="11px" c="dimmed" fw={700} tt="uppercase">
                  {locale === "ar" ? "إجمالي الدورة (TTC)" : "Montant par Échéance"}
                </Text>
                <Text size="lg" fw={900} style={{ color: "var(--foreground)" }}>
                  {formatCurrency(totals.totalTtc)}
                </Text>
                <Text size="10px" c="dimmed">
                  HT: {formatCurrency(totals.totalHt)} · TVA: {formatCurrency(totals.totalTva)}
                </Text>
              </div>

              <div>
                <Text size="11px" c="teal" fw={700} tt="uppercase">
                  {locale === "ar" ? "الدخل الشهري (MRR)" : "MRR Équivalent (Mensuel)"}
                </Text>
                <Text size="lg" fw={900} style={{ color: "#059669" }}>
                  {formatCurrency(totals.mrr)}
                </Text>
                <Text size="10px" c="dimmed">
                  {locale === "ar" ? "معدل الإيراد الشهري" : "Normalisé par mois"}
                </Text>
              </div>

              <div>
                <Text size="11px" c="indigo" fw={700} tt="uppercase">
                  {locale === "ar" ? "الدخل السنوي (ARR)" : "ARR Équivalent (Annuel)"}
                </Text>
                <Text size="lg" fw={900} style={{ color: "#4f46e5" }}>
                  {formatCurrency(totals.arr)}
                </Text>
                <Text size="10px" c="dimmed">
                  MRR × 12 mois
                </Text>
              </div>

              <div>
                <Text size="11px" c="dimmed" fw={700} tt="uppercase">
                  {locale === "ar" ? "حالة العقد" : "Statut du contrat"}
                </Text>
                <Select
                  size="xs"
                  radius="sm"
                  data={statutOptions}
                  value={statut}
                  onChange={(val) => setStatut((val as SubscriptionStatut) || "actif")}
                  className="mt-1"
                />
              </div>
            </SimpleGrid>
          </Paper>

          {/* Automation & Notes */}
          <Paper radius="xl" withBorder p="md" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div>
                <Switch
                  label={locale === "ar" ? "تفعيل التوليد التلقائي" : "Éligible au batch automatique"}
                  description={locale === "ar" ? "تضمين العقد في التوليد الجماعي" : "Inclus lors de la facturation groupée"}
                  checked={autoGenerer}
                  onChange={(e) => setAutoGenerer(e.currentTarget.checked)}
                />
              </div>

              <div>
                <Select
                  size="xs"
                  radius="md"
                  label={locale === "ar" ? "حالة الفاتورة عند الإنشاء" : "Statut facture générée"}
                  data={[
                    { value: "valide", label: locale === "ar" ? "معتمدة (Validée)" : "Validée (Prête)" },
                    { value: "brouillon", label: locale === "ar" ? "مسودة (Brouillon)" : "Brouillon" },
                  ]}
                  value={genererStatut}
                  onChange={(val) => setGenererStatut((val as any) || "valide")}
                />
              </div>

              <div>
                <NumberInput
                  size="xs"
                  radius="md"
                  label={locale === "ar" ? "أجل الأداء (أيام)" : "Délai de paiement (jours)"}
                  value={termePaiementJours}
                  onChange={(val) => setTermePaiementJours(Number(val) || 30)}
                />
              </div>
            </SimpleGrid>

            <Textarea
              radius="md"
              label={locale === "ar" ? "ملاحظات إضافية" : "Remarques contractuelles"}
              placeholder="Conditions particulières, engagement..."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              className="mt-3"
            />
          </Paper>

          {/* Action buttons */}
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" radius="md" onClick={onClose} disabled={saving}>
              {locale === "ar" ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" color="teal" radius="md" loading={saving}>
              {subscription
                ? (locale === "ar" ? "حفظ التعديلات" : "Enregistrer les modifications")
                : (locale === "ar" ? "إنشاء وتفعيل العقد" : "Créer le contrat d'abonnement")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
