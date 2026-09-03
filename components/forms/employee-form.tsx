"use client";

import Link from "next/link";

import { saveEmployeeAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { UploadField } from "@/components/upload-field";
import { AppDateInput } from "@/components/ui/app-date-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { type EmployeeRecord } from "@/lib/types";
import { toInputDate } from "@/lib/utils";

export function EmployeeForm({ employee }: { employee?: EmployeeRecord | null }) {
  const { t, locale } = useTranslation();

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={locale === "ar" ? "الموارد البشرية" : "Personnel"}
        title={
          employee
            ? (locale === "ar" ? `ملف مستخدم #${employee.numero}` : `Dossier #${employee.numero}`)
            : (locale === "ar" ? "إضافة مستخدم جديد" : "Nouveau dossier personnel")
        }
        description={
          locale === "ar"
            ? "عمر معلومات وملف المستخدم، بطاقة التعريف، الصالير، ورقم لاCNSS."
            : "Remplissez la fiche du salarié."
        }
        actions={
          employee ? (
            <Link href={`/print/fiche-personnel/${employee.id}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">{locale === "ar" ? "طباعة / PDF" : "Imprimer / PDF"}</Button>
            </Link>
          ) : null
        }
      />
      <form action={saveEmployeeAction} className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <input type="hidden" name="id" value={employee?.id ?? ""} />

        <Card className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={locale === "ar" ? "النسب (Nom)" : "Nom"}>
              <Input name="nom" defaultValue={employee?.nom ?? ""} required />
            </Field>
            <Field label={locale === "ar" ? "الاسم الشخصي (Prénom)" : "Prénom"}>
              <Input name="prenom" defaultValue={employee?.prenom ?? ""} required />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={locale === "ar" ? "تاريخ الازدياد" : "Date de naissance"}>
              <AppDateInput name="date_naissance" defaultValue={toInputDate(employee?.date_naissance)} />
            </Field>
            <Field label={locale === "ar" ? "مكان الازدياد" : "Lieu de naissance"}>
              <Input name="lieu_naissance" defaultValue={employee?.lieu_naissance ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={locale === "ar" ? "الحالة العائلية" : "État civil"}>
              <Input name="etat_civil" defaultValue={employee?.etat_civil ?? ""} />
            </Field>
            <Field label={locale === "ar" ? "رقم CNSS" : "N° CNSS"}>
              <Input name="cnss" defaultValue={employee?.cnss ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={locale === "ar" ? "تاريخ الالتحاق بالعمل" : "Date d'entrée"}>
              <AppDateInput name="date_entree" defaultValue={toInputDate(employee?.date_entree)} />
            </Field>
            <Field label={locale === "ar" ? "تاريخ مغادرة العمل" : "Date de sortie"}>
              <AppDateInput name="date_sortie" defaultValue={employee?.date_sortie ? toInputDate(employee.date_sortie) : ""} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={locale === "ar" ? "الهاتف" : "Téléphone"}>
              <Input name="telephone" defaultValue={employee?.telephone ?? ""} />
            </Field>
            <Field label={locale === "ar" ? "الأجر الشهري (درهم)" : "Salaire (MAD)"}>
              <Input name="salaire" type="number" step="0.01" defaultValue={employee?.salaire ?? 0} />
            </Field>
          </div>
          <Field label={locale === "ar" ? "عنوان المستخدم" : "Adresse du salarié"}>
            <Textarea name="adresse" defaultValue={employee?.adresse ?? ""} className="min-h-24" />
          </Field>
        </Card>

        <Card className="grid gap-4">
          <div className="rounded-[20px] border bg-[var(--background-alt)] p-3.5">
            <p className="text-xs font-semibold text-[var(--muted)]">
              {locale === "ar" ? "رقم الملف" : "Référence dossier"}
            </p>
            <p className="mt-1.5 text-xl font-black">{employee ? employee.numero : (locale === "ar" ? "تلقائي" : "Auto")}</p>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">
              {locale === "ar"
                ? "الرقم الداخلي للمستخدم كايتعطى أوتوماتيك فاش كايتكريا الملف."
                : "Le numéro interne est attribué automatiquement à la création."}
            </p>
          </div>
          <UploadField
            name="photo_path"
            folder="employees"
            initialValue={employee?.photo_path}
            label={locale === "ar" ? "صورة المستخدم" : "Photo"}
          />
          <SubmitButton className="w-full">
            {employee
              ? (locale === "ar" ? "تحديث ملف المستخدم" : "Mettre à jour le dossier")
              : (locale === "ar" ? "حفظ وإنشاء الملف" : "Créer le dossier")}
          </SubmitButton>
        </Card>
      </form>
    </div>
  );
}
