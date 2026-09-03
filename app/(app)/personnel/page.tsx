import Link from "next/link";

import { requireFeature } from "@/lib/features";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { listAttestations, listEmployees } from "@/lib/data";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { formatCurrency, formatDateLong } from "@/lib/utils";

export default async function PersonnelPage() {
  await requireFeature("personnel");
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

  const employees = listEmployees();
  const attestations = listAttestations();

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={locale === "ar" ? "الموارد البشرية والمستخدمين" : "Ressources humaines"}
        title={dict.personnel.title}
        description={dict.personnel.subtitle}
        actions={
          <>
            <Link href="/personnel/new">
              <Button>+ {dict.personnel.newEmployee}</Button>
            </Link>
            <Link href="/personnel/attestation">
              <Button variant="secondary">+ {dict.personnel.newAttestation}</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-3.5 text-lg font-black">
            {locale === "ar" ? "ملفات المستخدمين والعمال" : "Dossiers salariés"}
          </h3>
          <Table>
            <THead>
              <tr>
                <TH>{locale === "ar" ? "الرقم" : "N°"}</TH>
                <TH>{dict.personnel.nom}</TH>
                <TH>{dict.personnel.dateEntree}</TH>
                <TH>{dict.personnel.salaire}</TH>
                <TH className={locale === "ar" ? "text-left" : "text-right"}>{dict.common.actions}</TH>
              </tr>
            </THead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <TD colSpan={5} className="py-8 text-center text-[var(--muted)]">
                    {locale === "ar" ? "ما كاين حتى مستخدم مسجل حالياً. " : "Aucun dossier pour l'instant. "}
                    <Link href="/personnel/new" className="font-semibold text-[var(--accent)] hover:underline">
                      {locale === "ar" ? "إضافة أول مستخدم" : "Créer le premier"}
                    </Link>
                  </TD>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <TD className="font-semibold">
                      <Link href={`/personnel/${employee.id}/edit`} className="hover:underline">
                        {employee.numero}
                      </Link>
                    </TD>
                    <TD>{employee.prenom} {employee.nom}</TD>
                    <TD>{employee.date_entree ? formatDateLong(employee.date_entree) : "-"}</TD>
                    <TD>{formatCurrency(employee.salaire)}</TD>
                    <TD className={locale === "ar" ? "text-left" : "text-right"}>
                      <div className={`flex gap-2 ${locale === "ar" ? "justify-start" : "justify-end"}`}>
                        <Link href={`/personnel/${employee.id}/edit`}>
                          <Button variant="ghost">{dict.common.edit}</Button>
                        </Link>
                        <Link href={`/print/fiche-personnel/${employee.id}`} target="_blank" rel="noreferrer">
                          <Button variant="secondary">{dict.common.print}</Button>
                        </Link>
                      </div>
                    </TD>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>

        <Card>
          <h3 className="mb-3.5 text-lg font-black">
            {locale === "ar" ? "شواهد العمل الأخيرة" : "Attestations récentes"}
          </h3>
          <div className="grid gap-3">
            {attestations.length === 0 ? (
              <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-4 text-[13px] text-[var(--muted)]">
                {locale === "ar" ? "ما كاينا حتى شهادة منشأة حالياً." : "Aucune attestation générée."}
              </div>
            ) : (
              attestations.slice(0, 8).map((attestation: any) => (
                <Link
                  key={attestation.id}
                  href={`/print/attestation/${attestation.id}`}
                  className="rounded-xl border bg-[var(--background-alt)] px-3 py-3 transition duration-200 hover:border-[var(--accent)]"
                >
                  <div className="font-semibold">{attestation.prenom} {attestation.nom}</div>
                  <div className="text-xs text-[var(--muted)]">{attestation.type}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{formatDateLong(attestation.date)}</div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
