"use client";

import * as React from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import {
  Check,
  CreditCard,
  FileText,
  Save,
  Sliders,
} from "lucide-react";

import { saveRelanceSettingsAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { type RelanceSettings, type RelanceTemplates } from "@/lib/types";

const VARIABLE_TAGS = [
  { tag: "{{client_name}}", label: "Nom client" },
  { tag: "{{facture_numero}}", label: "N° Facture" },
  { tag: "{{montant_du}}", label: "Reste à payer" },
  { tag: "{{date_facture}}", label: "Date facture" },
  { tag: "{{date_echeance}}", label: "Date échéance" },
  { tag: "{{jours_retard}}", label: "Jours retard" },
  { tag: "{{lien_facture}}", label: "Lien facture" },
  { tag: "{{rib}}", label: "RIB bancaire" },
  { tag: "{{banque}}", label: "Nom banque" },
  { tag: "{{societe}}", label: "Nom société" },
];

export function RelancesSettingsPanel({
  initialSettings,
}: {
  initialSettings: RelanceSettings;
}) {
  const { locale } = useTranslation();

  const [delais, setDelais] = React.useState(initialSettings.delais);
  const [rib, setRib] = React.useState(initialSettings.rib || "");
  const [banque, setBanque] = React.useState(initialSettings.banque || "");
  const [titulaireCompte, setTitulaireCompte] = React.useState(
    initialSettings.titulaire_compte || ""
  );

  const [templatesFr, setTemplatesFr] = React.useState<RelanceTemplates>(
    initialSettings.templates_fr
  );
  const [templatesAr, setTemplatesAr] = React.useState<RelanceTemplates>(
    initialSettings.templates_ar
  );

  const [activeTab, setActiveTab] = React.useState<string | null>("fr");
  const [activeTier, setActiveTier] = React.useState<string | null>("prevenance");
  const [isPending, startTransition] = React.useTransition();
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const insertTag = (tag: string) => {
    if (activeTab === "fr") {
      const tierKey = (activeTier || "prevenance") as keyof RelanceTemplates;
      setTemplatesFr((prev) => ({
        ...prev,
        [tierKey]: (prev[tierKey] || "") + " " + tag,
      }));
    } else {
      const tierKey = (activeTier || "prevenance") as keyof RelanceTemplates;
      setTemplatesAr((prev) => ({
        ...prev,
        [tierKey]: (prev[tierKey] || "") + " " + tag,
      }));
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload: RelanceSettings = {
        delais,
        rib,
        banque,
        titulaire_compte: titulaireCompte,
        templates_fr: templatesFr,
        templates_ar: templatesAr,
      };

      const formData = new FormData();
      formData.set("settings_json", JSON.stringify(payload));

      await saveRelanceSettingsAction(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    });
  };

  return (
    <Stack gap="lg">
      {savedSuccess && (
        <Alert color="teal" icon={<Check size={16} />} title="Paramètres enregistrés">
          {locale === "ar"
            ? "تم حفظ إعدادات وسيناريوهات التذكير بنجاح."
            : "Les scénarios et coordonnées de relance ont été mis à jour avec succès."}
        </Alert>
      )}

      {/* Tiers Delays Configuration */}
      <Card withBorder radius="md" p="md">
        <Group gap="xs" mb="xs">
          <ThemeIcon size={28} radius="md" color="blue" variant="light">
            <Sliders size={16} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              {locale === "ar" ? "آجال وأيام سيناريوهات التذكير" : "Délais d'escalade des paliers"}
            </Text>
            <Text size="xs" c="dimmed">
              {locale === "ar"
                ? "حدد عدد الأيام الفاصلة لتفعيل كل مستوى إنذار تلقائياً"
                : "Configurez le nombre de jours par rapport à l'échéance pour déclencher chaque palier"}
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="sm">
          <NumberInput
            label={locale === "ar" ? "المرحلة 1 : استباقي" : "Palier 1 : Prévenance"}
            description="Jours avant échéance (négatif)"
            value={delais.prevenance}
            onChange={(val) => setDelais((d) => ({ ...d, prevenance: Number(val) || -3 }))}
          />
          <NumberInput
            label={locale === "ar" ? "المرحلة 2 : تذكير ودي" : "Palier 2 : 1ère Relance"}
            description="Jours après échéance"
            value={delais.relance_1}
            onChange={(val) => setDelais((d) => ({ ...d, relance_1: Number(val) || 7 }))}
          />
          <NumberInput
            label={locale === "ar" ? "المرحلة 3 : إنذار حازم" : "Palier 3 : 2ème Relance"}
            description="Jours après échéance"
            value={delais.relance_2}
            onChange={(val) => setDelais((d) => ({ ...d, relance_2: Number(val) || 15 }))}
          />
          <NumberInput
            label={locale === "ar" ? "المرحلة 4 : إنذار قانوني" : "Palier 4 : Mise en demeure"}
            description="Jours après échéance"
            value={delais.mise_en_demeure}
            onChange={(val) => setDelais((d) => ({ ...d, mise_en_demeure: Number(val) || 30 }))}
          />
        </SimpleGrid>
      </Card>

      {/* Bank Details Configuration */}
      <Card withBorder radius="md" p="md">
        <Group gap="xs" mb="xs">
          <ThemeIcon size={28} radius="md" color="emerald" variant="light">
            <CreditCard size={16} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              {locale === "ar" ? "معلومات الحساب البنكي للتحويل (RIB)" : "Coordonnées bancaires pour virement"}
            </Text>
            <Text size="xs" c="dimmed">
              {locale === "ar"
                ? "تُدرج هذه البيانات تلقائياً داخل رسائل الواتساب والإيميل لتسهيل الأداء"
                : "Ces informations sont injectées dans les variables {{rib}}, {{banque}}, et {{societe}}"}
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="sm">
          <TextInput
            label="RIB (24 chiffres)"
            placeholder="011 780 0000 123456789012 34"
            value={rib}
            onChange={(e) => setRib(e.currentTarget.value)}
          />
          <TextInput
            label="Nom de la banque"
            placeholder="BMCE Bank of Africa / Attijariwafa"
            value={banque}
            onChange={(e) => setBanque(e.currentTarget.value)}
          />
          <TextInput
            label="Titulaire du compte"
            placeholder="STE OURIDA SARL"
            value={titulaireCompte}
            onChange={(e) => setTitulaireCompte(e.currentTarget.value)}
          />
        </SimpleGrid>
      </Card>

      {/* Templates Editor */}
      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="violet" variant="light">
              <FileText size={16} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm">
                {locale === "ar" ? "صياغة رسائل التذكير المخصصة" : "Modèles de messages (Templates)"}
              </Text>
              <Text size="xs" c="dimmed">
                {locale === "ar"
                  ? "قم بتعديل صيغة الرسائل باللغتين الفرنسية والعربية لكل مرحلة"
                  : "Modifiez le contenu prédéfini pour chaque niveau d'escalade"}
              </Text>
            </div>
          </Group>

          <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
            <Tabs.List>
              <Tabs.Tab value="fr">Français</Tabs.Tab>
              <Tabs.Tab value="ar">العربية (Morocco)</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Group>

        {/* Variable tokens helper bar */}
        <Paper p="xs" radius="sm" withBorder style={{ background: "var(--surface-soft)" }}>
          <Text size="xs" fw={600} mb={6} c="dimmed">
            {locale === "ar" ? "انقر لإضافة المتغيرات الديناميكية في النص:" : "Variables dynamiques disponibles (cliquer pour insérer) :"}
          </Text>
          <Group gap={6} wrap="wrap">
            {VARIABLE_TAGS.map((v) => (
              <Badge
                key={v.tag}
                size="sm"
                variant="light"
                color="blue"
                style={{ cursor: "pointer", textTransform: "none" }}
                onClick={() => insertTag(v.tag)}
              >
                {v.tag} ({v.label})
              </Badge>
            ))}
          </Group>
        </Paper>

        <Tabs value={activeTier} onChange={setActiveTier} mt="md">
          <Tabs.List>
            <Tabs.Tab value="prevenance">Palier 1 : Prévenance (J-3)</Tabs.Tab>
            <Tabs.Tab value="relance_1">Palier 2 : 1ère Relance (J+7)</Tabs.Tab>
            <Tabs.Tab value="relance_2">Palier 3 : 2ème Relance (J+15)</Tabs.Tab>
            <Tabs.Tab value="mise_en_demeure">Palier 4 : Mise en demeure (J+30)</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="prevenance" pt="xs">
            <Textarea
              autosize
              minRows={6}
              maxRows={12}
              dir={activeTab === "ar" ? "rtl" : "ltr"}
              value={
                activeTab === "ar" ? templatesAr.prevenance : templatesFr.prevenance
              }
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (activeTab === "ar") {
                  setTemplatesAr((prev) => ({ ...prev, prevenance: val }));
                } else {
                  setTemplatesFr((prev) => ({ ...prev, prevenance: val }));
                }
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="relance_1" pt="xs">
            <Textarea
              autosize
              minRows={6}
              maxRows={12}
              dir={activeTab === "ar" ? "rtl" : "ltr"}
              value={
                activeTab === "ar" ? templatesAr.relance_1 : templatesFr.relance_1
              }
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (activeTab === "ar") {
                  setTemplatesAr((prev) => ({ ...prev, relance_1: val }));
                } else {
                  setTemplatesFr((prev) => ({ ...prev, relance_1: val }));
                }
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="relance_2" pt="xs">
            <Textarea
              autosize
              minRows={6}
              maxRows={12}
              dir={activeTab === "ar" ? "rtl" : "ltr"}
              value={
                activeTab === "ar" ? templatesAr.relance_2 : templatesFr.relance_2
              }
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (activeTab === "ar") {
                  setTemplatesAr((prev) => ({ ...prev, relance_2: val }));
                } else {
                  setTemplatesFr((prev) => ({ ...prev, relance_2: val }));
                }
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="mise_en_demeure" pt="xs">
            <Textarea
              autosize
              minRows={6}
              maxRows={12}
              dir={activeTab === "ar" ? "rtl" : "ltr"}
              value={
                activeTab === "ar" ? templatesAr.mise_en_demeure : templatesFr.mise_en_demeure
              }
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (activeTab === "ar") {
                  setTemplatesAr((prev) => ({ ...prev, mise_en_demeure: val }));
                } else {
                  setTemplatesFr((prev) => ({ ...prev, mise_en_demeure: val }));
                }
              }}
            />
          </Tabs.Panel>
        </Tabs>
      </Card>

      <Group justify="flex-end">
        <Button
          color="blue"
          size="md"
          leftSection={<Save size={16} />}
          loading={isPending}
          onClick={handleSave}
        >
          {locale === "ar" ? "حفظ كافة الإعدادات" : "Enregistrer les paramètres de relance"}
        </Button>
      </Group>
    </Stack>
  );
}
