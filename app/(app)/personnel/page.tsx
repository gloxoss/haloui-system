import Link from "next/link";

import { requireFeature } from "@/lib/features";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { listAttestations, listEmployees } from "@/lib/data";
import { formatCurrency, formatDateLong } from "@/lib/utils";

export default async function PersonnelPage() {
  await requireFeature("personnel");
  const employees = listEmployees();
  const attestations = listAttestations();

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Ressources humaines"
        title="Personnel"
        description="Gerez les salaries et leurs documents."
        actions={
          <>
            <Link href="/personnel/new"><Button>Nouveau dossier</Button></Link>
            <Link href="/personnel/attestation"><Button variant="secondary">Nouvelle attestation</Button></Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-3.5 text-lg font-black">Dossiers salaries</h3>
          <Table>
            <THead>
              <tr>
                <TH>N</TH>
                <TH>Nom</TH>
                <TH>Entree</TH>
                <TH>Salaire</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <TD colSpan={5} className="py-8 text-center text-[var(--muted)]">
                    Aucun dossier pour l&apos;instant.{" "}
                    <Link href="/personnel/new" className="font-semibold text-[var(--accent)] hover:underline">
                      Creer le premier
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
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/personnel/${employee.id}/edit`}>
                          <Button variant="ghost">Ouvrir</Button>
                        </Link>
                        <Link href={`/print/fiche-personnel/${employee.id}`} target="_blank" rel="noreferrer">
                          <Button variant="secondary">Imprimer</Button>
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
          <h3 className="mb-3.5 text-lg font-black">Attestations recentes</h3>
          <div className="grid gap-3">
            {attestations.length === 0 ? (
              <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-4 text-[13px] text-[var(--muted)]">
                Aucune attestation generee.
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
