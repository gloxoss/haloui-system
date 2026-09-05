import { notFound } from "next/navigation";
import { getActiveCompanyId } from "@/lib/company";
import { getCompany } from "@/lib/data";
import { getTicketById } from "@/lib/pos";
import { generateBarcodeSvg } from "@/lib/barcodes";
import { formatNumber } from "@/lib/utils";
import { PrintToolbar } from "@/components/pos/print-toolbar";

export const dynamic = "force-dynamic";

export default async function PrintTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) notFound();

  const ticket = getTicketById(ticketId);
  if (!ticket) notFound();

  const company = getCompany(ticket.company_id || 1);

  // Générer le code-barres 128 du ticket
  let barcodeSvg = "";
  try {
    barcodeSvg = await generateBarcodeSvg("code128", ticket.numero_ticket, {
      width: 180,
      height: 40,
      includeText: true,
    });
  } catch {
    // Continuer sans SVG
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Styles d'impression calibrés pour imprimante thermique ticket 80mm / 58mm */}
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
          .ticket-container {
            width: 78mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 4mm !important;
          }
        }
      `}</style>

      {/* Barre d'outils (Masquée à l'impression) */}
      <PrintToolbar title={`Ticket Caisse N° ${ticket.numero_ticket}`} />

      {/* TICKET DE CAISSE THERMIQUE 80MM */}
      <div className="p-6 flex justify-center">
        <div className="ticket-container bg-white shadow-xl border border-slate-200 p-4 rounded text-black font-mono text-[11px] leading-tight w-[78mm] flex flex-col justify-between">
          {/* En-tête Société */}
          <div className="text-center pb-3 border-b border-black border-dashed">
            <h1 className="text-sm font-bold tracking-tight uppercase">{company?.name || "HALOUI"}</h1>
            {company?.arabic_name && (
              <p className="text-[10px] font-sans font-bold mt-0.5">{company.arabic_name}</p>
            )}
            <p className="text-[9px] text-slate-600 mt-1">{company?.address}</p>
            {company?.phone && <p className="text-[9px]">Tél : {company.phone}</p>}
            <p className="text-[9px] text-slate-600 mt-0.5">
              {company?.ice ? `ICE: ${company.ice} · ` : ""}
              {company?.rc ? `RC: ${company.rc}` : ""}
            </p>
            {ticket.branch_name && (
              <p className="text-[9px] font-bold mt-1 bg-slate-100 py-0.5 rounded">
                {ticket.branch_name}
              </p>
            )}
          </div>

          {/* Métadonnées du Ticket */}
          <div className="py-2 border-b border-slate-300 text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span className="font-bold">Ticket :</span>
              <span>{ticket.numero_ticket}</span>
            </div>
            <div className="flex justify-between">
              <span>Date :</span>
              <span>{new Date(ticket.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <div className="flex justify-between">
              <span>Caissier :</span>
              <span>{ticket.created_by_name || "Caisse"}</span>
            </div>
            <div className="flex justify-between">
              <span>Client :</span>
              <span>{ticket.client_nom || "Client Comptoir"}</span>
            </div>
          </div>

          {/* Lignes d'Articles */}
          <div className="py-2.5 border-b border-black border-dashed space-y-2">
            {ticket.lignes.map((l, i) => {
              return (
                <div key={i}>
                  <div className="font-bold text-[11px] truncate">{l.designation}</div>
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>
                      {l.quantite} × {formatNumber(l.prix_unitaire_ttc)} DH
                      {(l.remise_pourcent || 0) > 0 ? ` (-${l.remise_pourcent}%)` : ""}
                    </span>
                    <span className="font-bold text-black">{formatNumber(l.total_ttc)} DH</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totaux & Règlements */}
          <div className="py-2.5 border-b border-black border-dashed space-y-1 text-[11px]">
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Total HT :</span>
              <span>{formatNumber(ticket.total_ht)} DH</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>TVA :</span>
              <span>{formatNumber(ticket.total_tva)} DH</span>
            </div>
            {ticket.remise_globale > 0 && (
              <div className="flex justify-between text-[10px] text-red-600">
                <span>Remise :</span>
                <span>-{formatNumber(ticket.remise_globale)} DH</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-1 mt-1">
              <span>TOTAL TTC :</span>
              <span>{formatNumber(ticket.total_ttc)} DH</span>
            </div>

            <div className="pt-2 border-t border-slate-200 mt-1 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Règlement :</span>
                <span className="font-bold uppercase">{ticket.mode_reglement}</span>
              </div>
              <div className="flex justify-between">
                <span>Montant Reçu :</span>
                <span>{formatNumber(ticket.montant_paye)} DH</span>
              </div>
              {ticket.montant_rendu > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>Monnaie Rendue :</span>
                  <span>{formatNumber(ticket.montant_rendu)} DH</span>
                </div>
              )}
            </div>
          </div>

          {/* Code-barres & Message Pied de Ticket */}
          <div className="pt-3 text-center space-y-2">
            {barcodeSvg && (
              <div
                className="flex justify-center"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            )}

            <p className="text-[10px] font-sans font-bold text-slate-800">
              Merci pour votre visite et à très bientôt !
            </p>
            <p className="text-[9px] font-sans text-slate-500">شكراً لزيارتكم ونرحب بكم دائماً</p>
          </div>
        </div>
      </div>
    </div>
  );
}
