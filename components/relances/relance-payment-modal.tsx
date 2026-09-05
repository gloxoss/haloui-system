"use client";

import * as React from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { Check, DollarSign } from "lucide-react";

import { enregistrerReglementRapideAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { type FactureImpayeeItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function RelancePaymentModal({
  invoice,
  opened,
  onClose,
  onSuccess,
}: {
  invoice: FactureImpayeeItem | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { locale } = useTranslation();

  const [montant, setMontant] = React.useState<number | string>(0);
  const [modePaiement, setModePaiement] = React.useState<string>("Virement bancaire");
  const [notes, setNotes] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (invoice && opened) {
      setMontant(invoice.reste);
      setModePaiement("Virement bancaire");
      setNotes("");
      setSuccess(false);
    }
  }, [invoice, opened]);

  if (!invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(montant);
    if (!val || val <= 0) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("document_id", String(invoice.id));
      formData.set("montant", String(val));
      formData.set("mode_paiement", modePaiement);
      formData.set("notes", notes);

      await enregistrerReglementRapideAction(formData);
      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 800);
    });
  };

  const resteApresPaiement = Math.max(0, invoice.reste - (Number(montant) || 0));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="emerald" variant="light">
            <DollarSign size={16} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              {locale === "ar" ? "تسجيل أداء / دفعة سريعة" : "Encaisser un règlement"}
            </Text>
            <Text size="xs" c="dimmed">
              Facture n° FAC-{invoice.numero} • {invoice.client_name}
            </Text>
          </div>
        </Group>
      }
      styles={{
        header: {
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
        },
        body: {
          paddingTop: "16px",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {success && (
            <Alert color="teal" icon={<Check size={16} />} title="Règlement enregistré !">
              {locale === "ar"
                ? "تم تحيين رصيد الفاتورة بنجاح."
                : "Le solde de la facture a été mis à jour avec succès."}
            </Alert>
          )}

          <Paper
            p="sm"
            radius="md"
            withBorder
            style={{
              background: "var(--surface-soft)",
              borderColor: "var(--border)",
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  {locale === "ar" ? "المبلغ الإجمالي" : "Total TTC"}
                </Text>
                <Text fw={700} size="sm">
                  {formatCurrency(invoice.total_ttc)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  {locale === "ar" ? "المستخلص سابقاً" : "Déjà réglé (Avance)"}
                </Text>
                <Text fw={700} size="sm" c="teal">
                  {formatCurrency(invoice.avance)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  {locale === "ar" ? "الباقي الحالي" : "Reste à payer"}
                </Text>
                <Text fw={800} size="md" c="red.6">
                  {formatCurrency(invoice.reste)}
                </Text>
              </div>
            </Group>
          </Paper>

          <NumberInput
            label={locale === "ar" ? "المبلغ المؤدى (MAD)" : "Montant du versement (MAD)"}
            value={montant}
            onChange={(val) => setMontant(val)}
            min={0.01}
            max={invoice.reste}
            decimalScale={2}
            thousandSeparator=" "
            required
            autoFocus
          />

          <Group justify="space-between">
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              onClick={() => setMontant(invoice.reste)}
            >
              {locale === "ar" ? "أداء كامل الباقي (Solde)" : "Régler la totalité du solde"}
            </Button>
            <Text size="xs" c={resteApresPaiement === 0 ? "teal" : "dimmed"}>
              {locale === "ar" ? "الباقي بعد الأداء:" : "Nouveau reste :"}
              {" "}
              <strong>{formatCurrency(resteApresPaiement)}</strong>
            </Text>
          </Group>

          <Select
            label={locale === "ar" ? "طريقة الأداء" : "Mode de règlement"}
            value={modePaiement}
            onChange={(v) => v && setModePaiement(v)}
            data={[
              { value: "Virement bancaire", label: "Virement bancaire" },
              { value: "Chèque", label: "Chèque bancaire" },
              { value: "Espèces", label: "Espèces (Caisse)" },
              { value: "Effet de commerce", label: "Effet de commerce / LCN" },
            ]}
          />

          <TextInput
            label={locale === "ar" ? "ملاحظة / مرجع الشيك أو التحويل" : "Référence / Notes complémentaires"}
            placeholder="Ex: Chèque n° 1298492 BMCE / Virement reçu ce matin"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <Group justify="space-between" pt="sm" style={{ borderTop: "1px solid var(--border)" }}>
            <Button variant="default" onClick={onClose} disabled={isPending}>
              {locale === "ar" ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" color="teal" loading={isPending}>
              {locale === "ar" ? "تأكيد التسجيل" : "Enregistrer le règlement"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
