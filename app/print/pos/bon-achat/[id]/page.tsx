import { notFound } from "next/navigation";
import { getCompany } from "@/lib/data";
import { getBonAchatById } from "@/lib/pos";
import { generateBarcodeSvg } from "@/lib/barcodes";
import { formatNumber } from "@/lib/utils";
import { PrintToolbar } from "@/components/pos/print-toolbar";

export const dynamic = "force-dynamic";

export default async function PrintBonAchatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bonId = parseInt(id, 10);
  if (isNaN(bonId)) notFound();

  const bon = getBonAchatById(bonId);
  if (!bon) notFound();

  const company = getCompany(bon.company_id || 1);

  // Générer le code-barres 128 scannable du bon d'achat
  let barcodeSvg = "";
  try {
    barcodeSvg = await generateBarcodeSvg("code128", bon.code, {
      width: 200,
      height: 45,
      includeText: true,
    });
  } catch {
    // Continuer sans SVG
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Styles d'impression pour ticket thermique 80mm */}
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

      {/* Barre d'outils */}
      <PrintToolbar title={`Bon d'Achat N° ${bon.code}`} />

      {/* TICKET BON D'ACHAT THERMIQUE 80MM */}
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
          </div>

          {/* Titre Document */}
          <div className="py-2.5 text-center border-b border-black border-dashed">
            <h2 className="text-xs font-black uppercase tracking-wider">
              BON D&apos;ACHAT / AVOIR
            </h2>
            <p className="text-[9px] text-slate-500">Titre de paiement valable en caisse</p>
          </div>

          {/* MONTANT GÉANT DU BON D'ACHAT */}
          <div className="py-4 my-1 text-center bg-slate-50 border border-slate-300 rounded">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">
              Valeur du Bon
            </span>
            <span className="text-2xl font-black text-black block tracking-tight mt-0.5">
              {formatNumber(bon.montant_restant)} DH
            </span>
            {bon.montant_restant < bon.montant_initial && (
              <span className="text-[9px] text-slate-500 block mt-1">
                (Montant initial : {formatNumber(bon.montant_initial)} DH)
              </span>
            )}
          </div>

          {/* Métadonnées du Bon */}
          <div className="py-2 border-b border-slate-300 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">Code Bon :</span>
              <span className="font-bold font-mono text-[11px]">{bon.code}</span>
            </div>
            <div className="flex justify-between">
              <span>Date Émission :</span>
              <span>{new Date(bon.date_emission).toLocaleDateString("fr-FR")}</span>
            </div>
            <div className="flex justify-between font-bold text-red-700">
              <span>Date d&apos;Expiration :</span>
              <span>{new Date(bon.date_expiration).toLocaleDateString("fr-FR")}</span>
            </div>
            {bon.client_nom && (
              <div className="flex justify-between">
                <span>Bénéficiaire :</span>
                <span>{bon.client_nom}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Statut :</span>
              <span className="uppercase font-bold">
                {bon.statut === "actif"
                  ? "✓ Actif (Utilisable)"
                  : bon.statut === "utilise"
                  ? "Consommé"
                  : bon.statut}
              </span>
            </div>
          </div>

          {/* Code-barres Scannable */}
          <div className="py-3 text-center space-y-2 border-b border-black border-dashed">
            {barcodeSvg && (
              <div
                className="flex justify-center"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            )}
            <p className="text-[9px] text-slate-600 font-mono tracking-widest">{bon.code}</p>
          </div>

          {/* Conditions d'Utilisation Pied de Ticket */}
          <div className="pt-2 text-center text-[8px] text-slate-500 space-y-0.5">
            <p>Ce bon est utilisable en une ou plusieurs fois lors de vos achats.</p>
            <p>Non remboursable en numéraire et non transmissible après expiration.</p>
            <p className="font-bold text-slate-700 pt-1">Merci pour votre confiance !</p>
          </div>
        </div>
      </div>
    </div>
  );
}
