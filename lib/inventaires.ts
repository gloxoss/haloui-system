import { getDb } from "@/lib/db";
import {
  type InventaireRecord,
  type InventaireLigneRecord,
  type InventaireKPIs,
  type InventaireType,
  type ComptageLigneStatut,
} from "@/lib/types";

/**
 * Generate sequential inventory session numbers: INV-YYYY-XXXX
 */
export function getNextInventaireNumber(companyId: number = 1): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastRecord = db
    .prepare(
      `
        SELECT numero
        FROM inventaires
        WHERE company_id = ? AND numero LIKE ?
        ORDER BY id DESC
        LIMIT 1
      `
    )
    .get(companyId, `${prefix}%`) as { numero: string } | undefined;

  if (!lastRecord) {
    return `${prefix}0001`;
  }

  const parts = lastRecord.numero.split("-");
  const lastSeq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(lastSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

/**
 * List inventory sessions with branch info and lines summary
 */
export function listInventaires(filters?: {
  companyId?: number;
  branchId?: number;
  statut?: string;
  search?: string;
}): InventaireRecord[] {
  const db = getDb();
  const companyId = filters?.companyId ?? 1;

  let query = `
    SELECT
      i.*,
      b.name as branch_name
    FROM inventaires i
    JOIN branches b ON i.branch_id = b.id
    WHERE i.company_id = ?
  `;
  const params: any[] = [companyId];

  if (filters?.branchId) {
    query += " AND i.branch_id = ?";
    params.push(filters.branchId);
  }

  if (filters?.statut && filters.statut !== "tous") {
    query += " AND i.statut = ?";
    params.push(filters.statut);
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query += " AND (i.numero LIKE ? OR i.titre LIKE ? OR i.notes LIKE ?)";
    params.push(term, term, term);
  }

  query += " ORDER BY i.id DESC";

  return db.prepare(query).all(...params) as InventaireRecord[];
}

/**
 * Get single inventory session by ID with all item lines
 */
export function getInventaireById(id: number): InventaireRecord | null {
  const db = getDb();

  const inv = db
    .prepare(
      `
        SELECT
          i.*,
          b.name as branch_name
        FROM inventaires i
        JOIN branches b ON i.branch_id = b.id
        WHERE i.id = ?
      `
    )
    .get(id) as InventaireRecord | undefined;

  if (!inv) return null;

  const lignes = db
    .prepare(
      `
        SELECT
          il.*,
          p.categorie as produit_categorie,
          p.rayon as produit_rayon
        FROM inventaire_lignes il
        JOIN produits p ON il.produit_id = p.id
        WHERE il.inventaire_id = ?
        ORDER BY il.id ASC
      `
    )
    .all(id) as InventaireLigneRecord[];

  inv.lignes = lignes;
  return inv;
}

/**
 * Create a new inventory counting session with automatic snapshot of theoretical stocks
 */
export function creerInventaireSession(data: {
  companyId?: number;
  branchId: number;
  titre: string;
  typeInventaire: InventaireType;
  critereFiltre?: string;
  notes?: string;
  userId?: number;
  userFullName?: string;
}): InventaireRecord {
  const db = getDb();
  const companyId = data.companyId ?? 1;
  const userId = data.userId ?? 1;
  const userFullName = data.userFullName ?? "Super Administrateur";

  const numero = getNextInventaireNumber(companyId);
  const dateDebut = new Date().toISOString().slice(0, 10);

  const tx = db.transaction(() => {
    // 1. Fetch products matching filters
    let prodQuery = "SELECT id, ref, designation, code_barre, unite, prix_ht, rayon, categorie FROM produits WHERE active = 1";
    const prodParams: any[] = [];

    if (data.typeInventaire === "tournant_rayon" && data.critereFiltre) {
      prodQuery += " AND rayon = ?";
      prodParams.push(data.critereFiltre);
    } else if (data.typeInventaire === "tournant_famille" && data.critereFiltre) {
      prodQuery += " AND categorie = ?";
      prodParams.push(data.critereFiltre);
    }

    prodQuery += " ORDER BY ref ASC";
    const products = db.prepare(prodQuery).all(...prodParams) as Array<{
      id: number;
      ref: string;
      designation: string;
      code_barre: string;
      unite: string;
      prix_ht: number;
      rayon: string;
      categorie: string;
    }>;

    if (products.length === 0) {
      throw new Error("Aucun article trouvé pour les critères sélectionnés.");
    }

    // 2. Insert session header
    const insertInv = db.prepare(`
      INSERT INTO inventaires (
        company_id, branch_id, numero, titre, type_inventaire, critere_filtre,
        statut, date_debut, total_articles, total_comptes, total_ecarts_qte, total_valeur_ecart_ht,
        notes, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        'en_cours', ?, ?, 0, 0, 0,
        ?, ?
      )
    `);

    const res = insertInv.run(
      companyId,
      data.branchId,
      numero,
      data.titre.trim(),
      data.typeInventaire,
      data.critereFiltre || "",
      dateDebut,
      products.length,
      data.notes || "",
      userId
    );

    const invId = Number(res.lastInsertRowid);

    // 3. Snapshot theoretical stock from stock_depots for each product
    const insertLigne = db.prepare(`
      INSERT INTO inventaire_lignes (
        inventaire_id, produit_id, designation, ref, code_barre, unite,
        prix_unitaire_ht, stock_theorique, stock_physique, ecart_quantite, valeur_ecart_ht,
        statut_comptage, motif_ecart
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, 0, ?, ?,
        'non_compte', ''
      )
    `);

    const getStockTheorique = db.prepare(`
      SELECT quantite
      FROM stock_depots
      WHERE branch_id = ? AND produit_id = ?
    `);

    for (const p of products) {
      const stockRow = getStockTheorique.get(data.branchId, p.id) as { quantite: number } | undefined;
      const stockTheo = stockRow ? Number(stockRow.quantite) : 0;
      // Initial variance when not counted yet
      const initialEcart = -stockTheo;
      const initialValEcart = initialEcart * p.prix_ht;

      insertLigne.run(
        invId,
        p.id,
        p.designation,
        p.ref,
        p.code_barre || "",
        p.unite || "u",
        p.prix_ht,
        stockTheo,
        initialEcart,
        initialValEcart
      );
    }

    return invId;
  });

  const id = tx();
  const created = getInventaireById(id);
  if (!created) throw new Error("Erreur lors de la création de la session d'inventaire.");
  return created;
}

/**
 * Record a physical count for a single line item
 */
export function enregistrerComptageLigne(
  ligneId: number,
  stockPhysique: number,
  motifEcart?: string
): boolean {
  const db = getDb();

  const ligne = db
    .prepare("SELECT * FROM inventaire_lignes WHERE id = ?")
    .get(ligneId) as InventaireLigneRecord | undefined;

  if (!ligne) throw new Error("Ligne d'inventaire introuvable.");

  const inv = db
    .prepare("SELECT statut FROM inventaires WHERE id = ?")
    .get(ligne.inventaire_id) as { statut: string } | undefined;

  if (!inv || inv.statut !== "en_cours") {
    throw new Error("Cette session d'inventaire est déjà clôturée ou annulée.");
  }

  const physique = Math.max(0, Number(stockPhysique));
  const ecartQte = physique - Number(ligne.stock_theorique);
  const valeurEcart = ecartQte * Number(ligne.prix_unitaire_ht);
  const statutComptage: ComptageLigneStatut = ecartQte === 0 ? "conforme" : "ecart";
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      `
        UPDATE inventaire_lignes
        SET stock_physique = ?,
            ecart_quantite = ?,
            valeur_ecart_ht = ?,
            statut_comptage = ?,
            motif_ecart = ?,
            compte_at = ?
        WHERE id = ?
      `
    ).run(physique, ecartQte, valeurEcart, statutComptage, motifEcart || "", now, ligneId);

    // Recalculate session aggregates
    recalculerTotauxInventaire(ligne.inventaire_id);
  });

  tx();
  return true;
}

/**
 * Instant barcode scan for physical inventory counting (supports barcode scanner gun)
 */
export function scanCodeBarreInventaire(
  inventaireId: number,
  codeBarre: string,
  quantiteAjout: number = 1
): { success: boolean; line?: InventaireLigneRecord; message: string } {
  const db = getDb();
  const cleanCode = codeBarre.trim();

  if (!cleanCode) {
    return { success: false, message: "Code-barres vide." };
  }

  const ligne = db
    .prepare(
      `
        SELECT *
        FROM inventaire_lignes
        WHERE inventaire_id = ? AND (code_barre = ? OR ref = ?)
        LIMIT 1
      `
    )
    .get(inventaireId, cleanCode, cleanCode) as InventaireLigneRecord | undefined;

  if (!ligne || ligne.id == null) {
    return {
      success: false,
      message: `Aucun article avec le code "${cleanCode}" dans cette session d'inventaire.`,
    };
  }

  const currentPhysique = Number(ligne.stock_physique);
  const newPhysique = currentPhysique + quantiteAjout;

  enregistrerComptageLigne(ligne.id, newPhysique, ligne.motif_ecart);

  const updatedLine = db
    .prepare("SELECT * FROM inventaire_lignes WHERE id = ?")
    .get(ligne.id) as InventaireLigneRecord;

  return {
    success: true,
    line: updatedLine,
    message: `${updatedLine.designation} : quantité comptée portée à ${newPhysique} ${updatedLine.unite}.`,
  };
}

/**
 * Bulk convenience action: Align uncounted lines to theoretical stock (100% match)
 */
export function alignerLignesTheorique(
  inventaireId: number,
  mode: "non_comptes" | "tous" = "non_comptes"
): boolean {
  const db = getDb();

  const inv = db
    .prepare("SELECT statut FROM inventaires WHERE id = ?")
    .get(inventaireId) as { statut: string } | undefined;

  if (!inv || inv.statut !== "en_cours") {
    throw new Error("Cette session n'est pas en cours.");
  }

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    let whereClause = "WHERE inventaire_id = ?";
    if (mode === "non_comptes") {
      whereClause += " AND statut_comptage = 'non_compte'";
    }

    db.prepare(
      `
        UPDATE inventaire_lignes
        SET stock_physique = stock_theorique,
            ecart_quantite = 0,
            valeur_ecart_ht = 0,
            statut_comptage = 'conforme',
            motif_ecart = '',
            compte_at = ?
        ${whereClause}
      `
    ).run(now, inventaireId);

    recalculerTotauxInventaire(inventaireId);
  });

  tx();
  return true;
}

/**
 * Recalculate and update session summary counters
 */
function recalculerTotauxInventaire(inventaireId: number) {
  const db = getDb();

  const stats = db
    .prepare(
      `
        SELECT
          COUNT(*) as total_articles,
          SUM(CASE WHEN statut_comptage != 'non_compte' THEN 1 ELSE 0 END) as total_comptes,
          SUM(CASE WHEN statut_comptage != 'non_compte' THEN ecart_quantite ELSE 0 END) as total_ecarts_qte,
          SUM(CASE WHEN statut_comptage != 'non_compte' THEN valeur_ecart_ht ELSE 0 END) as total_valeur_ecart_ht
        FROM inventaire_lignes
        WHERE inventaire_id = ?
      `
    )
    .get(inventaireId) as {
    total_articles: number;
    total_comptes: number;
    total_ecarts_qte: number;
    total_valeur_ecart_ht: number;
  };

  db.prepare(
    `
      UPDATE inventaires
      SET total_articles = ?,
          total_comptes = ?,
          total_ecarts_qte = ?,
          total_valeur_ecart_ht = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(
    stats.total_articles || 0,
    stats.total_comptes || 0,
    stats.total_ecarts_qte || 0,
    stats.total_valeur_ecart_ht || 0,
    inventaireId
  );
}

/**
 * Finalize & close inventory session:
 * - Updates physical stock in `stock_depots` for all discrepancy lines
 * - Automatically writes 'ajustement' movements in `mouvements_stock`
 * - Sets status = 'cloture' with timestamp & operator name
 */
export function cloturerInventaire(
  inventaireId: number,
  userId: number = 1,
  userFullName: string = "Super Administrateur"
): boolean {
  const db = getDb();

  const inv = getInventaireById(inventaireId);
  if (!inv) throw new Error("Inventaire introuvable.");
  if (inv.statut !== "en_cours") {
    throw new Error("Cet inventaire est déjà clôturé ou annulé.");
  }

  const tx = db.transaction(() => {
    const now = new Date().toISOString();
    const lignes = inv.lignes || [];

    for (const ligne of lignes) {
      // If line has a discrepancy, adjust stock and log movement
      const ecart = Number(ligne.ecart_quantite);
      const stockPhysique = Number(ligne.stock_physique);
      const stockTheorique = Number(ligne.stock_theorique);

      // Only adjust if line was counted and has variance
      if (ligne.statut_comptage !== "non_compte" && ecart !== 0) {
        // Update stock_depots
        db.prepare(
          `
            INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(company_id, branch_id, produit_id)
            DO UPDATE SET
              quantite = ?,
              updated_at = CURRENT_TIMESTAMP
          `
        ).run(inv.company_id, inv.branch_id, ligne.produit_id, stockPhysique, stockPhysique);

        // Audit entry in mouvements_stock
        const motifLabel =
          ligne.motif_ecart?.trim() ||
          (ecart > 0 ? "Surplus régularisé suite inventaire" : "Manquant régularisé suite inventaire");

        db.prepare(
          `
            INSERT INTO mouvements_stock (
              company_id, branch_id, produit_id, type_mouvement,
              quantite, stock_avant, stock_apres, reference_document,
              motif, user_id, created_at
            ) VALUES (
              ?, ?, ?, 'ajustement',
              ?, ?, ?, ?,
              ?, ?, ?
            )
          `
        ).run(
          inv.company_id,
          inv.branch_id,
          ligne.produit_id,
          ecart,
          stockTheorique,
          stockPhysique,
          inv.numero,
          `Inventaire ${inv.numero} (${inv.titre}) : ${motifLabel}`,
          userId,
          now
        );
      }
    }

    // Mark session as closed
    db.prepare(
      `
        UPDATE inventaires
        SET statut = 'cloture',
            date_cloture = ?,
            cloture_par_id = ?,
            cloture_par_nom = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    ).run(now, userId, userFullName, inventaireId);

    // Final totals recalculation
    recalculerTotauxInventaire(inventaireId);
  });

  tx();
  return true;
}

/**
 * Cancel an ongoing inventory session
 */
export function annulerInventaire(inventaireId: number, userId: number = 1): boolean {
  const db = getDb();

  const inv = db
    .prepare("SELECT statut FROM inventaires WHERE id = ?")
    .get(inventaireId) as { statut: string } | undefined;

  if (!inv) throw new Error("Inventaire introuvable.");
  if (inv.statut === "cloture") {
    throw new Error("Un inventaire déjà clôturé ne peut pas être annulé.");
  }

  db.prepare(
    `
      UPDATE inventaires
      SET statut = 'annule',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(inventaireId);

  return true;
}

/**
 * Get executive KPIs for inventory dashboard
 */
export function getInventaireKPIs(companyId: number = 1): InventaireKPIs {
  const db = getDb();

  const enCoursCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM inventaires WHERE company_id = ? AND statut = 'en_cours'")
      .get(companyId) as any
  )?.count ?? 0;

  const cloturesCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM inventaires WHERE company_id = ? AND statut = 'cloture'")
      .get(companyId) as any
  )?.count ?? 0;

  const aggregates = db
    .prepare(
      `
        SELECT
          SUM(total_ecarts_qte) as total_ecarts_qte,
          SUM(total_valeur_ecart_ht) as total_valeur_ecart_ht
        FROM inventaires
        WHERE company_id = ? AND statut = 'cloture'
      `
    )
    .get(companyId) as {
    total_ecarts_qte: number | null;
    total_valeur_ecart_ht: number | null;
  };

  // Conformity rate of all counted lines
  const linesConformity = db
    .prepare(
      `
        SELECT
          COUNT(*) as total_lines,
          SUM(CASE WHEN statut_comptage = 'conforme' THEN 1 ELSE 0 END) as conformes
        FROM inventaire_lignes il
        JOIN inventaires i ON il.inventaire_id = i.id
        WHERE i.company_id = ? AND il.statut_comptage != 'non_compte'
      `
    )
    .get(companyId) as { total_lines: number; conformes: number };

  const totalLines = linesConformity?.total_lines ?? 0;
  const conformes = linesConformity?.conformes ?? 0;
  const tauxConformiteMoyen = totalLines > 0 ? Math.round((conformes / totalLines) * 100) : 100;

  // Last closed inventory
  const dernier = db
    .prepare(
      `
        SELECT numero, titre, date_cloture, total_articles, total_comptes
        FROM inventaires
        WHERE company_id = ? AND statut = 'cloture'
        ORDER BY date_cloture DESC
        LIMIT 1
      `
    )
    .get(companyId) as
    | { numero: string; titre: string; date_cloture: string; total_articles: number; total_comptes: number }
    | undefined;

  let dernierInventaireCloture = undefined;
  if (dernier) {
    dernierInventaireCloture = {
      numero: dernier.numero,
      titre: dernier.titre,
      date: dernier.date_cloture ? dernier.date_cloture.slice(0, 10) : "",
      tauxConformite: tauxConformiteMoyen,
    };
  }

  return {
    sessionsEnCours: enCoursCount,
    sessionsCloturees: cloturesCount,
    tauxConformiteMoyen,
    totalEcartsQuantite: Number(aggregates?.total_ecarts_qte || 0),
    totalValeurEcartsMAD: Number(aggregates?.total_valeur_ecart_ht || 0),
    dernierInventaireCloture,
  };
}
