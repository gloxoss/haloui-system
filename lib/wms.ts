import { getDb } from "./db";
import {
  EmplacementRecord,
  EmplacementStatut,
  EmplacementType,
  ProduitEmplacementRecord,
  WmsKPIs,
  PickingListRecord,
  PickingListItem,
} from "./types";

export interface EmplacementFilterOptions {
  companyId?: number;
  branchId?: number;
  zone?: string;
  type?: EmplacementType;
  statut?: EmplacementStatut;
  search?: string;
}

export function listEmplacements(
  options: EmplacementFilterOptions = {},
): EmplacementRecord[] {
  const db = getDb();
  const companyId = options.companyId ?? 1;

  let query = `
    SELECT 
      e.id,
      e.company_id,
      e.branch_id,
      e.zone,
      e.allee,
      e.travee,
      CAST(e.niveau AS TEXT) as niveau,
      e.bac,
      e.code_emplacement,
      e.type_emplacement,
      e.capacite_max_volume as capacite_max_kg,
      (CASE WHEN e.active = 1 THEN 'actif' ELSE 'inactif' END) as statut,
      e.notes,
      e.created_at,
      e.updated_at,
      b.name as branch_name,
      (SELECT COUNT(DISTINCT pe.produit_id) FROM produit_emplacements pe WHERE pe.emplacement_id = e.id) as nb_articles_assignes
    FROM emplacements e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.company_id = ?
  `;
  const params: any[] = [companyId];

  if (options.branchId) {
    query += " AND e.branch_id = ?";
    params.push(options.branchId);
  }
  if (options.zone) {
    query += " AND e.zone = ?";
    params.push(options.zone);
  }
  if (options.type) {
    query += " AND e.type_emplacement = ?";
    params.push(options.type);
  }
  if (options.statut) {
    query += " AND (CASE WHEN e.active = 1 THEN 'actif' ELSE 'inactif' END) = ?";
    params.push(options.statut);
  }
  if (options.search) {
    query += " AND (e.code_emplacement LIKE ? OR e.notes LIKE ?)";
    params.push(`%${options.search}%`, `%${options.search}%`);
  }

  query += " ORDER BY e.zone ASC, e.allee ASC, e.travee ASC, e.niveau ASC, e.bac ASC";

  return db.prepare(query).all(...params) as EmplacementRecord[];
}

export function creerEmplacement(data: {
  companyId?: number;
  branchId: number;
  zone: string;
  allee: string;
  travee: string;
  niveau: string;
  bac: string;
  type_emplacement?: EmplacementType;
  capacite_max_kg?: number;
  statut?: EmplacementStatut;
  notes?: string;
}): EmplacementRecord {
  const db = getDb();
  const companyId = data.companyId ?? 1;

  const zoneClean = data.zone.trim().toUpperCase();
  const alleeClean = data.allee.trim().toUpperCase().padStart(2, "0");
  const traveeClean = data.travee.trim().toUpperCase().padStart(2, "0");
  const niveauNum = parseInt(data.niveau.trim() || "1", 10) || 1;
  const bacClean = data.bac.trim().toUpperCase();

  const code = `${zoneClean}-${alleeClean}-${traveeClean}-${niveauNum}-${bacClean}`;

  const result = db.prepare(`
    INSERT INTO emplacements (
      company_id, branch_id, zone, allee, travee, niveau, bac,
      code_emplacement, type_emplacement, capacite_max_volume, active, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    data.branchId,
    zoneClean,
    alleeClean,
    traveeClean,
    niveauNum,
    bacClean,
    code,
    data.type_emplacement || "picking",
    data.capacite_max_kg || 100,
    data.statut === "inactif" ? 0 : 1,
    data.notes || "",
  );

  const emp = db.prepare(`
    SELECT 
      id, company_id, branch_id, zone, allee, travee, CAST(niveau AS TEXT) as niveau, bac,
      code_emplacement, type_emplacement, capacite_max_volume as capacite_max_kg,
      (CASE WHEN active = 1 THEN 'actif' ELSE 'inactif' END) as statut, notes, created_at, updated_at
    FROM emplacements WHERE id = ?
  `).get(result.lastInsertRowid) as EmplacementRecord;

  return emp;
}

export function genererMatriceEmplacements(data: {
  companyId?: number;
  branchId: number;
  zone: string;
  allees: string[]; // e.g. ["01", "02", "03"]
  nbTravees: number; // e.g. 4
  nbNiveaux: number; // e.g. 3
  bacsParNiveau: string[]; // e.g. ["A", "B"]
  type_emplacement?: EmplacementType;
  capacite_max_kg?: number;
}): { totalCrees: number } {
  const db = getDb();
  const companyId = data.companyId ?? 1;
  const zoneClean = data.zone.trim().toUpperCase();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO emplacements (
      company_id, branch_id, zone, allee, travee, niveau, bac,
      code_emplacement, type_emplacement, capacite_max_volume, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  let count = 0;
  db.transaction(() => {
    for (const allee of data.allees) {
      const a = allee.trim().toUpperCase().padStart(2, "0");
      for (let t = 1; t <= data.nbTravees; t++) {
        const traveeStr = String(t).padStart(2, "0");
        for (let n = 1; n <= data.nbNiveaux; n++) {
          for (const b of data.bacsParNiveau) {
            const bacStr = b.trim().toUpperCase();
            const code = `${zoneClean}-${a}-${traveeStr}-${n}-${bacStr}`;
            const res = insert.run(
              companyId,
              data.branchId,
              zoneClean,
              a,
              traveeStr,
              n,
              bacStr,
              code,
              data.type_emplacement || "picking",
              data.capacite_max_kg || 100,
            );
            if (res.changes > 0) count++;
          }
        }
      }
    }
  })();

  return { totalCrees: count };
}

export function listProduitsEmplacements(options: {
  companyId?: number;
  branchId?: number;
  produitId?: number;
  emplacementId?: number;
  search?: string;
} = {}): ProduitEmplacementRecord[] {
  const db = getDb();
  const companyId = options.companyId ?? 1;

  let query = `
    SELECT 
      pe.id,
      pe.company_id,
      pe.branch_id,
      pe.produit_id,
      pe.emplacement_id,
      pe.is_principal as est_principal,
      pe.quantite_stockee as quantite,
      pe.seuil_reassort_picking as capacite_max,
      pe.updated_at,
      p.designation as produit_designation,
      p.ref as produit_ref,
      p.code_barre,
      e.code_emplacement as emplacement_code,
      e.code_emplacement,
      e.zone,
      e.allee,
      e.travee,
      CAST(e.niveau AS TEXT) as niveau,
      e.bac
    FROM produit_emplacements pe
    JOIN produits p ON pe.produit_id = p.id
    JOIN emplacements e ON pe.emplacement_id = e.id
    WHERE pe.company_id = ?
  `;
  const params: any[] = [companyId];

  if (options.branchId) {
    query += " AND pe.branch_id = ?";
    params.push(options.branchId);
  }
  if (options.produitId) {
    query += " AND pe.produit_id = ?";
    params.push(options.produitId);
  }
  if (options.emplacementId) {
    query += " AND pe.emplacement_id = ?";
    params.push(options.emplacementId);
  }
  if (options.search) {
    query += " AND (p.designation LIKE ? OR p.ref LIKE ? OR e.code_emplacement LIKE ?)";
    params.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`);
  }

  query += " ORDER BY e.zone ASC, e.allee ASC, e.travee ASC, e.niveau ASC, e.bac ASC, p.designation ASC";

  return db.prepare(query).all(...params) as ProduitEmplacementRecord[];
}

export function assignerProduitEmplacement(data: {
  companyId?: number;
  branchId: number;
  produitId: number;
  emplacementId: number;
  quantite?: number;
  capaciteMax?: number;
  estPrincipal?: boolean;
}): void {
  const db = getDb();
  const companyId = data.companyId ?? 1;
  const isPrincipal = data.estPrincipal ?? true;

  db.transaction(() => {
    if (isPrincipal) {
      // Unset other principal flags for this product in this branch
      db.prepare(`
        UPDATE produit_emplacements
        SET is_principal = 0
        WHERE branch_id = ? AND produit_id = ?
      `).run(data.branchId, data.produitId);

      // Also update fast reference on produits table
      const emp = db.prepare("SELECT code_emplacement FROM emplacements WHERE id = ?").get(data.emplacementId) as { code_emplacement: string } | undefined;
      if (emp) {
        db.prepare("UPDATE produits SET emplacement_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(emp.code_emplacement, data.produitId);
      }
    }

    db.prepare(`
      INSERT INTO produit_emplacements (
        company_id, branch_id, produit_id, emplacement_id, quantite_stockee, seuil_reassort_picking, is_principal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(branch_id, produit_id, emplacement_id) DO UPDATE SET
        quantite_stockee = excluded.quantite_stockee,
        seuil_reassort_picking = excluded.seuil_reassort_picking,
        is_principal = excluded.is_principal,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      companyId,
      data.branchId,
      data.produitId,
      data.emplacementId,
      data.quantite || 0,
      data.capaciteMax || 100,
      isPrincipal ? 1 : 0,
    );
  })();
}

export function retirerProduitEmplacement(produitEmplacementId: number): void {
  const db = getDb();
  const record = db.prepare("SELECT * FROM produit_emplacements WHERE id = ?").get(produitEmplacementId) as any;
  if (!record) return;

  db.transaction(() => {
    db.prepare("DELETE FROM produit_emplacements WHERE id = ?").run(produitEmplacementId);
    if (record.is_principal) {
      db.prepare("UPDATE produits SET emplacement_code = '' WHERE id = ?").run(record.produit_id);
    }
  })();
}

export function getWmsKPIs(options: { companyId?: number; branchId?: number } = {}): WmsKPIs {
  const db = getDb();
  const companyId = options.companyId ?? 1;

  let whereBranch = "";
  const params: any[] = [companyId];
  if (options.branchId) {
    whereBranch = " AND branch_id = ?";
    params.push(options.branchId);
  }

  const row = db.prepare(`
    SELECT 
      COUNT(*) as total_emplacements,
      COUNT(DISTINCT CASE WHEN pe.id IS NOT NULL THEN e.id END) as emplacements_occupes,
      COUNT(DISTINCT pe.produit_id) as total_produits_cartographies
    FROM emplacements e
    LEFT JOIN produit_emplacements pe ON e.id = pe.emplacement_id
    WHERE e.company_id = ? ${whereBranch}
  `).get(...params) as {
    total_emplacements: number;
    emplacements_occupes: number;
    total_produits_cartographies: number;
  };

  const total = Number(row?.total_emplacements || 0);
  const occupes = Number(row?.emplacements_occupes || 0);
  const vides = Math.max(total - occupes, 0);
  const tauxOccupation = total > 0 ? Math.round((occupes / total) * 1000) / 10 : 0;

  return {
    totalEmplacements: total,
    emplacementsOccupes: occupes,
    emplacementsVides: vides,
    tauxOccupation,
    totalProduitsCartographies: Number(row?.total_produits_cartographies || 0),
  };
}

/**
 * Generates an optimized S-Shape picking list for a given document (BL, BS, BC, BT).
 * S-Shape logic:
 * In odd aisles (1, 3, 5...), traverse bays in ascending order (forward).
 * In even aisles (2, 4, 6...), traverse bays in descending order (backward).
 * Items without an assigned location are sorted at the end.
 */
export function genererPickingList(documentId: number): PickingListRecord {
  const db = getDb();

  // Fetch document header
  const doc = db.prepare(`
    SELECT 
      d.id,
      d.type,
      d.numero,
      d.date,
      d.branch_id,
      b.name as depot_source_nom,
      c.name as client_nom,
      f.name as fournisseur_nom
    FROM documents d
    LEFT JOIN branches b ON d.branch_id = b.id
    LEFT JOIN clients c ON d.client_id = c.id
    LEFT JOIN fournisseurs f ON d.fournisseur_id = f.id
    WHERE d.id = ?
  `).get(documentId) as {
    id: number;
    type: "bl" | "bs" | "bc" | "bt";
    numero: number;
    date: string;
    branch_id?: number;
    depot_source_nom?: string;
    client_nom?: string;
    fournisseur_nom?: string;
  } | undefined;

  if (!doc) {
    throw new Error("Document introuvable pour la préparation de commande.");
  }

  // Fetch document lines joined with primary location and product details
  const lines = db.prepare(`
    SELECT 
      dl.id as ligne_id,
      dl.produit_id,
      dl.designation,
      dl.quantite,
      dl.unite,
      p.ref as produit_ref,
      p.code_barre,
      COALESCE(e.code_emplacement, p.emplacement_code, 'NON-ASSIGNE') as emplacement_code,
      COALESCE(e.zone, 'Z') as zone,
      COALESCE(e.allee, '99') as allee,
      COALESCE(e.travee, '99') as travee,
      COALESCE(CAST(e.niveau AS TEXT), '9') as niveau,
      COALESCE(e.bac, 'Z') as bac
    FROM document_lignes dl
    LEFT JOIN produits p ON dl.produit_id = p.id
    LEFT JOIN produit_emplacements pe ON dl.produit_id = pe.produit_id AND pe.is_principal = 1
    LEFT JOIN emplacements e ON pe.emplacement_id = e.id
    WHERE dl.document_id = ?
  `).all(documentId) as Array<{
    ligne_id: number;
    produit_id?: number;
    designation: string;
    quantite: number;
    unite: string;
    produit_ref?: string;
    code_barre?: string;
    emplacement_code: string;
    zone: string;
    allee: string;
    travee: string;
    niveau: string;
    bac: string;
  }>;

  // S-Shape sorting
  const sortedLines = [...lines].sort((a, b) => {
    // 1. Zone
    if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);

    // 2. Allée
    const alleeA = parseInt(a.allee.replace(/\D/g, "") || "99", 10);
    const alleeB = parseInt(b.allee.replace(/\D/g, "") || "99", 10);
    if (alleeA !== alleeB) return alleeA - alleeB;

    // 3. Travée (S-Shape traversal)
    const traveeA = parseInt(a.travee.replace(/\D/g, "") || "99", 10);
    const traveeB = parseInt(b.travee.replace(/\D/g, "") || "99", 10);
    const isOddAllee = alleeA % 2 !== 0;

    if (traveeA !== traveeB) {
      return isOddAllee ? traveeA - traveeB : traveeB - traveeA;
    }

    // 4. Niveau
    const niveauA = parseInt(a.niveau.replace(/\D/g, "") || "9", 10);
    const niveauB = parseInt(b.niveau.replace(/\D/g, "") || "9", 10);
    if (niveauA !== niveauB) return niveauA - niveauB;

    // 5. Bac
    return a.bac.localeCompare(b.bac);
  });

  const items: PickingListItem[] = sortedLines.map((l, index) => ({
    produit_id: l.produit_id || 0,
    produit_ref: l.produit_ref || `ART-${l.produit_id || index + 1}`,
    produit_designation: l.designation,
    unite: l.unite || "u",
    quantite_demandee: Number(l.quantite || 0),
    quantite_prelevee: 0,
    emplacement_code: l.emplacement_code,
    zone: l.zone,
    allee: l.allee,
    travee: l.travee,
    niveau: l.niveau,
    bac: l.bac,
    ordre_picking: index + 1,
    code_barre: l.code_barre,
  }));

  const clientOuDestinataire = doc.client_nom || doc.fournisseur_nom || "Magasin Central";

  return {
    document_id: doc.id,
    document_type: doc.type,
    document_numero: `${doc.type.toUpperCase()}-${String(doc.numero).padStart(4, "0")}`,
    date_document: doc.date,
    client_ou_destinataire: clientOuDestinataire,
    depot_source_nom: doc.depot_source_nom || "Dépôt Principal",
    total_lignes: items.length,
    total_articles: items.reduce((acc, i) => acc + i.quantite_demandee, 0),
    items,
  };
}
