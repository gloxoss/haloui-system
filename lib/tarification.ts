import { getDb } from "@/lib/db";
import { getFideliteConfig } from "@/lib/fidelite";
import {
  type CalculatedPriceResult,
  type ClientCategorieTarifaire,
  type GrilleTarifaireLigneRecord,
  type GrilleTarifaireRecord,
  type GrilleTarifaireType,
} from "@/lib/types";

export function getGrillesTarifaires(companyId: number): GrilleTarifaireRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      gt.id,
      gt.company_id,
      gt.code,
      gt.nom,
      gt.description as notes,
      CASE WHEN gt.type_application = 'contrat_client' THEN 'contrat_client' ELSE 'categorie' END as type_grille,
      gt.categorie_client as categorie_cible,
      gt.client_id,
      gt.date_debut,
      gt.date_fin,
      gt.active as actif,
      gt.created_at,
      gt.updated_at,
      c.name as client_nom,
      (SELECT COUNT(*) FROM grille_tarifaire_lignes gtl WHERE gtl.grille_id = gt.id) as lignes_count
    FROM grilles_tarifaires gt
    LEFT JOIN clients c ON c.id = gt.client_id
    WHERE gt.company_id = ?
    ORDER BY gt.created_at DESC
  `).all(companyId) as any[];

  return rows.map((r) => ({
    ...r,
    actif: Boolean(r.actif),
    remise_globale_pourcent: 0,
  }));
}

export function getGrilleTarifaireById(id: number): {
  grille: GrilleTarifaireRecord;
  lignes: GrilleTarifaireLigneRecord[];
} {
  const db = getDb();
  const grille = db.prepare(`
    SELECT
      gt.id,
      gt.company_id,
      gt.code,
      gt.nom,
      gt.description as notes,
      CASE WHEN gt.type_application = 'contrat_client' THEN 'contrat_client' ELSE 'categorie' END as type_grille,
      gt.categorie_client as categorie_cible,
      gt.client_id,
      gt.date_debut,
      gt.date_fin,
      gt.active as actif,
      gt.created_at,
      gt.updated_at,
      c.name as client_nom
    FROM grilles_tarifaires gt
    LEFT JOIN clients c ON c.id = gt.client_id
    WHERE gt.id = ?
  `).get(id) as any;

  if (!grille) {
    throw new Error(`Grille tarifaire #${id} introuvable`);
  }

  const lignes = db.prepare(`
    SELECT
      gtl.id,
      gtl.grille_id,
      gtl.produit_id,
      gtl.prix_special_ht as prix_specifique_ht,
      gtl.remise_pourcentage as remise_pourcent,
      p.ref as produit_ref,
      p.designation as produit_designation,
      p.prix_ht as prix_base_ht
    FROM grille_tarifaire_lignes gtl
    JOIN produits p ON p.id = gtl.produit_id
    WHERE gtl.grille_id = ?
    ORDER BY p.designation ASC
  `).all(id) as any[];

  const enrichedLignes = lignes.map((l) => {
    let prixFinal = l.prix_base_ht || 0;
    if (l.prix_specifique_ht !== null && l.prix_specifique_ht !== undefined) {
      prixFinal = l.prix_specifique_ht;
    } else if (l.remise_pourcent) {
      prixFinal = Math.round((prixFinal * (1 - l.remise_pourcent / 100)) * 100) / 100;
    }
    return {
      ...l,
      prix_final_ht: prixFinal,
    };
  });

  return {
    grille: {
      ...grille,
      actif: Boolean(grille.actif),
      remise_globale_pourcent: 0,
      lignes_count: enrichedLignes.length,
    },
    lignes: enrichedLignes,
  };
}

export function creerGrilleTarifaire(data: {
  companyId: number;
  code: string;
  nom: string;
  typeGrille: GrilleTarifaireType;
  categorieCible?: ClientCategorieTarifaire | null;
  clientId?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  remiseGlobalePourcent?: number;
  notes?: string;
  lignes?: Array<{
    produitId: number;
    prixSpecifiqueHt?: number | null;
    remisePourcent?: number;
  }>;
}): GrilleTarifaireRecord {
  const db = getDb();
  const typeApp = data.typeGrille === "contrat_client" ? "contrat_client" : "groupe_client";

  let newId = 0;
  db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO grilles_tarifaires (
        company_id, code, nom, description, type_application, categorie_client,
        client_id, date_debut, date_fin,
        active, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      data.companyId,
      data.code.trim().toUpperCase(),
      data.nom.trim(),
      data.notes || "",
      typeApp,
      data.categorieCible || "",
      data.clientId || null,
      data.dateDebut || "",
      data.dateFin || ""
    );

    newId = Number(res.lastInsertRowid);

    if (data.lignes && data.lignes.length > 0) {
      const insertLine = db.prepare(`
        INSERT INTO grille_tarifaire_lignes (
          grille_id, produit_id, prix_special_ht, remise_pourcentage, quantite_min, active
        ) VALUES (?, ?, ?, ?, 1, 1)
      `);
      for (const line of data.lignes) {
        insertLine.run(
          newId,
          line.produitId,
          line.prixSpecifiqueHt !== undefined ? line.prixSpecifiqueHt : null,
          line.remisePourcent || 0
        );
      }
    }
  })();

  return getGrilleTarifaireById(newId).grille;
}

export function updateGrilleTarifaire(
  id: number,
  data: Partial<GrilleTarifaireRecord> & {
    lignes?: Array<{
      produitId: number;
      prixSpecifiqueHt?: number | null;
      remisePourcent?: number;
    }>;
  }
): GrilleTarifaireRecord {
  const db = getDb();
  const current = getGrilleTarifaireById(id).grille;
  const typeApp = (data.type_grille ?? current.type_grille) === "contrat_client" ? "contrat_client" : "groupe_client";

  db.transaction(() => {
    db.prepare(`
      UPDATE grilles_tarifaires
      SET code = ?,
          nom = ?,
          description = ?,
          type_application = ?,
          categorie_client = ?,
          client_id = ?,
          date_debut = ?,
          date_fin = ?,
          active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.code !== undefined ? data.code.trim().toUpperCase() : current.code,
      data.nom !== undefined ? data.nom.trim() : current.nom,
      data.notes !== undefined ? data.notes : (current.notes || ""),
      typeApp,
      data.categorie_cible !== undefined ? data.categorie_cible : (current.categorie_cible || ""),
      data.client_id !== undefined ? data.client_id : current.client_id,
      data.date_debut !== undefined ? data.date_debut : (current.date_debut || ""),
      data.date_fin !== undefined ? data.date_fin : (current.date_fin || ""),
      data.actif !== undefined ? (data.actif ? 1 : 0) : (current.actif ? 1 : 0),
      id
    );

    if (data.lignes !== undefined) {
      db.prepare("DELETE FROM grille_tarifaire_lignes WHERE grille_id = ?").run(id);
      const insertLine = db.prepare(`
        INSERT INTO grille_tarifaire_lignes (
          grille_id, produit_id, prix_special_ht, remise_pourcentage, quantite_min, active
        ) VALUES (?, ?, ?, ?, 1, 1)
      `);
      for (const line of data.lignes) {
        insertLine.run(
          id,
          line.produitId,
          line.prixSpecifiqueHt !== undefined ? line.prixSpecifiqueHt : null,
          line.remisePourcent || 0
        );
      }
    }
  })();

  return getGrilleTarifaireById(id).grille;
}

export function supprimerGrilleTarifaire(id: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM grille_tarifaire_lignes WHERE grille_id = ?").run(id);
    db.prepare("DELETE FROM grilles_tarifaires WHERE id = ?").run(id);
  })();
}

export function assignerCategorieClient(
  clientId: number,
  categorie: ClientCategorieTarifaire
): void {
  const db = getDb();
  db.prepare("UPDATE clients SET categorie_tarifaire = ? WHERE id = ?").run(categorie, clientId);
}

/**
 * Price Resolution Algorithm:
 * 1. Specific active contract for client_id
 * 2. Category pricing grid based on clients.categorie_tarifaire
 * 3. Automatic loyalty tier discount (if better)
 * 4. Base catalog price
 */
export function calculerPrixArticleClient(params: {
  companyId: number;
  produitId: number;
  clientId?: number | null;
  todayDate?: string;
}): CalculatedPriceResult {
  const db = getDb();
  const today = params.todayDate || new Date().toISOString().slice(0, 10);

  // 0. Base product
  const produit = db
    .prepare("SELECT id, prix_ht, designation FROM produits WHERE id = ?")
    .get(params.produitId) as { id: number; prix_ht: number; designation: string } | undefined;

  if (!produit) {
    throw new Error(`Produit #${params.produitId} non trouvé`);
  }

  const basePrice = produit.prix_ht || 0;

  if (!params.clientId) {
    return {
      produit_id: produit.id,
      prix_base_ht: basePrice,
      prix_applique_ht: basePrice,
      remise_appliquee_pourcent: 0,
      source: "base",
    };
  }

  // Fetch client details
  const client = db.prepare(`
    SELECT id, name, categorie_tarifaire, fidelite_palier, fidelite_total_depense
    FROM clients
    WHERE id = ?
  `).get(params.clientId) as {
    id: number;
    name: string;
    categorie_tarifaire?: string | null;
    fidelite_palier?: string | null;
    fidelite_total_depense?: number;
  } | undefined;

  if (!client) {
    return {
      produit_id: produit.id,
      prix_base_ht: basePrice,
      prix_applique_ht: basePrice,
      remise_appliquee_pourcent: 0,
      source: "base",
    };
  }

  // 1. Check client contract (Priority 1)
  const contrat = db.prepare(`
    SELECT gt.*
    FROM grilles_tarifaires gt
    WHERE gt.company_id = ?
      AND gt.type_application = 'contrat_client'
      AND gt.client_id = ?
      AND gt.active = 1
      AND (gt.date_debut = '' OR gt.date_debut IS NULL OR gt.date_debut <= ?)
      AND (gt.date_fin = '' OR gt.date_fin IS NULL OR gt.date_fin >= ?)
    ORDER BY gt.id DESC
    LIMIT 1
  `).get(params.companyId, client.id, today, today) as any;

  if (contrat) {
    const ligneContrat = db.prepare(`
      SELECT * FROM grille_tarifaire_lignes
      WHERE grille_id = ? AND produit_id = ? AND active = 1
    `).get(contrat.id, produit.id) as any;

    if (ligneContrat) {
      if (ligneContrat.prix_special_ht !== null && ligneContrat.prix_special_ht !== undefined) {
        const remiseEquiv = basePrice > 0
          ? Math.max(0, Math.round(((basePrice - ligneContrat.prix_special_ht) / basePrice) * 10000) / 100)
          : 0;
        return {
          produit_id: produit.id,
          prix_base_ht: basePrice,
          prix_applique_ht: ligneContrat.prix_special_ht,
          remise_appliquee_pourcent: remiseEquiv,
          source: "contrat_client",
          source_nom: contrat.nom,
        };
      } else if (ligneContrat.remise_pourcentage) {
        const prixCalc = Math.round((basePrice * (1 - ligneContrat.remise_pourcentage / 100)) * 100) / 100;
        return {
          produit_id: produit.id,
          prix_base_ht: basePrice,
          prix_applique_ht: prixCalc,
          remise_appliquee_pourcent: ligneContrat.remise_pourcentage,
          source: "contrat_client",
          source_nom: contrat.nom,
        };
      }
    }
  }

  // 2. Check category pricing grid (Priority 2)
  if (client.categorie_tarifaire) {
    const grilleCat = db.prepare(`
      SELECT gt.*
      FROM grilles_tarifaires gt
      WHERE gt.company_id = ?
        AND gt.type_application = 'groupe_client'
        AND gt.categorie_client = ?
        AND gt.active = 1
        AND (gt.date_debut = '' OR gt.date_debut IS NULL OR gt.date_debut <= ?)
        AND (gt.date_fin = '' OR gt.date_fin IS NULL OR gt.date_fin >= ?)
      ORDER BY gt.id DESC
      LIMIT 1
    `).get(params.companyId, client.categorie_tarifaire, today, today) as any;

    if (grilleCat) {
      const ligneCat = db.prepare(`
        SELECT * FROM grille_tarifaire_lignes
        WHERE grille_id = ? AND produit_id = ? AND active = 1
      `).get(grilleCat.id, produit.id) as any;

      if (ligneCat) {
        if (ligneCat.prix_special_ht !== null && ligneCat.prix_special_ht !== undefined) {
          const remiseEquiv = basePrice > 0
            ? Math.max(0, Math.round(((basePrice - ligneCat.prix_special_ht) / basePrice) * 10000) / 100)
            : 0;
          return {
            produit_id: produit.id,
            prix_base_ht: basePrice,
            prix_applique_ht: ligneCat.prix_special_ht,
            remise_appliquee_pourcent: remiseEquiv,
            source: "grille_categorie",
            source_nom: grilleCat.nom,
          };
        } else if (ligneCat.remise_pourcentage) {
          const prixCalc = Math.round((basePrice * (1 - ligneCat.remise_pourcentage / 100)) * 100) / 100;
          return {
            produit_id: produit.id,
            prix_base_ht: basePrice,
            prix_applique_ht: prixCalc,
            remise_appliquee_pourcent: ligneCat.remise_pourcentage,
            source: "grille_categorie",
            source_nom: grilleCat.nom,
          };
        }
      }
    }
  }

  // 3. Loyalty Palier Auto Discount (Priority 3)
  if (client.fidelite_palier && client.fidelite_palier !== "Bronze") {
    const fideliteConfig = getFideliteConfig(params.companyId);
    let remisePalier = 0;
    if (client.fidelite_palier === "Silver") remisePalier = fideliteConfig.remise_auto_silver;
    else if (client.fidelite_palier === "Gold") remisePalier = fideliteConfig.remise_auto_gold;
    else if (client.fidelite_palier === "VIP") remisePalier = fideliteConfig.remise_auto_vip;

    if (remisePalier > 0) {
      const prixCalc = Math.round((basePrice * (1 - remisePalier / 100)) * 100) / 100;
      return {
        produit_id: produit.id,
        prix_base_ht: basePrice,
        prix_applique_ht: prixCalc,
        remise_appliquee_pourcent: remisePalier,
        source: "palier_fidelite",
        source_nom: `Avantage Palier ${client.fidelite_palier}`,
      };
    }
  }

  // 4. Base price fallback
  return {
    produit_id: produit.id,
    prix_base_ht: basePrice,
    prix_applique_ht: basePrice,
    remise_appliquee_pourcent: 0,
    source: "base",
  };
}
