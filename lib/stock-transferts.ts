import { getDb } from "@/lib/db";
import {
  type StockTransfertRecord,
  type StockTransfertLine,
  type StockDepotRecord,
  type StockMouvementRecord,
  type StockTransfertKPIs,
} from "@/lib/types";

/**
 * List all inter-depot stock transfers for a company
 */
export function listStockTransferts(
  companyId: number,
  filters?: {
    status?: string;
    sourceBranchId?: number;
    destinationBranchId?: number;
    search?: string;
  }
): StockTransfertRecord[] {
  const db = getDb();

  let query = `
    SELECT t.*,
           sb.name AS source_branch_name,
           db2.name AS destination_branch_name
    FROM transferts_stock t
    LEFT JOIN branches sb ON sb.id = t.source_branch_id
    LEFT JOIN branches db2 ON db2.id = t.destination_branch_id
    WHERE t.company_id = ?
  `;
  const params: any[] = [companyId];

  if (filters?.status && filters.status !== "all") {
    query += ` AND t.statut = ?`;
    params.push(filters.status);
  }

  if (filters?.sourceBranchId) {
    query += ` AND t.source_branch_id = ?`;
    params.push(filters.sourceBranchId);
  }

  if (filters?.destinationBranchId) {
    query += ` AND t.destination_branch_id = ?`;
    params.push(filters.destinationBranchId);
  }

  if (filters?.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    query += ` AND (t.numero LIKE ? OR t.chauffeur_nom LIKE ? OR t.vehicule_matricule LIKE ? OR t.notes LIKE ?)`;
    params.push(q, q, q, q);
  }

  query += ` ORDER BY t.date_transfert DESC, t.id DESC`;

  const rows = db.prepare(query).all(...params) as StockTransfertRecord[];

  // Fetch lines for each transfer
  const linesStmt = db.prepare(`
    SELECT * FROM transfert_stock_lignes
    WHERE transfert_id = ?
    ORDER BY id ASC
  `);

  return rows.map((r) => ({
    ...r,
    lignes: linesStmt.all(r.id) as StockTransfertLine[],
  }));
}

/**
 * Get a single transfer by ID with lines and depot names
 */
export function getStockTransfertById(id: number): StockTransfertRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT t.*,
               sb.name AS source_branch_name,
               db2.name AS destination_branch_name
        FROM transferts_stock t
        LEFT JOIN branches sb ON sb.id = t.source_branch_id
        LEFT JOIN branches db2 ON db2.id = t.destination_branch_id
        WHERE t.id = ?
      `
    )
    .get(id) as StockTransfertRecord | undefined;

  if (!row) return null;

  const lignes = db
    .prepare(
      `
        SELECT l.*, p.ref as produit_ref
        FROM transfert_stock_lignes l
        LEFT JOIN produits p ON p.id = l.produit_id
        WHERE l.transfert_id = ?
        ORDER BY l.id ASC
      `
    )
    .all(id) as (StockTransfertLine & { produit_ref?: string })[];

  return {
    ...row,
    lignes,
  };
}

/**
 * Generate next sequential Bon de Transfert number: BT-YYYY-0001
 */
export function getNextStockTransfertNumber(companyId: number): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `BT-${year}-`;

  const lastRow = db
    .prepare(
      `
        SELECT numero FROM transferts_stock
        WHERE company_id = ? AND numero LIKE ?
        ORDER BY id DESC LIMIT 1
      `
    )
    .get(companyId, `${prefix}%`) as { numero: string } | undefined;

  if (!lastRow) {
    return `${prefix}0001`;
  }

  const parts = lastRow.numero.split("-");
  const lastNum = parseInt(parts[parts.length - 1], 10);
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

/**
 * Save or create a draft Bon de Transfert
 */
export function saveStockTransfertDraft(
  data: {
    id?: number;
    companyId: number;
    sourceBranchId: number;
    destinationBranchId: number;
    chauffeurNom?: string;
    vehiculeMatricule?: string;
    bonTransportRef?: string;
    notes?: string;
    dateTransfert?: string;
    lignes: Array<{
      produitId: number;
      designation: string;
      unite?: string;
      quantiteExpediee: number;
    }>;
  },
  userId: number
): number {
  const db = getDb();
  const today = data.dateTransfert || new Date().toISOString().slice(0, 10);

  const totalArticles = data.lignes.length;
  const totalQuantiteExpediee = data.lignes.reduce((sum, l) => sum + Number(l.quantiteExpediee || 0), 0);

  const tx = db.transaction(() => {
    let transfertId = data.id;

    if (transfertId) {
      // Update existing draft
      db.prepare(
        `
          UPDATE transferts_stock
          SET source_branch_id = @sourceBranchId,
              destination_branch_id = @destinationBranchId,
              chauffeur_nom = @chauffeurNom,
              vehicule_matricule = @vehiculeMatricule,
              bon_transport_ref = @bonTransportRef,
              notes = @notes,
              date_transfert = @dateTransfert,
              total_articles = @totalArticles,
              total_quantite_expediee = @totalQuantiteExpediee,
              updated_by = @userId,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = @id AND statut = 'brouillon'
        `
      ).run({
        id: transfertId,
        sourceBranchId: data.sourceBranchId,
        destinationBranchId: data.destinationBranchId,
        chauffeurNom: data.chauffeurNom || "",
        vehiculeMatricule: data.vehiculeMatricule || "",
        bonTransportRef: data.bonTransportRef || "",
        notes: data.notes || "",
        dateTransfert: today,
        totalArticles,
        totalQuantiteExpediee,
        userId,
      });

      // Clear existing lines
      db.prepare("DELETE FROM transfert_stock_lignes WHERE transfert_id = ?").run(transfertId);
    } else {
      // Create new draft
      const numero = getNextStockTransfertNumber(data.companyId);
      const res = db
        .prepare(
          `
            INSERT INTO transferts_stock (
              company_id, numero, date_transfert, source_branch_id, destination_branch_id,
              chauffeur_nom, vehicule_matricule, bon_transport_ref, notes,
              statut, total_articles, total_quantite_expediee, total_quantite_recue, total_ecart,
              created_by, updated_by
            ) VALUES (
              @companyId, @numero, @dateTransfert, @sourceBranchId, @destinationBranchId,
              @chauffeurNom, @vehiculeMatricule, @bonTransportRef, @notes,
              'brouillon', @totalArticles, @totalQuantiteExpediee, 0, 0,
              @userId, @userId
            )
          `
        )
        .run({
          companyId: data.companyId,
          numero,
          dateTransfert: today,
          sourceBranchId: data.sourceBranchId,
          destinationBranchId: data.destinationBranchId,
          chauffeurNom: data.chauffeurNom || "",
          vehiculeMatricule: data.vehiculeMatricule || "",
          bonTransportRef: data.bonTransportRef || "",
          notes: data.notes || "",
          totalArticles,
          totalQuantiteExpediee,
          userId,
        });

      transfertId = Number(res.lastInsertRowid);
    }

    // Insert lines
    const insertLine = db.prepare(`
      INSERT INTO transfert_stock_lignes (
        transfert_id, produit_id, designation, unite, quantite_expediee, quantite_recue, ecart
      ) VALUES (?, ?, ?, ?, ?, 0, 0)
    `);

    for (const ligne of data.lignes) {
      insertLine.run(
        transfertId,
        ligne.produitId,
        ligne.designation,
        ligne.unite || "u",
        Number(ligne.quantiteExpediee)
      );
    }

    return transfertId;
  });

  return tx();
}

/**
 * Step 1: Validate Dispatch (Expédition)
 * - Decrements available stock from source branch
 * - Increments in-transit stock for destination branch
 * - Logs audit movement 'transfert_sortie'
 * - Sets status = 'en_transit'
 */
export function expedierStockTransfert(
  id: number,
  transportData?: {
    chauffeurNom?: string;
    vehiculeMatricule?: string;
    bonTransportRef?: string;
    notes?: string;
  },
  userId: number = 1,
  userFullName: string = "Expéditeur"
): boolean {
  const db = getDb();

  const transfert = getStockTransfertById(id);
  if (!transfert) {
    throw new Error("Bon de transfert introuvable.");
  }
  if (transfert.statut !== "brouillon") {
    throw new Error("Ce transfert a déjà été expédié ou clôturé.");
  }
  if (!transfert.lignes || transfert.lignes.length === 0) {
    throw new Error("Le transfert ne contient aucun article à expédier.");
  }

  const tx = db.transaction(() => {
    const now = new Date().toISOString();

    // 1. Process each line
    for (const ligne of transfert.lignes!) {
      const qte = Number(ligne.quantite_expediee);
      if (qte <= 0) continue;

      // Source Depot Stock
      const sourceStock = db
        .prepare(
          "SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?"
        )
        .get(transfert.source_branch_id, ligne.produit_id) as { quantite: number } | undefined;

      const stockAvant = sourceStock ? Number(sourceStock.quantite) : 0;
      const stockApres = stockAvant - qte;

      // Update or insert source stock
      db.prepare(
        `
          INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
          VALUES (?, ?, ?, ?, 0)
          ON CONFLICT(company_id, branch_id, produit_id)
          DO UPDATE SET quantite = quantite - ?, updated_at = CURRENT_TIMESTAMP
        `
      ).run(transfert.company_id, transfert.source_branch_id, ligne.produit_id, Math.max(0, stockApres), qte);

      // Increment in-transit for destination depot
      db.prepare(
        `
          INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
          VALUES (?, ?, ?, 0, ?)
          ON CONFLICT(company_id, branch_id, produit_id)
          DO UPDATE SET quantite_en_transit = quantite_en_transit + ?, updated_at = CURRENT_TIMESTAMP
        `
      ).run(transfert.company_id, transfert.destination_branch_id, ligne.produit_id, qte, qte);

      // Audit movement log
      db.prepare(
        `
          INSERT INTO mouvements_stock (
            company_id, branch_id, produit_id, type_mouvement,
            quantite, stock_avant, stock_apres, reference_document,
            transfert_id, motif, user_id, created_at
          ) VALUES (
            ?, ?, ?, 'transfert_sortie',
            ?, ?, ?, ?,
            ?, ?, ?, ?
          )
        `
      ).run(
        transfert.company_id,
        transfert.source_branch_id,
        ligne.produit_id,
        -qte,
        stockAvant,
        stockApres,
        transfert.numero,
        transfert.id,
        `Départ transfert vers ${transfert.destination_branch_name || "Dépôt d'arrivée"}`,
        userId,
        now
      );
    }

    // 2. Update transfer status
    db.prepare(
      `
        UPDATE transferts_stock
        SET statut = 'en_transit',
            date_expedition = @now,
            expedie_par_id = @userId,
            expedie_par_nom = @userFullName,
            chauffeur_nom = COALESCE(NULLIF(@chauffeurNom, ''), chauffeur_nom),
            vehicule_matricule = COALESCE(NULLIF(@vehiculeMatricule, ''), vehicule_matricule),
            bon_transport_ref = COALESCE(NULLIF(@bonTransportRef, ''), bon_transport_ref),
            notes = COALESCE(NULLIF(@notes, ''), notes),
            updated_by = @userId,
            updated_at = @now
        WHERE id = @id
      `
    ).run({
      id,
      now,
      userId,
      userFullName,
      chauffeurNom: transportData?.chauffeurNom || "",
      vehiculeMatricule: transportData?.vehiculeMatricule || "",
      bonTransportRef: transportData?.bonTransportRef || "",
      notes: transportData?.notes || "",
    });

    return true;
  });

  return tx();
}

/**
 * Step 2: Confirm Physical Reception at Destination Warehouse
 * - Verifies actually received quantities against dispatched quantities
 * - Decrements in-transit stock from destination depot
 * - Increments available stock in destination depot with actual received quantities
 * - If variance/loss detected, logs 'perte_transport' movement for accountability
 * - Sets status = 'recu'
 */
export function receptionnerStockTransfert(
  id: number,
  receptionLines: Array<{
    lineId: number;
    quantiteRecue: number;
    motifEcart?: string;
  }>,
  userId: number = 1,
  userFullName: string = "Réceptionnaire",
  motifGlobal?: string
): boolean {
  const db = getDb();

  const transfert = getStockTransfertById(id);
  if (!transfert) {
    throw new Error("Bon de transfert introuvable.");
  }
  if (transfert.statut !== "en_transit") {
    throw new Error("Ce transfert n'est pas actuellement en transit.");
  }

  const tx = db.transaction(() => {
    const now = new Date().toISOString();
    let totalRecu = 0;
    let totalEcart = 0;

    for (const item of receptionLines) {
      const ligne = (transfert.lignes || []).find((l) => l.id === item.lineId);
      if (!ligne) continue;

      const qteExpediee = Number(ligne.quantite_expediee);
      const qteRecue = Math.max(0, Number(item.quantiteRecue));
      const ecart = qteRecue - qteExpediee; // Negative = shortage / loss

      totalRecu += qteRecue;
      totalEcart += ecart;

      // Update line
      db.prepare(
        `
          UPDATE transfert_stock_lignes
          SET quantite_recue = ?,
              ecart = ?,
              motif_ecart = ?
          WHERE id = ?
        `
      ).run(qteRecue, ecart, item.motifEcart || "", item.lineId);

      // Destination stock before
      const destStock = db
        .prepare(
          "SELECT quantite, quantite_en_transit FROM stock_depots WHERE branch_id = ? AND produit_id = ?"
        )
        .get(transfert.destination_branch_id, ligne.produit_id) as
        | { quantite: number; quantite_en_transit: number }
        | undefined;

      const stockAvant = destStock ? Number(destStock.quantite) : 0;
      const stockApres = stockAvant + qteRecue;

      // Update destination stock: decrement in-transit, increment physical stock
      db.prepare(
        `
          INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
          VALUES (?, ?, ?, ?, 0)
          ON CONFLICT(company_id, branch_id, produit_id)
          DO UPDATE SET
            quantite = quantite + ?,
            quantite_en_transit = MAX(0, quantite_en_transit - ?),
            updated_at = CURRENT_TIMESTAMP
        `
      ).run(transfert.company_id, transfert.destination_branch_id, ligne.produit_id, qteRecue, qteRecue, qteExpediee);

      // Audit movement for received goods
      db.prepare(
        `
          INSERT INTO mouvements_stock (
            company_id, branch_id, produit_id, type_mouvement,
            quantite, stock_avant, stock_apres, reference_document,
            transfert_id, motif, user_id, created_at
          ) VALUES (
            ?, ?, ?, 'transfert_entree',
            ?, ?, ?, ?,
            ?, ?, ?, ?
          )
        `
      ).run(
        transfert.company_id,
        transfert.destination_branch_id,
        ligne.produit_id,
        qteRecue,
        stockAvant,
        stockApres,
        transfert.numero,
        transfert.id,
        `Réception physique transfert depuis ${transfert.source_branch_name || "Dépôt d'origine"}`,
        userId,
        now
      );

      // If missing/damaged during transport, log official transit loss
      if (ecart < 0) {
        db.prepare(
          `
            INSERT INTO mouvements_stock (
              company_id, branch_id, produit_id, type_mouvement,
              quantite, stock_avant, stock_apres, reference_document,
              transfert_id, motif, user_id, created_at
            ) VALUES (
              ?, ?, ?, 'perte_transport',
              ?, 0, 0, ?,
              ?, ?, ?, ?
            )
          `
        ).run(
          transfert.company_id,
          transfert.destination_branch_id,
          ligne.produit_id,
          ecart,
          transfert.numero,
          transfert.id,
          `Avarie / Manquant transport (${Math.abs(ecart)} ${ligne.unite}) : ${item.motifEcart || "Non spécifié"}`,
          userId,
          now
        );
      }
    }

    // Update transfer to 'recu'
    db.prepare(
      `
        UPDATE transferts_stock
        SET statut = 'recu',
            date_reception = @now,
            recu_par_id = @userId,
            recu_par_nom = @userFullName,
            total_quantite_recue = @totalRecu,
            total_ecart = @totalEcart,
            motif_ecart_global = @motifGlobal,
            updated_by = @userId,
            updated_at = @now
        WHERE id = @id
      `
    ).run({
      id,
      now,
      userId,
      userFullName,
      totalRecu,
      totalEcart,
      motifGlobal: motifGlobal || "",
    });

    return true;
  });

  return tx();
}

/**
 * Cancel a transfer (draft or return transit stock to source)
 */
export function annulerStockTransfert(id: number, userId: number = 1): boolean {
  const db = getDb();
  const transfert = getStockTransfertById(id);
  if (!transfert) throw new Error("Transfert introuvable.");
  if (transfert.statut === "recu") throw new Error("Impossible d'annuler un transfert déjà réceptionné.");
  if (transfert.statut === "annule") return true;

  const tx = db.transaction(() => {
    // If it was in transit, return stock to source depot and clear transit from dest
    if (transfert.statut === "en_transit" && transfert.lignes) {
      for (const ligne of transfert.lignes) {
        const qte = Number(ligne.quantite_expediee);
        // Add back to source
        db.prepare(
          "UPDATE stock_depots SET quantite = quantite + ? WHERE branch_id = ? AND produit_id = ?"
        ).run(qte, transfert.source_branch_id, ligne.produit_id);
        // Remove from destination in_transit
        db.prepare(
          "UPDATE stock_depots SET quantite_en_transit = MAX(0, quantite_en_transit - ?) WHERE branch_id = ? AND produit_id = ?"
        ).run(qte, transfert.destination_branch_id, ligne.produit_id);
      }
    }

    db.prepare(
      "UPDATE transferts_stock SET statut = 'annule', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(userId, id);

    return true;
  });

  return tx();
}

/**
 * Get inventory stock status for all products in a warehouse
 */
export function getStockSummaryByBranch(
  companyId: number,
  branchId: number
): StockDepotRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT s.*,
               p.ref AS produit_ref,
               p.designation AS produit_designation,
               p.unite AS produit_unite,
               b.name AS branch_name
        FROM stock_depots s
        JOIN produits p ON p.id = s.produit_id
        JOIN branches b ON b.id = s.branch_id
        WHERE s.company_id = ? AND s.branch_id = ?
        ORDER BY p.designation ASC
      `
    )
    .all(companyId, branchId) as StockDepotRecord[];

  return rows;
}

/**
 * Get all stocks across all branches for a company
 */
export function getAllStocksForCompany(companyId: number): StockDepotRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT s.*,
               p.ref AS produit_ref,
               p.designation AS produit_designation,
               p.unite AS produit_unite,
               b.name AS branch_name
        FROM stock_depots s
        JOIN produits p ON p.id = s.produit_id
        JOIN branches b ON b.id = s.branch_id
        WHERE s.company_id = ?
        ORDER BY b.name ASC, p.designation ASC
      `
    )
    .all(companyId) as StockDepotRecord[];

  return rows;
}

/**
 * Get Key Performance Indicators for Transfers Dashboard
 */
export function getTransfertKPIs(companyId: number): StockTransfertKPIs {
  const db = getDb();

  const totalRow = db
    .prepare("SELECT COUNT(*) as count FROM transferts_stock WHERE company_id = ?")
    .get(companyId) as { count: number };

  const transitRow = db
    .prepare(
      `
        SELECT COUNT(*) as count,
               COALESCE(SUM(total_quantite_expediee), 0) as articles_count
        FROM transferts_stock
        WHERE company_id = ? AND statut = 'en_transit'
      `
    )
    .get(companyId) as { count: number; articles_count: number };

  const recusRow = db
    .prepare(
      `
        SELECT COUNT(*) as total_recus,
               SUM(CASE WHEN total_ecart = 0 THEN 1 ELSE 0 END) as conformes,
               ABS(COALESCE(SUM(CASE WHEN total_ecart < 0 THEN total_ecart ELSE 0 END), 0)) as total_manquants
        FROM transferts_stock
        WHERE company_id = ? AND statut = 'recu'
      `
    )
    .get(companyId) as { total_recus: number; conformes: number; total_manquants: number };

  const totalTransferts = totalRow.count;
  const enTransitCount = transitRow.count;
  const enTransitArticlesCount = transitRow.articles_count;
  const recusCount = recusRow.total_recus || 0;
  const recusConformesCount = recusRow.conformes || 0;
  const totalPiecesManquantes = recusRow.total_manquants || 0;

  const tauxConformite =
    recusCount > 0
      ? Math.round((recusConformesCount / recusCount) * 100)
      : 100;

  return {
    totalTransferts,
    enTransitCount,
    enTransitArticlesCount,
    enAttenteReceptionCount: enTransitCount,
    recusCount,
    recusConformesCount,
    totalPiecesManquantes,
    tauxConformite,
  };
}

/**
 * Adjust stock for a specific warehouse depot with audit logging
 */
export function ajusterStockDepot(
  companyId: number,
  branchId: number,
  produitId: number,
  nouvelleQuantite: number,
  motif: string,
  userId: number = 1
): boolean {
  const db = getDb();
  const current = db
    .prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?")
    .get(branchId, produitId) as { quantite: number } | undefined;

  const stockAvant = current ? Number(current.quantite) : 0;
  const quantiteDelta = nouvelleQuantite - stockAvant;

  const tx = db.transaction(() => {
    db.prepare(
      `
        INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
        VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(company_id, branch_id, produit_id)
        DO UPDATE SET quantite = ?, updated_at = CURRENT_TIMESTAMP
      `
    ).run(companyId, branchId, produitId, nouvelleQuantite, nouvelleQuantite);

    db.prepare(
      `
        INSERT INTO mouvements_stock (
          company_id, branch_id, produit_id, type_mouvement,
          quantite, stock_avant, stock_apres, reference_document,
          transfert_id, motif, user_id, created_at
        ) VALUES (
          ?, ?, ?, 'ajustement',
          ?, ?, ?, 'AJUSTEMENT-MANUEL',
          NULL, ?, ?, CURRENT_TIMESTAMP
        )
      `
    ).run(companyId, branchId, produitId, quantiteDelta, stockAvant, nouvelleQuantite, motif, userId);

    return true;
  });

  return tx();
}

/**
 * Get a map of product_id -> available quantity for a specific branch
 */
export function getDepotStockMap(companyId: number, branchId: number): Record<number, number> {
  const db = getDb();
  const rows = db
    .prepare("SELECT produit_id, quantite FROM stock_depots WHERE company_id = ? AND branch_id = ?")
    .all(companyId, branchId) as Array<{ produit_id: number; quantite: number }>;

  const map: Record<number, number> = {};
  for (const r of rows) {
    map[r.produit_id] = Number(r.quantite) || 0;
  }
  return map;
}

