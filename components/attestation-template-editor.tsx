"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileText,
  Hash,
  PenTool,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";

import {
  ATTESTATION_TYPE_LABELS,
  ATTESTATION_TYPE_TITLES,
  DEFAULT_ATTESTATION_TEMPLATES,
} from "@/lib/constants";
import { getCompanyAttestationConfigs, interpolateTemplate } from "@/lib/attestations";
import { type AttestationTemplateConfigItem, type AttestationTemplatesConfig, type CompanyRecord } from "@/lib/types";

const VARIABLE_CHIPS = [
  { tag: "{{societe}}", label: "Société", icon: Building2 },
  { tag: "{{employe}}", label: "Salarié", icon: User },
  { tag: "{{cnss}}", label: "N° CNSS", icon: Hash },
  { tag: "{{cin}}", label: "N° CIN", icon: Hash },
  { tag: "{{poste}}", label: "Poste", icon: User },
  { tag: "{{date_entree}}", label: "Date d'entrée", icon: Calendar },
  { tag: "{{salaire}}", label: "Salaire", icon: Coins },
  { tag: "{{date_du_jour}}", label: "Date du jour", icon: Clock },
  { tag: "{{ville}}", label: "Ville", icon: Building2 },
];

const SIGNATAIRE_PRESETS = [
  "La Direction Générale",
  "Le Gérant",
  "La Direction des Ressources Humaines",
  "Le Responsable Administratif",
  "Le Chef d'Établissement",
];

const SAMPLE_DATA = {
  societe: "STE OURIDA STATION SARL",
  employe: "Mohammed Benjelloun",
  prenom: "Mohammed",
  nom: "Benjelloun",
  cnss: "5298204",
  cin: "C123456",
  poste: "Chef de Station",
  date_entree: "15/01/2022",
  date_sortie: "31/12/2025",
  salaire: "6 500,00 MAD",
  date_du_jour: new Date().toLocaleDateString("fr-FR"),
  ville: "Sefrou",
};

export function AttestationTemplateEditor({
  initialValues,
}: {
  initialValues: Partial<CompanyRecord>;
}) {
  const initialConfigs = React.useMemo(() => {
    return getCompanyAttestationConfigs(initialValues);
  }, [initialValues]);

  const [configs, setConfigs] = React.useState<AttestationTemplatesConfig>(initialConfigs);
  const [activeTab, setActiveTab] = React.useState<string>("simple");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const modelKeys = Object.keys(DEFAULT_ATTESTATION_TEMPLATES);
  const currentModel = configs[activeTab] || {
    title: ATTESTATION_TYPE_TITLES[activeTab] || "ATTESTATION",
    objet: "",
    body: DEFAULT_ATTESTATION_TEMPLATES[activeTab] || "",
    signataire: "La Direction Générale",
  };

  const updateCurrentModel = (patch: Partial<AttestationTemplateConfigItem>) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...currentModel,
        ...patch,
      },
    }));
  };

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      updateCurrentModel({ body: (currentModel.body || "") + " " + tag });
      return;
    }
    const start = el.selectionStart ?? currentModel.body.length;
    const end = el.selectionEnd ?? currentModel.body.length;
    const current = currentModel.body || "";
    const next = current.substring(0, start) + tag + current.substring(end);
    updateCurrentModel({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const handleResetCurrent = () => {
    updateCurrentModel({
      title: ATTESTATION_TYPE_TITLES[activeTab] || "ATTESTATION",
      objet: "",
      body: DEFAULT_ATTESTATION_TEMPLATES[activeTab] || "",
      signataire: "La Direction Générale",
    });
  };

  // Preview interpolation
  const previewText = interpolateTemplate(currentModel.body || "", {
    ...SAMPLE_DATA,
    societe: initialValues.name || SAMPLE_DATA.societe,
  });

  return (
    <Card radius="md" p="md" withBorder className="bg-[var(--surface-soft)]">
      {/* Hidden inputs to save into database */}
      <input
        type="hidden"
        name="attestation_templates_json"
        value={JSON.stringify(configs)}
      />
      <input
        type="hidden"
        name="attestation_template_simple"
        value={configs.simple?.body || ""}
      />
      <input
        type="hidden"
        name="attestation_template_salary"
        value={configs["avec-salaire"]?.body || ""}
      />
      <input
        type="hidden"
        name="attestation_template_visa"
        value={configs.visa?.body || ""}
      />
      <input
        type="hidden"
        name="attestation_template_bank"
        value={configs.banque?.body || ""}
      />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Group gap="xs">
              <ThemeIcon size={28} radius="md" color="blue" variant="light">
                <FileCheck size={16} />
              </ThemeIcon>
              <Text fw={800} size="md">
                Modèles Maîtres d'Attestations (10 Modèles Officiels)
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              Configurez ici les textes, titres et objets légaux qui seront utilisés par vos collaborateurs lors de l'émission d'attestations.
            </Text>
          </div>
          <Badge variant="light" color="blue">
            Studio Administrateur
          </Badge>
        </Group>

        {/* Tab selection for the 10 models */}
        <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)}>
          <Tabs.List style={{ flexWrap: "wrap", gap: 4 }}>
            {modelKeys.map((key) => {
              const label = ATTESTATION_TYPE_LABELS[key] || key;
              return (
                <Tabs.Tab key={key} value={key} style={{ fontSize: "12px", fontWeight: 700 }}>
                  {label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>

        {/* Editor for current selected model */}
        <div className="grid gap-4 lg:grid-cols-2 mt-2">
          {/* Left: Configuration form */}
          <Stack gap="xs">
            <Group grow align="flex-start">
              <TextInput
                label="Titre officiel imprimé"
                description="Titre figurant en haut du document"
                value={currentModel.title}
                onChange={(e) => updateCurrentModel({ title: e.target.value })}
                placeholder="Ex: ATTESTATION DE TRAVAIL"
                size="xs"
              />
              <TextInput
                label="Objet ou Référence par défaut (facultatif)"
                description="Ex: Objet : Demande de visa"
                value={currentModel.objet || ""}
                onChange={(e) => updateCurrentModel({ objet: e.target.value })}
                placeholder="Ex: Objet : Dossier d'obtention de visa"
                size="xs"
              />
            </Group>

            <Group grow align="flex-start">
              <Select
                label="Signataire habilité par défaut"
                description="Mention figurant sous le cadre de signature"
                data={SIGNATAIRE_PRESETS}
                value={currentModel.signataire || "La Direction Générale"}
                onChange={(val) => updateCurrentModel({ signataire: val || "La Direction Générale" })}
                size="xs"
                searchable
              />
              <div className="flex items-end justify-end h-full pt-5">
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<RotateCcw size={13} />}
                  onClick={handleResetCurrent}
                >
                  Rétablir ce modèle
                </Button>
              </div>
            </Group>

            {/* Variable insertion buttons */}
            <div>
              <Text size="11px" fw={700} c="dimmed" mb={4}>
                Insérer une variable dynamique (un clic insère la balise au curseur) :
              </Text>
              <Group gap={4} wrap="wrap">
                {VARIABLE_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <Button
                      key={chip.tag}
                      type="button"
                      variant="light"
                      color="blue"
                      size="compact-xs"
                      radius="sm"
                      leftSection={<Icon size={11} />}
                      onClick={() => handleInsertTag(chip.tag)}
                      style={{ fontSize: "11px" }}
                    >
                      {chip.label}
                    </Button>
                  );
                })}
              </Group>
            </div>

            {/* Template Body */}
            <div>
              <Text size="xs" fw={700} mb={4}>
                Corps du texte du modèle :
              </Text>
              <Textarea
                ref={textareaRef}
                value={currentModel.body}
                onChange={(e) => updateCurrentModel({ body: e.target.value })}
                minRows={8}
                maxRows={14}
                autosize
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              />
            </div>
          </Stack>

          {/* Right: Real-time simulation preview */}
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="xs" fw={700} c="dimmed">
                Aperçu fidèle simulé (avec données exemples) :
              </Text>
              <Badge size="xs" color="gray" variant="outline">
                A4 Simulé
              </Badge>
            </Group>

            <Paper
              p="lg"
              radius="md"
              withBorder
              className="bg-white text-gray-900 shadow-sm min-h-[360px] flex flex-col justify-between"
              style={{ fontSize: "12px", lineHeight: 1.7 }}
            >
              <div>
                {/* Header preview */}
                <div className="border-b pb-2 mb-3 text-center">
                  <Text size="xs" fw={800} tt="uppercase" c="blue.9">
                    {initialValues.name || "STE OURIDA STATION SARL"}
                  </Text>
                  <Text size="10px" c="dimmed">
                    {initialValues.address || "Ourida 4, Station Les Cerises, Sefrou"}
                  </Text>
                </div>

                {/* City & Date */}
                <div className="text-right text-[11px] text-gray-500 mb-3">
                  Sefrou, le {SAMPLE_DATA.date_du_jour}
                </div>

                {/* Title */}
                <div className="text-center my-3">
                  <Text fw={900} size="sm" tt="uppercase" className="tracking-wide border-b-2 border-gray-800 pb-1 inline-block">
                    {currentModel.title || "ATTESTATION DE TRAVAIL"}
                  </Text>
                </div>

                {/* Objet */}
                {currentModel.objet ? (
                  <div className="italic text-[11px] text-gray-700 mb-3 font-medium">
                    {currentModel.objet}
                  </div>
                ) : null}

                {/* Body */}
                <div className="whitespace-pre-line text-justify text-[12px] text-gray-800">
                  {previewText}
                </div>
              </div>

              {/* Signature Box */}
              <div className="mt-6 pt-3 flex justify-end">
                <div className="border-2 border-dashed border-gray-300 rounded p-2 text-center w-48 bg-gray-50">
                  <Text size="10px" fw={800} tt="uppercase" c="dimmed">
                    {currentModel.signataire || "La Direction Générale"}
                  </Text>
                  <div className="h-10 text-[9px] text-gray-400 flex items-center justify-center">
                    (Signature & Cachet)
                  </div>
                </div>
              </div>
            </Paper>
          </div>
        </div>
      </Stack>
    </Card>
  );
}
