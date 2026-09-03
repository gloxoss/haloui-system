"use client";

import * as React from "react";
import { createAttestationAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { AppDateInput } from "@/components/ui/app-date-input";
import { buildAttestationContent } from "@/lib/attestations";
import { ATTESTATION_TYPE_LABELS, ATTESTATION_TYPE_TITLES } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { type CompanyRecord, type EmployeeRecord } from "@/lib/types";
import { formatDate, todayIso } from "@/lib/utils";
import {
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
  Award,
  FileCheck,
  FileText,
  PenTool,
  Printer,
  RotateCcw,
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
];

export function AttestationPreview({
  employees,
  company,
}: {
  employees: EmployeeRecord[];
  company: CompanyRecord;
  initialType?: string;
}) {
  const { t, locale } = useTranslation();
  const [employeeId, setEmployeeId] = React.useState<string>(() => String(employees[0]?.id ?? ""));
  const [type, setType] = React.useState<string>("simple");
  const [date, setDate] = React.useState(todayIso());
  const [ville, setVille] = React.useState("Tanger");
  const [title, setTitle] = React.useState(() => ATTESTATION_TYPE_TITLES.simple || "ATTESTATION DE TRAVAIL");
  const [objet, setObjet] = React.useState("");
  const [signataire, setSignataire] = React.useState("La Direction Générale");
  const [bodyText, setBodyText] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const currentEmployee = React.useMemo(() => {
    return employees.find((item) => String(item.id) === employeeId);
  }, [employees, employeeId]);

  // Generate baseline text when employee, type, or date changes
  React.useEffect(() => {
    if (currentEmployee) {
      const generated = buildAttestationContent(
        {
          prenom: currentEmployee.prenom,
          nom: currentEmployee.nom,
          cnss: currentEmployee.cnss,
          date_entree: currentEmployee.date_entree,
          date_sortie: currentEmployee.date_sortie,
          salaire: currentEmployee.salaire,
        },
        type,
        company,
        { referenceDate: date, ville },
      );
      setBodyText(generated);
    }
  }, [employeeId, type, date, ville, company, currentEmployee]);

  // Update default document title when type changes
  const handleTypeChange = (newType: string | null) => {
    if (!newType) return;
    setType(newType);
    const defaultTitle = ATTESTATION_TYPE_TITLES[newType] || "ATTESTATION OFFICIELLE";
    setTitle(defaultTitle);
  };

  // Helper to insert a variable chip at cursor position in textarea
  const insertVariable = (value: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBodyText((prev) => prev + " " + value);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = bodyText;
    const updated = current.substring(0, start) + value + current.substring(end);
    setBodyText(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + value.length, start + value.length);
    }, 50);
  };

  // Reset text to default template
  const handleResetTemplate = () => {
    if (currentEmployee) {
      const generated = buildAttestationContent(
        {
          prenom: currentEmployee.prenom,
          nom: currentEmployee.nom,
          cnss: currentEmployee.cnss,
          date_entree: currentEmployee.date_entree,
          date_sortie: currentEmployee.date_sortie,
          salaire: currentEmployee.salaire,
        },
        type,
        company,
        { referenceDate: date, ville },
      );
      setBodyText(generated);
    }
  };

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={t.personnel.attestations}
        title={locale === "ar" ? "إنشاء وتخصيص الشهادات والوثائق" : "Éditeur d'Attestations & Documents RH"}
        description={
          locale === "ar"
            ? "اختر نوع الشهادة، نسق نص الوثيقة وموضع العناصر، ثم عاين النتيجة مباشرة قبل الطباعة."
            : "Personnalisez la mise en page, modifiez le texte libre, ajoutez des mentions légales et imprimez directement."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Left Column: Interactive Form & Text Area Editor */}
        <Card className="p-5">
          <form action={createAttestationAction}>
            <input type="hidden" name="employe_id" value={employeeId} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="custom_title" value={title} />
            <input type="hidden" name="custom_objet" value={objet} />
            <input type="hidden" name="custom_body" value={bodyText} />
            <input type="hidden" name="custom_ville" value={ville} />
            <input type="hidden" name="custom_signataire" value={signataire} />

            <Stack gap="md">
              {/* Step 1: Employee and Document Type */}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Select
                  label={t.attestations.employee}
                  placeholder={locale === "ar" ? "اختر الموظف" : "Sélectionnez un employé"}
                  data={employees.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.numero} - ${emp.prenom} ${emp.nom}`,
                  }))}
                  value={employeeId}
                  onChange={(val) => setEmployeeId(val || "")}
                  required
                  radius="md"
                  leftSection={<User size={16} />}
                />

                <Select
                  label={t.attestations.type}
                  placeholder={locale === "ar" ? "نوع الوثيقة" : "Type de document"}
                  data={Object.entries(ATTESTATION_TYPE_LABELS).map(([key, label]) => ({
                    value: key,
                    label: locale === "ar" && ATTESTATION_TYPE_LABELS_AR[key] ? ATTESTATION_TYPE_LABELS_AR[key] : label,
                  }))}
                  value={type}
                  onChange={handleTypeChange}
                  required
                  radius="md"
                  leftSection={<FileText size={16} />}
                />
              </SimpleGrid>

              {/* Step 2: Document Elements (Title, Objet, City, Signatory) */}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={locale === "ar" ? "عنوان الوثيقة (بالحجم العريض)" : "Titre officiel du document"}
                  placeholder="EX: ATTESTATION DE TRAVAIL"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  required
                  radius="md"
                />

                <TextInput
                  label={locale === "ar" ? "الموضوع / المرجع (اختياري)" : "Objet ou Référence (optionnel)"}
                  placeholder="Ex : Objet : Demande de visa touristique"
                  value={objet}
                  onChange={(e) => setObjet(e.currentTarget.value)}
                  radius="md"
                />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <TextInput
                  label={locale === "ar" ? "مدينة التحرير" : "Ville d'émission"}
                  value={ville}
                  onChange={(e) => setVille(e.currentTarget.value)}
                  radius="md"
                />

                <div>
                  <Text size="xs" fw={700} c="dimmed" mb={4}>
                    {locale === "ar" ? "تاريخ التحرير" : "Date du document"}
                  </Text>
                  <AppDateInput value={date} onChange={setDate} clearable={false} />
                </div>

                <Select
                  label={locale === "ar" ? "الموقع على الوثيقة" : "Signataire habilité"}
                  data={SIGNATAIRE_PRESETS.map((s) => ({ value: s, label: s }))}
                  value={signataire}
                  onChange={(val) => setSignataire(val || "La Direction Générale")}
                  radius="md"
                />
              </SimpleGrid>

              <Divider my="xs" />

              {/* Step 3: Interactive Body Text Editor with Variable Insert Chips */}
              <div>
                <Group justify="space-between" align="center" mb={6} wrap="wrap">
                  <Group gap={6}>
                    <PenTool size={16} className="text-blue-600" />
                    <Text size="sm" fw={800}>
                      {locale === "ar" ? "نص الوثيقة والتنسيق المخصص" : "Texte et mise en forme de l'attestation"}
                    </Text>
                  </Group>

                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="gray"
                    leftSection={<RotateCcw size={12} />}
                    onClick={handleResetTemplate}
                    type="button"
                  >
                    {locale === "ar" ? "إعادة تعيين للنموذج" : "Rétablir le modèle"}
                  </Button>
                </Group>

                {/* Variable insertion buttons */}
                <Paper
                  withBorder
                  p="xs"
                  radius="md"
                  mb="xs"
                  style={{
                    background: "var(--surface-soft)",
                    borderColor: "var(--border)",
                  }}
                >
                  <Text size="11px" fw={700} c="dimmed" mb={4}>
                    {locale === "ar" ? "إدراج معلومات الموظف بنقرة واحدة :" : "Insérer rapidement une variable :"}
                  </Text>
                  <Group gap={6} wrap="wrap">
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="blue"
                      radius="xl"
                      onClick={() => insertVariable(currentEmployee ? `${currentEmployee.prenom} ${currentEmployee.nom}` : "{{employe}}")}
                      type="button"
                    >
                      + Nom complet
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="teal"
                      radius="xl"
                      onClick={() => insertVariable(currentEmployee?.cnss || "{{cnss}}")}
                      type="button"
                    >
                      + N° CNSS
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="cyan"
                      radius="xl"
                      onClick={() => insertVariable(currentEmployee?.date_entree ? formatDate(currentEmployee.date_entree) : "{{date_entree}}")}
                      type="button"
                    >
                      + Date d'embauche
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="indigo"
                      radius="xl"
                      onClick={() => insertVariable(currentEmployee?.salaire ? `${currentEmployee.salaire} MAD` : "{{salaire}}")}
                      type="button"
                    >
                      + Salaire
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="grape"
                      radius="xl"
                      onClick={() => insertVariable(company.name || "{{societe}}")}
                      type="button"
                    >
                      + Raison sociale
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="orange"
                      radius="xl"
                      onClick={() => insertVariable(formatDate(date))}
                      type="button"
                    >
                      + Date du jour
                    </Button>
                  </Group>
                </Paper>

                {/* Free Textarea */}
                <textarea
                  ref={textareaRef}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={9}
                  placeholder="Rédigez ou personnalisez le texte de l'attestation ici..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-[14px] leading-relaxed text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                  style={{
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Submit Action */}
              <Button
                type="submit"
                size="md"
                radius="xl"
                color="blue"
                leftSection={<Printer size={18} />}
                style={{ fontWeight: 800 }}
              >
                {locale === "ar" ? "حفظ وطباعة الوثيقة الرسمية" : "Créer et Imprimer le document"}
              </Button>
            </Stack>
          </form>
        </Card>

        {/* Right Column: High-Fidelity A4 Paper Live Preview */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <Group justify="space-between" align="center" mb="md">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">{t.attestations.preview}</p>
                <h3 className="text-lg font-black">{locale === "ar" ? "معاينة الورقة (A4 مباشر)" : "Aperçu A4 en temps réel"}</h3>
              </div>
              <Badge variant="light" color="blue" size="md">
                {locale === "ar" ? "معاينة مطابقة للأصل" : "Conforme à l'impression"}
              </Badge>
            </Group>

            {/* Simulated A4 Paper */}
            <div
              className="rounded-2xl border p-8 shadow-sm"
              style={{
                background: "#ffffff",
                borderColor: "var(--border-strong)",
                color: "#1e293b",
                minHeight: 520,
              }}
            >
              {/* Paper Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="text-[14px] font-black uppercase tracking-wider text-slate-900">
                    {company.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Département des Ressources Humaines
                  </div>
                </div>
                <div className="text-right text-[12px] font-semibold text-slate-500">
                  {ville}, le {formatDate(date)}
                </div>
              </div>

              {/* Optional Objet */}
              {objet ? (
                <div className="mt-4 text-[12.5px] font-semibold italic text-slate-600">
                  {objet}
                </div>
              ) : null}

              {/* Centered Document Title */}
              <div className="my-8 text-center">
                <h2 className="inline-block text-[19px] font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1">
                  {title || "ATTESTATION DE TRAVAIL"}
                </h2>
              </div>

              {/* Formatted Body Text */}
              <div className="my-6">
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-justify text-slate-800">
                  {bodyText || (locale === "ar" ? "يرجى كتابة نص الشهادة في الحقل المقابل..." : "Saisissez ou modifiez le texte dans l'éditeur...")}
                </p>
              </div>

              {/* Official Closing Mention */}
              <div className="mt-8 text-[12.5px] italic text-slate-600">
                La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
              </div>

              {/* Signature Box */}
              <div className="mt-10 flex justify-end">
                <div className="w-56 rounded-xl border border-dashed border-slate-300 p-3 text-center">
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-slate-800">
                    {signataire}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Signature & Cachet Officiel
                  </div>
                  <div className="h-16" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-[var(--muted)]">
            {locale === "ar"
              ? "سيتم حفظ هذه الوثيقة في أرشيف الموظف ويمكن إعادة طباعتها في أي وقت."
              : "Cette attestation sera archivée dans la fiche de l'employé et pourra être réimprimée à tout moment."}
          </div>
        </Card>
      </div>
    </div>
  );
}
