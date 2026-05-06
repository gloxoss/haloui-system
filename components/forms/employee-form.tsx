import Link from "next/link";

import { saveEmployeeAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { type EmployeeRecord } from "@/lib/types";
import { toInputDate } from "@/lib/utils";

export function EmployeeForm({ employee }: { employee?: EmployeeRecord | null }) {
  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Personnel"
        title={employee ? `Dossier #${employee.numero}` : "Nouveau dossier personnel"}
        description="Remplissez la fiche du salarie."
        actions={
          employee ? (
            <Link href={`/print/fiche-personnel/${employee.id}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Imprimer / PDF</Button>
            </Link>
          ) : null
        }
      />
      <form action={saveEmployeeAction} className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <input type="hidden" name="id" value={employee?.id ?? ""} />

        <Card className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom"><Input name="nom" defaultValue={employee?.nom ?? ""} required /></Field>
            <Field label="Prenom"><Input name="prenom" defaultValue={employee?.prenom ?? ""} required /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date de naissance"><Input name="date_naissance" type="date" defaultValue={toInputDate(employee?.date_naissance)} /></Field>
            <Field label="Lieu de naissance"><Input name="lieu_naissance" defaultValue={employee?.lieu_naissance ?? ""} /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Etat civil"><Input name="etat_civil" defaultValue={employee?.etat_civil ?? ""} /></Field>
            <Field label="N CNSS"><Input name="cnss" defaultValue={employee?.cnss ?? ""} /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date d'entree"><Input name="date_entree" type="date" defaultValue={toInputDate(employee?.date_entree)} /></Field>
            <Field label="Date de sortie"><Input name="date_sortie" type="date" defaultValue={employee?.date_sortie ? toInputDate(employee.date_sortie) : ""} /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Telephone"><Input name="telephone" defaultValue={employee?.telephone ?? ""} /></Field>
            <Field label="Salaire"><Input name="salaire" type="number" step="0.01" defaultValue={employee?.salaire ?? 0} /></Field>
          </div>
          <Field label="Adresse du salarie">
            <Textarea name="adresse" defaultValue={employee?.adresse ?? ""} className="min-h-24" />
          </Field>
        </Card>

        <Card className="grid gap-4">
          <div className="rounded-[20px] border bg-[var(--background-alt)] p-3.5">
            <p className="text-xs font-semibold text-[var(--muted)]">Reference dossier</p>
            <p className="mt-1.5 text-xl font-black">{employee ? employee.numero : "Auto"}</p>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">
              Le numero interne est attribue automatiquement a la creation.
            </p>
          </div>
          <UploadField
            name="photo_path"
            folder="employees"
            initialValue={employee?.photo_path}
            label="Photo"
          />
          <SubmitButton className="w-full">{employee ? "Mettre a jour le dossier" : "Creer le dossier"}</SubmitButton>
        </Card>
      </form>
    </div>
  );
}
