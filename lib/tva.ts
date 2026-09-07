import { getDb } from "@/lib/db";
import {
  type TVADeclarationRecord,
  type TVADeclarationStatut,
  type TVARegime,
} from "@/lib/types";

export type CalculerTVAParams = {
  companyId?: number;
  periodeCode: string; // YYYY-MM or YYYY-T[1-4]
  periodeType?: "mensuelle" | "trimestrielle";
  regime?: TVARegime;
};

export function getDeclarationsTVA(companyId: number = 1): TVADeclarationRecord[] {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT * FROM tva_declarations 
    WHERE company_id = ?
    ORDER BY periode_code DESC
  `
    )
    .all(companyId) as TVADeclarationRecord[];
}

export function getDeclarationTVAById(id: number): TVADeclarationRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM tva_declarations WHERE id = ?")
    .get(id);
  return (row as TVADeclarationRecord) || null;
}

export function getDeclarationTVAByPeriode(
  companyId: number = 1,
  periodeCode: string
): TVADeclarationRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM tva_declarations WHERE company_id = ? AND periode_code = ?"
    )
    .get(companyId, periodeCode);
  return (row as TVADeclarationRecord) || null;
}

export function calculerDeclarationTVA(params: CalculerTVAParams) {
  const db = getDb();
  const companyId = params.companyId ?? 1;
  const periodeCode = params.periodeCode;
  const regime = params.regime ?? "encaissement";

  // Determine date boundaries
  let dateDebut = "";
  let dateFin = "";

  if (periodeCode.includes("-T")) {
    const [year, trim] = periodeCode.split("-T");
    const t = parseInt(trim, 10);
    const mStart = String((t - 1) * 3 + 1).padStart(2, "0");
    const mEnd = String(t * 3).padStart(2, "0");
    dateDebut = `${year}-${mStart}-01`;
    // Last day of mEnd
    const lastDay = new Date(parseInt(year, 10), t * 3, 0).getDate();
    dateFin = `${year}-${mEnd}-${String(lastDay).padStart(2, "0")}`;
  } else {
    // Monthly format YYYY-MM
    dateDebut = `${periodeCode}-01`;
    const [y, m] = periodeCode.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    dateFin = `${periodeCode}-${String(lastDay).padStart(2, "0")}`;
  }

  // 1. TVA Collectée sur Ventes (Factures émises / validées)
  const ventesRows = db
    .prepare(
      `
    SELECT 
      COALESCE(dl.tva_rate, 20) AS tva_rate,
      SUM(dl.total_ht) AS total_ht
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    WHERE d.company_id = ?
      AND d.type = 'facture'
      AND d.status != 'brouillon'
      AND d.date >= ? AND d.date <= ?
    GROUP BY dl.tva_rate
  `
    )
    .all(companyId, dateDebut, dateFin) as Array<{ tva_rate: number; total_ht: number }>;

  let tvaCollectee20 = 0;
  let tvaCollectee14 = 0;
  let tvaCollectee10 = 0;
  let tvaCollectee7 = 0;

  for (const v of ventesRows) {
    const rate = Math.round(Number(v.tva_rate) || 20);
    const ht = Number(v.total_ht) || 0;
    const tva = Math.round(ht * (rate / 100) * 100) / 100;

    if (rate === 20) tvaCollectee20 += tva;
    else if (rate === 14) tvaCollectee14 += tva;
    else if (rate === 10) tvaCollectee10 += tva;
    else if (rate === 7) tvaCollectee7 += tva;
    else tvaCollectee20 += tva; // Default bucket
  }

  // Also include POS receipts in TVA Collectée
  const posRows = db
    .prepare(
      `
    SELECT 
      COALESCE(p.tva_rate, 20) AS tva_rate,
      SUM(ctl.total_ttc) AS total_ttc
    FROM caisse_ticket_lignes ctl
    JOIN caisse_tickets ct ON ct.id = ctl.ticket_id
    LEFT JOIN produits p ON p.id = ctl.produit_id
    WHERE ct.company_id = ?
      AND ct.statut != 'annule'
      AND ct.created_at >= ? AND ct.created_at <= ?
    GROUP BY p.tva_rate
  `
    )
    .all(companyId, `${dateDebut} 00:00:00`, `${dateFin} 23:59:59`) as Array<{
    tva_rate: number;
    total_ttc: number;
  }>;

  for (const pr of posRows) {
    const rate = Math.round(Number(pr.tva_rate) || 20);
    const ttc = Number(pr.total_ttc) || 0;
    const ht = ttc / (1 + rate / 100);
    const tva = Math.round((ttc - ht) * 100) / 100;

    if (rate === 20) tvaCollectee20 += tva;
    else if (rate === 14) tvaCollectee14 += tva;
    else if (rate === 10) tvaCollectee10 += tva;
    else if (rate === 7) tvaCollectee7 += tva;
    else tvaCollectee20 += tva;
  }

  tvaCollectee20 = Math.round(tvaCollectee20 * 100) / 100;
  tvaCollectee14 = Math.round(tvaCollectee14 * 100) / 100;
  tvaCollectee10 = Math.round(tvaCollectee10 * 100) / 100;
  tvaCollectee7 = Math.round(tvaCollectee7 * 100) / 100;
  const tvaCollecteeTotal = Math.round((tvaCollectee20 + tvaCollectee14 + tvaCollectee10 + tvaCollectee7) * 100) / 100;

  // 2. TVA Déductible sur Achats & Dépenses
  // A. Achats fournisseurs / Bons de commande
  const achatsRows = db
    .prepare(
      `
    SELECT 
      COALESCE(dl.tva_rate, 20) AS tva_rate,
      SUM(dl.total_ht) AS total_ht
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    WHERE d.company_id = ?
      AND d.type = 'bc'
      AND d.status != 'brouillon'
      AND d.date >= ? AND d.date <= ?
    GROUP BY dl.tva_rate
  `
    )
    .all(companyId, dateDebut, dateFin) as Array<{ tva_rate: number; total_ht: number }>;

  let tvaDeductible20 = 0;
  let tvaDeductible14 = 0;
  let tvaDeductible10 = 0;
  let tvaDeductible7 = 0;
  let tvaDeductibleCharges = 0;
  let tvaDeductibleImmo = 0;

  for (const a of achatsRows) {
    const rate = Math.round(Number(a.tva_rate) || 20);
    const ht = Number(a.total_ht) || 0;
    const tva = Math.round(ht * (rate / 100) * 100) / 100;

    if (rate === 20) tvaDeductible20 += tva;
    else if (rate === 14) tvaDeductible14 += tva;
    else if (rate === 10) tvaDeductible10 += tva;
    else if (rate === 7) tvaDeductible7 += tva;
    else tvaDeductible20 += tva;

    tvaDeductibleCharges += tva;
  }

  // B. Notes de frais déductibles
  const fraisRows = db
    .prepare(
      `
    SELECT 
      COALESCE(tva_rate, 0) AS tva_rate,
      SUM(montant_tva) AS total_tva
    FROM notes_frais
    WHERE company_id = ?
      AND statut IN ('approuve', 'rembourse')
      AND date_depense >= ? AND date_depense <= ?
    GROUP BY tva_rate
  `
    )
    .all(companyId, dateDebut, dateFin) as Array<{ tva_rate: number; total_tva: number }>;

  for (const f of fraisRows) {
    const rate = Math.round(Number(f.tva_rate) || 0);
    const tva = Math.round(Number(f.total_tva) * 100) / 100;
    if (rate === 20) tvaDeductible20 += tva;
    else if (rate === 14) tvaDeductible14 += tva;
    else if (rate === 10) tvaDeductible10 += tva;
    else if (rate === 7) tvaDeductible7 += tva;

    tvaDeductibleCharges += tva;
  }

  tvaDeductible20 = Math.round(tvaDeductible20 * 100) / 100;
  tvaDeductible14 = Math.round(tvaDeductible14 * 100) / 100;
  tvaDeductible10 = Math.round(tvaDeductible10 * 100) / 100;
  tvaDeductible7 = Math.round(tvaDeductible7 * 100) / 100;
  const tvaDeductibleTotal = Math.round((tvaDeductible20 + tvaDeductible14 + tvaDeductible10 + tvaDeductible7) * 100) / 100;
  tvaDeductibleCharges = tvaDeductibleTotal;

  // 3. Crédit antérieur reportable (de la précédente déclaration)
  const prevDecl = db
    .prepare(
      `
    SELECT credit_tva_a_reporter 
    FROM tva_declarations 
    WHERE company_id = ? AND periode_code < ?
    ORDER BY periode_code DESC
    LIMIT 1
  `
    )
    .get(companyId, periodeCode) as { credit_tva_a_reporter: number } | undefined;

  const creditTvaPrecedent = Number(prevDecl?.credit_tva_a_reporter) || 0;

  // 4. Calcul TVA Nette Due vs Crédit de TVA à Reporter
  const totalDeductibleEtCredit = tvaDeductibleTotal + creditTvaPrecedent;
  let tvaNetteDue = 0;
  let creditTvaAReporter = 0;

  if (tvaCollecteeTotal >= totalDeductibleEtCredit) {
    tvaNetteDue = Math.round((tvaCollecteeTotal - totalDeductibleEtCredit) * 100) / 100;
    creditTvaAReporter = 0;
  } else {
    tvaNetteDue = 0;
    creditTvaAReporter = Math.round((totalDeductibleEtCredit - tvaCollecteeTotal) * 100) / 100;
  }

  return {
    company_id: companyId,
    periode_code: periodeCode,
    periode_type: (periodeCode.includes("-T") ? "trimestrielle" : "mensuelle") as "mensuelle" | "trimestrielle",
    regime,
    dateDebut,
    dateFin,
    tva_collectee_total: tvaCollecteeTotal,
    tva_collectee_20: tvaCollectee20,
    tva_collectee_14: tvaCollectee14,
    tva_collectee_10: tvaCollectee10,
    tva_collectee_7: tvaCollectee7,
    tva_deductible_total: tvaDeductibleTotal,
    tva_deductible_immo: tvaDeductibleImmo,
    tva_deductible_charges: tvaDeductibleCharges,
    tva_deductible_20: tvaDeductible20,
    tva_deductible_14: tvaDeductible14,
    tva_deductible_10: tvaDeductible10,
    tva_deductible_7: tvaDeductible7,
    credit_tva_precedent: creditTvaPrecedent,
    tva_nette_due: tvaNetteDue,
    credit_tva_a_reporter: creditTvaAReporter,
  };
}

export function enregistrerDeclarationTVA(
  params: CalculerTVAParams & {
    statut?: TVADeclarationStatut;
    notes?: string;
    userId?: number | null;
  }
): TVADeclarationRecord {
  const db = getDb();
  const calc = calculerDeclarationTVA(params);
  const statut = params.statut || "validee";
  const today = new Date().toISOString().slice(0, 10);

  const existing = getDeclarationTVAByPeriode(calc.company_id, calc.periode_code);

  if (existing) {
    db.prepare(
      `
      UPDATE tva_declarations
      SET 
        tva_collectee_total = ?, tva_collectee_20 = ?, tva_collectee_14 = ?, tva_collectee_10 = ?, tva_collectee_7 = ?,
        tva_deductible_total = ?, tva_deductible_immo = ?, tva_deductible_charges = ?, tva_deductible_20 = ?, tva_deductible_14 = ?, tva_deductible_10 = ?, tva_deductible_7 = ?,
        credit_tva_precedent = ?, tva_nette_due = ?, credit_tva_a_reporter = ?,
        statut = ?, notes = ?, date_declaration = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(
      calc.tva_collectee_total,
      calc.tva_collectee_20,
      calc.tva_collectee_14,
      calc.tva_collectee_10,
      calc.tva_collectee_7,
      calc.tva_deductible_total,
      calc.tva_deductible_immo,
      calc.tva_deductible_charges,
      calc.tva_deductible_20,
      calc.tva_deductible_14,
      calc.tva_deductible_10,
      calc.tva_deductible_7,
      calc.credit_tva_precedent,
      calc.tva_nette_due,
      calc.credit_tva_a_reporter,
      statut,
      params.notes || "",
      today,
      existing.id
    );

    return getDeclarationTVAById(existing.id)!;
  }

  const res = db
    .prepare(
      `
    INSERT INTO tva_declarations (
      company_id, periode_type, periode_code, regime,
      tva_collectee_total, tva_collectee_20, tva_collectee_14, tva_collectee_10, tva_collectee_7,
      tva_deductible_total, tva_deductible_immo, tva_deductible_charges, tva_deductible_20, tva_deductible_14, tva_deductible_10, tva_deductible_7,
      credit_tva_precedent, tva_nette_due, credit_tva_a_reporter,
      statut, date_declaration, notes, created_by
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
    )
  `
    )
    .run(
      calc.company_id,
      calc.periode_type,
      calc.periode_code,
      calc.regime,
      calc.tva_collectee_total,
      calc.tva_collectee_20,
      calc.tva_collectee_14,
      calc.tva_collectee_10,
      calc.tva_collectee_7,
      calc.tva_deductible_total,
      calc.tva_deductible_immo,
      calc.tva_deductible_charges,
      calc.tva_deductible_20,
      calc.tva_deductible_14,
      calc.tva_deductible_10,
      calc.tva_deductible_7,
      calc.credit_tva_precedent,
      calc.tva_nette_due,
      calc.credit_tva_a_reporter,
      statut,
      today,
      params.notes || "",
      params.userId || null
    );

  return getDeclarationTVAById(Number(res.lastInsertRowid))!;
}

export function changerStatutDeclarationTVA(
  id: number,
  statut: TVADeclarationStatut,
  referenceTelepaiement?: string
): TVADeclarationRecord {
  const db = getDb();
  db.prepare(
    `
    UPDATE tva_declarations
    SET statut = ?,
        reference_telepaiement = COALESCE(?, reference_telepaiement),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(statut, referenceTelepaiement || null, id);

  return getDeclarationTVAById(id)!;
}
