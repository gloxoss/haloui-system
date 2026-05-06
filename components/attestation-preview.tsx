"use client";

import { useState } from "react";

import { createAttestationAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { buildAttestationContent } from "@/lib/attestations";
import { ATTESTATION_TYPE_LABELS } from "@/lib/constants";
import {
  type CompanyRecord,
  type EmployeeAttestationType,
  type EmployeeRecord,
} from "@/lib/types";
import { formatDate, todayIso } from "@/lib/utils";

export function AttestationPreview({
  employees,
  company,
}: {
  employees: EmployeeRecord[];
  company: CompanyRecord;
}) {
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
        eyebrow="Attestations"
        title="Generateur d'attestation de travail"
        description="Choisissez un salarie puis imprimez l'attestation."
      />

      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <form action={createAttestationAction} className="grid gap-4">
            <Field label="Salarie">
              <Select
                name="employe_id"
                value={String(employeeId)}
                onValueChange={(value) => setEmployeeId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Salarie" />
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
            <Field label="Type">
              <Select
                name="type"
                value={type}
                onValueChange={(value) => setType(value as EmployeeAttestationType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTESTATION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date">
              <input
                className="min-h-10 rounded-xl border bg-[var(--card)] px-3 py-2 text-[13px]"
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <SubmitButton>Creer et imprimer</SubmitButton>
          </form>

          <div className="mt-3.5 rounded-xl border bg-[var(--background-alt)] px-3 py-3 text-[13px] leading-5 text-[var(--muted)]">
            Les attestations sont archivees automatiquement et consultables depuis le module Personnel.
          </div>

          <div className="mt-3 rounded-xl border bg-[var(--background)] px-3 py-3 text-[12px] leading-5 text-[var(--muted)]">
            Ce texte vient de Parametres. Variables disponibles: {"{{societe}}"}, {"{{employe}}"}, {"{{cnss}}"}, {"{{date_entree}}"}, {"{{salaire}}"}, {"{{date_du_jour}}"}.
          </div>
        </Card>

        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--muted)]">Apercu</p>
              <h3 className="mt-1 text-xl font-black">Texte genere</h3>
            </div>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              Tester l'impression
            </Button>
          </div>

          <div className="rounded-[20px] border bg-[var(--background)] p-6 shadow-sm">
            <p className="text-right text-[13px]">Tanger, le {formatDate(date)}</p>
            <h4 className="mt-8 text-center text-xl font-black uppercase">Attestation de travail</h4>
            <p className="mt-8 whitespace-pre-line text-[15px] leading-7">
              {preview || "Selectionnez un salarie pour generer le texte."}
            </p>
            <p className="mt-12 text-right text-sm font-semibold">La direction</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
