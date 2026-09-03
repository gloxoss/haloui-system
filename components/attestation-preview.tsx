"use client";

import * as React from "react";
import { createAttestationAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { AppDateInput } from "@/components/ui/app-date-input";
import {
  buildAttestationContent,
  extractCityFromAddress,
  getAttestationModelConfig,
} from "@/lib/attestations";
import { ATTESTATION_TYPE_LABELS, ATTESTATION_TYPE_TITLES } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { type CompanyRecord, type EmployeeRecord } from "@/lib/types";
import { formatDate, todayIso } from "@/lib/utils";
import {
  Accordion,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  Lock,
  Printer,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

const ATTESTATION_TYPE_LABELS_AR: Record<string, string> = {
  simple: "شهادة عمل عادية",
  "avec-salaire": "شهادة عمل مع تحديد الراتب",
  visa: "شهادة عمل لطلب التأشيرة (Visa)",
  banque: "شهادة عمل للملف البنكي",
  stage: "شهادة تدريب (Stage)",
  "certificat-travail": "شهادة نهاية الخدمة (Certificat)",
  "ordre-mission": "أمر بمهمة عمل (Mission)",
  conge: "قرار إجازة سنوية (Congé)",
  recommandation: "رسالة تزكية وتوصية",
  custom: "وثيقة مخصصة (نموذج حر)",
};

const SIGNATAIRE_PRESETS = [
  "La Direction Générale",
  "La Direction des Ressources Humaines",
  "Le Gérant",
  "Le Responsable Administratif",
  "Le Chef d'Établissement",
];

export function AttestationPreview({
  employees,
  company,
  initialType = "simple",
}: {
  employees: EmployeeRecord[];
  company: CompanyRecord;
  initialType?: string;
}) {
  const { t, locale } = useTranslation();
  const defaultCity = React.useMemo(() => extractCityFromAddress(company?.address), [company?.address]);

  const [employeeId, setEmployeeId] = React.useState<string>(() => String(employees[0]?.id ?? ""));
  const [type, setType] = React.useState<string>(initialType);
  const [date, setDate] = React.useState(todayIso());
  const [ville, setVille] = React.useState(defaultCity);

  // Load configured model from company settings
  const modelConfig = React.useMemo(() => {
    return getAttestationModelConfig(type, company);
  }, [type, company]);

  const [title, setTitle] = React.useState(modelConfig.title);
  const [objet, setObjet] = React.useState(modelConfig.objet || "");
  const [signataire, setSignataire] = React.useState(modelConfig.signataire || "La Direction Générale");
  const [customBody, setCustomBody] = React.useState<string | null>(null);

  // Sync when template type changes
  React.useEffect(() => {
    setTitle(modelConfig.title);
    setObjet(modelConfig.objet || "");
    setSignataire(modelConfig.signataire || "La Direction Générale");
    setCustomBody(null); // reset one-off customization
  }, [modelConfig]);

  const currentEmployee = React.useMemo(() => {
    return employees.find((item) => String(item.id) === employeeId);
  }, [employees, employeeId]);

  // Auto-generate interpolated body text using admin configured master template
  const defaultInterpolatedBody = React.useMemo(() => {
    if (!currentEmployee) return "";
    return buildAttestationContent(currentEmployee, type, company, {
      referenceDate: date,
      ville,
    });
  }, [currentEmployee, type, company, date, ville]);

  const activeBodyText = customBody !== null ? customBody : defaultInterpolatedBody;

  const employeeOptions = React.useMemo(() => {
    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.nom} ${emp.prenom}${emp.cnss ? ` (CNSS: ${emp.cnss})` : ""}`,
    }));
  }, [employees]);

  const modelOptions = React.useMemo(() => {
    return Object.entries(ATTESTATION_TYPE_LABELS).map(([key, label]) => ({
      value: key,
      label: String(locale === "ar" ? ATTESTATION_TYPE_LABELS_AR[key] || label : label),
    }));
  }, [locale]);

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Ressources Humaines"
        title="Générateur d'Attestations Officielles"
        description="Émission rapide et impression de documents conformes pour vos collaborateurs."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] items-start">
        {/* Left Column: Client generator controls */}
        <Card radius="lg" p="lg" withBorder className="bg-[var(--card)] shadow-sm">
          <form action={createAttestationAction} className="space-y-5">
            <input type="hidden" name="employee_id" value={employeeId} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="objet" value={objet} />
            <input type="hidden" name="ville" value={ville} />
            <input type="hidden" name="signataire" value={signataire} />
            <input type="hidden" name="custom_body" value={activeBodyText} />

            {/* Step 1: Employee selection */}
            <div>
              <Group justify="space-between" mb={6}>
                <Text size="xs" fw={800} tt="uppercase" c="blue.6">
                  1. Salarié bénéficiaire
                </Text>
                {currentEmployee?.cnss ? (
                  <Badge size="xs" variant="light" color="blue">
                    CNSS : {currentEmployee.cnss}
                  </Badge>
                ) : null}
              </Group>
              <Select
                data={employeeOptions}
                value={employeeId}
                onChange={(val) => setEmployeeId(val ?? "")}
                placeholder="Sélectionnez un salarié..."
                searchable
                nothingFoundMessage="Aucun employé trouvé"
                leftSection={<User size={16} className="text-gray-400" />}
                size="sm"
                radius="md"
              />
            </div>

            {/* Step 2: Model selection */}
            <div>
              <Group justify="space-between" mb={6}>
                <Text size="xs" fw={800} tt="uppercase" c="blue.6">
                  2. Type de document
                </Text>
                <Tooltip label="Modèle conforme configuré dans les Paramètres">
                  <Badge size="xs" variant="dot" color="teal">
                    Modèle officiel
                  </Badge>
                </Tooltip>
              </Group>
              <Select
                data={modelOptions}
                value={type}
                onChange={(val) => setType(val ?? "simple")}
                leftSection={<FileText size={16} className="text-gray-400" />}
                size="sm"
                radius="md"
              />
            </div>

            {/* Step 3: Quick document parameters */}
            <div className="bg-[var(--surface-soft)] p-3 rounded-lg border">
              <Text size="xs" fw={700} c="dimmed" mb={3} tt="uppercase">
                3. Informations d'émission
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <div>
                  <Text size="11px" fw={600} mb={2}>
                    Date d'émission
                  </Text>
                  <AppDateInput value={date} onChange={setDate} />
                </div>
                <div>
                  <Text size="11px" fw={600} mb={2}>
                    Ville d'émission
                  </Text>
                  <TextInput
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    size="xs"
                    placeholder="Ville..."
                  />
                </div>
                <div>
                  <Text size="11px" fw={600} mb={2}>
                    Objet spécifique (facultatif)
                  </Text>
                  <TextInput
                    value={objet}
                    onChange={(e) => setObjet(e.target.value)}
                    placeholder="Ex: Demande de visa Espagne"
                    size="xs"
                  />
                </div>
                <div>
                  <Text size="11px" fw={600} mb={2}>
                    Signataire habilité
                  </Text>
                  <Select
                    data={SIGNATAIRE_PRESETS}
                    value={signataire}
                    onChange={(val) => setSignataire(val || "La Direction Générale")}
                    size="xs"
                    searchable
                  />
                </div>
              </SimpleGrid>
            </div>

            {/* Optional one-off wording adjustment (collapsed by default) */}
            <Accordion variant="separated" radius="md">
              <Accordion.Item value="custom-text">
                <Accordion.Control icon={<FileCheck size={14} />}>
                  <Text size="xs" fw={600} c="dimmed">
                    Ajuster ponctuellement le texte (optionnel)
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="11px" c="dimmed" mb={2}>
                    Ce texte est déjà automatiquement rempli avec les données du salarié. Vous pouvez ajouter une précision ponctuelle si nécessaire :
                  </Text>
                  <Textarea
                    value={activeBodyText}
                    onChange={(e) => setCustomBody(e.target.value)}
                    minRows={5}
                    autosize
                    size="xs"
                  />
                  {customBody !== null && (
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      mt="xs"
                      onClick={() => setCustomBody(null)}
                    >
                      Rétablir le texte officiel
                    </Button>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {/* Primary Action Button */}
            <Button
              type="submit"
              size="md"
              radius="md"
              fullWidth
              color="blue"
              leftSection={<Printer size={18} />}
              disabled={!currentEmployee}
              style={{ fontWeight: 800 }}
            >
              Générer et Imprimer le document
            </Button>

            <Group gap="xs" justify="center">
              <ShieldCheck size={14} className="text-teal-600" />
              <Text size="11px" c="dimmed">
                Modèle certifié et archivé automatiquement dans le dossier du salarié.
              </Text>
            </Group>
          </form>
        </Card>

        {/* Right Column: Live A4 Printable Preview */}
        <div>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <ThemeIcon size={24} radius="sm" color="teal" variant="light">
                <FileCheck size={14} />
              </ThemeIcon>
              <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                Aperçu officiel en direct (Format A4)
              </Text>
            </Group>
            <Badge size="sm" variant="light" color="teal">
              Prêt pour impression
            </Badge>
          </Group>

          <Paper
            radius="md"
            p="xl"
            withBorder
            className="bg-white text-gray-900 shadow-md min-h-[560px] flex flex-col justify-between"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              lineHeight: 1.8,
            }}
          >
            <div>
              {/* Header */}
              <div className="border-b-2 border-gray-200 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <Text size="sm" fw={900} tt="uppercase" c="blue.9" style={{ letterSpacing: "-0.01em" }}>
                    {company?.name || "STE OURIDA STATION SARL"}
                  </Text>
                  <Text size="11px" c="dimmed" mt={1}>
                    {company?.address || "Ourida 4, Station Les Cerises, Route d'El Menzel, Sefrou"}
                  </Text>
                  {company?.phone && (
                    <Text size="11px" c="dimmed">
                      Tél : {company.phone}
                    </Text>
                  )}
                </div>
                <div className="text-right">
                  <Badge size="xs" color="gray" variant="outline">
                    A4 Officiel
                  </Badge>
                </div>
              </div>

              {/* City and Date */}
              <div className="text-right text-xs text-gray-600 font-medium mb-6">
                {ville}, le {formatDate(date)}
              </div>

              {/* Title */}
              <div className="text-center my-6">
                <Text
                  fw={900}
                  size="md"
                  tt="uppercase"
                  className="tracking-wider inline-block border-b-2 border-gray-800 pb-1"
                >
                  {title}
                </Text>
              </div>

              {/* Objet */}
              {objet ? (
                <div className="italic text-xs font-semibold text-gray-700 mb-6 bg-gray-50 p-2 rounded border">
                  {objet}
                </div>
              ) : null}

              {/* Document Body */}
              <div className="whitespace-pre-line text-justify text-sm text-gray-800 font-normal leading-relaxed">
                {activeBodyText || "Veuillez sélectionner un salarié pour prévisualiser le document."}
              </div>
            </div>

            {/* Signature & Legal Footer */}
            <div className="mt-12">
              <div className="flex justify-end mb-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center w-56 bg-gray-50/70">
                  <Text size="11px" fw={800} tt="uppercase" c="gray.7">
                    {signataire}
                  </Text>
                  <div className="h-14 flex items-center justify-center text-[10px] text-gray-400">
                    (Signature & Cachet)
                  </div>
                </div>
              </div>

              {/* Legal Footer */}
              <div className="border-t pt-3 text-center text-[10px] text-gray-400 leading-tight">
                {company?.legal_notice || `${company?.name} — ICE : ${company?.ice} — RC : ${company?.rc} — IF : ${company?.if_number} — Patente : ${company?.tp}`}
              </div>
            </div>
          </Paper>
        </div>
      </div>
    </div>
  );
}
