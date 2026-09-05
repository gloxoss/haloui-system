import { getDb } from "@/lib/db";
import {
  type ProduitLotRecord,
  type ProduitSerieRecord,
  type LotsSeriesKPIs,
  type LotStatut,
  type SerieStatut,
} from "@/lib/types";

/**
 * List inventory product lots with computed days remaining and dynamic expiration status
 */
export function listLots(filters?: {
  companyId?: number;
  branchId?: number;
  statut?: string;
  search?: string;
  alerteOnly?: boolean;
}): ProduitLotRecord[] {
  const db = getDb();
  const companyId = filters?.companyId ?? 1;
  const today = new Date().toISOString().slice(0, 10);

  let query = `
    SELECT
      pl.*,
      b.name as branch_name,
      p.designation as produit_designation,
      p.ref as produit_ref,
      p.code_barre as code_barre,
      p.unite as unite,
      p.seuil_alerte_dlc_jours as seuil_alerte_dlc_jours,
      f.name as fournisseur_nom
    FROM produit_lots pl
    JOIN branches b ON pl.branch_id = b.id
    JOIN produits p ON pl.produit_id = p.id
    LEFT JOIN fournisseurs f ON pl.fournisseur_id = f.id
    WHERE pl.company_id = ?
  `;
  const params: any[] = [companyId];

  if (filters?.branchId) {
    query += " AND pl.branch_id = ?";
    params.push(filters.branchId);
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query += " AND (pl.numero_lot LIKE ? OR p.designation LIKE ? OR p.ref LIKE ? OR p.code_barre LIKE ?)";
    params.push(term, term, term, term);
  }

  query += " ORDER BY pl.date_peremption ASC, pl.id DESC";

  const raw = db.prepare(query).all(...params) as Array<
    ProduitLotRecord & { seuil_alerte_dlc_jours: number }
  >;

  const nowMs = Date.now();

  const results: ProduitLotRecord[] = [];

  for (const item of raw) {
    const peremptionMs = new Date(item.date_peremption).getTime();
    const joursRestants = Math.ceil((peremptionMs - nowMs) / (1000 * 60 * 60 * 24));
    item.jours_restants = joursRestants;

    // Dynamically update status based on date if not quarantined or exhausted
    if (item.statut !== "quarantaine" && item.statut !== "epuise") {
      if (item.quantite_restante <= 0) {
        item.statut = "epuise";
      } else if (joursRestants <= 0) {
        item.statut = "perime";
      } else if (joursRestants <= (item.seuil_alerte_dlc_jours || 30)) {
        item.statut = "alerte_peremption";
      } else {
        item.statut = "actif";
      }
    }

    item.valeur_stock_ht = Number(item.quantite_restante) * Number(item.cout_unitaire_ht);

    // Filter by statut
    if (filters?.statut && filters.statut !== "tous" && item.statut !== filters.statut) {
      continue;
    }

    // Filter alerteOnly
    if (filters?.alerteOnly && item.statut !== "perime" && item.statut !== "alerte_peremption") {
      continue;
    }

    results.push(item);
  }

  return results;
}

/**
 * List tracked individual serial numbers
 */
export function listSeries(filters?: {
  companyId?: number;
  branchId?: number;
  statut?: string;
  search?: string;
}): ProduitSerieRecord[] {
  const db = getDb();
  const companyId = filters?.companyId ?? 1;
  const nowMs = Date.now();

  let query = `
    SELECT
      ps.*,
      b.name as branch_name,
      p.designation as produit_designation,
      p.ref as produit_ref,
      p.code_barre as code_barre,
      d.numero as document_vente_numero
    FROM produit_series ps
    JOIN branches b ON ps.branch_id = b.id
    JOIN produits p ON ps.produit_id = p.id
    LEFT JOIN documents d ON ps.document_vente_id = d.id
    WHERE ps.company_id = ?
  `;
  const params: any[] = [companyId];

  if (filters?.branchId) {
    query += " AND ps.branch_id = ?";
    params.push(filters.branchId);
  }

  if (filters?.statut && filters.statut !== "tous") {
    query += " AND ps.statut = ?";
    params.push(filters.statut);
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query += " AND (ps.numero_serie LIKE ? OR p.designation LIKE ? OR p.ref LIKE ? OR p.code_barre LIKE ?)";
    params.push(term, term, term, term);
  }

  query += " ORDER BY ps.id DESC";

  const raw = db.prepare(query).all(...params) as ProduitSerieRecord[];

  for (const s of raw) {
    if (s.garantie_fin_date) {
      const gMs = new Date(s.garantie_fin_date).getTime();
      s.jours_garantie_restants = Math.max(0, Math.ceil((gMs - nowMs) / (1000 * 60 * 60 * 24)));
    } else {
      s.jours_garantie_restants = 0;
    }
  }

  return raw;
}

/**
 * Create a new product batch/lot
 */
export function creerLot(data: {
  companyId?: number;
  branchId: number;
  produitId: number;
  numeroLot: string;
  dateFabrication?: string;
  datePeremption: string;
  quantiteInitiale: number;
  coutUnitaireHt?: number;
  fournisseurId?: number;
  notes?: string;
}): ProduitLotRecord {
  const db = getDb();
  const companyId = data.companyId ?? 1;

  const lotNumber = data.numeroLot.trim();
  if (!lotNumber) throw new Error("Le numéro de lot est requis.");
  if (!data.datePeremption) throw new Error("La date de péremption (DLC/DLUO) est requise.");

  const nowMs = Date.now();
  const peremptionMs = new Date(data.datePeremption).getTime();
  const joursRestants = Math.ceil((peremptionMs - nowMs) / (1000 * 60 * 60 * 24));
  let statut: LotStatut = "actif";
  if (joursRestants <= 0) statut = "perime";
  else if (joursRestants <= 30) statut = "alerte_peremption";

  const tx = db.transaction(() => {
    const insertLot = db.prepare(`
      INSERT INTO produit_lots (
        company_id, branch_id, produit_id, numero_lot, date_fabrication, date_peremption,
        quantite_initiale, quantite_restante, statut, cout_unitaire_ht, fournisseur_id, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    const res = insertLot.run(
      companyId,
      data.branchId,
      data.produitId,
      lotNumber,
      data.dateFabrication || "",
      data.datePeremption,
      data.quantiteInitiale,
      data.quantiteInitiale,
      statut,
      data.coutUnitaireHt || 0,
      data.fournisseurId || null,
      data.notes || ""
    );

    const lotId = Number(res.lastInsertRowid);

    // Increment physical stock in stock_depots
    db.prepare(`
      INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
      VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(company_id, branch_id, produit_id)
      DO UPDATE SET
        quantite = quantite + ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(companyId, data.branchId, data.produitId, data.quantiteInitiale, data.quantiteInitiale);

    // Audit movement
    const prod = db.prepare("SELECT designation FROM produits WHERE id = ?").get(data.produitId) as any;
    db.prepare(`
      INSERT INTO mouvements_stock (
        company_id, branch_id, produit_id, type_mouvement, quantite,
        stock_avant, stock_apres, reference_document, motif, created_at
      ) VALUES (
        ?, ?, ?, 'initialisation', ?,
        0, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `).run(
      companyId,
      data.branchId,
      data.produitId,
      data.quantiteInitiale,
      data.quantiteInitiale,
      lotNumber,
      `Entrée lot ${lotNumber} (${prod?.designation || ""})`
    );

    return lotId;
  });

  const id = tx();
  const all = listLots({ companyId, search: lotNumber });
  const created = all.find((l) => l.id === id);
  if (!created) throw new Error("Erreur lors de la création du lot.");
  return created;
}

/**
 * Create a new individual serial number unit
 */
export function creerSerie(data: {
  companyId?: number;
  branchId: number;
  produitId: number;
  numeroSerie: string;
  documentAchatRef?: string;
  garantieFinDate?: string;
  notes?: string;
}): ProduitSerieRecord {
  const db = getDb();
  const companyId = data.companyId ?? 1;
  const sn = data.numeroSerie.trim();

  if (!sn) throw new Error("Le numéro de série est requis.");

  const tx = db.transaction(() => {
    const res = db
      .prepare(
        `
          INSERT INTO produit_series (
            company_id, branch_id, produit_id, numero_serie, statut,
            document_achat_ref, garantie_fin_date, notes
          ) VALUES (
            ?, ?, ?, ?, 'en_stock',
            ?, ?, ?
          )
        `
      )
      .run(
        companyId,
        data.branchId,
        data.produitId,
        sn,
        data.documentAchatRef || "",
        data.garantieFinDate || "",
        data.notes || ""
      );

    // Increment physical stock by 1 in stock_depots
    db.prepare(`
      INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
      VALUES (?, ?, ?, 1, 0)
      ON CONFLICT(company_id, branch_id, produit_id)
      DO UPDATE SET
        quantite = quantite + 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(companyId, data.branchId, data.produitId);

    return Number(res.lastInsertRowid);
  });

  const id = tx();
  const all = listSeries({ companyId, search: sn });
  const created = all.find((s) => s.id === id);
  if (!created) throw new Error("Erreur lors de l'enregistrement du numéro de série.");
  return created;
}

/**
 * Put an expired or defective batch into quarantine (blocks it from retail stock & registers deduction)
 */
export function bloquerLotQuarantaine(
  lotId: number,
  motif: string = "Retrait pour péremption / avarie",
  userId: number = 1
): boolean {
  const db = getDb();

  const lot = db.prepare("SELECT * FROM produit_lots WHERE id = ?").get(lotId) as
    | ProduitLotRecord
    | undefined;

  if (!lot) throw new Error("Lot introuvable.");
  if (lot.statut === "quarantaine") {
    throw new Error("Ce lot est déjà placé en quarantaine.");
  }

  const qteBloquee = Number(lot.quantite_restante);
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    // 1. Mark lot as quarantaine
    db.prepare(`
      UPDATE produit_lots
      SET statut = 'quarantaine',
          notes = notes || ' | ' || ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(`Quarantaine le ${now.slice(0, 10)} : ${motif}`, lotId);

    // 2. Decrement available stock in stock_depots
    const destStock = db
      .prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?")
      .get(lot.branch_id, lot.produit_id) as { quantite: number } | undefined;

    const stockAvant = destStock ? Number(destStock.quantite) : 0;
    const stockApres = Math.max(0, stockAvant - qteBloquee);

    db.prepare(`
      UPDATE stock_depots
      SET quantite = MAX(0, quantite - ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE branch_id = ? AND produit_id = ?
    `).run(qteBloquee, lot.branch_id, lot.produit_id);

    // 3. Log audit movement
    const mvt = db.prepare(`
      INSERT INTO mouvements_stock (
        company_id, branch_id, produit_id, type_mouvement,
        quantite, stock_avant, stock_apres, reference_document,
        motif, user_id, created_at
      ) VALUES (
        ?, ?, ?, 'ajustement',
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `).run(
      lot.company_id,
      lot.branch_id,
      lot.produit_id,
      -qteBloquee,
      stockAvant,
      stockApres,
      lot.numero_lot,
      `Mise en quarantaine lot ${lot.numero_lot} : ${motif}`,
      userId,
      now
    );

    // 4. Trace in mouvements_lots_series
    db.prepare(`
      INSERT INTO mouvements_lots_series (
        company_id, mouvement_stock_id, lot_id, type_operation,
        quantite, reference_doc, notes
      ) VALUES (
        ?, ?, ?, 'quarantaine',
        ?, ?, ?
      )
    `).run(
      lot.company_id,
      Number(mvt.lastInsertRowid),
      lot.id,
      qteBloquee,
      lot.numero_lot,
      motif
    );
  });

  tx();
  return true;
}

/**
 * Change status of an individual serial number (e.g. SAV, Défectueux, En stock)
 */
export function changerStatutSerie(
  serieId: number,
  statut: SerieStatut,
  motif?: string,
  userId: number = 1
): boolean {
  const db = getDb();

  const serie = db.prepare("SELECT * FROM produit_series WHERE id = ?").get(serieId) as
    | ProduitSerieRecord
    | undefined;

  if (!serie) throw new Error("Numéro de série introuvable.");

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE produit_series
      SET statut = ?,
          notes = notes || ' | ' || ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(statut, `${statut.toUpperCase()} le ${now.slice(0, 10)} : ${motif || ""}`, serieId);

    // If marked defective or in SAV, adjust stock if it was en_stock
    if ((statut === "defectueux" || statut === "sav") && serie.statut === "en_stock") {
      db.prepare(`
        UPDATE stock_depots
        SET quantite = MAX(0, quantite - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE branch_id = ? AND produit_id = ?
      `).run(serie.branch_id, serie.produit_id);
    } else if (statut === "en_stock" && (serie.statut === "defectueux" || serie.statut === "sav")) {
      db.prepare(`
        UPDATE stock_depots
        SET quantite = quantite + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE branch_id = ? AND produit_id = ?
      `).run(serie.branch_id, serie.produit_id);
    }
  });

  tx();
  return true;
}

/**
 * Calculate executive KPIs for lots, expiration tracking & serial numbers
 */
export function getLotsSeriesKPIs(companyId: number = 1): LotsSeriesKPIs {
  const allLots = listLots({ companyId });
  const allSeries = listSeries({ companyId });

  let totalLotsActifs = 0;
  let lotsPerimes = 0;
  let lotsAlerteUrgent = 0;
  let lotsAlerteAttention = 0;
  let valeurStockPerimeMAD = 0;

  for (const lot of allLots) {
    if (lot.statut !== "quarantaine" && lot.statut !== "epuise") {
      totalLotsActifs++;
    }

    const j = lot.jours_restants ?? 999;
    if (j <= 0) {
      lotsPerimes++;
      valeurStockPerimeMAD += Number(lot.valeur_stock_ht || 0);
    } else if (j <= 15) {
      lotsAlerteUrgent++;
    } else if (j <= 60) {
      lotsAlerteAttention++;
    }
  }

  let totalSeriesActives = 0;
  let seriesSousGarantie = 0;
  let seriesEnSav = 0;

  for (const s of allSeries) {
    if (s.statut === "en_stock") totalSeriesActives++;
    if (s.statut === "sav") seriesEnSav++;
    if ((s.jours_garantie_restants ?? 0) > 0) seriesSousGarantie++;
  }

  return {
    totalLotsActifs,
    lotsPerimes,
    lotsAlerteUrgent,
    lotsAlerteAttention,
    valeurStockPerimeMAD: Math.round(valeurStockPerimeMAD * 100) / 100,
    totalSeriesActives,
    seriesSousGarantie,
    seriesEnSav,
  };
}
