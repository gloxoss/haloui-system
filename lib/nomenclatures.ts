import { getDb } from "./db";
import {
  type ModeDestockageKit,
  type NatureProduit,
  type NomenclatureRecord,
  type NomenclaturesKPIs,
  type OrdreFabricationRecord,
  type ProduitComposantRecord,
} from "./types";

/**
 * Récupère la nomenclature (BOM) d'un produit parent avec calculs de coûts,
 * marge brute et stock virtuel fabricable dans un dépôt donné.
 */
export function getNomenclature(
  produitParentId: number,
  companyId: number = 1,
  branchId?: number
): NomenclatureRecord | null {
  const db = getDb();

  const parent = db
    .prepare(
      `SELECT id, ref, designation, nature_produit, mode_destockage_kit, prix_ht, cout_revient_calcule
       FROM produits
       WHERE id = ? AND company_id = ?`
    )
    .get(produitParentId, companyId) as any;

  if (!parent) return null;

  // Si aucun branchId fourni, prendre le premier dépôt actif
  const targetBranchId =
    branchId ??
    ((db.prepare("SELECT id FROM branches WHERE active = 1 ORDER BY id ASC LIMIT 1").get() as any)?.id || 1);

  // Récupérer les composants liés
  const rows = db
    .prepare(
      `SELECT
         pn.id,
         pn.produit_parent_id,
         pn.composant_id,
         pn.quantite,
         pn.unite,
         pn.taux_perte_pourcent,
         pn.ordre,
         pn.notes,
         c.ref AS composant_ref,
         c.designation AS composant_designation,
         c.unite AS composant_unite,
         c.prix_ht AS composant_prix_achat_ht,
         COALESCE(sd.quantite, 0) AS composant_stock_actuel
       FROM produit_nomenclatures pn
       JOIN produits c ON c.id = pn.composant_id
       LEFT JOIN stock_depots sd ON sd.produit_id = pn.composant_id AND sd.branch_id = ?
       WHERE pn.produit_parent_id = ? AND pn.company_id = ?
       ORDER BY pn.ordre ASC, pn.id ASC`
    )
    .all(targetBranchId, produitParentId, companyId) as any[];

  let coutRevientTotal = 0;
  let maxStockVirtuel = rows.length > 0 ? Infinity : 0;

  const composants: ProduitComposantRecord[] = rows.map((r) => {
    const perteFacteur = 1 + (Number(r.taux_perte_pourcent) || 0) / 100;
    const qteEffective = Number(r.quantite) * perteFacteur;
    const coutLigne = Math.round(qteEffective * Number(r.composant_prix_achat_ht) * 100) / 100;
    coutRevientTotal += coutLigne;

    // Calcul du stock virtuel disponible selon ce composant
    if (r.quantite > 0) {
      const fabricableParCeComposant = Math.floor(Number(r.composant_stock_actuel) / qteEffective);
      if (fabricableParCeComposant < maxStockVirtuel) {
        maxStockVirtuel = Math.max(0, fabricableParCeComposant);
      }
    }

    return {
      id: r.id,
      produit_parent_id: r.produit_parent_id,
      composant_id: r.composant_id,
      composant_ref: r.composant_ref,
      composant_designation: r.composant_designation,
      composant_unite: r.composant_unite || "u",
      composant_prix_achat_ht: Number(r.composant_prix_achat_ht),
      composant_stock_actuel: Number(r.composant_stock_actuel),
      quantite: Number(r.quantite),
      unite: r.unite || "u",
      taux_perte_pourcent: Number(r.taux_perte_pourcent) || 0,
      ordre: Number(r.ordre) || 0,
      notes: r.notes || "",
      cout_ligne_ht: coutLigne,
    };
  });

  if (maxStockVirtuel === Infinity) maxStockVirtuel = 0;

  // Récupérer le stock physique du kit lui-même dans ce dépôt
  const kitStockRow = db
    .prepare("SELECT quantite FROM stock_depots WHERE produit_id = ? AND branch_id = ?")
    .get(produitParentId, targetBranchId) as any;
  const stockPhysiqueKit = Number(kitStockRow?.quantite || 0);

  const prixVenteHt = Number(parent.prix_ht);
  const coutRevientHt = Math.round(coutRevientTotal * 100) / 100;
  const margeBruteHt = Math.round((prixVenteHt - coutRevientHt) * 100) / 100;
  const margePourcent =
    prixVenteHt > 0 ? Math.round((margeBruteHt / prixVenteHt) * 1000) / 10 : 0;

  return {
    produit_id: parent.id,
    produit_ref: parent.ref,
    produit_designation: parent.designation,
    nature_produit: (parent.nature_produit as NatureProduit) || "kit",
    mode_destockage_kit: (parent.mode_destockage_kit as ModeDestockageKit) || "composants",
    prix_vente_ht: prixVenteHt,
    cout_revient_ht: coutRevientHt,
    marge_brute_ht: margeBruteHt,
    marge_pourcent: margePourcent,
    stock_virtuel_fabricable: maxStockVirtuel,
    stock_physique_kit: stockPhysiqueKit,
    nb_composants: composants.length,
    composants,
  };
}

/**
 * Enregistre ou met à jour la nomenclature (BOM) d'un kit.
 */
export function saveNomenclature(input: {
  companyId?: number;
  produitParentId: number;
  natureProduit?: NatureProduit;
  modeDestockageKit?: ModeDestockageKit;
  composants: Array<{
    composantId: number;
    quantite: number;
    unite?: string;
    tauxPertePourcent?: number;
    ordre?: number;
    notes?: string;
  }>;
}) {
  const db = getDb();
  const companyId = input.companyId ?? 1;

  // Vérifier qu'un produit n'est pas son propre composant
  for (const c of input.composants) {
    if (c.composantId === input.produitParentId) {
      throw new Error("Un produit composé ne peut pas se contenir lui-même comme composant.");
    }
  }

  const apply = db.transaction(() => {
    // 1. Mettre à jour le statut du produit parent
    db.prepare(
      `UPDATE produits
       SET nature_produit = ?,
           mode_destockage_kit = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    ).run(
      input.natureProduit || "kit",
      input.modeDestockageKit || "composants",
      input.produitParentId,
      companyId
    );

    // 2. Supprimer les composants existants
    db.prepare("DELETE FROM produit_nomenclatures WHERE produit_parent_id = ? AND company_id = ?").run(
      input.produitParentId,
      companyId
    );

    // 3. Insérer les nouveaux composants
    const insertStmt = db.prepare(
      `INSERT INTO produit_nomenclatures (
         company_id, produit_parent_id, composant_id, quantite, unite, taux_perte_pourcent, ordre, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let coutRevientEstime = 0;
    const getCompPrice = db.prepare("SELECT prix_ht FROM produits WHERE id = ?");

    input.composants.forEach((c, idx) => {
      const perte = Number(c.tauxPertePourcent) || 0;
      const qte = Number(c.quantite) > 0 ? Number(c.quantite) : 1;
      insertStmt.run(
        companyId,
        input.produitParentId,
        c.composantId,
        qte,
        c.unite || "u",
        perte,
        c.ordre ?? idx + 1,
        c.notes || ""
      );

      const compRow = getCompPrice.get(c.composantId) as any;
      const prixAchat = Number(compRow?.prix_ht || 0);
      coutRevientEstime += qte * (1 + perte / 100) * prixAchat;
    });

    // 4. Mettre à jour cout_revient_calcule sur le produit parent
    db.prepare(
      `UPDATE produits
       SET cout_revient_calcule = ?
       WHERE id = ? AND company_id = ?`
    ).run(Math.round(coutRevientEstime * 100) / 100, input.produitParentId, companyId);
  });

  apply();
  return getNomenclature(input.produitParentId, companyId);
}

/**
 * Supprime la nomenclature d'un kit et repasse le produit en mode simple.
 */
export function supprimerNomenclature(produitParentId: number, companyId: number = 1) {
  const db = getDb();
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM produit_nomenclatures WHERE produit_parent_id = ? AND company_id = ?").run(
      produitParentId,
      companyId
    );
    db.prepare(
      `UPDATE produits
       SET nature_produit = 'simple',
           cout_revient_calcule = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    ).run(produitParentId, companyId);
  });
  apply();
}

/**
 * Liste tous les kits / produits composés de l'entreprise avec indicateurs de marge et stock.
 */
export function listKits(companyId: number = 1, branchId?: number): NomenclatureRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id
       FROM produits
       WHERE company_id = ? AND (nature_produit = 'kit' OR id IN (SELECT DISTINCT produit_parent_id FROM produit_nomenclatures WHERE company_id = ?))
       ORDER BY designation ASC`
    )
    .all(companyId, companyId) as Array<{ id: number }>;

  const kits: NomenclatureRecord[] = [];
  for (const row of rows) {
    const nom = getNomenclature(row.id, companyId, branchId);
    if (nom) kits.push(nom);
  }
  return kits;
}

/**
 * Récupère les KPIs globaux des nomenclatures & fabrications.
 */
export function getNomenclaturesKPIs(companyId: number = 1): NomenclaturesKPIs {
  const db = getDb();

  const totalKits = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT id) AS count
         FROM produits
         WHERE company_id = ? AND (nature_produit = 'kit' OR id IN (SELECT DISTINCT produit_parent_id FROM produit_nomenclatures WHERE company_id = ?))`
      )
      .get(companyId, companyId) as any
  )?.count || 0;

  const totalComposants = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT composant_id) AS count
         FROM produit_nomenclatures
         WHERE company_id = ?`
      )
      .get(companyId) as any
  )?.count || 0;

  const totalOrdresFabrication = (
    db
      .prepare("SELECT COUNT(*) AS count FROM ordres_fabrication WHERE company_id = ?")
      .get(companyId) as any
  )?.count || 0;

  const valeurStockKitsHT = (
    db
      .prepare(
        `SELECT COALESCE(SUM(p.prix_ht * sd.quantite), 0) AS total
         FROM produits p
         JOIN stock_depots sd ON sd.produit_id = p.id
         WHERE p.company_id = ? AND p.nature_produit = 'kit'`
      )
      .get(companyId) as any
  )?.total || 0;

  return {
    totalKits,
    totalComposants,
    totalOrdresFabrication,
    valeurStockKitsHT: Math.round(valeurStockKitsHT * 100) / 100,
  };
}

/**
 * Exécute un ordre de fabrication (assemblage en atelier) ou de désassemblage :
 * - Décrémente les composants de stock_depots
 * - Incrémente le produit fini dans stock_depots
 * - Trace les mouvements dans mouvements_stock et ordres_fabrication
 */
export function lancerOrdreFabrication(input: {
  companyId?: number;
  branchId: number;
  produitId: number;
  typeOperation?: "assemblage" | "desassemblage";
  quantite: number;
  responsableId?: number | null;
  notes?: string;
}): OrdreFabricationRecord {
  const db = getDb();
  const companyId = input.companyId ?? 1;
  const typeOperation = input.typeOperation ?? "assemblage";
  const qteAFabriquer = Number(input.quantite);

  if (qteAFabriquer <= 0) {
    throw new Error("La quantité à fabriquer doit être strictement supérieure à 0.");
  }

  const nomenclature = getNomenclature(input.produitId, companyId, input.branchId);
  if (!nomenclature || nomenclature.composants.length === 0) {
    throw new Error("Ce produit n'a aucune nomenclature ou fiche technique configurée.");
  }

  // Si assemblage, vérifier que le stock de chaque composant est suffisant
  if (typeOperation === "assemblage") {
    const manquants: string[] = [];
    for (const comp of nomenclature.composants) {
      const besoinTotal = comp.quantite * (1 + comp.taux_perte_pourcent / 100) * qteAFabriquer;
      if (comp.composant_stock_actuel < besoinTotal) {
        manquants.push(
          `${comp.composant_designation} (Requis: ${besoinTotal} ${comp.unite}, Disponible: ${comp.composant_stock_actuel})`
        );
      }
    }
    if (manquants.length > 0) {
      throw new Error(
        `Stock insuffisant pour lancer l'assemblage :\n- ${manquants.join("\n- ")}`
      );
    }
  } else {
    // Si désassemblage, vérifier que le produit fini est disponible
    if (nomenclature.stock_physique_kit < qteAFabriquer) {
      throw new Error(
        `Stock physique du kit insuffisant pour le désassemblage (Requis: ${qteAFabriquer}, Disponible: ${nomenclature.stock_physique_kit}).`
      );
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const nextNum = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM ordres_fabrication WHERE company_id = ? AND date_ordre >= ?"
      )
      .get(companyId, today.substring(0, 4) + "-01-01") as any
  )?.count || 0;
  const numeroOF = `OF-${today.substring(0, 4)}-${String(nextNum + 1).padStart(4, "0")}`;

  const coutTotalHT = Math.round(nomenclature.cout_revient_ht * qteAFabriquer * 100) / 100;

  const apply = db.transaction(() => {
    // 1. Créer l'entête OF
    const ofResult = db
      .prepare(
        `INSERT INTO ordres_fabrication (
           company_id, branch_id, numero, produit_id, type_operation, quantite_prevue, quantite_realisee,
           cout_total_ht, statut, date_ordre, date_fin, responsable_id, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'termine', ?, ?, ?, ?)`
      )
      .run(
        companyId,
        input.branchId,
        numeroOF,
        input.produitId,
        typeOperation,
        qteAFabriquer,
        qteAFabriquer,
        coutTotalHT,
        today,
        today,
        input.responsableId ?? null,
        input.notes || ""
      );

    const ordreId = Number(ofResult.lastInsertRowid);

    // 2. Traiter chaque composant
    const insertOfLigne = db.prepare(
      `INSERT INTO ordre_fabrication_lignes (
         ordre_id, composant_id, quantite_unitaire, quantite_totale, cout_unitaire_ht, cout_total_ht
       ) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const updateStockDepot = db.prepare(
      `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(company_id, branch_id, produit_id) DO UPDATE SET
         quantite = quantite + excluded.quantite,
         updated_at = CURRENT_TIMESTAMP`
    );

    const insertMvtStock = db.prepare(
      `INSERT INTO mouvements_stock (
         company_id, branch_id, produit_id, type_mouvement, quantite, stock_avant, stock_apres, reference_document, motif, user_id
       ) VALUES (?, ?, ?, 'ajustement', ?, ?, ?, ?, ?, ?)`
    );

    for (const comp of nomenclature.composants) {
      const perteFacteur = 1 + comp.taux_perte_pourcent / 100;
      const qteTotaleComp = Math.round(comp.quantite * perteFacteur * qteAFabriquer * 100) / 100;
      const coutTotalComp = Math.round(qteTotaleComp * comp.composant_prix_achat_ht * 100) / 100;

      insertOfLigne.run(
        ordreId,
        comp.composant_id,
        comp.quantite,
        qteTotaleComp,
        comp.composant_prix_achat_ht,
        coutTotalComp
      );

      // Si assemblage: décrémenter composant (-qteTotaleComp)
      // Si désassemblage: réintégrer composant (+qteTotaleComp)
      const deltaComp = typeOperation === "assemblage" ? -qteTotaleComp : qteTotaleComp;
      const stockAvantRow = db
        .prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?")
        .get(input.branchId, comp.composant_id) as any;
      const stockAvant = Number(stockAvantRow?.quantite || 0);
      const stockApres = stockAvant + deltaComp;

      updateStockDepot.run(companyId, input.branchId, comp.composant_id, deltaComp);

      insertMvtStock.run(
        companyId,
        input.branchId,
        comp.composant_id,
        deltaComp,
        stockAvant,
        stockApres,
        numeroOF,
        typeOperation === "assemblage"
          ? `Consommation fabrication ${numeroOF} (${nomenclature.produit_designation})`
          : `Réintégration désassemblage ${numeroOF}`,
        input.responsableId ?? null
      );
    }

    // 3. Traiter le produit fini (Kit)
    // Si assemblage: incrémenter kit (+qteAFabriquer)
    // Si désassemblage: décrémenter kit (-qteAFabriquer)
    const deltaKit = typeOperation === "assemblage" ? qteAFabriquer : -qteAFabriquer;
    const kitStockAvantRow = db
      .prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?")
      .get(input.branchId, input.produitId) as any;
    const kitStockAvant = Number(kitStockAvantRow?.quantite || 0);
    const kitStockApres = kitStockAvant + deltaKit;

    updateStockDepot.run(companyId, input.branchId, input.produitId, deltaKit);

    insertMvtStock.run(
      companyId,
      input.branchId,
      input.produitId,
      deltaKit,
      kitStockAvant,
      kitStockApres,
      numeroOF,
      typeOperation === "assemblage"
        ? `Entrée fabrication kit ${numeroOF}`
        : `Démontage kit ${numeroOF}`,
      input.responsableId ?? null
    );

    return ordreId;
  });

  const ofId = apply();

  const ofRecord = db
    .prepare(
      `SELECT
         of.id, of.company_id, of.branch_id, of.numero, of.produit_id, of.type_operation,
         of.quantite_prevue, of.quantite_realisee, of.cout_total_ht, of.statut, of.date_ordre,
         of.date_fin, of.responsable_id, of.notes, of.created_at,
         b.name AS branch_nom,
         p.ref AS produit_ref,
         p.designation AS produit_designation,
         u.full_name AS responsable_nom
       FROM ordres_fabrication of
       LEFT JOIN branches b ON b.id = of.branch_id
       LEFT JOIN produits p ON p.id = of.produit_id
       LEFT JOIN users u ON u.id = of.responsable_id
       WHERE of.id = ?`
    )
    .get(ofId) as any;

  return ofRecord;
}

/**
 * Liste les ordres de fabrication / assemblage enregistrés.
 */
export function listOrdresFabrication(
  companyId: number = 1,
  branchId?: number
): OrdreFabricationRecord[] {
  const db = getDb();
  let query = `
    SELECT
      of.id, of.company_id, of.branch_id, of.numero, of.produit_id, of.type_operation,
      of.quantite_prevue, of.quantite_realisee, of.cout_total_ht, of.statut, of.date_ordre,
      of.date_fin, of.responsable_id, of.notes, of.created_at,
      b.name AS branch_nom,
      p.ref AS produit_ref,
      p.designation AS produit_designation,
      u.full_name AS responsable_nom
    FROM ordres_fabrication of
    LEFT JOIN branches b ON b.id = of.branch_id
    LEFT JOIN produits p ON p.id = of.produit_id
    LEFT JOIN users u ON u.id = of.responsable_id
    WHERE of.company_id = ?
  `;
  const params: any[] = [companyId];

  if (branchId) {
    query += " AND of.branch_id = ?";
    params.push(branchId);
  }

  query += " ORDER BY of.date_ordre DESC, of.id DESC";

  return db.prepare(query).all(...params) as OrdreFabricationRecord[];
}

/**
 * Hook automatique lors de la vente/livraison :
 * Si un document contient un produit dont `nature_produit = 'kit'` et `mode_destockage_kit = 'composants'`,
 * décrémente automatiquement chacun des composants élémentaires dans le stock du dépôt.
 */
export function traiterDestockageKitsDocument(documentId: number, userId: number = 1) {
  const db = getDb();

  const doc = db
    .prepare("SELECT id, type, numero, branch_id, company_id FROM documents WHERE id = ?")
    .get(documentId) as any;
  if (!doc || !doc.branch_id) return;

  const lines = db
    .prepare(
      `SELECT dl.produit_id, dl.quantite, p.nature_produit, p.mode_destockage_kit, p.designation
       FROM document_lignes dl
       JOIN produits p ON p.id = dl.produit_id
       WHERE dl.document_id = ?`
    )
    .all(documentId) as any[];

  const docRef = `${doc.type.toUpperCase()}-${doc.numero}`;

  const apply = db.transaction(() => {
    for (const line of lines) {
      if (line.nature_produit === "kit" && line.mode_destockage_kit === "composants") {
        // Récupérer les composants de la nomenclature
        const composants = db
          .prepare(
            `SELECT pn.composant_id, pn.quantite, pn.taux_perte_pourcent, c.designation
             FROM produit_nomenclatures pn
             JOIN produits c ON c.id = pn.composant_id
             WHERE pn.produit_parent_id = ?`
          )
          .all(line.produit_id) as any[];

        for (const comp of composants) {
          const perte = 1 + (Number(comp.taux_perte_pourcent) || 0) / 100;
          const qteADecompter = Math.round(Number(line.quantite) * Number(comp.quantite) * perte * 100) / 100;

          const stockAvantRow = db
            .prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?")
            .get(doc.branch_id, comp.composant_id) as any;
          const stockAvant = Number(stockAvantRow?.quantite || 0);
          const stockApres = stockAvant - qteADecompter;

          db.prepare(
            `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
             VALUES (?, ?, ?, ?, 0)
             ON CONFLICT(company_id, branch_id, produit_id) DO UPDATE SET
               quantite = quantite - excluded.quantite,
               updated_at = CURRENT_TIMESTAMP`
          ).run(doc.company_id || 1, doc.branch_id, comp.composant_id, qteADecompter);

          db.prepare(
            `INSERT INTO mouvements_stock (
               company_id, branch_id, produit_id, type_mouvement, quantite, stock_avant, stock_apres, reference_document, motif, user_id
             ) VALUES (?, ?, ?, 'ajustement', ?, ?, ?, ?, ?, ?)`
          ).run(
            doc.company_id || 1,
            doc.branch_id,
            comp.composant_id,
            -qteADecompter,
            stockAvant,
            stockApres,
            docRef,
            `Déstockage composant pour vente kit ${line.designation} (${docRef})`,
            userId
          );
        }
      }
    }
  });

  apply();
}
