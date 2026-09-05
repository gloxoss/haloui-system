"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Printer,
} from "lucide-react";
import { generateBarcodeSvgAction } from "@/app/actions";
import {
  type BarcodeSymbology,
  type LabelConfig,
  type LabelDimensionPreset,
  type LabelItemToPrint,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface PrintJobData {
  preset: LabelDimensionPreset;
  config: LabelConfig;
  companyName: string;
  items: LabelItemToPrint[];
  createdAt: string;
}

export default function PrintEtiquettesPage() {
  const [job, setJob] = useState<PrintJobData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [barcodesSvg, setBarcodesSvg] = useState<Record<number, string>>({});
  const [loadingMsg, setLoadingMsg] = useState("Chargement des données d'impression...");

  // 1. Récupérer le travail d'impression depuis le localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("haloui_etiquettes_print_job");
      if (raw) {
        const parsed: PrintJobData = JSON.parse(raw);
        setJob(parsed);
      } else {
        setLoadingMsg("Aucun ordre d'impression d'étiquettes trouvé.");
      }
    } catch (e) {
      console.error("Erreur lecture job impression", e);
      setLoadingMsg("Erreur lors de la lecture du travail d'impression.");
    }
  }, []);

  // 2. Générer les SVGs des codes-barres pour chaque article
  useEffect(() => {
    if (!job || job.items.length === 0) return;

    let active = true;
    setLoadingMsg("Génération vectorielle des codes-barres...");

    const generateAll = async () => {
      const svgs: Record<number, string> = {};
      const { preset, config, items } = job;

      for (const item of items) {
        const symbology = config.symbology || "code128";
        const rawCode =
          symbology === "ean13"
            ? item.code_barre && item.code_barre.replace(/\D/g, "").length >= 12
              ? item.code_barre.replace(/\D/g, "")
              : `200${String(item.produit_id).padStart(9, "0")}`
            : item.code_barre || item.ref || `PROD-${item.produit_id}`;

        try {
          const res = await generateBarcodeSvgAction(symbology, rawCode, {
            width: preset.largeurMm > 60 ? 220 : 160,
            height: symbology === "qrcode" ? (preset.hauteurMm > 35 ? 75 : 55) : 48,
            includeText: config.afficherCodeBarreChiffre,
          });
          if (res.success) {
            svgs[item.produit_id] = res.svg;
          }
        } catch (err) {
          console.error(`Erreur génération code pour article ${item.produit_id}`, err);
        }
      }

      if (active) {
        setBarcodesSvg(svgs);
        setIsReady(true);
      }
    };

    generateAll();

    return () => {
      active = false;
    };
  }, [job]);

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-medium text-slate-600">{loadingMsg}</p>
      </div>
    );
  }

  const { preset, config, companyName, items } = job;
  const isThermal = preset.typeSupport === "thermique_rouleau";

  // Déplier les articles selon le nombre d'exemplaires demandé
  const expandedLabels: LabelItemToPrint[] = [];
  items.forEach((item) => {
    const qty = Math.max(1, item.exemplaires || 1);
    for (let i = 0; i < qty; i++) {
      expandedLabels.push(item);
    }
  });

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Dynamic CSS Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            ${isThermal
              ? `size: ${preset.largeurMm}mm ${preset.hauteurMm}mm; margin: 0;`
              : `size: A4 portrait; margin: 0;`}
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
          .thermal-page {
            width: ${preset.largeurMm}mm !important;
            height: ${preset.hauteurMm}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .a4-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Barre d'outils / En-tête (Masquée à l'impression) */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Fermer
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Aperçu avant Impression · {preset.nom}
            </h1>
            <p className="text-xs text-slate-500">
              {expandedLabels.length} étiquette(s) au total · Dimensions : {preset.largeurMm}mm ×{" "}
              {preset.hauteurMm}mm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg">
            <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Astuce : Dans la boîte de dialogue d&apos;impression, réglez les <strong>Marges : Aucune</strong> pour un
              calibrage thermique optimal.
            </span>
          </div>

          <button
            disabled={!isReady}
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-600/30"
          >
            {isReady ? (
              <>
                <Printer className="w-4 h-4" /> Imprimer ({expandedLabels.length})
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Préparation...
              </>
            )}
          </button>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DES ÉTIQUETTES */}
      <div className="p-4 sm:p-8 flex flex-col items-center">
        {isThermal ? (
          /* Rendu Rouleau Thermique Continu (Zebra, Brother, Dymo) */
          <div className="flex flex-col items-center gap-6">
            {expandedLabels.map((item, idx) => (
              <div
                key={`${item.produit_id}-${idx}`}
                className="thermal-page bg-white shadow-md rounded border border-slate-300 relative flex flex-col justify-between overflow-hidden text-black font-sans box-border"
                style={{
                  width: `${preset.largeurMm}mm`,
                  height: `${preset.hauteurMm}mm`,
                  padding: `${Math.max(2, preset.hauteurMm * 0.05)}mm ${Math.max(3, preset.largeurMm * 0.04)}mm`,
                }}
              >
                {/* En-tête : Société & Référence */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-0.5 mb-0.5 leading-none">
                  {config.afficherNomEntreprise && (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-800 truncate max-w-[60%]">
                      {companyName}
                    </span>
                  )}
                  {config.afficherReference && (
                    <span className="text-[8px] font-mono font-bold bg-slate-100 px-1 rounded text-slate-900 ml-auto">
                      {item.ref}
                    </span>
                  )}
                </div>

                {/* Désignation Produit */}
                {config.afficherNomProduit && (
                  <div
                    className="font-bold text-slate-900 leading-tight line-clamp-2 my-0.5"
                    style={{
                      fontSize: preset.hauteurMm <= 30 ? "9px" : "11px",
                    }}
                  >
                    {item.designation}
                  </div>
                )}

                {/* Code-barre SVG / QR Code Vectoriel */}
                <div className="flex-1 flex items-center justify-center my-0.5 max-h-[50%] overflow-hidden">
                  {barcodesSvg[item.produit_id] ? (
                    <div
                      className="w-full flex justify-center items-center"
                      dangerouslySetInnerHTML={{ __html: barcodesSvg[item.produit_id] }}
                    />
                  ) : (
                    <span className="text-[9px] text-slate-400 font-mono">{item.code_barre || item.ref}</span>
                  )}
                </div>

                {/* Pied d'étiquette : Prix & Emplacement */}
                <div className="flex justify-between items-end border-t border-slate-200 border-dashed pt-0.5 mt-0.5 leading-none">
                  <div>
                    {config.afficherEmplacement && item.emplacement_code && (
                      <span className="text-[7px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 px-1 rounded inline-block">
                        {item.emplacement_code}
                      </span>
                    )}
                    {config.afficherPrixHT && (
                      <div className="text-[7px] text-slate-500 mt-0.5">
                        HT: {formatNumber(item.prix_ht)} DH
                      </div>
                    )}
                  </div>

                  {config.afficherPrixTTC && (
                    <div className="text-right">
                      <div
                        className="font-black text-slate-950 leading-none"
                        style={{
                          fontSize:
                            config.taillePrix === "tres_grand"
                              ? "16px"
                              : config.taillePrix === "grand"
                              ? "13px"
                              : "10px",
                        }}
                      >
                        {formatNumber(item.prix_ttc)}{" "}
                        <span className="text-[8px] font-bold text-slate-600">DH</span>
                      </div>
                      <span className="text-[6px] font-semibold text-slate-500 uppercase">TTC</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Rendu Planches A4 (Avery 24, 14, 40, 65) */
          <div className="a4-sheet bg-white shadow-xl border border-slate-300 p-[10mm] box-border mb-8">
            <div
              className="grid gap-[2mm]"
              style={{
                gridTemplateColumns: `repeat(${preset.colonnes || 3}, ${preset.largeurMm}mm)`,
                gridAutoRows: `${preset.hauteurMm}mm`,
              }}
            >
              {expandedLabels.map((item, idx) => (
                <div
                  key={`${item.produit_id}-${idx}`}
                  className="bg-white border border-dashed border-slate-300 rounded-sm flex flex-col justify-between p-1 box-border overflow-hidden text-black font-sans"
                  style={{
                    width: `${preset.largeurMm}mm`,
                    height: `${preset.hauteurMm}mm`,
                  }}
                >
                  <div className="flex justify-between items-center text-[7px] font-bold pb-0.5 border-b border-slate-100">
                    <span className="truncate max-w-[65%]">{companyName}</span>
                    <span className="font-mono bg-slate-100 px-0.5 rounded">{item.ref}</span>
                  </div>

                  <div className="text-[8px] font-bold leading-tight line-clamp-1 my-0.5">
                    {item.designation}
                  </div>

                  <div className="flex-1 flex items-center justify-center overflow-hidden my-0.5">
                    {barcodesSvg[item.produit_id] ? (
                      <div
                        className="w-full flex justify-center items-center"
                        dangerouslySetInnerHTML={{ __html: barcodesSvg[item.produit_id] }}
                      />
                    ) : (
                      <span className="text-[8px] font-mono">{item.code_barre || item.ref}</span>
                    )}
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-0.5">
                    <span className="text-[6px] text-slate-500">
                      {item.emplacement_code ? `LOC: ${item.emplacement_code}` : ""}
                    </span>
                    <span className="text-[10px] font-black text-slate-900">
                      {formatNumber(item.prix_ttc)} DH
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
