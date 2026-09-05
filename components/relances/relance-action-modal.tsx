"use client";

import * as React from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import { enregistrerRelanceAction } from "@/app/actions";
import { RELANCE_PALIER_LABELS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import {
  type FactureImpayeeItem,
  type RelanceCanal,
  type RelancePalier,
  type RelanceSettings,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function normalizeMoroccanPhone(raw: string): string {
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "212" + cleaned.slice(1);
  } else if (!cleaned.startsWith("212") && cleaned.length >= 9) {
    cleaned = "212" + cleaned;
  }
  return cleaned;
}

export function RelanceActionModal({
  invoice,
  settings,
  opened,
  onClose,
  onSuccess,
}: {
  invoice: FactureImpayeeItem | null;
  settings: RelanceSettings;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { locale } = useTranslation();

  const [palier, setPalier] = React.useState<RelancePalier>("prevenance");
  const [canal, setCanal] = React.useState<RelanceCanal>("whatsapp");
  const [lang, setLang] = React.useState<"fr" | "ar">("fr");
  const [recipient, setRecipient] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const [sentSuccess, setSentSuccess] = React.useState(false);

  // Initialize or re-sync when invoice or opened changes
  React.useEffect(() => {
    if (invoice && opened) {
      const initialPalier = invoice.palier_recommande || "prevenance";
      setPalier(initialPalier);
      setCanal("whatsapp");
      setLang(locale === "ar" ? "ar" : "fr");
      setRecipient(invoice.client_phone || "");
      setNotes("");
      setCopied(false);
      setSentSuccess(false);
    }
  }, [invoice, opened, locale]);

  // Interpolate message whenever palier, lang, or invoice changes
  React.useEffect(() => {
    if (!invoice) return;

    const templates = lang === "ar" ? settings.templates_ar : settings.templates_fr;
    const rawTemplate = templates[palier] || "";

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const lienFacture = `${baseUrl}/print/facture/${invoice.id}`;

    const vars: Record<string, string | number> = {
      client_name: invoice.client_name,
      facture_numero: `FAC-${String(invoice.numero).padStart(5, "0")}`,
      date_facture: formatDate(invoice.date),
      date_echeance: formatDate(invoice.date_echeance),
      montant_du: formatCurrency(invoice.reste),
      montant_total: formatCurrency(invoice.total_ttc),
      montant_avance: formatCurrency(invoice.avance),
      jours_retard: Math.max(0, invoice.jours_retard),
      lien_facture: lienFacture,
      rib: settings.rib || "011 780 0000 123456789012 34",
      banque: settings.banque || "BMCE Bank of Africa",
      societe: settings.titulaire_compte || "Notre Société",
    };

    let populated = rawTemplate;
    for (const [k, v] of Object.entries(vars)) {
      populated = populated.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }

    setMessage(populated);

    if (canal === "whatsapp" || canal === "appel") {
      setRecipient(invoice.client_phone || "");
    } else if (canal === "email") {
      setRecipient(invoice.client_email || "");
    }
  }, [invoice, palier, lang, canal, settings]);

  if (!invoice) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSendAndLog = () => {
    startTransition(async () => {
      // 1. Open external app if applicable
      if (canal === "whatsapp") {
        const phoneFormatted = normalizeMoroccanPhone(recipient);
        const encoded = encodeURIComponent(message);
        const waUrl = `https://wa.me/${phoneFormatted}?text=${encoded}`;
        window.open(waUrl, "_blank");
      } else if (canal === "email") {
        const subject =
          lang === "ar"
            ? `تذكير بأداء الفاتورة رقم FAC-${invoice.numero} - ${settings.titulaire_compte}`
            : `Rappel de règlement : Facture FAC-${invoice.numero} - ${settings.titulaire_compte}`;
        const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.location.href = mailtoUrl;
      }

      // 2. Log in DB via Server Action
      const formData = new FormData();
      formData.set("document_id", String(invoice.id));
      formData.set("client_id", String(invoice.client_id));
      formData.set("palier", palier);
      formData.set("canal", canal);
      formData.set("destinataire", recipient);
      formData.set("message_envoye", message);
      formData.set("statut", "envoye");
      formData.set("notes", notes);

      await enregistrerRelanceAction(formData);
      setSentSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 900);
    });
  };

  const handleOnlyLog = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("document_id", String(invoice.id));
      formData.set("client_id", String(invoice.client_id));
      formData.set("palier", palier);
      formData.set("canal", canal);
      formData.set("destinataire", recipient);
      formData.set("message_envoye", message);
      formData.set("statut", "envoye");
      formData.set("notes", notes ? `${notes} (Enregistré manuellement)` : "Enregistré manuellement");

      await enregistrerRelanceAction(formData);
      setSentSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 700);
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="teal" variant="light">
            <Send size={16} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              {locale === "ar" ? "إرسال تذكير بالأداء" : "Envoyer une Relance d'Impayé"}
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
      <Stack gap="md">
        {sentSuccess && (
          <Alert color="teal" icon={<Check size={16} />} title={locale === "ar" ? "تم بنجاح" : "Relance enregistrée !"}>
            {locale === "ar"
              ? "تم تسجيل عملية التذكير في سجل التتبع بنجاح."
              : "La relance a été enregistrée avec succès dans le journal d'audit."}
          </Alert>
        )}

        {/* Invoice Summary Header Pill */}
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
                {locale === "ar" ? "المبلغ المتبقي" : "Reste à recouvrer"}
              </Text>
              <Text fw={800} size="lg" c="red.6">
                {formatCurrency(invoice.reste)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {locale === "ar" ? "أجل الاستحقاق" : "Date d'échéance"}
              </Text>
              <Text size="sm" fw={600}>
                {formatDate(invoice.date_echeance)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {locale === "ar" ? "أيام التأخير" : "Retard actuel"}
              </Text>
              <Badge
                size="md"
                variant="light"
                color={invoice.jours_retard > 30 ? "red" : invoice.jours_retard > 7 ? "orange" : "teal"}
              >
                {invoice.jours_retard <= 0
                  ? `J${invoice.jours_retard}`
                  : `+${invoice.jours_retard} jours`}
              </Badge>
            </div>
          </Group>
        </Paper>

        {/* Palier & Language Selectors */}
        <Group grow align="flex-start">
          <Select
            label={locale === "ar" ? "مستوى الإنذار (Palier)" : "Palier de Relance"}
            value={palier}
            onChange={(val) => val && setPalier(val as RelancePalier)}
            data={[
              { value: "prevenance", label: "Palier 1 : Prévenance (J-3)" },
              { value: "relance_1", label: "Palier 2 : 1ère Relance (J+7)" },
              { value: "relance_2", label: "Palier 3 : 2ème Relance (J+15)" },
              { value: "mise_en_demeure", label: "Palier 4 : Mise en demeure (J+30)" },
            ]}
          />

          <div>
            <Text size="xs" fw={600} mb={4}>
              {locale === "ar" ? "لغة الرسالة" : "Langue du message"}
            </Text>
            <SegmentedControl
              fullWidth
              value={lang}
              onChange={(v) => setLang(v as "fr" | "ar")}
              data={[
                { label: "Français", value: "fr" },
                { label: "العربية (Morocco)", value: "ar" },
              ]}
            />
          </div>
        </Group>

        {/* Channel Selector */}
        <div>
          <Text size="xs" fw={600} mb={4}>
            {locale === "ar" ? "قناة التواصل" : "Canal d'envoi"}
          </Text>
          <SegmentedControl
            fullWidth
            value={canal}
            onChange={(val) => setCanal(val as RelanceCanal)}
            data={[
              {
                value: "whatsapp",
                label: (
                  <Group gap={6} justify="center">
                    <MessageCircle size={15} color="#25D366" />
                    <span>WhatsApp</span>
                  </Group>
                ),
              },
              {
                value: "email",
                label: (
                  <Group gap={6} justify="center">
                    <Mail size={15} color="#0284c7" />
                    <span>Email</span>
                  </Group>
                ),
              },
              {
                value: "appel",
                label: (
                  <Group gap={6} justify="center">
                    <Phone size={15} color="#ea580c" />
                    <span>Appel téléphonique</span>
                  </Group>
                ),
              },
            ]}
          />
        </div>

        {/* Recipient Field */}
        <TextInput
          label={
            canal === "whatsapp" || canal === "appel"
              ? locale === "ar"
                ? "رقم الهاتف / الواتساب"
                : "Numéro de téléphone / WhatsApp"
              : locale === "ar"
                ? "البريد الإلكتروني للعميل"
                : "Adresse Email du destinataire"
          }
          placeholder={canal === "email" ? "client@example.com" : "06XXXXXXXX"}
          value={recipient}
          onChange={(e) => setRecipient(e.currentTarget.value)}
          rightSection={
            canal === "whatsapp" ? (
              <MessageCircle size={16} color="#25D366" />
            ) : canal === "email" ? (
              <Mail size={16} color="#0284c7" />
            ) : (
              <Phone size={16} color="#ea580c" />
            )
          }
        />

        {/* Message preview & editor */}
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" fw={600}>
              {locale === "ar" ? "نص الرسالة المخصص" : "Texte du message (Personnalisable)"}
            </Text>
            <Group gap="xs">
              <Tooltip label={copied ? "Copié !" : "Copier le texte"}>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color={copied ? "teal" : "gray"}
                  leftSection={copied ? <Check size={12} /> : <Copy size={12} />}
                  onClick={handleCopy}
                >
                  {copied ? "Copié" : "Copier"}
                </Button>
              </Tooltip>
            </Group>
          </Group>

          <Textarea
            autosize
            minRows={5}
            maxRows={10}
            dir={lang === "ar" ? "rtl" : "ltr"}
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
            style={{
              fontFamily: lang === "ar" ? "var(--mantine-font-family)" : "inherit",
            }}
          />
        </div>

        {/* Internal notes field */}
        <TextInput
          label={locale === "ar" ? "ملاحظة داخلية (اختياري)" : "Note interne de suivi (Optionnel)"}
          placeholder={
            locale === "ar"
              ? "مثال: العميل وعد بالأداء يوم الجمعة..."
              : "Ex: Promesse de virement d'ici vendredi, accord téléphonique..."
          }
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        {/* Action buttons */}
        <Group justify="space-between" pt="sm" style={{ borderTop: "1px solid var(--border)" }}>
          <Button variant="default" onClick={onClose} disabled={isPending}>
            {locale === "ar" ? "إلغاء" : "Annuler"}
          </Button>

          <Group gap="xs">
            <Button
              variant="light"
              color="gray"
              onClick={handleOnlyLog}
              loading={isPending}
              title="Enregistrer dans l'historique sans ouvrir l'application externe"
            >
              {locale === "ar" ? "تسجيل في الأرشيف فقط" : "Marquer comme envoyé"}
            </Button>

            <Button
              color={canal === "whatsapp" ? "teal" : "blue"}
              onClick={handleSendAndLog}
              loading={isPending}
              leftSection={
                canal === "whatsapp" ? (
                  <MessageCircle size={16} />
                ) : canal === "email" ? (
                  <Mail size={16} />
                ) : (
                  <ExternalLink size={16} />
                )
              }
            >
              {canal === "whatsapp"
                ? locale === "ar"
                  ? "فتح واتساب وتسجيل"
                  : "Envoyer WhatsApp & Enregistrer"
                : canal === "email"
                  ? locale === "ar"
                    ? "إرسال إيميل وتسجيل"
                    : "Ouvrir Email & Enregistrer"
                  : locale === "ar"
                    ? "تسجيل الاتصال"
                    : "Enregistrer l'appel"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
