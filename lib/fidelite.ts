import { getDb } from "@/lib/db";
import {
  type BonAchatRecord,
  type FideliteConfigRecord,
  type FideliteMouvementRecord,
  type FidelitePalier,
  type FideliteStats,
} from "@/lib/types";

export function getFideliteConfig(companyId: number): FideliteConfigRecord {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM fidelite_config WHERE company_id = ?")
    .get(companyId) as any;

  if (!row) {
    db.prepare(`
      INSERT INTO fidelite_config (
        company_id, taux_dh_par_point, valeur_cashback_par_100_pts,
        seuil_conversion_min_pts, palier_silver_pts, palier_gold_pts, palier_vip_pts,
        remise_silver_pct, remise_gold_pct, remise_vip_pct, active
      ) VALUES (
        ?, 1.0, 5.0,
        100, 500, 1500, 5000,
        2.0, 5.0, 10.0, 1
      )
    `).run(companyId);

    row = db
      .prepare("SELECT * FROM fidelite_config WHERE company_id = ?")
      .get(companyId) as any;
  }

  return {
    id: row.id,
    company_id: row.company_id,
    points_par_dh: row.taux_dh_par_point ?? 1.0,
    taux_conversion_cashback: (row.valeur_cashback_par_100_pts ?? 5.0) / 100,
    palier_bronze_min_dh: 0,
    palier_silver_min_dh: (row.palier_silver_pts ?? 500) * 4,
    palier_gold_min_dh: (row.palier_gold_pts ?? 1500) * 3.5,
    palier_vip_min_dh: (row.palier_vip_pts ?? 5000) * 2,
    remise_auto_bronze: 0,
    remise_auto_silver: row.remise_silver_pct ?? 2.0,
    remise_auto_gold: row.remise_gold_pct ?? 5.0,
    remise_auto_vip: row.remise_vip_pct ?? 10.0,
    points_expiration_jours: 365,
    actif: Boolean(row.active),
  };
}

export function updateFideliteConfig(
  companyId: number,
  patch: Partial<FideliteConfigRecord>
): FideliteConfigRecord {
  const db = getDb();
  const current = getFideliteConfig(companyId);

  const pointsParDh = patch.points_par_dh ?? current.points_par_dh;
  const valeurCashback = (patch.taux_conversion_cashback !== undefined ? patch.taux_conversion_cashback * 100 : current.taux_conversion_cashback * 100);
  const remiseSilver = patch.remise_auto_silver ?? current.remise_auto_silver;
  const remiseGold = patch.remise_auto_gold ?? current.remise_auto_gold;
  const remiseVip = patch.remise_auto_vip ?? current.remise_auto_vip;
  const active = patch.actif !== undefined ? (patch.actif ? 1 : 0) : (current.actif ? 1 : 0);

  db.prepare(`
    UPDATE fidelite_config
    SET taux_dh_par_point = ?,
        valeur_cashback_par_100_pts = ?,
        remise_silver_pct = ?,
        remise_gold_pct = ?,
        remise_vip_pct = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ?
  `).run(pointsParDh, valeurCashback, remiseSilver, remiseGold, remiseVip, active, companyId);

  return getFideliteConfig(companyId);
}

export function calculerPalierClient(
  totalDepense: number,
  config?: FideliteConfigRecord
): {
  palier: FidelitePalier;
  remiseAuto: number;
  nextPalier: FidelitePalier | null;
  montantManquantNext: number;
  progressionPourcent: number;
} {
  const cfg = config || getFideliteConfig(1);

  if (totalDepense >= cfg.palier_vip_min_dh) {
    return {
      palier: "VIP",
      remiseAuto: cfg.remise_auto_vip,
      nextPalier: null,
      montantManquantNext: 0,
      progressionPourcent: 100,
    };
  }

  if (totalDepense >= cfg.palier_gold_min_dh) {
    const range = cfg.palier_vip_min_dh - cfg.palier_gold_min_dh;
    const current = totalDepense - cfg.palier_gold_min_dh;
    return {
      palier: "Gold",
      remiseAuto: cfg.remise_auto_gold,
      nextPalier: "VIP",
      montantManquantNext: Math.max(0, cfg.palier_vip_min_dh - totalDepense),
      progressionPourcent: Math.min(100, Math.round((current / range) * 100)),
    };
  }

  if (totalDepense >= cfg.palier_silver_min_dh) {
    const range = cfg.palier_gold_min_dh - cfg.palier_silver_min_dh;
    const current = totalDepense - cfg.palier_silver_min_dh;
    return {
      palier: "Silver",
      remiseAuto: cfg.remise_auto_silver,
      nextPalier: "Gold",
      montantManquantNext: Math.max(0, cfg.palier_gold_min_dh - totalDepense),
      progressionPourcent: Math.min(100, Math.round((current / range) * 100)),
    };
  }

  const range = cfg.palier_silver_min_dh;
  return {
    palier: "Bronze",
    remiseAuto: cfg.remise_auto_bronze,
    nextPalier: "Silver",
    montantManquantNext: Math.max(0, cfg.palier_silver_min_dh - totalDepense),
    progressionPourcent: range > 0 ? Math.min(100, Math.round((totalDepense / range) * 100)) : 100,
  };
}

export function attribuerPointsVente(params: {
  companyId: number;
  clientId: number;
  montantTTC: number;
  ticketId?: number | null;
  documentId?: number | null;
  motif?: string;
}): {
  pointsGagnes: number;
  nouveauSolde: number;
  nouveauPalier: FidelitePalier;
  remisePalier: number;
} {
  const db = getDb();
  const config = getFideliteConfig(params.companyId);

  if (!config.actif || params.montantTTC <= 0) {
    const client = db
      .prepare("SELECT fidelite_points, fidelite_palier FROM clients WHERE id = ?")
      .get(params.clientId) as { fidelite_points: number; fidelite_palier: string } | undefined;
    return {
      pointsGagnes: 0,
      nouveauSolde: client?.fidelite_points ?? 0,
      nouveauPalier: (client?.fidelite_palier as FidelitePalier) ?? "Bronze",
      remisePalier: 0,
    };
  }

  const client = db
    .prepare("SELECT id, name, fidelite_points, fidelite_palier, fidelite_total_depense FROM clients WHERE id = ?")
    .get(params.clientId) as {
      id: number;
      name: string;
      fidelite_points: number;
      fidelite_palier: string;
      fidelite_total_depense: number;
    } | undefined;

  if (!client) {
    return {
      pointsGagnes: 0,
      nouveauSolde: 0,
      nouveauPalier: "Bronze",
      remisePalier: 0,
    };
  }

  const pointsGagnes = Math.max(0, Math.floor(params.montantTTC * config.points_par_dh));
  const ancienSolde = client.fidelite_points || 0;
  const nouveauSolde = ancienSolde + pointsGagnes;
  const nouveauTotalDepense = (client.fidelite_total_depense || 0) + params.montantTTC;

  const palierCalc = calculerPalierClient(nouveauTotalDepense, config);

  db.transaction(() => {
    db.prepare(`
      UPDATE clients
      SET fidelite_points = ?,
          fidelite_palier = ?,
          fidelite_total_depense = ?
      WHERE id = ?
    `).run(nouveauSolde, palierCalc.palier, nouveauTotalDepense, client.id);

    db.prepare(`
      INSERT INTO fidelite_mouvements (
        company_id, client_id, type_mouvement, points, points_avant, points_apres,
        document_type, document_id, notes, created_at
      ) VALUES (?, ?, 'gain_achat', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      params.companyId,
      client.id,
      pointsGagnes,
      ancienSolde,
      nouveauSolde,
      params.ticketId ? "ticket" : "document",
      params.ticketId ?? params.documentId ?? null,
      params.motif || `Gain achat (${params.montantTTC.toFixed(2)} DH TTC)`
    );
  })();

  return {
    pointsGagnes,
    nouveauSolde,
    nouveauPalier: palierCalc.palier,
    remisePalier: palierCalc.remiseAuto,
  };
}

export function convertirPointsEnBonAchat(params: {
  companyId: number;
  branchId: number;
  clientId: number;
  userId: number;
  pointsAConvertir: number;
  validiteMois?: number;
}): {
  success: boolean;
  bonAchat: BonAchatRecord;
  soldeRestant: number;
  montantCashbackDH: number;
} {
  const db = getDb();
  const config = getFideliteConfig(params.companyId);

  if (params.pointsAConvertir <= 0) {
    throw new Error("Le nombre de points à convertir doit être supérieur à 0");
  }

  const client = db
    .prepare("SELECT id, name, fidelite_points FROM clients WHERE id = ?")
    .get(params.clientId) as { id: number; name: string; fidelite_points: number } | undefined;

  if (!client) {
    throw new Error("Client introuvable");
  }

  const soldeActuel = client.fidelite_points || 0;
  if (soldeActuel < params.pointsAConvertir) {
    throw new Error(
      `Solde de points insuffisant : vous disposez de ${soldeActuel} pts, demande: ${params.pointsAConvertir} pts`
    );
  }

  const montantCashbackDH = Math.round(params.pointsAConvertir * config.taux_conversion_cashback * 100) / 100;
  if (montantCashbackDH <= 0) {
    throw new Error("Le montant cashback résultant est inférieur à 0.01 DH");
  }

  const soldeRestant = soldeActuel - params.pointsAConvertir;
  const validiteMois = params.validiteMois || 6;
  const dateExp = new Date();
  dateExp.setMonth(dateExp.getMonth() + validiteMois);
  const dateExpiration = dateExp.toISOString().slice(0, 10);
  const codeBon = `BON-FID-${Date.now().toString(36).toUpperCase()}`;

  let branchId = params.branchId;
  if (!branchId) {
    const b = db.prepare("SELECT id FROM branches WHERE company_id = ? LIMIT 1").get(params.companyId) as { id: number } | undefined;
    branchId = b?.id || 18;
  }

  let bonAchatId = 0;

  db.transaction(() => {
    // 1. Insert into bons_achat
    const resBon = db.prepare(`
      INSERT INTO bons_achat (
        company_id, branch_id, code, montant_initial, montant_restant,
        statut, date_emission, date_expiration, client_id, notes,
        created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        'actif', CURRENT_TIMESTAMP, ?, ?, ?,
        ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      params.companyId,
      branchId,
      codeBon,
      montantCashbackDH,
      montantCashbackDH,
      dateExpiration,
      client.id,
      `Conversion fidélité (${params.pointsAConvertir} pts = ${montantCashbackDH} DH)`,
      params.userId
    );

    bonAchatId = Number(resBon.lastInsertRowid);

    // 2. Decrement client points
    db.prepare(`
      UPDATE clients
      SET fidelite_points = ?
      WHERE id = ?
    `).run(soldeRestant, client.id);

    // 3. Record movement
    db.prepare(`
      INSERT INTO fidelite_mouvements (
        company_id, client_id, type_mouvement, points, points_avant, points_apres,
        bon_achat_id, notes, created_by, created_at
      ) VALUES (?, ?, 'conversion_bon_achat', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      params.companyId,
      client.id,
      -params.pointsAConvertir,
      soldeActuel,
      soldeRestant,
      bonAchatId,
      `Conversion en bon d'achat ${codeBon} (${montantCashbackDH} DH)`,
      params.userId
    );
  })();

  const bonAchat = db
    .prepare("SELECT * FROM bons_achat WHERE id = ?")
    .get(bonAchatId) as BonAchatRecord;

  return {
    success: true,
    bonAchat,
    soldeRestant,
    montantCashbackDH,
  };
}

export function getHistoriqueFideliteClient(clientId: number): FideliteMouvementRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT fm.*, c.name as client_nom
    FROM fidelite_mouvements fm
    JOIN clients c ON c.id = fm.client_id
    WHERE fm.client_id = ?
    ORDER BY fm.created_at DESC
  `).all(clientId) as any[];

  return rows.map((r) => ({
    id: r.id,
    company_id: r.company_id,
    client_id: r.client_id,
    client_nom: r.client_nom,
    type_mouvement: r.type_mouvement === "gain_achat" ? "gain_vente" : r.type_mouvement === "conversion_bon_achat" ? "conversion_bon" : "ajustement",
    points: r.points,
    solde_apres: r.points_apres ?? 0,
    ticket_id: r.document_type === "ticket" ? r.document_id : null,
    document_id: r.document_type !== "ticket" ? r.document_id : null,
    bon_achat_id: r.bon_achat_id,
    motif: r.notes || "",
    created_at: r.created_at,
  }));
}

export function getFideliteStats(companyId: number): FideliteStats {
  const db = getDb();
  const config = getFideliteConfig(companyId);

  const clients = db.prepare(`
    SELECT fidelite_points, fidelite_palier
    FROM clients
    WHERE fidelite_points > 0 OR fidelite_palier IS NOT NULL
  `).all() as Array<{ fidelite_points: number; fidelite_palier: string }>;

  const repartition: Record<FidelitePalier, number> = {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    VIP: 0,
  };

  let totalPointsEnCirculation = 0;
  for (const c of clients) {
    totalPointsEnCirculation += c.fidelite_points || 0;
    const palier = (c.fidelite_palier as FidelitePalier) || "Bronze";
    if (repartition[palier] !== undefined) {
      repartition[palier]++;
    } else {
      repartition.Bronze++;
    }
  }

  const distribuesRow = db.prepare(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM fidelite_mouvements
    WHERE company_id = ? AND points > 0
  `).get(companyId) as { total: number } | undefined;

  const convertisRow = db.prepare(`
    SELECT COALESCE(ABS(SUM(points)), 0) as total
    FROM fidelite_mouvements
    WHERE company_id = ? AND type_mouvement = 'conversion_bon_achat'
  `).get(companyId) as { total: number } | undefined;

  return {
    totalClientsFidelises: clients.length,
    totalPointsEnCirculation,
    totalPointsDistribues: distribuesRow?.total || 0,
    totalPointsConvertis: convertisRow?.total || 0,
    valeurPointsCirculationMAD: Math.round(totalPointsEnCirculation * config.taux_conversion_cashback * 100) / 100,
    repartitionPaliers: repartition,
  };
}

export function ajusterPointsManuel(params: {
  companyId: number;
  clientId: number;
  points: number; // positive or negative
  motif: string;
}): { nouveauSolde: number } {
  const db = getDb();
  const client = db
    .prepare("SELECT id, fidelite_points FROM clients WHERE id = ?")
    .get(params.clientId) as { id: number; fidelite_points: number } | undefined;

  if (!client) throw new Error("Client introuvable");

  const ancienSolde = client.fidelite_points || 0;
  const nouveauSolde = Math.max(0, ancienSolde + params.points);

  db.transaction(() => {
    db.prepare("UPDATE clients SET fidelite_points = ? WHERE id = ?").run(nouveauSolde, client.id);
    db.prepare(`
      INSERT INTO fidelite_mouvements (
        company_id, client_id, type_mouvement, points, points_avant, points_apres, notes, created_at
      ) VALUES (?, ?, 'ajustement_manuel', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(params.companyId, client.id, params.points, ancienSolde, nouveauSolde, params.motif);
  })();

  return { nouveauSolde };
}
