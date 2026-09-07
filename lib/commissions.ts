import { getDb } from "@/lib/db";
import {
  type CommissionBaseCalcul,
  type CommissionFicheLigneRecord,
  type CommissionFicheRecord,
  type CommissionFicheStatut,
  type CommissionRegleRecord,
  type UserRecord,
} from "@/lib/types";

export function getCommissionRegles(companyId: number): CommissionRegleRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      cr.id,
      cr.company_id,
      cr.commercial_id as user_id,
      u.full_name as user_nom,
      cr.famille_produit as categorie_produit,
      CASE WHEN cr.base_calcul = 'marge_brute' THEN 'marge_brute' ELSE 'ca_ht' END as base_calcul,
      cr.taux_pourcentage as taux_pourcent,
      cr.active as actif,
      cr.active,
      cr.date_debut,
      cr.date_fin
    FROM commission_regles cr
    LEFT JOIN users u ON u.id = cr.commercial_id
    WHERE cr.company_id = ?
    ORDER BY cr.id DESC
  `).all(companyId) as any[];

  return rows.map((r) => ({
    id: r.id,
    company_id: r.company_id,
    nom: r.user_nom ? `Règle ${r.user_nom}` : `Règle Générale ${r.base_calcul.toUpperCase()}`,
    user_id: r.user_id,
    user_nom: r.user_nom,
    categorie_produit: r.categorie_produit,
    base_calcul: r.base_calcul as CommissionBaseCalcul,
    taux_pourcent: r.taux_pourcent,
    actif: Boolean(r.active),
    created_at: new Date().toISOString(),
  }));
}

export function creerCommissionRegle(data: {
  companyId: number;
  nom: string;
  userId?: number | null;
  categorieProduit?: string | null;
  baseCalcul: CommissionBaseCalcul;
  tauxPourcent: number;
}): CommissionRegleRecord {
  const db = getDb();
  const baseSql = data.baseCalcul === "marge_brute" ? "marge_brute" : "chiffre_affaires_ht";
  const commId = data.userId || 1;

  const res = db.prepare(`
    INSERT INTO commission_regles (
      company_id, commercial_id, base_calcul, taux_pourcentage,
      famille_produit, active
    ) VALUES (
      ?, ?, ?, ?,
      ?, 1
    )
  `).run(
    data.companyId,
    commId,
    baseSql,
    data.tauxPourcent,
    data.categorieProduit || ""
  );

  const regles = getCommissionRegles(data.companyId);
  return regles.find((r) => r.id === Number(res.lastInsertRowid)) || regles[0];
}

export function updateCommissionRegle(
  id: number,
  patch: Partial<CommissionRegleRecord>
): CommissionRegleRecord {
  const db = getDb();
  const current = db.prepare("SELECT * FROM commission_regles WHERE id = ?").get(id) as any;
  if (!current) throw new Error("Règle de commission introuvable");

  const baseSql = patch.base_calcul
    ? (patch.base_calcul === "marge_brute" ? "marge_brute" : "chiffre_affaires_ht")
    : current.base_calcul;

  db.prepare(`
    UPDATE commission_regles
    SET commercial_id = ?,
        famille_produit = ?,
        base_calcul = ?,
        taux_pourcentage = ?,
        active = ?
    WHERE id = ?
  `).run(
    patch.user_id !== undefined ? (patch.user_id || 1) : current.commercial_id,
    patch.categorie_produit !== undefined ? patch.categorie_produit : current.famille_produit,
    baseSql,
    patch.taux_pourcent ?? current.taux_pourcentage,
    patch.actif !== undefined ? (patch.actif ? 1 : 0) : current.active,
    id
  );

  const regles = getCommissionRegles(current.company_id);
  return regles.find((r) => r.id === id) || regles[0];
}

export function supprimerCommissionRegle(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM commission_regles WHERE id = ?").run(id);
}

export function getCommerciaux(): UserRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, username, full_name, role, active, email, phone,
           is_commercial, code_commercial, taux_commission_defaut, created_at
    FROM users
    WHERE is_commercial = 1 OR role IN ('admin', 'user')
    ORDER BY is_commercial DESC, full_name ASC
  `).all() as UserRecord[];
}

export function assignerCommercialAUser(
  userId: number,
  data: {
    isCommercial: boolean;
    codeCommercial?: string;
    tauxCommissionDefaut?: number;
  }
): void {
  const db = getDb();
  db.prepare(`
    UPDATE users
    SET is_commercial = ?,
        code_commercial = ?,
        taux_commission_defaut = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.isCommercial ? 1 : 0,
    data.codeCommercial?.trim().toUpperCase() || null,
    data.tauxCommissionDefaut || 0,
    userId
  );
}

export function getCommissionFiches(
  companyId: number,
  periodeMois?: string
): CommissionFicheRecord[] {
  const db = getDb();
  let query = `
    SELECT
      cf.id,
      cf.company_id,
      ('COM-' || REPLACE(cf.periode, '-', '') || '-' || cf.commercial_id) as numero_fiche,
      cf.commercial_id,
      u.full_name as commercial_nom,
      cf.periode as periode_mois,
      cf.created_at as date_generation,
      cf.total_ca_ht as total_ca_realise_ht,
      cf.total_marge_brute as total_marge_realisee_ht,
      cf.montant_commission as total_commission_brute,
      0 as ajustements,
      cf.montant_commission as total_commission_nette,
      cf.statut,
      cf.date_paiement,
      '' as mode_paiement,
      cf.notes,
      cf.created_at
    FROM commission_fiches cf
    JOIN users u ON u.id = cf.commercial_id
    WHERE cf.company_id = ?
  `;
  const params: any[] = [companyId];

  if (periodeMois) {
    query += " AND cf.periode = ?";
    params.push(periodeMois);
  }

  query += " ORDER BY cf.created_at DESC";
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((r) => ({
    ...r,
    statut: (r.statut as CommissionFicheStatut) || "brouillon",
  }));
}

export function getCommissionFicheById(id: number): {
  fiche: CommissionFicheRecord;
  lignes: CommissionFicheLigneRecord[];
} {
  const db = getDb();
  const f = db.prepare(`
    SELECT
      cf.id,
      cf.company_id,
      ('COM-' || REPLACE(cf.periode, '-', '') || '-' || cf.commercial_id) as numero_fiche,
      cf.commercial_id,
      u.full_name as commercial_nom,
      cf.periode as periode_mois,
      cf.created_at as date_generation,
      cf.total_ca_ht as total_ca_realise_ht,
      cf.total_marge_brute as total_marge_realisee_ht,
      cf.montant_commission as total_commission_brute,
      0 as ajustements,
      cf.montant_commission as total_commission_nette,
      cf.statut,
      cf.date_paiement,
      '' as mode_paiement,
      cf.notes,
      cf.created_at
    FROM commission_fiches cf
    JOIN users u ON u.id = cf.commercial_id
    WHERE cf.id = ?
  `).get(id) as any;

  if (!f) throw new Error(`Fiche de commission #${id} non trouvée`);

  const lignes = db.prepare(`
    SELECT
      cfl.id,
      cfl.fiche_id,
      cfl.document_type as type_source,
      cfl.document_id as source_id,
      cfl.document_numero as source_numero,
      cfl.date_vente as date_source,
      cfl.client_nom,
      cfl.total_ht as montant_ht,
      cfl.marge_brute as marge_ht,
      cfl.taux_applique as taux_commission,
      cfl.montant_commission
    FROM commission_fiches_lignes cfl
    WHERE cfl.fiche_id = ?
    ORDER BY cfl.date_vente ASC, cfl.id ASC
  `).all(id) as CommissionFicheLigneRecord[];

  return {
    fiche: {
      ...f,
      statut: (f.statut as CommissionFicheStatut) || "brouillon",
    },
    lignes,
  };
}

export function genererFicheCommissionMensuelle(params: {
  companyId: number;
  commercialId: number;
  periodeMois: string; // "YYYY-MM"
  ajustements?: number;
  notes?: string;
}): {
  fiche: CommissionFicheRecord;
  lignesCount: number;
} {
  const db = getDb();

  const commercial = db.prepare(`
    SELECT id, full_name, code_commercial, taux_commission_defaut
    FROM users
    WHERE id = ?
  `).get(params.commercialId) as {
    id: number;
    full_name: string;
    code_commercial?: string;
    taux_commission_defaut?: number;
  } | undefined;

  if (!commercial) throw new Error("Commercial non trouvé");

  const rules = getCommissionRegles(params.companyId);
  const userRule = rules.find((r) => r.user_id === commercial.id) || rules[0] || {
    base_calcul: "ca_ht" as CommissionBaseCalcul,
    taux_pourcent: commercial.taux_commission_defaut || 3.0,
  };

  const startPeriod = `${params.periodeMois}-01`;
  const endPeriod = `${params.periodeMois}-31 23:59:59`;

  const docs = db.prepare(`
    SELECT d.id, d.type, d.numero, d.date, d.total_ht, d.total_ttc, c.name as client_nom
    FROM documents d
    LEFT JOIN clients c ON c.id = d.client_id
    WHERE d.company_id = ?
      AND d.commercial_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.date >= ? AND d.date <= ?
      AND d.status != 'brouillon'
  `).all(params.companyId, commercial.id, startPeriod, endPeriod) as any[];

  const tickets = db.prepare(`
    SELECT ct.id, ct.numero_ticket, ct.created_at, ct.total_ht, ct.total_ttc, ct.client_nom
    FROM caisse_tickets ct
    WHERE ct.company_id = ?
      AND ct.commercial_id = ?
      AND ct.created_at >= ? AND ct.created_at <= ?
      AND ct.statut = 'valide'
  `).all(params.companyId, commercial.id, startPeriod, endPeriod) as any[];

  let totalCaHt = 0;
  let totalMargeHt = 0;
  let totalCommissionBrute = 0;

  type LigneTemp = {
    document_type: "facture" | "ticket";
    document_id: number;
    document_numero: string;
    date_vente: string;
    client_nom?: string;
    total_ht: number;
    marge_brute: number;
    taux_applique: number;
    montant_commission: number;
  };

  const lignesToInsert: LigneTemp[] = [];

  for (const doc of docs) {
    const montantHt = doc.total_ht || 0;
    const estimatedMargin = Math.round(montantHt * 0.3 * 100) / 100;
    const base = userRule.base_calcul === "marge_brute" ? estimatedMargin : montantHt;
    const comm = Math.round((base * (userRule.taux_pourcent / 100)) * 100) / 100;

    totalCaHt += montantHt;
    totalMargeHt += estimatedMargin;
    totalCommissionBrute += comm;

    lignesToInsert.push({
      document_type: "facture",
      document_id: doc.id,
      document_numero: `${doc.type.toUpperCase()}-${doc.numero}`,
      date_vente: doc.date,
      client_nom: doc.client_nom || "Client",
      total_ht: montantHt,
      marge_brute: estimatedMargin,
      taux_applique: userRule.taux_pourcent,
      montant_commission: comm,
    });
  }

  for (const t of tickets) {
    const montantHt = t.total_ht || 0;
    const estimatedMargin = Math.round(montantHt * 0.25 * 100) / 100;
    const base = userRule.base_calcul === "marge_brute" ? estimatedMargin : montantHt;
    const comm = Math.round((base * (userRule.taux_pourcent / 100)) * 100) / 100;

    totalCaHt += montantHt;
    totalMargeHt += estimatedMargin;
    totalCommissionBrute += comm;

    lignesToInsert.push({
      document_type: "ticket",
      document_id: t.id,
      document_numero: t.numero_ticket,
      date_vente: t.created_at.slice(0, 10),
      client_nom: t.client_nom || "Comptoir",
      total_ht: montantHt,
      marge_brute: estimatedMargin,
      taux_applique: userRule.taux_pourcent,
      montant_commission: comm,
    });
  }

  let ficheId = 0;
  db.transaction(() => {
    // Delete existing draft fiche for same commercial & period if any
    const existing = db.prepare(`
      SELECT id FROM commission_fiches
      WHERE company_id = ? AND commercial_id = ? AND periode = ?
    `).get(params.companyId, commercial.id, params.periodeMois) as { id: number } | undefined;

    if (existing) {
      db.prepare("DELETE FROM commission_fiches_lignes WHERE fiche_id = ?").run(existing.id);
      db.prepare("DELETE FROM commission_fiches WHERE id = ?").run(existing.id);
    }

    const res = db.prepare(`
      INSERT INTO commission_fiches (
        company_id, commercial_id, periode, total_ca_ht, total_marge_brute,
        montant_commission, statut, notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, 'brouillon', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      params.companyId,
      commercial.id,
      params.periodeMois,
      Math.round(totalCaHt * 100) / 100,
      Math.round(totalMargeHt * 100) / 100,
      Math.round(totalCommissionBrute * 100) / 100,
      params.notes || `Génération automatique (${userRule.taux_pourcent}% sur ${userRule.base_calcul === "marge_brute" ? "Marge" : "CA HT"})`
    );

    ficheId = Number(res.lastInsertRowid);

    const insertLigne = db.prepare(`
      INSERT INTO commission_fiches_lignes (
        fiche_id, document_type, document_id, document_numero, date_vente,
        client_nom, total_ht, marge_brute, taux_applique, montant_commission
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of lignesToInsert) {
      insertLigne.run(
        ficheId,
        l.document_type,
        l.document_id,
        l.document_numero,
        l.date_vente,
        l.client_nom,
        l.total_ht,
        l.marge_brute,
        l.taux_applique,
        l.montant_commission
      );
    }
  })();

  return {
    fiche: getCommissionFicheById(ficheId).fiche,
    lignesCount: lignesToInsert.length,
  };
}

export function changerStatutFicheCommission(
  ficheId: number,
  statut: CommissionFicheStatut,
  detailsPaiement?: {
    datePaiement?: string;
    modePaiement?: string;
  }
): CommissionFicheRecord {
  const db = getDb();
  db.prepare(`
    UPDATE commission_fiches
    SET statut = ?,
        date_paiement = COALESCE(?, date_paiement),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    statut,
    detailsPaiement?.datePaiement || null,
    ficheId
  );

  return getCommissionFicheById(ficheId).fiche;
}
