import { getDb } from "./db";
import {
  ReapproSuggestionRecord,
  ReapproKPIs,
  ReapproUrgence,
} from "./types";
import { saveDocument } from "./data";

export interface ReapproQueryOptions {
  companyId?: number;
  branchId?: number;
  horizonJours?: number; // 30, 60, or 90
  categorie?: string;
  fournisseurId?: number;
  urgence?: ReapproUrgence;
  search?: string;
}

export function calculerBesoinsApprovisionnement(
  options: ReapproQueryOptions = {},
): ReapproSuggestionRecord[] {
  const db = getDb();
  const companyId = options.companyId ?? 1;
  const horizon = options.horizonJours && [30, 60, 90].includes(options.horizonJours)
    ? options.horizonJours
    : 30;

  // 1. Fetch sales/issue velocity (VMJ) over the selected horizon
  // We sum quantities from active invoices, BL, and BS
  const velocityRows = db.prepare(`
    SELECT 
      dl.produit_id,
      SUM(dl.quantite) as total_sorties
    FROM document_lignes dl
    JOIN documents d ON dl.document_id = d.id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl', 'bs')
      AND d.status != 'annule'
      AND d.date >= date('now', '-' || ? || ' days')
      AND dl.produit_id IS NOT NULL
      ${options.branchId ? "AND d.branch_id = ?" : ""}
    GROUP BY dl.produit_id
  `).all(
    options.branchId ? [companyId, horizon, options.branchId] : [companyId, horizon]
  ) as Array<{ produit_id: number; total_sorties: number }>;

  const velocityMap = new Map<number, number>();
  for (const row of velocityRows) {
    velocityMap.set(row.produit_id, Number(row.total_sorties || 0) / horizon);
  }

  // 2. Fetch pending orders (quantite_en_commande) from active BC documents
  const pendingOrdersRows = db.prepare(`
    SELECT 
      dl.produit_id,
      SUM(dl.quantite) as total_en_commande
    FROM document_lignes dl
    JOIN documents d ON dl.document_id = d.id
    WHERE d.company_id = ?
      AND d.type = 'bc'
      AND d.status = 'brouillon'
      AND dl.produit_id IS NOT NULL
      ${options.branchId ? "AND d.branch_id = ?" : ""}
    GROUP BY dl.produit_id
  `).all(
    options.branchId ? [companyId, options.branchId] : [companyId]
  ) as Array<{ produit_id: number; total_en_commande: number }>;

  const pendingOrdersMap = new Map<number, number>();
  for (const row of pendingOrdersRows) {
    pendingOrdersMap.set(row.produit_id, Number(row.total_en_commande || 0));
  }

  // 3. Fetch products joined with primary supplier details
  let query = `
    SELECT 
      p.id as produit_id,
      p.ref as reference,
      p.designation,
      p.categorie,
      p.unite,
      p.prix_ht as prix_achat_ht,
      COALESCE(p.stock_minimum, 5) as stock_minimum,
      COALESCE(p.stock_maximum, 50) as stock_maximum,
      COALESCE(p.delai_livraison_jours, 5) as delai_livraison_jours,
      COALESCE(p.conditionnement_achat, 1) as conditionnement_achat,
      COALESCE(p.emplacement_code, '') as emplacement_code,
      p.fournisseur_principal_id,
      COALESCE(f.name, '') as fournisseur_nom,
      f.delai_livraison_jours as fournisseur_delai,
      f.franco_port_ht as fournisseur_franco_ht
    FROM produits p
    LEFT JOIN fournisseurs f ON p.fournisseur_principal_id = f.id
    WHERE p.active = 1
  `;
  const params: any[] = [];

  if (options.categorie) {
    query += " AND p.categorie = ?";
    params.push(options.categorie);
  }
  if (options.fournisseurId) {
    query += " AND p.fournisseur_principal_id = ?";
    params.push(options.fournisseurId);
  }
  if (options.search) {
    query += " AND (p.ref LIKE ? OR p.designation LIKE ?)";
    params.push(`%${options.search}%`, `%${options.search}%`);
  }

  query += " ORDER BY p.designation ASC";

  const produits = db.prepare(query).all(...params) as Array<{
    produit_id: number;
    reference: string;
    designation: string;
    categorie: string;
    unite: string;
    prix_achat_ht: number;
    stock_minimum: number;
    stock_maximum: number;
    delai_livraison_jours: number;
    conditionnement_achat: number;
    emplacement_code: string;
    fournisseur_principal_id?: number;
    fournisseur_nom?: string;
    fournisseur_delai?: number;
    fournisseur_franco_ht?: number;
  }>;

  // 4. Fetch stock for each product (specific branch or global)
  const stockMap = new Map<number, number>();
  if (options.branchId) {
    const stockRows = db.prepare(`
      SELECT produit_id, quantite, quantite_en_commande
      FROM stock_depots
      WHERE branch_id = ?
    `).all(options.branchId) as Array<{ produit_id: number; quantite: number; quantite_en_commande: number }>;
    for (const row of stockRows) {
      stockMap.set(row.produit_id, Number(row.quantite || 0));
      if (!pendingOrdersMap.has(row.produit_id) && Number(row.quantite_en_commande || 0) > 0) {
        pendingOrdersMap.set(row.produit_id, Number(row.quantite_en_commande));
      }
    }
  } else {
    // Sum stock across depots or fallback to produits.stock_actuel
    const stockRows = db.prepare(`
      SELECT produit_id, SUM(quantite) as total_stock
      FROM stock_depots
      GROUP BY produit_id
    `).all() as Array<{ produit_id: number; total_stock: number }>;
    for (const row of stockRows) {
      stockMap.set(row.produit_id, Number(row.total_stock || 0));
    }
  }

  const results: ReapproSuggestionRecord[] = [];

  for (const p of produits) {
    const stockActuel = stockMap.get(p.produit_id) ?? 0;
    const quantiteEnCommande = pendingOrdersMap.get(p.produit_id) ?? 0;
    const vmj = Math.round((velocityMap.get(p.produit_id) ?? 0) * 100) / 100;

    // Lead time: priority to product level, then supplier level, default 5
    const delaiLivraison = p.delai_livraison_jours || p.fournisseur_delai || 5;

    // Safety stock: stock_minimum
    const stockSecurite = p.stock_minimum || 5;
    const stockMax = p.stock_maximum > stockSecurite ? p.stock_maximum : stockSecurite * 3;

    // ROP (Reorder Point) = (VMJ * Delai) + Stock Sécurité
    const rop = Math.round((vmj * delaiLivraison + stockSecurite) * 10) / 10;

    // Net Stock available = Stock Actuel + Quantité En Commande
    const stockNet = stockActuel + quantiteEnCommande;

    // Determine Urgence
    let urgence: ReapproUrgence = "optimal";
    if (stockActuel <= 0) {
      urgence = "rupture";
    } else if (stockActuel <= stockSecurite) {
      urgence = "critique";
    } else if (stockNet <= rop) {
      urgence = "a_commander";
    } else if (stockActuel > stockMax) {
      urgence = "surstock";
    } else {
      urgence = "optimal";
    }

    // Suggested order quantity
    let quantiteSuggeree = 0;
    if (urgence === "rupture" || urgence === "critique" || urgence === "a_commander") {
      const brut = stockMax - stockNet;
      if (brut > 0) {
        const cond = p.conditionnement_achat > 0 ? p.conditionnement_achat : 1;
        // Round up to nearest multiple of packaging size
        quantiteSuggeree = Math.ceil(brut / cond) * cond;
      }
    }

    const prixAchat = Number(p.prix_achat_ht || 0);
    const montantEstimeHT = Math.round(quantiteSuggeree * prixAchat * 100) / 100;
    const joursAutonomie = vmj > 0 ? Math.round(stockActuel / vmj) : (stockActuel > 0 ? 999 : 0);

    const record: ReapproSuggestionRecord = {
      produit_id: p.produit_id,
      reference: p.reference,
      designation: p.designation,
      categorie: p.categorie || "Général",
      unite: p.unite || "u",
      stock_actuel: stockActuel,
      stock_minimum: stockSecurite,
      stock_maximum: stockMax,
      quantite_en_commande: quantiteEnCommande,
      delai_livraison_jours: delaiLivraison,
      fournisseur_id: p.fournisseur_principal_id,
      fournisseur_nom: p.fournisseur_nom || "Non assigné",
      fournisseur_delai: p.fournisseur_delai,
      fournisseur_franco_ht: p.fournisseur_franco_ht,
      prix_achat_ht: prixAchat,
      conditionnement_achat: p.conditionnement_achat || 1,
      emplacement_code: p.emplacement_code,
      vmj,
      rop,
      quantite_suggeree: quantiteSuggeree,
      montant_estime_ht: montantEstimeHT,
      urgence,
      jours_autonomie: joursAutonomie,
    };

    if (!options.urgence || options.urgence === urgence) {
      results.push(record);
    }
  }

  // Sort by urgency severity: rupture > critique > a_commander > surstock > optimal
  const priorityMap: Record<ReapproUrgence, number> = {
    rupture: 1,
    critique: 2,
    a_commander: 3,
    surstock: 4,
    optimal: 5,
  };

  return results.sort((a, b) => {
    const diff = priorityMap[a.urgence] - priorityMap[b.urgence];
    if (diff !== 0) return diff;
    return a.designation.localeCompare(b.designation);
  });
}

export function getReapproKPIs(options: ReapproQueryOptions = {}): ReapproKPIs {
  const suggestions = calculerBesoinsApprovisionnement({
    ...options,
    urgence: undefined, // calculate across all products
  });

  let articlesEnRupture = 0;
  let articlesACommander = 0;
  let articlesSurstock = 0;
  let budgetReapproEstimeHT = 0;
  const fournisseursSet = new Set<number>();

  for (const s of suggestions) {
    if (s.urgence === "rupture") articlesEnRupture++;
    if (s.urgence === "rupture" || s.urgence === "critique" || s.urgence === "a_commander") {
      articlesACommander++;
      budgetReapproEstimeHT += s.montant_estime_ht;
      if (s.fournisseur_id) {
        fournisseursSet.add(s.fournisseur_id);
      }
    }
    if (s.urgence === "surstock") articlesSurstock++;
  }

  return {
    articlesEnRupture,
    articlesACommander,
    articlesSurstock,
    budgetReapproEstimeHT: Math.round(budgetReapproEstimeHT * 100) / 100,
    fournisseursConcernes: fournisseursSet.size,
  };
}

export interface GeneratedBCResult {
  bcId: number;
  bcNumero: number;
  fournisseurId: number;
  fournisseurNom: string;
  montantHT: number;
  totalArticles: number;
}

export function genererBonsCommandeFournisseur(
  items: Array<{ produitId: number; quantite: number; prixUnitaireHT?: number }>,
  options: {
    companyId: number;
    branchId?: number;
    userId: number;
    dateLivraisonSouhaitee?: string;
    notes?: string;
  },
): GeneratedBCResult[] {
  const db = getDb();
  if (!items || items.length === 0) {
    throw new Error("Aucun article sélectionné pour la commande.");
  }

  // Fetch product info to group by supplier
  const productIds = items.map((i) => i.produitId);
  const placeholders = productIds.map(() => "?").join(",");
  const productRows = db.prepare(`
    SELECT 
      p.id,
      p.designation,
      p.unite,
      p.prix_ht as prix_achat_ht,
      p.fournisseur_principal_id,
      COALESCE(f.name, '') as fournisseur_nom
    FROM produits p
    LEFT JOIN fournisseurs f ON p.fournisseur_principal_id = f.id
    WHERE p.id IN (${placeholders})
  `).all(...productIds) as Array<{
    id: number;
    designation: string;
    unite: string;
    prix_achat_ht: number;
    fournisseur_principal_id?: number;
    fournisseur_nom?: string;
  }>;

  const productMap = new Map<number, typeof productRows[0]>();
  for (const p of productRows) {
    productMap.set(p.id, p);
  }

  // Group items by supplier ID (null gets grouped under fallback supplier if available)
  const defaultSupplier = db.prepare("SELECT id, name as nom FROM fournisseurs LIMIT 1").get() as { id: number; nom: string } | undefined;
  const groups = new Map<number, { supplierNom: string; lines: Array<{ produit_id: number; designation: string; quantite: number; unite: string; prix_unitaire_ht: number }> }>();

  for (const item of items) {
    const prod = productMap.get(item.produitId);
    if (!prod) continue;

    const supplierId = prod.fournisseur_principal_id || (defaultSupplier ? defaultSupplier.id : 0);
    const supplierNom = prod.fournisseur_nom || (defaultSupplier ? defaultSupplier.nom : "Fournisseur Général");

    if (!groups.has(supplierId)) {
      groups.set(supplierId, { supplierNom, lines: [] });
    }

    const prixUnit = item.prixUnitaireHT !== undefined && item.prixUnitaireHT > 0
      ? item.prixUnitaireHT
      : Number(prod.prix_achat_ht || 0);

    groups.get(supplierId)!.lines.push({
      produit_id: prod.id,
      designation: prod.designation,
      quantite: Number(item.quantite),
      unite: prod.unite || "u",
      prix_unitaire_ht: prixUnit,
    });
  }

  const results: GeneratedBCResult[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const [supplierId, group] of groups.entries()) {
    if (group.lines.length === 0) continue;

    // Validate supplier existence for FK integrity
    const supExists = supplierId > 0 ? db.prepare("SELECT id FROM fournisseurs WHERE id = ?").get(supplierId) : null;
    const finalSupplierId = supExists ? supplierId : null;

    // Validate branch existence for FK integrity
    const branchExists = options.branchId ? db.prepare("SELECT id FROM branches WHERE id = ?").get(options.branchId) : null;
    const finalBranchId = branchExists ? options.branchId : null;

    const docResult = saveDocument(
      {
        company_id: options.companyId,
        type: "bc",
        date: today,
        date_echeance: options.dateLivraisonSouhaitee || "",
        branch_id: finalBranchId,
        fournisseur_id: finalSupplierId,
        status: "brouillon",
        notes: options.notes
          ? `${options.notes} (Généré par réapprovisionnement automatique)`
          : "Généré automatiquement par le module de réapprovisionnement intelligent",
        lines: group.lines.map((l) => ({
          produit_id: l.produit_id,
          designation: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          prix_unitaire_ht: l.prix_unitaire_ht,
          tva_rate: 20,
          remise: 0,
        })),
      },
      options.userId,
    );

    const createdDoc = db.prepare("SELECT numero FROM documents WHERE id = ?").get(docResult) as { numero: number } | undefined;

    // Update quantite_en_commande in stock_depots for this branch
    if (finalBranchId) {
      for (const line of group.lines) {
        db.prepare(`
          INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_commande)
          VALUES (?, ?, ?, 0, ?)
          ON CONFLICT(company_id, branch_id, produit_id) DO UPDATE SET
            quantite_en_commande = quantite_en_commande + excluded.quantite_en_commande,
            updated_at = CURRENT_TIMESTAMP
        `).run(options.companyId, finalBranchId, line.produit_id, line.quantite);
      }
    }

    const totalHT = group.lines.reduce((acc, l) => acc + l.quantite * l.prix_unitaire_ht, 0);

    results.push({
      bcId: docResult,
      bcNumero: createdDoc?.numero || docResult,
      fournisseurId: supplierId,
      fournisseurNom: group.supplierNom,
      montantHT: Math.round(totalHT * 100) / 100,
      totalArticles: group.lines.length,
    });
  }

  return results;
}

export function mettreAJourSeuilsProduit(
  produitId: number,
  data: {
    stock_minimum?: number;
    stock_maximum?: number;
    delai_livraison_jours?: number;
    fournisseur_principal_id?: number | null;
    conditionnement_achat?: number;
    emplacement_code?: string;
  },
): void {
  const db = getDb();
  db.prepare(`
    UPDATE produits
    SET 
      stock_minimum = COALESCE(?, stock_minimum),
      stock_maximum = COALESCE(?, stock_maximum),
      delai_livraison_jours = COALESCE(?, delai_livraison_jours),
      fournisseur_principal_id = ?,
      conditionnement_achat = COALESCE(?, conditionnement_achat),
      emplacement_code = COALESCE(?, emplacement_code),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.stock_minimum !== undefined ? data.stock_minimum : null,
    data.stock_maximum !== undefined ? data.stock_maximum : null,
    data.delai_livraison_jours !== undefined ? data.delai_livraison_jours : null,
    data.fournisseur_principal_id !== undefined ? data.fournisseur_principal_id : null,
    data.conditionnement_achat !== undefined ? data.conditionnement_achat : null,
    data.emplacement_code !== undefined ? data.emplacement_code : null,
    produitId,
  );
}
