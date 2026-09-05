import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { getCompany, getBankStatementWithOperations } from "@/lib/data";
import { getActiveCompanyId } from "@/lib/company";
import { PrintTrigger } from "@/components/print/print-trigger";

export const dynamic = "force-dynamic";

export default async function PrintRapprochementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const statementId = Number(id);
  if (!statementId) notFound();

  const authSession = await getAuthSession();
  if (!authSession?.user) {
    redirect("/login");
  }

  const companyId = await getActiveCompanyId();
  const company = getCompany(companyId);
  const data = getBankStatementWithOperations(statementId);

  if (!data) notFound();

  const { statement, operations, stats, account } = data;
  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="min-h-screen bg-neutral-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-[210mm] bg-white p-8 shadow-sm print:max-w-none print:p-6 print:shadow-none font-sans text-neutral-900 text-xs">
        {/* Header Entreprise */}
        <div className="flex justify-between items-start border-b border-neutral-300 pb-4 mb-6">
          <div>
            <h1 className="text-base font-bold tracking-tight text-neutral-900 uppercase">
              {company.name}
            </h1>
            <p className="text-xs text-neutral-600 mt-0.5">{company.address}</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              ICE : {company.ice || "—"} | IF : {company.if_number || "—"} | RC : {company.rc || "—"}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold text-neutral-800" dir="rtl">
              {company.arabic_name}
            </h2>
            <p className="text-xs text-neutral-500 mt-1 font-mono">
              Date d'édition : {today}
            </p>
          </div>
        </div>

        {/* Titre Officiel */}
        <div className="text-center my-6 py-2 bg-neutral-50 border border-neutral-200 rounded">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800">
            Procès-Verbal de Rapprochement Bancaire
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Période : {statement.date_debut || "—"} au {statement.date_fin || "—"} | Relevé : {statement.nom_fichier} ({statement.format_fichier})
          </p>
        </div>

        {/* Informations Compte Bancaire */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50/50 rounded border border-neutral-200 mb-6">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-semibold">Établissement Bancaire</div>
            <div className="text-xs font-bold text-neutral-900 mt-0.5">{account.nom_banque}</div>
            <div className="text-[11px] text-neutral-600">{account.intitule_compte}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-semibold">Relevé d'Identité Bancaire (RIB)</div>
            <div className="text-xs font-mono font-semibold text-neutral-800 mt-0.5">{account.rib}</div>
            <div className="text-[11px] text-neutral-500">Devise : {account.devise}</div>
          </div>
        </div>

        {/* Tableau Synthèse de Rapprochement */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
            Synthèse de la Réconciliation Comptable
          </h3>
          <table className="w-full border-collapse border border-neutral-300 text-xs">
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="p-2 font-medium">Solde au relevé bancaire (arrêté au {statement.date_fin || today})</td>
                <td className="p-2 text-right font-mono font-bold">
                  {stats.soldeReleve.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.devise}
                </td>
              </tr>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <td className="p-2 font-medium">Solde comptable rapproché (écritures ERP lettrées)</td>
                <td className="p-2 text-right font-mono font-bold text-emerald-800">
                  {stats.soldeRapproche.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.devise}
                </td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-2 font-medium">Opérations en suspens / non lettrées ({stats.nbEnAttente} ligne(s))</td>
                <td className="p-2 text-right font-mono text-neutral-600">
                  {stats.nbEnAttente} opération(s)
                </td>
              </tr>
              <tr className="bg-neutral-100 font-bold">
                <td className="p-2.5 uppercase tracking-wide">
                  Écart de rapprochement net
                </td>
                <td className={`p-2.5 text-right font-mono text-sm ${Math.abs(stats.ecartRapprochement) < 0.01 ? "text-emerald-700" : "text-amber-700"}`}>
                  {stats.ecartRapprochement.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.devise}
                </td>
              </tr>
            </tbody>
          </table>
          {Math.abs(stats.ecartRapprochement) < 0.01 ? (
            <p className="text-[11px] text-emerald-700 mt-1.5 font-medium">
              ✓ Concordance exacte : Les écritures bancaires et comptables sont parfaitement réconciliées sans aucun écart.
            </p>
          ) : (
            <p className="text-[11px] text-amber-700 mt-1.5 font-medium">
              ⚠️ Attention : Un écart de {stats.ecartRapprochement.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.devise} subsiste entre le relevé et les livres comptables.
            </p>
          )}
        </div>

        {/* Détail des Opérations du Relevé */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
            Détail des Écritures Bancaires ({operations.length} opérations)
          </h3>
          <table className="w-full border-collapse border border-neutral-300 text-[11px]">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-300">
                <th className="p-1.5 text-left">Date</th>
                <th className="p-1.5 text-left">Libellé de l'opération</th>
                <th className="p-1.5 text-right">Débit</th>
                <th className="p-1.5 text-right">Crédit</th>
                <th className="p-1.5 text-left">Statut</th>
                <th className="p-1.5 text-left">Contrepartie ERP</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr key={op.id} className="border-b border-neutral-200">
                  <td className="p-1.5 font-mono">{op.date_operation}</td>
                  <td className="p-1.5 font-medium">{op.libelle}</td>
                  <td className="p-1.5 text-right font-mono">
                    {op.type_mouvement === "debit" ? op.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    {op.type_mouvement === "credit" ? op.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="p-1.5">
                    <span className={op.statut_rapprochement === "rapproche" ? "text-emerald-700 font-semibold" : "text-neutral-400 italic"}>
                      {op.statut_rapprochement === "rapproche" ? "Rapproché" : "Non lettré"}
                    </span>
                  </td>
                  <td className="p-1.5 text-neutral-600">
                    {op.document_type === "facture" && op.matched_document ? (
                      `Facture #${op.matched_document.numero} (${op.matched_document.client_name || ""})`
                    ) : op.document_type === "sortie_caisse" ? (
                      `Dépense #${op.document_id}`
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures & Visas Officiels */}
        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-neutral-300 mt-8">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase text-neutral-700">Le Responsable Comptable / Trésorerie</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Signature & Cachet</p>
            <div className="h-20 border border-dashed border-neutral-300 rounded mt-2"></div>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase text-neutral-700">La Direction Générale</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Pour Approbation</p>
            <div className="h-20 border border-dashed border-neutral-300 rounded mt-2"></div>
          </div>
        </div>

        {/* Bouton d'impression (masqué à l'impression) */}
        <div className="mt-8 text-center print:hidden">
          <PrintTrigger />
        </div>
      </div>
    </div>
  );
}
