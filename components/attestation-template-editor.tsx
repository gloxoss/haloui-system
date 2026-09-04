"use client";

import * as React from "react";
import { saveCompanyAttestationTemplatesAction } from "@/app/actions";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  EyeOff,
  FileCheck,
  FilePlus,
  FileText,
  Hash,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
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

const DEFAULT_NEW_BODY =
  "Nous soussignés, {{societe}}, attestons par la présente que :\n\n{{employe}}, titulaire du numéro CNSS {{cnss}},\nest employé(e) au sein de notre établissement en qualité de {{poste}} depuis le {{date_entree}}.\n\nLa présente attestation lui est délivrée sur sa demande pour servir et valoir ce que de droit.";

export function AttestationTemplateEditor({
  initialValues,
}: {
  initialValues: Partial<CompanyRecord>;
}) {
  const initialConfigs = React.useMemo(() => {
    return getCompanyAttestationConfigs(initialValues);
  }, [initialValues]);

  const [configs, setConfigs] = React.useState<AttestationTemplatesConfig>(initialConfigs);
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    const keys = Object.keys(initialConfigs);
    return keys[0] || "simple";
  });
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [newModalOpened, { open: openNewModal, close: closeNewModal }] = useDisclosure(false);

  // New model form state
  const [newModelName, setNewModelName] = React.useState("");
  const [newModelTitle, setNewModelTitle] = React.useState("");

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Filter out any models marked as deleted
  const visibleEntries = Object.entries(configs).filter(
    ([_, item]) => !(item as any)._deleted
  );
  const modelKeys = visibleEntries.map(([key]) => key);

  // Ensure activeTab is valid
  React.useEffect(() => {
    if (modelKeys.length > 0 && !modelKeys.includes(activeTab)) {
      setActiveTab(modelKeys[0]);
    }
  }, [modelKeys, activeTab]);

  const currentModel = configs[activeTab] || {
    id: activeTab,
    name: ATTESTATION_TYPE_LABELS[activeTab] || activeTab,
    title: ATTESTATION_TYPE_TITLES[activeTab] || "ATTESTATION",
    objet: "",
    body: DEFAULT_ATTESTATION_TEMPLATES[activeTab] || "",
    signataire: "La Direction Générale",
    active: true,
  };

  const updateCurrentModel = (patch: Partial<AttestationTemplateConfigItem>) => {
    setSavedSuccess(false);
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
    const defaultBody = DEFAULT_ATTESTATION_TEMPLATES[activeTab] || DEFAULT_NEW_BODY;
    const defaultTitle = ATTESTATION_TYPE_TITLES[activeTab] || "ATTESTATION";
    const defaultName = ATTESTATION_TYPE_LABELS[activeTab] || activeTab;
    updateCurrentModel({
      name: defaultName,
      title: defaultTitle,
      objet: "",
      body: defaultBody,
      signataire: "La Direction Générale",
      active: true,
    });
  };

  const handleToggleActive = (checked: boolean) => {
    updateCurrentModel({ active: checked });
  };

  const handleDeleteModel = (keyToDelete: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ce modèle (${configs[keyToDelete]?.name || keyToDelete}) ?`)) {
      return;
    }
    setSavedSuccess(false);
    setConfigs((prev) => {
      const next = { ...prev };
      if (keyToDelete in DEFAULT_ATTESTATION_TEMPLATES) {
        // Mark default model as deleted so it can be restored if needed
        next[keyToDelete] = {
          ...next[keyToDelete],
          _deleted: true,
        } as any;
      } else {
        delete next[keyToDelete];
      }
      return next;
    });

    const remaining = modelKeys.filter((k) => k !== keyToDelete);
    if (remaining.length > 0) {
      setActiveTab(remaining[0]);
    }
  };

  const handleCreateNewModel = () => {
    const name = newModelName.trim();
    if (!name) return;

    const slug = `modele-${Date.now().toString(36)}`;
    const title = newModelTitle.trim().toUpperCase() || name.toUpperCase();

    setConfigs((prev) => ({
      ...prev,
      [slug]: {
        id: slug,
        name,
        title,
        objet: "",
        body: DEFAULT_NEW_BODY,
        signataire: "La Direction Générale",
        active: true,
        isCustom: true,
      },
    }));

    setNewModelName("");
    setNewModelTitle("");
    setActiveTab(slug);
    closeNewModal();
    setSavedSuccess(false);
  };

  // Preview interpolation
  const previewText = interpolateTemplate(currentModel.body || "", {
    ...SAMPLE_DATA,
    societe: initialValues.name || SAMPLE_DATA.societe,
  });

  const activeCount = visibleEntries.filter(([_, item]) => item.active !== false).length;

  return (
    <Card radius="xl" p={{ base: "md", md: "xl" }} withBorder className="bg-[var(--card)] shadow-xs">
      {/* Modal for adding a new custom model */}
      <Modal
        opened={newModalOpened}
        onClose={closeNewModal}
        title={
          <Group gap="xs">
            <ThemeIcon size={26} radius="md" color="blue" variant="light">
              <FilePlus size={15} />
            </ThemeIcon>
            <Text fw={800} size="sm">
              Créer un nouveau modèle d'attestation
            </Text>
          </Group>
        }
        radius="lg"
      >
        <Stack gap="sm">
          <TextInput
            label="Nom du modèle (menu & sélection)"
            placeholder="Ex: Attestation de fin de stage PFE"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            required
            autoFocus
          />
          <TextInput
            label="Titre officiel imprimé"
            placeholder="Ex: ATTESTATION DE STAGE DE FIN D'ÉTUDES"
            value={newModelTitle}
            onChange={(e) => setNewModelTitle(e.target.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={closeNewModal}>
              Annuler
            </Button>
            <Button
              color="blue"
              onClick={handleCreateNewModel}
              disabled={!newModelName.trim()}
              leftSection={<Plus size={15} />}
            >
              Créer ce modèle
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Main Form enclosing save action */}
      <form
        action={async (formData) => {
          startTransition(async () => {
            await saveCompanyAttestationTemplatesAction(formData);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 4000);
          });
        }}
      >
        <input type="hidden" name="company_id" value={initialValues.id || 1} />
        <input
          type="hidden"
          name="attestation_templates_json"
          value={JSON.stringify(configs)}
        />

        <Stack gap="lg">
          {/* Header Row */}
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <div>
              <Group gap="xs" align="center">
                <ThemeIcon size={32} radius="md" color="blue" variant="light">
                  <FileCheck size={18} />
                </ThemeIcon>
                <Text fw={900} size="lg">
                  Modèles Maîtres d'Attestations
                </Text>
                <Badge variant="light" color="blue" size="sm">
                  {visibleEntries.length} modèles ({activeCount} actifs)
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={3}>
                Activez, désactivez ou personnalisez les modèles d'attestations mis à disposition des collaborateurs.
              </Text>
            </div>

            <Group gap="xs">
              <Button
                type="button"
                variant="light"
                color="blue"
                size="sm"
                radius="md"
                leftSection={<Plus size={15} />}
                onClick={openNewModal}
              >
                Nouveau modèle
              </Button>

              <Button
                type="submit"
                color={savedSuccess ? "teal" : "blue"}
                size="sm"
                radius="md"
                loading={isPending}
                leftSection={savedSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
              >
                {savedSuccess ? "Modèles enregistrés !" : "Enregistrer les modèles"}
              </Button>
            </Group>
          </Group>

          {/* Model Selection Tabs Bar */}
          <Paper radius="lg" withBorder p="xs" className="bg-[var(--surface-soft)]">
            <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)}>
              <Tabs.List style={{ flexWrap: "wrap", gap: 6, borderBottom: "none" }}>
                {visibleEntries.map(([key, item]) => {
                  const isActive = item.active !== false;
                  return (
                    <Tabs.Tab
                      key={key}
                      value={key}
                      style={{
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        opacity: isActive ? 1 : 0.6,
                        border: "1px solid var(--border)",
                        background: activeTab === key ? "var(--accent)" : "var(--card)",
                        color: activeTab === key ? "var(--accent-foreground)" : "var(--foreground)",
                      }}
                      rightSection={
                        !isActive ? (
                          <Badge size="xs" color="gray" variant="outline" p={3}>
                            Masqué
                          </Badge>
                        ) : null
                      }
                    >
                      {item.name || item.title || key}
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>
            </Tabs>
          </Paper>

          {/* Editor Workspace for Currently Selected Model */}
          <Paper radius="xl" withBorder p={{ base: "md", md: "lg" }} className="bg-[var(--card)]">
            {/* Model Action Toolbar */}
            <Group justify="space-between" align="center" wrap="wrap" gap="sm" pb="md" className="border-b border-[var(--border)]">
              <Group gap="sm" align="center">
                <Switch
                  checked={currentModel.active !== false}
                  onChange={(e) => handleToggleActive(e.currentTarget.checked)}
                  color="teal"
                  size="md"
                  label={
                    <Text size="xs" fw={700}>
                      {currentModel.active !== false ? "Modèle actif (Visible pour les salariés)" : "Modèle désactivé (Masqué)"}
                    </Text>
                  }
                />
                <Badge color={currentModel.active !== false ? "teal" : "gray"} variant="light" size="sm">
                  {currentModel.active !== false ? "Actif" : "Désactivé pour les utilisateurs"}
                </Badge>
              </Group>

              <Group gap="xs">
                <Button
                  type="button"
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<RotateCcw size={13} />}
                  onClick={handleResetCurrent}
                >
                  Rétablir formulation par défaut
                </Button>

                <Button
                  type="button"
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<Trash2 size={13} />}
                  onClick={() => handleDeleteModel(activeTab)}
                >
                  Supprimer ce modèle
                </Button>
              </Group>
            </Group>

            {/* Form & Simulation Grid */}
            <div className="grid gap-6 lg:grid-cols-2 mt-4 min-w-0">
              {/* Left Column: Model Configuration */}
              <Stack gap="sm" className="min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput
                    label="Nom du modèle (pour les collaborateurs)"
                    description="Nom figurant dans la liste déroulante"
                    value={currentModel.name || ""}
                    onChange={(e) => updateCurrentModel({ name: e.target.value })}
                    placeholder="Ex: Attestation de travail avec salaire"
                    size="xs"
                  />
                  <TextInput
                    label="Titre officiel imprimé"
                    description="Titre figurant en haut de la page imprimée"
                    value={currentModel.title}
                    onChange={(e) => updateCurrentModel({ title: e.target.value })}
                    placeholder="Ex: ATTESTATION DE TRAVAIL ET DE SALAIRE"
                    size="xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput
                    label="Objet ou Référence par défaut (facultatif)"
                    description="Ex: Objet : Demande de visa ou dossier bancaire"
                    value={currentModel.objet || ""}
                    onChange={(e) => updateCurrentModel({ objet: e.target.value })}
                    placeholder="Ex: Objet : Demande d'obtention de visa"
                    size="xs"
                  />
                  <Select
                    label="Signataire habilité par défaut"
                    description="Mention figurant sous le cadre de signature"
                    data={SIGNATAIRE_PRESETS}
                    value={currentModel.signataire || "La Direction Générale"}
                    onChange={(val) => updateCurrentModel({ signataire: val || "La Direction Générale" })}
                    size="xs"
                    searchable
                  />
                </div>

                {/* Variable insertion buttons */}
                <div>
                  <Text size="11px" fw={700} c="dimmed" mb={5}>
                    Insérer une balise dynamique (un clic insère la balise au curseur) :
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
                    minRows={9}
                    maxRows={16}
                    autosize
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  />
                </div>
              </Stack>

              {/* Right Column: Faithful Real-Time A4 Simulation Preview */}
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
                  className="bg-white text-gray-900 shadow-sm min-h-[380px] flex flex-col justify-between"
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
          </Paper>
        </Stack>
      </form>
    </Card>
  );
}
