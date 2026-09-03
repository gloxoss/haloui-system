"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  Clock,
  Coins,
  FileText,
  Hash,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { DEFAULT_ATTESTATION_TEMPLATES } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";

interface TemplateConfig {
  key: "attestation_template_simple" | "attestation_template_salary" | "attestation_template_visa" | "attestation_template_bank";
  labelFr: string;
  labelAr: string;
  defaultText: string;
  descFr: string;
  descAr: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    key: "attestation_template_simple",
    labelFr: "Attestation simple",
    labelAr: "شهادة عمل عادية",
    defaultText: DEFAULT_ATTESTATION_TEMPLATES.simple,
    descFr: "Modèle standard d'attestation de travail sans mention financière.",
    descAr: "النموذج القياسي لشهادة العمل بدون ذكر الأجر الشهري.",
  },
  {
    key: "attestation_template_salary",
    labelFr: "Attestation avec salaire",
    labelAr: "شهادة عمل مع تحديد الصولد (الأجر)",
    defaultText: DEFAULT_ATTESTATION_TEMPLATES["avec-salaire"],
    descFr: "Attestation certifiant l'emploi et le salaire mensuel brut perçu.",
    descAr: "شهادة عمل رسمية مع تحديد الأجر الشهري الإجمالي.",
  },
  {
    key: "attestation_template_visa",
    labelFr: "Attestation pour visa",
    labelAr: "شهادة عمل لطلب الڤيزا (Visa)",
    defaultText: DEFAULT_ATTESTATION_TEMPLATES.visa,
    descFr: "Mention légale pour dossiers de demande de visa ou consulat.",
    descAr: "صيغة قانونية مخصصة لملفات طلبات التأشيرة والقنصليات.",
  },
  {
    key: "attestation_template_bank",
    labelFr: "Attestation pour banque",
    labelAr: "شهادة عمل لفتح حساب أو سلف بنكي",
    defaultText: DEFAULT_ATTESTATION_TEMPLATES.banque,
    descFr: "Attestation détaillée pour ouverture de compte ou dossier de crédit.",
    descAr: "شهادة مفصلة موجهة للأبناك لفتح الحساب أو ملفات التمويل.",
  },
];

const VARIABLE_TAGS = [
  { tag: "{{societe}}", labelFr: "Société", labelAr: "الشركة", icon: Building2, descFr: "Nom légal de votre entreprise", descAr: "الاسم القانوني للشركة" },
  { tag: "{{employe}}", labelFr: "Salarié", labelAr: "المستخدم", icon: User, descFr: "Nom et prénom de l'employé", descAr: "الاسم الكامل للمستخدم" },
  { tag: "{{cnss}}", labelFr: "N° CNSS", labelAr: "رقم CNSS", icon: Hash, descFr: "Numéro d'immatriculation CNSS", descAr: "رقم التسجيل فالضمان الاجتماعي" },
  { tag: "{{date_entree}}", labelFr: "Date d'entrée", labelAr: "تاريخ الدخول", icon: Calendar, descFr: "Date d'embauche du salarié", descAr: "تاريخ بداية العمل" },
  { tag: "{{salaire}}", labelFr: "Salaire", labelAr: "الأجر الصافي", icon: Coins, descFr: "Montant du salaire mensuel brut", descAr: "مبلغ الأجر الشهري" },
  { tag: "{{date_du_jour}}", labelFr: "Date du jour", labelAr: "تاريخ اليوم", icon: Clock, descFr: "Date d'émission de l'attestation", descAr: "تاريخ تحرير الشهادة" },
];

export function AttestationTemplateEditor({
  initialValues,
}: {
  initialValues: {
    attestation_template_simple?: string;
    attestation_template_salary?: string;
    attestation_template_visa?: string;
    attestation_template_bank?: string;
  };
}) {
  const { t, locale } = useTranslation();

  const [values, setValues] = React.useState({
    attestation_template_simple: initialValues.attestation_template_simple || DEFAULT_ATTESTATION_TEMPLATES.simple,
    attestation_template_salary: initialValues.attestation_template_salary || DEFAULT_ATTESTATION_TEMPLATES["avec-salaire"],
    attestation_template_visa: initialValues.attestation_template_visa || DEFAULT_ATTESTATION_TEMPLATES.visa,
    attestation_template_bank: initialValues.attestation_template_bank || DEFAULT_ATTESTATION_TEMPLATES.banque,
  });

  const textareaRefs = {
    attestation_template_simple: React.useRef<HTMLTextAreaElement>(null),
    attestation_template_salary: React.useRef<HTMLTextAreaElement>(null),
    attestation_template_visa: React.useRef<HTMLTextAreaElement>(null),
    attestation_template_bank: React.useRef<HTMLTextAreaElement>(null),
  };

  const handleInsertTag = (
    key: TemplateConfig["key"],
    tag: string
  ) => {
    const textarea = textareaRefs[key].current;
    const currentVal = values[key] ?? "";

    if (!textarea) {
      setValues((prev) => ({ ...prev, [key]: currentVal + tag }));
      return;
    }

    const start = textarea.selectionStart ?? currentVal.length;
    const end = textarea.selectionEnd ?? currentVal.length;

    const nextVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setValues((prev) => ({ ...prev, [key]: nextVal }));

    requestAnimationFrame(() => {
      textarea.focus();
      const nextPos = start + tag.length;
      textarea.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleReset = (key: TemplateConfig["key"], defaultText: string) => {
    setValues((prev) => ({ ...prev, [key]: defaultText }));
    const textarea = textareaRefs[key].current;
    if (textarea) {
      textarea.focus();
    }
  };

  return (
    <div className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--background-alt)] p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--accent)]" />
            <h4 className="text-base font-black text-[var(--foreground)]">{t.attestations.editorTitle}</h4>
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {t.attestations.editorDesc}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {TEMPLATES.map((tmpl) => {
          const val = values[tmpl.key];
          const textareaRef = textareaRefs[tmpl.key];
          const label = locale === "ar" ? tmpl.labelAr : tmpl.labelFr;
          const description = locale === "ar" ? tmpl.descAr : tmpl.descFr;

          return (
            <div
              key={tmpl.key}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs"
            >
              {/* Card Header: Title + Reset Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="text-sm font-extrabold text-[var(--foreground)]">{label}</h5>
                  <p className="text-[11px] text-[var(--muted)]">{description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleReset(tmpl.key, tmpl.defaultText)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-strong)] hover:bg-[var(--card)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title={t.attestations.defaultModel}
                >
                  <RotateCcw size={12} strokeWidth={2} />
                  <span>{t.attestations.defaultModel}</span>
                </button>
              </div>

              {/* Dynamic Variables Toolbar */}
              <div className="mt-3 rounded-xl border border-[var(--border)]/60 bg-[var(--surface-soft)]/50 p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={13} className="text-[var(--accent)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {t.attestations.insertVariables}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_TAGS.map((v) => {
                    const Icon = v.icon;
                    const tagLabel = locale === "ar" ? v.labelAr : v.labelFr;
                    const tagDesc = locale === "ar" ? v.descAr : v.descFr;

                    return (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(tmpl.key, v.tag)}
                        title={`${tagDesc} — ${v.tag}`}
                        className="group inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-mono font-medium text-[var(--foreground)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <Icon size={12} className="text-[var(--accent)] group-hover:text-inherit" />
                        <span className="font-bold text-[11px]">{v.tag}</span>
                        <span className="text-[10px] opacity-75 font-sans">({tagLabel})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea */}
              <div className="mt-3">
                <textarea
                  ref={textareaRef}
                  name={tmpl.key}
                  value={val}
                  onChange={(e) => setValues((prev) => ({ ...prev, [tmpl.key]: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-xs sm:text-sm text-[var(--foreground)] leading-relaxed focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 focus:outline-none transition-all resize-y min-h-[90px]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
