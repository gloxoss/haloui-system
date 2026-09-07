import { getDb } from "@/lib/db";
import {
  type MargeBranchItem,
  type MargeClientItem,
  type MargeFamilleItem,
  type MargeProduitItem,
  type MargeStatsGlobales,
} from "@/lib/types";

export type MargeFilters = {
  dateDebut?: string;
  dateFin?: string;
  branchId?: number;
  famille?: string;
  clientId?: number;
};

export function getMargeStatsGlobales(
  companyId: number = 1,
  filters?: MargeFilters
): MargeStatsGlobales {
  const db = getDb();

  // Query sales lines from valid invoices and delivery notes
  let sql = `
    SELECT 
      dl.quantite,
      dl.prix_unitaire_ht,
      dl.remise,
      dl.total_ht,
      COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0) AS cout_achat_unitaire
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    LEFT JOIN produits p ON p.id = dl.produit_id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.status != 'brouillon'
  `;

  const params: any[] = [companyId];

  if (filters?.dateDebut) {
    sql += " AND d.date >= ?";
    params.push(filters.dateDebut);
  }

  if (filters?.dateFin) {
    sql += " AND d.date <= ?";
    params.push(filters.dateFin);
  }

  if (filters?.branchId) {
    sql += " AND d.branch_id = ?";
    params.push(filters.branchId);
  }

  if (filters?.clientId) {
    sql += " AND d.client_id = ?";
    params.push(filters.clientId);
  }

  if (filters?.famille) {
    sql += " AND p.categorie = ?";
    params.push(filters.famille);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    quantite: number;
    prix_unitaire_ht: number;
    remise: number;
    total_ht: number;
    cout_achat_unitaire: number;
  }>;

  let caTotalHt = 0;
  let coutTotalAchat = 0;

  for (const r of rows) {
    const qte = Number(r.quantite) || 0;
    const ca = Number(r.total_ht) || 0;
    const coutUnitaire = Number(r.cout_achat_unitaire) || 0;
    const coutLigne = qte * coutUnitaire;

    caTotalHt += ca;
    coutTotalAchat += coutLigne;
  }

  // Also include POS receipts if not filtered by specific doc client
  if (!filters?.clientId) {
    let posSql = `
      SELECT 
        ctl.quantite,
        ctl.total_ttc,
        COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0) AS cout_achat_unitaire,
        COALESCE(p.tva_rate, 20) AS tva_rate
      FROM caisse_ticket_lignes ctl
      JOIN caisse_tickets ct ON ct.id = ctl.ticket_id
      LEFT JOIN produits p ON p.id = ctl.produit_id
      WHERE ct.company_id = ?
        AND ct.statut != 'annule'
    `;
    const posParams: any[] = [companyId];

    if (filters?.dateDebut) {
      posSql += " AND ct.created_at >= ?";
      posParams.push(filters.dateDebut);
    }
    if (filters?.dateFin) {
      posSql += " AND ct.created_at <= ?";
      posParams.push(`${filters.dateFin} 23:59:59`);
    }
    if (filters?.branchId) {
      posSql += " AND ct.branch_id = ?";
      posParams.push(filters.branchId);
    }
    if (filters?.famille) {
      posSql += " AND p.categorie = ?";
      posParams.push(filters.famille);
    }

    const posRows = db.prepare(posSql).all(...posParams) as Array<{
      quantite: number;
      total_ttc: number;
      cout_achat_unitaire: number;
      tva_rate: number;
    }>;

    for (const pr of posRows) {
      const qte = Number(pr.quantite) || 0;
      const tva = Number(pr.tva_rate) || 20;
      const ttc = Number(pr.total_ttc) || 0;
      const ht = ttc / (1 + tva / 100);
      const coutUnitaire = Number(pr.cout_achat_unitaire) || 0;
      const coutLigne = qte * coutUnitaire;

      caTotalHt += ht;
      coutTotalAchat += coutLigne;
    }
  }

  caTotalHt = Math.round(caTotalHt * 100) / 100;
  coutTotalAchat = Math.round(coutTotalAchat * 100) / 100;
  const margeBruteTotale = Math.round((caTotalHt - coutTotalAchat) * 100) / 100;
  const tauxMargeGlobal = caTotalHt > 0 ? Math.round((margeBruteTotale / caTotalHt) * 1000) / 10 : 0;
  const tauxMarqueGlobal = coutTotalAchat > 0 ? Math.round((margeBruteTotale / coutTotalAchat) * 1000) / 10 : 0;

  return {
    ca_total_ht: caTotalHt,
    cout_total_achat: coutTotalAchat,
    marge_brute_totale: margeBruteTotale,
    taux_marge_global: tauxMargeGlobal,
    taux_marque_global: tauxMarqueGlobal,
    nb_ventes: rows.length,
  };
}

export function getMargeParProduit(
  companyId: number = 1,
  filters?: MargeFilters,
  limit: number = 25
): MargeProduitItem[] {
  const db = getDb();

  let sql = `
    SELECT 
      p.id AS produit_id,
      p.ref,
      p.designation,
      COALESCE(p.categorie, 'Non catégorisé') AS categorie,
      SUM(dl.quantite) AS quantite_vendue,
      SUM(dl.total_ht) AS ca_ht,
      COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0) AS cout_unitaire
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    JOIN produits p ON p.id = dl.produit_id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.status != 'brouillon'
  `;

  const params: any[] = [companyId];

  if (filters?.dateDebut) {
    sql += " AND d.date >= ?";
    params.push(filters.dateDebut);
  }
  if (filters?.dateFin) {
    sql += " AND d.date <= ?";
    params.push(filters.dateFin);
  }
  if (filters?.branchId) {
    sql += " AND d.branch_id = ?";
    params.push(filters.branchId);
  }
  if (filters?.famille) {
    sql += " AND p.categorie = ?";
    params.push(filters.famille);
  }

  sql += `
    GROUP BY p.id
    ORDER BY ca_ht DESC
    LIMIT ?
  `;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Array<{
    produit_id: number;
    ref: string;
    designation: string;
    categorie: string;
    quantite_vendue: number;
    ca_ht: number;
    cout_unitaire: number;
  }>;

  return rows.map((r) => {
    const qte = Number(r.quantite_vendue) || 0;
    const ca = Math.round((Number(r.ca_ht) || 0) * 100) / 100;
    const coutTotal = Math.round(qte * (Number(r.cout_unitaire) || 0) * 100) / 100;
    const marge = Math.round((ca - coutTotal) * 100) / 100;
    const tauxMarge = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;
    const tauxMarque = coutTotal > 0 ? Math.round((marge / coutTotal) * 1000) / 10 : 0;

    return {
      produit_id: r.produit_id,
      ref: r.ref,
      designation: r.designation,
      categorie: r.categorie,
      quantite_vendue: qte,
      ca_ht: ca,
      cout_total_achat: coutTotal,
      marge_brute: marge,
      taux_marge: tauxMarge,
      taux_marque: tauxMarque,
    };
  });
}

export function getMargeParFamille(
  companyId: number = 1,
  filters?: MargeFilters
): MargeFamilleItem[] {
  const db = getDb();

  let sql = `
    SELECT 
      COALESCE(p.categorie, 'Non catégorisé') AS famille,
      COUNT(DISTINCT p.id) AS nb_produits,
      SUM(dl.quantite) AS quantite_vendue,
      SUM(dl.total_ht) AS ca_ht,
      SUM(dl.quantite * COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0)) AS cout_total_achat
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    JOIN produits p ON p.id = dl.produit_id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.status != 'brouillon'
  `;

  const params: any[] = [companyId];

  if (filters?.dateDebut) {
    sql += " AND d.date >= ?";
    params.push(filters.dateDebut);
  }
  if (filters?.dateFin) {
    sql += " AND d.date <= ?";
    params.push(filters.dateFin);
  }
  if (filters?.branchId) {
    sql += " AND d.branch_id = ?";
    params.push(filters.branchId);
  }

  sql += `
    GROUP BY p.categorie
    ORDER BY ca_ht DESC
  `;

  const rows = db.prepare(sql).all(...params) as Array<{
    famille: string;
    nb_produits: number;
    quantite_vendue: number;
    ca_ht: number;
    cout_total_achat: number;
  }>;

  return rows.map((r) => {
    const ca = Math.round((Number(r.ca_ht) || 0) * 100) / 100;
    const cout = Math.round((Number(r.cout_total_achat) || 0) * 100) / 100;
    const marge = Math.round((ca - cout) * 100) / 100;
    const tauxMarge = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;

    return {
      famille: r.famille,
      nb_produits: Number(r.nb_produits) || 0,
      quantite_vendue: Number(r.quantite_vendue) || 0,
      ca_ht: ca,
      cout_total_achat: cout,
      marge_brute: marge,
      taux_marge: tauxMarge,
    };
  });
}

export function getMargeParClient(
  companyId: number = 1,
  filters?: MargeFilters,
  limit: number = 15
): MargeClientItem[] {
  const db = getDb();

  let sql = `
    SELECT 
      c.id AS client_id,
      c.name AS client_nom,
      COALESCE(c.categorie_tarifaire, 'particulier') AS categorie_tarifaire,
      SUM(dl.total_ht) AS ca_ht,
      SUM(dl.quantite * COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0)) AS cout_total_achat
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    JOIN clients c ON c.id = d.client_id
    LEFT JOIN produits p ON p.id = dl.produit_id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.status != 'brouillon'
  `;

  const params: any[] = [companyId];

  if (filters?.dateDebut) {
    sql += " AND d.date >= ?";
    params.push(filters.dateDebut);
  }
  if (filters?.dateFin) {
    sql += " AND d.date <= ?";
    params.push(filters.dateFin);
  }
  if (filters?.branchId) {
    sql += " AND d.branch_id = ?";
    params.push(filters.branchId);
  }

  sql += `
    GROUP BY c.id
    ORDER BY ca_ht DESC
    LIMIT ?
  `;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Array<{
    client_id: number;
    client_nom: string;
    categorie_tarifaire: string;
    ca_ht: number;
    cout_total_achat: number;
  }>;

  return rows.map((r) => {
    const ca = Math.round((Number(r.ca_ht) || 0) * 100) / 100;
    const cout = Math.round((Number(r.cout_total_achat) || 0) * 100) / 100;
    const marge = Math.round((ca - cout) * 100) / 100;
    const tauxMarge = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;

    return {
      client_id: r.client_id,
      client_nom: r.client_nom,
      categorie_tarifaire: r.categorie_tarifaire,
      ca_ht: ca,
      cout_total_achat: cout,
      marge_brute: marge,
      taux_marge: tauxMarge,
    };
  });
}

export function getMargeParBranch(
  companyId: number = 1,
  filters?: MargeFilters
): MargeBranchItem[] {
  const db = getDb();

  let sql = `
    SELECT 
      b.id AS branch_id,
      b.name AS branch_nom,
      SUM(dl.total_ht) AS ca_ht,
      SUM(dl.quantite * COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0)) AS cout_total_achat
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    JOIN branches b ON b.id = d.branch_id
    LEFT JOIN produits p ON p.id = dl.produit_id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.status != 'brouillon'
  `;

  const params: any[] = [companyId];

  if (filters?.dateDebut) {
    sql += " AND d.date >= ?";
    params.push(filters.dateDebut);
  }
  if (filters?.dateFin) {
    sql += " AND d.date <= ?";
    params.push(filters.dateFin);
  }

  sql += `
    GROUP BY b.id
    ORDER BY ca_ht DESC
  `;

  const rows = db.prepare(sql).all(...params) as Array<{
    branch_id: number;
    branch_nom: string;
    ca_ht: number;
    cout_total_achat: number;
  }>;

  return rows.map((r) => {
    const ca = Math.round((Number(r.ca_ht) || 0) * 100) / 100;
    const cout = Math.round((Number(r.cout_total_achat) || 0) * 100) / 100;
    const marge = Math.round((ca - cout) * 100) / 100;
    const tauxMarge = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;

    return {
      branch_id: r.branch_id,
      branch_nom: r.branch_nom,
      ca_ht: ca,
      cout_total_achat: cout,
      marge_brute: marge,
      taux_marge: tauxMarge,
    };
  });
}

export function getMargeEvolutionMensuelle(
  companyId: number = 1,
  year: string = new Date().getFullYear().toString()
) {
  const db = getDb();

  const rows = db
    .prepare(
      `
    SELECT 
      SUBSTR(d.date, 1, 7) AS mois,
      SUM(dl.total_ht) AS ca_ht,
      SUM(dl.quantite * COALESCE(p.cout_revient_calcule, p.prix_ht * 0.7, 0)) AS cout_achat
    FROM document_lignes dl
    JOIN documents d ON d.id = dl.document_id
    LEFT JOIN produits p ON p.id = dl.produit_id
    WHERE d.company_id = ?
      AND d.type IN ('facture', 'bl')
      AND d.status != 'brouillon'
      AND d.date LIKE ?
    GROUP BY SUBSTR(d.date, 1, 7)
    ORDER BY mois ASC
  `
    )
    .all(companyId, `${year}-%`) as Array<{
    mois: string;
    ca_ht: number;
    cout_achat: number;
  }>;

  return rows.map((r) => {
    const ca = Math.round((Number(r.ca_ht) || 0) * 100) / 100;
    const cout = Math.round((Number(r.cout_achat) || 0) * 100) / 100;
    const marge = Math.round((ca - cout) * 100) / 100;
    const taux = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;
    return {
      mois: r.mois,
      ca_ht: ca,
      cout_achat: cout,
      marge_brute: marge,
      taux_marge: taux,
    };
  });
}
