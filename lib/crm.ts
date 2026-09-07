import { getDb } from "@/lib/db";
import {
  type CRMEtape,
  type CRMOpportuniteActiviteRecord,
  type CRMOpportuniteRecord,
  type CRMPipelineKPIs,
} from "@/lib/types";

const ETAPE_PROBABILITES: Record<CRMEtape, number> = {
  nouveau_contact: 10,
  qualification: 30,
  devis_envoye: 60,
  negociation: 80,
  gagne: 100,
  perdu: 0,
};

export function getCRMOpportunites(
  companyId: number,
  options?: {
    commercialId?: number;
    search?: string;
  }
): CRMOpportuniteRecord[] {
  const db = getDb();
  let query = `
    SELECT
      o.id,
      o.company_id,
      o.branch_id,
      o.titre,
      o.client_id,
      o.contact_nom,
      o.contact_phone as contact_telephone,
      o.contact_email,
      o.commercial_id,
      o.etape,
      o.montant_estime as montant_estime_ht,
      o.probabilite as probabilite_pourcent,
      o.date_cloture_prevue,
      o.devis_id as devis_document_id,
      o.notes,
      o.motif_perte,
      o.ordre as ordre_kanban,
      o.created_at,
      o.updated_at,
      c.name as client_associe_nom,
      COALESCE(c.name, o.contact_nom, 'Prospect') as client_nom,
      u.full_name as commercial_nom,
      d.numero as devis_numero
    FROM crm_opportunites o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN users u ON u.id = o.commercial_id
    LEFT JOIN documents d ON d.id = o.devis_id
    WHERE o.company_id = ?
  `;
  const params: any[] = [companyId];

  if (options?.commercialId) {
    query += " AND o.commercial_id = ?";
    params.push(options.commercialId);
  }

  if (options?.search) {
    query += " AND (o.titre LIKE ? OR c.name LIKE ? OR o.contact_nom LIKE ?)";
    const term = `%${options.search.trim()}%`;
    params.push(term, term, term);
  }

  query += " ORDER BY o.ordre ASC, o.created_at DESC";
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((r) => ({
    ...r,
    montant_estime_ht: r.montant_estime_ht || 0,
    montant_pondere_ht:
      Math.round(((r.montant_estime_ht || 0) * (r.probabilite_pourcent || 0) / 100) * 100) / 100,
  }));
}

export function getCRMOpportuniteById(id: number): {
  opportunite: CRMOpportuniteRecord;
  activites: CRMOpportuniteActiviteRecord[];
} {
  const db = getDb();
  const opp = db.prepare(`
    SELECT
      o.id,
      o.company_id,
      o.branch_id,
      o.titre,
      o.client_id,
      o.contact_nom,
      o.contact_phone as contact_telephone,
      o.contact_email,
      o.commercial_id,
      o.etape,
      o.montant_estime as montant_estime_ht,
      o.probabilite as probabilite_pourcent,
      o.date_cloture_prevue,
      o.devis_id as devis_document_id,
      o.notes,
      o.motif_perte,
      o.ordre as ordre_kanban,
      o.created_at,
      o.updated_at,
      c.name as client_associe_nom,
      COALESCE(c.name, o.contact_nom, 'Prospect') as client_nom,
      u.full_name as commercial_nom,
      d.numero as devis_numero
    FROM crm_opportunites o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN users u ON u.id = o.commercial_id
    LEFT JOIN documents d ON d.id = o.devis_id
    WHERE o.id = ?
  `).get(id) as any;

  if (!opp) throw new Error(`Opportunité CRM #${id} non trouvée`);

  const activites = db.prepare(`
    SELECT
      a.id,
      a.opportunite_id,
      a.type as type_activite,
      a.titre,
      a.description,
      a.date_activite,
      a.created_by as user_id,
      a.created_at,
      u.full_name as user_nom
    FROM crm_opportunite_activites a
    LEFT JOIN users u ON u.id = a.created_by
    WHERE a.opportunite_id = ?
    ORDER BY a.created_at DESC
  `).all(id) as CRMOpportuniteActiviteRecord[];

  return {
    opportunite: {
      ...opp,
      montant_estime_ht: opp.montant_estime_ht || 0,
      montant_pondere_ht:
        Math.round(((opp.montant_estime_ht || 0) * (opp.probabilite_pourcent || 0) / 100) * 100) / 100,
    },
    activites,
  };
}

export function creerCRMOpportunite(data: {
  companyId: number;
  branchId?: number | null;
  titre: string;
  clientId?: number | null;
  clientNom?: string;
  contactNom?: string;
  contactTelephone?: string;
  contactEmail?: string;
  commercialId?: number | null;
  etape?: CRMEtape;
  probabilitePourcent?: number;
  montantEstimeHt: number;
  dateCloturePrevue?: string | null;
  notes?: string;
  userId?: number;
}): CRMOpportuniteRecord {
  const db = getDb();
  const etape: CRMEtape = data.etape || "nouveau_contact";
  const probabilite =
    data.probabilitePourcent !== undefined
      ? data.probabilitePourcent
      : (ETAPE_PROBABILITES[etape] ?? 10);

  let oppId = 0;
  db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO crm_opportunites (
        company_id, branch_id, titre, client_id,
        contact_nom, contact_phone, contact_email, commercial_id,
        etape, montant_estime, probabilite,
        date_cloture_prevue, notes, ordre, created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      data.companyId,
      data.branchId || null,
      data.titre.trim(),
      data.clientId || null,
      data.contactNom || data.clientNom || "",
      data.contactTelephone || "",
      data.contactEmail || "",
      data.commercialId || null,
      etape,
      data.montantEstimeHt || 0,
      probabilite,
      data.dateCloturePrevue || "",
      data.notes || "",
      data.userId || null
    );

    oppId = Number(res.lastInsertRowid);

    db.prepare(`
      INSERT INTO crm_opportunite_activites (
        opportunite_id, created_by, type, titre, description, date_activite, created_at
      ) VALUES (?, ?, 'note', 'Création de la piste commerciale', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      oppId,
      data.userId || null,
      `Piste créée au montant estimé de ${(data.montantEstimeHt || 0).toFixed(2)} DH HT`
    );
  })();

  return getCRMOpportuniteById(oppId).opportunite;
}

export function deplacerEtapeOpportunite(
  id: number,
  nouvelleEtape: CRMEtape,
  options?: {
    probabiliteCustom?: number;
    userId?: number;
    notes?: string;
    motifPerte?: string;
  }
): CRMOpportuniteRecord {
  const db = getDb();
  const current = getCRMOpportuniteById(id).opportunite;

  const probabilite =
    options?.probabiliteCustom !== undefined
      ? options.probabiliteCustom
      : (ETAPE_PROBABILITES[nouvelleEtape] ?? current.probabilite_pourcent);

  db.transaction(() => {
    db.prepare(`
      UPDATE crm_opportunites
      SET etape = ?,
          probabilite = ?,
          motif_perte = CASE WHEN ? = 'perdu' THEN ? ELSE motif_perte END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nouvelleEtape,
      probabilite,
      nouvelleEtape,
      options?.motifPerte || null,
      id
    );

    db.prepare(`
      INSERT INTO crm_opportunite_activites (
        opportunite_id, created_by, type, titre, description, date_activite, created_at
      ) VALUES (?, ?, 'changement_etape', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      options?.userId || null,
      `Passage à l'étape : ${nouvelleEtape.toUpperCase()}`,
      options?.notes || `Probabilité ajustée à ${probabilite}%.`
    );
  })();

  return getCRMOpportuniteById(id).opportunite;
}

export function convertirOpportuniteEnDevis(
  opportuniteId: number,
  userId: number
): {
  documentId: number;
  numeroDevis: number;
  opportunite: CRMOpportuniteRecord;
} {
  const db = getDb();
  const opp = getCRMOpportuniteById(opportuniteId).opportunite;

  if (opp.devis_document_id) {
    const existingDoc = db.prepare("SELECT id, numero FROM documents WHERE id = ?").get(opp.devis_document_id) as { id: number; numero: number } | undefined;
    if (existingDoc) {
      return {
        documentId: existingDoc.id,
        numeroDevis: existingDoc.numero,
        opportunite: opp,
      };
    }
  }

  let docId = 0;
  let devisNum = 0;

  db.transaction(() => {
    const nextNumRow = db.prepare(`
      SELECT COALESCE(MAX(numero), 0) + 1 as next_num
      FROM documents
      WHERE company_id = ? AND type = 'devis'
    `).get(opp.company_id) as { next_num: number };
    devisNum = nextNumRow.next_num;

    const dateToday = new Date().toISOString().slice(0, 10);
    const dateEcheance = new Date();
    dateEcheance.setDate(dateEcheance.getDate() + 30);
    const dateEcheanceStr = dateEcheance.toISOString().slice(0, 10);

    const totalHt = opp.montant_estime_ht || 0;
    const totalTva = Math.round((totalHt * 0.2) * 100) / 100;
    const totalTtc = Math.round((totalHt + totalTva) * 100) / 100;

    const res = db.prepare(`
      INSERT INTO documents (
        company_id, type, numero, date, date_echeance, branch_id,
        client_id, commercial_id, total_ht, total_tva, total_ttc,
        remise, avance, reste, notes, status, created_by, updated_by,
        created_at, updated_at
      ) VALUES (
        ?, 'devis', ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        0, 0, ?, ?, 'brouillon', ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      opp.company_id,
      devisNum,
      dateToday,
      dateEcheanceStr,
      opp.branch_id || null,
      opp.client_id || null,
      opp.commercial_id || null,
      totalHt,
      totalTva,
      totalTtc,
      totalTtc,
      `Devis généré depuis l'opportunité CRM : ${opp.titre}`,
      userId,
      userId
    );

    docId = Number(res.lastInsertRowid);

    // Add a default line with opportunity description
    db.prepare(`
      INSERT INTO document_lignes (
        document_id, produit_id, designation, quantite, unite,
        prix_unitaire_ht, tva_rate, remise, total_ht
      ) VALUES (?, NULL, ?, 1, 'prestation', ?, 20.0, 0, ?)
    `).run(docId, opp.titre, totalHt, totalHt);

    // Update opportunity: link quote and advance to devis_envoye
    db.prepare(`
      UPDATE crm_opportunites
      SET devis_id = ?,
          etape = 'devis_envoye',
          probabilite = 60,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(docId, opp.id);

    db.prepare(`
      INSERT INTO crm_opportunite_activites (
        opportunite_id, created_by, type, titre, description, date_activite, created_at
      ) VALUES (?, ?, 'note', 'Conversion en Devis', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      opp.id,
      userId,
      `Génération automatique du Devis N° DEVIS-${devisNum} (${totalHt.toFixed(2)} DH HT)`
    );
  })();

  return {
    documentId: docId,
    numeroDevis: devisNum,
    opportunite: getCRMOpportuniteById(opp.id).opportunite,
  };
}

export function ajouterActiviteOpportunite(
  opportuniteId: number,
  data: {
    userId?: number;
    typeActivite: "appel" | "reunion" | "email" | "devis" | "changement_etape" | "note";
    titre: string;
    description?: string;
  }
): void {
  const db = getDb();
  const typeDb = data.typeActivite === "devis" ? "note" : data.typeActivite;
  db.prepare(`
    INSERT INTO crm_opportunite_activites (
      opportunite_id, created_by, type, titre, description, date_activite, created_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    opportuniteId,
    data.userId || null,
    typeDb,
    data.titre.trim(),
    data.description || ""
  );
}

export function getCRMPipelineKPIs(companyId: number): CRMPipelineKPIs {
  const db = getDb();
  const rows = db.prepare(`
    SELECT etape, montant_estime, probabilite
    FROM crm_opportunites
    WHERE company_id = ?
  `).all(companyId) as Array<{
    etape: CRMEtape;
    montant_estime: number;
    probabilite: number;
  }>;

  let totalOpportunites = rows.length;
  let opportunitesActives = 0;
  let montantTotalPipelineHT = 0;
  let montantPonderePipelineHT = 0;
  let montantGagneHT = 0;
  let totalGagnes = 0;
  let totalClotures = 0;

  for (const r of rows) {
    const montant = r.montant_estime || 0;
    const proba = r.probabilite || 0;
    const pondere = (montant * proba) / 100;

    if (r.etape !== "gagne" && r.etape !== "perdu") {
      opportunitesActives++;
      montantTotalPipelineHT += montant;
      montantPonderePipelineHT += pondere;
    } else {
      totalClotures++;
      if (r.etape === "gagne") {
        totalGagnes++;
        montantGagneHT += montant;
      }
    }
  }

  const tauxConversion =
    totalClotures > 0
      ? Math.round((totalGagnes / totalClotures) * 100)
      : totalGagnes > 0
      ? 100
      : 0;

  return {
    totalOpportunites,
    opportunitesActives,
    montantTotalPipelineHT: Math.round(montantTotalPipelineHT * 100) / 100,
    montantPonderePipelineHT: Math.round(montantPonderePipelineHT * 100) / 100,
    montantGagneHT: Math.round(montantGagneHT * 100) / 100,
    tauxConversion,
  };
}

export function supprimerCRMOpportunite(id: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM crm_opportunite_activites WHERE opportunite_id = ?").run(id);
    db.prepare("DELETE FROM crm_opportunites WHERE id = ?").run(id);
  })();
}
