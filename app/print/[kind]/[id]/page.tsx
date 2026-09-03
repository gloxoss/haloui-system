import { notFound } from "next/navigation";

import AttestationTemplate from "@/app/print/[kind]/[id]/templates/attestation";
import BonLivraisonTemplate from "@/app/print/[kind]/[id]/templates/bl";
import BonCommandeTemplate from "@/app/print/[kind]/[id]/templates/bc";
import BonSortieTemplate from "@/app/print/[kind]/[id]/templates/bs";
import DevisTemplate from "@/app/print/[kind]/[id]/templates/devis";
import FactureTemplate from "@/app/print/[kind]/[id]/templates/facture";
import FichePersonnelTemplate from "@/app/print/[kind]/[id]/templates/fiche-personnel";
import { type PrintableAttestation, type PrintableDocument } from "@/app/print/[kind]/[id]/templates/shared";
import { PrintTrigger } from "@/components/print/print-trigger";
import {
  getAttestationById,
  getCompany,
  getDocumentById,
  getEmployeeById,
  getEntityById,
  listBranches,
} from "@/lib/data";

import { getActiveCompanyId } from "@/lib/company";

export const dynamic = "force-dynamic";

const documentKinds = new Map([
  ["devis", "devis"],
  ["facture", "facture"],
  ["bon-livraison", "bl"],
  ["bon-sortie", "bs"],
  ["bon-commande", "bc"],
] as const);

type PrintDocumentKind = "devis" | "facture" | "bon-livraison" | "bon-sortie" | "bon-commande";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ paper?: string }>;
}) {
  const { kind, id } = await params;
  const { paper } = await searchParams;
  const activeCompanyId = await getActiveCompanyId();
  const documentKind = documentKinds.get(kind as PrintDocumentKind);

  if (documentKind) {
    const document = getDocumentById(Number(id)) as (PrintableDocument & { company_id?: number }) | null;
    if (!document) {
      notFound();
    }

    const company = getCompany(document.company_id || activeCompanyId);

    const branches = listBranches();
    const branch = branches.find((item) => item.id === document.branch_id) ?? null;
    const sourceBranch = branches.find((item) => item.id === document.source_branch_id) ?? null;
    const destinationBranch = branches.find((item) => item.id === document.destination_branch_id) ?? null;
    const party = document.client_id
      ? getEntityById("clients", document.client_id)
      : document.fournisseur_id
        ? getEntityById("fournisseurs", document.fournisseur_id)
        : null;

    return (
      <>
        <PrintTrigger />
        {kind === "devis" ? (
          <DevisTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
        {kind === "facture" ? (
          <FactureTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
        {kind === "bon-livraison" ? (
          <BonLivraisonTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
        {kind === "bon-sortie" ? (
          <BonSortieTemplate
            company={company}
            document={document}
            sourceBranch={sourceBranch}
            destinationBranch={destinationBranch}
          />
        ) : null}
        {kind === "bon-commande" ? (
          <BonCommandeTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
      </>
    );
  }

  if (kind === "fiche-personnel") {
    const company = getCompany(activeCompanyId);
    const employee = getEmployeeById(Number(id));
    if (!employee) {
      notFound();
    }

    return (
      <>
        <PrintTrigger />
        <FichePersonnelTemplate
          company={company}
          employee={employee}
          paper={paper === "blanc" ? "blanc" : "jaune"}
        />
      </>
    );
  }

  if (kind === "attestation") {
    const company = getCompany(activeCompanyId);
    const attestation = getAttestationById(Number(id)) as PrintableAttestation | undefined;
    if (!attestation) {
      notFound();
    }

    return (
      <>
        <PrintTrigger />
        <AttestationTemplate company={company} attestation={attestation} />
      </>
    );
  }

  notFound();
}
