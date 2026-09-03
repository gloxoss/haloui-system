"use client";

import { useState } from "react";

import { createAttestationAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { AppDateInput } from "@/components/ui/app-date-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { buildAttestationContent } from "@/lib/attestations";
import { ATTESTATION_TYPE_LABELS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import {
  type CompanyRecord,
  type EmployeeAttestationType,
  type EmployeeRecord,
} from "@/lib/types";
import { formatDate, todayIso } from "@/lib/utils";

const ATTESTATION_TYPE_LABELS_AR: Record<string, string> = {
  simple: "شهادة عمل عادية",
  "avec-salaire": "شهادة عمل مع تحديد الصولد",
  visa: "شهادة عمل لطلب الڤيزا (Visa)",
  banque: "شهادة عمل للبنك",
};

export function AttestationPreview({
  employees,
  company,
}: {
  employees: EmployeeRecord[];
  company: CompanyRecord;
}) {
  const { t, locale } = useTranslation();
  const [employeeId, setEmployeeId] = useState<number>(employees[0]?.id ?? 0);
  const [type, setType] = useState<EmployeeAttestationType>("simple");
  const [date, setDate] = useState(todayIso());

  const employee = employees.find((item) => item.id === employeeId);
  const preview = employee
    ? buildAttestationContent(employee, type, company, { referenceDate: date })
    : "";

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={t.personnel.attestations}
        title={t.attestations.title}
        description={t.attestations.subtitle}
      />

      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <form action={createAttestationAction} className="grid gap-4">
            <Field label={t.attestations.employee}>
              <Select
                name="employe_id"
                value={String(employeeId)}
                onValueChange={(value) => setEmployeeId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.attestations.employee} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.numero} - {item.prenom} {item.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.attestations.type}>
              <Select
                name="type"
                value={type}
                onValueChange={(value) => setType(value as EmployeeAttestationType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.attestations.type} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTESTATION_TYPE_LABELS).map(([key, label]) => {
                    const localizedLabel = locale === "ar" && ATTESTATION_TYPE_LABELS_AR[key]
                      ? ATTESTATION_TYPE_LABELS_AR[key]
                      : label;

                    return (
                      <SelectItem key={key} value={key}>
                        {localizedLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.attestations.date}>
              <AppDateInput
                name="date"
                value={date}
                onChange={setDate}
              />
            </Field>
            <SubmitButton>{t.attestations.createAndPrint}</SubmitButton>
          </form>

          <div className="mt-3.5 rounded-xl border bg-[var(--background-alt)] px-3 py-3 text-[13px] leading-5 text-[var(--muted)]">
            {locale === "ar"
              ? "الشهادات كيتأرشيفاو أوتوماتيك وكتلقاهم فملف المستخدم المعني فالبرسونيل."
              : "Les attestations sont archivées automatiquement et consultables depuis le module Personnel."}
          </div>

          <div className="mt-3 rounded-xl border bg-[var(--background)] px-3 py-3 text-[12px] leading-5 text-[var(--muted)]">
            {locale === "ar"
              ? "هاد النص كيجي من الإعدادات. المتغيرات المتاحة: {{societe}}، {{employe}}، {{cnss}}، {{date_entree}}، {{salaire}}، {{date_du_jour}}."
              : "Ce texte vient de Paramètres. Variables disponibles: {{societe}}, {{employe}}, {{cnss}}, {{date_entree}}, {{salaire}}, {{date_du_jour}}."}
          </div>
        </Card>

        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--muted)]">{t.attestations.preview}</p>
              <h3 className="mt-1 text-xl font-black">{t.attestations.generatedText}</h3>
            </div>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              {t.attestations.testPrint}
            </Button>
          </div>

          <div className="rounded-[20px] border bg-[var(--background)] p-6 shadow-sm">
            <p className="text-right text-[13px]">
              {locale === "ar" ? `طنجة، في ${formatDate(date)}` : `Tanger, le ${formatDate(date)}`}
            </p>
            <h4 className="mt-8 text-center text-xl font-black uppercase">
              {locale === "ar" ? "شهادة عمل" : "Attestation de travail"}
            </h4>
            <p className="mt-8 whitespace-pre-line text-[15px] leading-7">
              {preview || t.attestations.selectEmployeePrompt}
            </p>
            <p className="mt-12 text-right text-sm font-semibold">{t.attestations.managementSignature}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
