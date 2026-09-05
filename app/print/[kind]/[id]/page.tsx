import { notFound, redirect } from "next/navigation";

import AttestationTemplate from "@/app/print/[kind]/[id]/templates/attestation";
import BonLivraisonTemplate from "@/app/print/[kind]/[id]/templates/bl";
import BonCommandeTemplate from "@/app/print/[kind]/[id]/templates/bc";
import BonSortieTemplate from "@/app/print/[kind]/[id]/templates/bs";
import DevisTemplate from "@/app/print/[kind]/[id]/templates/devis";
import FactureTemplate from "@/app/print/[kind]/[id]/templates/facture";
import FichePersonnelTemplate from "@/app/print/[kind]/[id]/templates/fiche-personnel";
import BonTransfertTemplate from "@/app/print/[kind]/[id]/templates/bt";
import InventaireTemplate from "@/app/print/[kind]/[id]/templates/inventaire";
import PickingTemplate from "@/app/print/[kind]/[id]/templates/picking";
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
import { getStockTransfertById } from "@/lib/stock-transferts";
import { getInventaireById } from "@/lib/inventaires";
import { genererPickingList } from "@/lib/wms";

import { getAuthSession } from "@/lib/auth";
import { getPortalClientSession } from "@/lib/portal-auth";
import { getActiveCompanyId } from "@/lib/company";

export const dynamic = "force-dynamic";

const documentKinds = new Map<string, "devis" | "facture" | "bl" | "bs" | "bc">([
  ["devis", "devis"],
  ["facture", "facture"],
  ["factures", "facture"],
  ["bl", "bl"],
  ["bon-livraison", "bl"],
  ["bons-livraison", "bl"],
  ["bs", "bs"],
  ["bon-sortie", "bs"],
  ["bons-sortie", "bs"],
  ["bc", "bc"],
  ["bon-commande", "bc"],
  ["bons-commande", "bc"],
]);

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ paper?: string }>;
}) {
  const { kind, id } = await params;
  const { paper } = await searchParams;

  const authSession = await getAuthSession();
  const portalSession = await getPortalClientSession();

  // If not logged in as staff nor as a valid portal client, deny access
  if (!authSession?.user && !portalSession) {
    redirect("/login");
  }

  const activeCompanyId = await getActiveCompanyId();
  const documentKind = documentKinds.get(kind.toLowerCase());

  if (documentKind) {
    const document = getDocumentById(Number(id)) as (PrintableDocument & { company_id?: number }) | null;
    if (!document) {
      notFound();
    }

    // Tenant Isolation: A client portal session can ONLY access documents belonging strictly to their client ID
    if (portalSession && !authSession?.user) {
      if (!document.client_id || document.client_id !== portalSession.clientId) {
        notFound();
      }
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
        {documentKind === "devis" ? (
          <DevisTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
        {documentKind === "facture" ? (
          <FactureTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
        {documentKind === "bl" ? (
          <BonLivraisonTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
        {documentKind === "bs" ? (
          <BonSortieTemplate
            company={company}
            document={document}
            sourceBranch={sourceBranch}
            destinationBranch={destinationBranch}
          />
        ) : null}
        {documentKind === "bc" ? (
          <BonCommandeTemplate company={company} document={document} branch={branch} party={party} />
        ) : null}
      </>
    );
  }

  // Client portal users are strictly barred from HR / staff documents (fiche-personnel, attestations)
  if (portalSession && !authSession?.user) {
    notFound();
  }

  if (kind === "fiche-personnel" || kind === "personnel") {
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

  if (kind === "attestation" || kind === "attestations") {
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

  if (kind === "bt" || kind === "bon-transfert" || kind === "transfert" || kind === "transferts") {
    const transfert = getStockTransfertById(Number(id));
    if (!transfert) {
      notFound();
    }

    const company = getCompany(transfert.company_id || activeCompanyId);
    const branches = listBranches();
    const sourceBranch = branches.find((b) => b.id === transfert.source_branch_id) ?? null;
    const destinationBranch = branches.find((b) => b.id === transfert.destination_branch_id) ?? null;

    return (
      <>
        <PrintTrigger />
        <BonTransfertTemplate
          company={company}
          transfert={transfert}
          sourceBranch={sourceBranch}
          destinationBranch={destinationBranch}
        />
      </>
    );
  }

  if (kind === "inventaire" || kind === "inventaires") {
    const inventaire = getInventaireById(Number(id));
    if (!inventaire) {
      notFound();
    }

    const company = getCompany(inventaire.company_id || activeCompanyId);
    const branches = listBranches();
    const branch = branches.find((b) => b.id === inventaire.branch_id) ?? null;

    return (
      <>
        <PrintTrigger />
        <InventaireTemplate
          company={company}
          inventaire={inventaire}
          branch={branch}
        />
      </>
    );
  }

  if (kind === "picking" || kind === "picking-list") {
    try {
      const pickingList = genererPickingList(Number(id));
      const company = getCompany(activeCompanyId);

      return (
        <>
          <PrintTrigger />
          <PickingTemplate
            company={company}
            pickingList={pickingList}
          />
        </>
      );
    } catch {
      notFound();
    }
  }

  notFound();
}

