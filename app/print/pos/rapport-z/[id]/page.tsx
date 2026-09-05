import { notFound } from "next/navigation";
import { getCompany } from "@/lib/data";
import { getSessionById } from "@/lib/pos";
import { type RapportZData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { PrintToolbar } from "@/components/pos/print-toolbar";

export const dynamic = "force-dynamic";

export default async function PrintRapportZPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (isNaN(sessionId)) notFound();

  const session = getSessionById(sessionId);
  if (!session) notFound();

  const company = getCompany(session.company_id || 1);

  let rapportZ: RapportZData | null = null;
  if (session.rapport_z_json) {
    try {
      rapportZ = JSON.parse(session.rapport_z_json);
    } catch {
      // Ignorer
    }
  }

  const theorique = session.montant_especes_theorique;
  const reel = session.montant_especes_reel;
  const ecart = session.ecart_caisse;

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Styles d'impression calibrés pour ticket Z 80mm */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .ticket-z-container {
            width: 78mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 4mm !important;
          }
        }
      `}</style>

      {/* Barre d'outils (Masquée à l'impression) */}
      <PrintToolbar title={`Rapport Z · ${session.rapport_z_numero || session.numero_session}`} />

      {/* TICKET Z THERMIQUE 80MM */}
      <div className="p-6 flex justify-center">
        <div className="ticket-z-container bg-white shadow-xl border border-slate-200 p-4 rounded text-black font-mono text-[11px] leading-tight w-[78mm] flex flex-col justify-between">
          {/* En-tête Société */}
          <div className="text-center pb-2.5 border-b border-black border-dashed">
            <h1 className="text-sm font-bold uppercase">{company?.name || "HALOUI"}</h1>
            {company?.arabic_name && (
              <p className="text-[10px] font-sans font-bold mt-0.5">{company.arabic_name}</p>
            )}
            <p className="text-[9px] text-slate-600">{company?.address}</p>
            {company?.ice && <p className="text-[9px]">ICE : {company.ice}</p>}
            <p className="text-[10px] font-bold mt-1 bg-slate-100 py-0.5 rounded">
              {session.branch_name}
            </p>
          </div>

          {/* Titre Officiel Rapport Z */}
          <div className="text-center py-2 border-b border-black border-dashed">
            <div className="text-xs font-black uppercase tracking-wider">
              RAPPORT Z - CLÔTURE DE CAISSE
            </div>
            <div className="text-xs font-bold text-indigo-900 mt-0.5">
              N° {session.rapport_z_numero || "Z-DEFINITIF"}
            </div>
          </div>

          {/* Horodatages et Caissier */}
          <div className="py-2 border-b border-slate-300 text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>Session :</span>
              <span>{session.numero_session}</span>
            </div>
            <div className="flex justify-between">
              <span>Ouverture :</span>
              <span>{new Date(session.date_ouverture).toLocaleString("fr-FR")}</span>
            </div>
            <div className="flex justify-between">
              <span>Clôture :</span>
              <span>
                {session.date_fermeture
                  ? new Date(session.date_fermeture).toLocaleString("fr-FR")
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Caissier :</span>
              <span>{session.user_name || "Caisse"}</span>
            </div>
          </div>

          {/* Ventes & Chiffre d'affaires */}
          <div className="py-2.5 border-b border-black border-dashed space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase">Activité Ventes :</div>
            <div className="flex justify-between text-[10px]">
              <span>Nombre de tickets émis :</span>
              <span className="font-bold">{session.nb_tickets}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Total Ventes HT :</span>
              <span>{formatNumber(session.total_ventes_ht)} DH</span>
            </div>
            <div className="flex justify-between text-xs font-black border-t border-slate-200 pt-1 mt-1">
              <span>TOTAL VENTES TTC :</span>
              <span>{formatNumber(session.total_ventes_ttc)} DH</span>
            </div>
          </div>

          {/* Répartition par Mode de Paiement */}
          <div className="py-2.5 border-b border-black border-dashed space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase">
              Règlements Encaissés :
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Espèces :</span>
              <span>{formatNumber(session.total_especes)} DH</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Cartes Bancaires (TPE) :</span>
              <span>{formatNumber(session.total_carte)} DH</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Bons d&apos;Achat :</span>
              <span>{formatNumber(session.total_bon_achat || 0)} DH</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Chèques :</span>
              <span>{formatNumber(session.total_cheque)} DH</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Virements :</span>
              <span>{formatNumber(session.total_virement)} DH</span>
            </div>
          </div>

          {/* Mouvements de Caisse Directs */}
          <div className="py-2.5 border-b border-black border-dashed space-y-1 text-[10px]">
            <div className="text-[10px] font-bold text-slate-600 uppercase">Flux Espèces :</div>
            <div className="flex justify-between">
              <span>Fond Initial :</span>
              <span>{formatNumber(session.fond_caisse_ouverture)} DH</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>+ Ventes Espèces :</span>
              <span>+{formatNumber(session.total_especes)} DH</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>+ Entrées Caisse :</span>
              <span>+{formatNumber(session.total_entrees)} DH</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span>- Sorties Caisse :</span>
              <span>-{formatNumber(session.total_sorties)} DH</span>
            </div>
          </div>

          {/* Rapprochement & Écart de Caisse */}
          <div className="py-2.5 border-b border-black border-dashed space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span>Théorique Attendu :</span>
              <span>{formatNumber(theorique)} DH</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span>Comptage Réel :</span>
              <span>{formatNumber(reel)} DH</span>
            </div>
            <div
              className={`flex justify-between text-xs font-black p-1.5 rounded ${
                ecart === 0
                  ? "bg-slate-100 text-black"
                  : ecart > 0
                  ? "bg-emerald-100 text-emerald-950"
                  : "bg-red-100 text-red-950"
              }`}
            >
              <span>ÉCART DE CAISSE :</span>
              <span>
                {ecart > 0 ? `+${formatNumber(ecart)} DH` : `${formatNumber(ecart)} DH`}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-3 pb-1 space-y-8 text-[9px]">
            <div className="flex justify-between">
              <div>
                <p className="font-bold">Visa Caissier :</p>
                <p className="text-slate-500 mt-0.5">{session.user_name}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Visa Responsable :</p>
                <p className="text-slate-500 mt-0.5">Direction</p>
              </div>
            </div>
            <div className="border-t border-slate-300 pt-1 text-center text-[8px] text-slate-500">
              Clôture certifiée conforme Haloui POS · Document comptable officiel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
