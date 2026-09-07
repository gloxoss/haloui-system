import { getDb } from "@/lib/db";
import {
  type BulletinPaieRecord,
  type BulletinPaieStatut,
  type PretAvanceRecord,
  type PretEcheancierRecord,
  type PretStatut,
  type PretType,
} from "@/lib/types";

export function creerPretAvance(params: {
  companyId?: number;
  employeId: number;
  type: PretType;
  montantTotal: number;
  dateOctroi: string;
  nbMensualites: number;
  modePaiement?: string;
  notes?: string;
  userId?: number;
}): PretAvanceRecord {
  const db = getDb();
  const companyId = params.companyId || 1;

  if (params.montantTotal <= 0) {
    throw new Error("Le montant du prêt ou de l'avance doit être supérieur à 0");
  }

  const nbMensualites = Math.max(1, params.nbMensualites || 1);
  const montantMensualite = Math.round((params.montantTotal / nbMensualites) * 100) / 100;

  let pretId = 0;

  db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO prets_avances (
        company_id, employe_id, type, montant_total, date_octroi,
        nb_mensualites, montant_mensualite, montant_rembourse, solde_restant,
        mode_paiement, statut, notes, created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, 0, ?,
        ?, 'actif', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      companyId,
      params.employeId,
      params.type,
      params.montantTotal,
      params.dateOctroi,
      nbMensualites,
      montantMensualite,
      params.montantTotal,
      params.modePaiement || "virement",
      params.notes || "",
      params.userId || null
    );

    pretId = Number(res.lastInsertRowid);

    // Générer l'échéancier mensuel
    const insertEch = db.prepare(`
      INSERT INTO prets_echeancier (
        pret_id, employe_id, numero_mensualite, mois_prelevement,
        montant_echeance, montant_preleve, statut
      ) VALUES (?, ?, ?, ?, ?, 0, 'a_prelever')
    `);

    const dateBase = new Date(params.dateOctroi);
    for (let i = 1; i <= nbMensualites; i++) {
      const d = new Date(dateBase);
      d.setMonth(d.getMonth() + (i - 1));
      const moisStr = d.toISOString().slice(0, 7); // YYYY-MM
      insertEch.run(pretId, params.employeId, i, moisStr, montantMensualite);
    }
  })();

  return getPretById(pretId)!;
}

export function getPretById(id: number): PretAvanceRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT p.*, e.nom as employe_nom, e.prenom as employe_prenom
    FROM prets_avances p
    JOIN employes e ON p.employe_id = e.id
    WHERE p.id = ?
  `).get(id) as any;

  if (!row) return null;

  const echeances = db.prepare(`
    SELECT * FROM prets_echeancier
    WHERE pret_id = ?
    ORDER BY numero_mensualite ASC
  `).all(id) as PretEcheancierRecord[];

  return {
    ...row,
    echeances,
  };
}

export function getPretsAvances(
  companyId = 1,
  options?: { employeId?: number; statut?: PretStatut }
): PretAvanceRecord[] {
  const db = getDb();
  let query = `
    SELECT p.*, e.nom as employe_nom, e.prenom as employe_prenom
    FROM prets_avances p
    JOIN employes e ON p.employe_id = e.id
    WHERE p.company_id = ?
  `;
  const params: any[] = [companyId];

  if (options?.employeId) {
    query += " AND p.employe_id = ?";
    params.push(options.employeId);
  }

  if (options?.statut) {
    query += " AND p.statut = ?";
    params.push(options.statut);
  }

  query += " ORDER BY p.id DESC";
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((r) => {
    const echeances = db.prepare(`
      SELECT * FROM prets_echeancier
      WHERE pret_id = ?
      ORDER BY numero_mensualite ASC
    `).all(r.id) as PretEcheancierRecord[];
    return { ...r, echeances };
  });
}

export function genererBulletinsPaieMensuels(params: {
  companyId?: number;
  periodeMois: string; // YYYY-MM
  userId?: number;
}): BulletinPaieRecord[] {
  const db = getDb();
  const companyId = params.companyId || 1;
  const employes = db.prepare("SELECT * FROM employes ORDER BY nom ASC").all() as any[];

  const dateEmission = new Date().toISOString().slice(0, 10);
  const resultats: BulletinPaieRecord[] = [];

  db.transaction(() => {
    for (const emp of employes) {
      // 1. Calcul des heures normales et heures sup depuis les pointages du mois
      const pointages = db.prepare(`
        SELECT COALESCE(SUM(heures_normales), 0) as tot_norm,
               COALESCE(SUM(heures_sup), 0) as tot_sup
        FROM pointages
        WHERE company_id = ? AND employe_id = ? AND strftime('%Y-%m', date_pointage) = ? AND statut = 'valide'
      `).get(companyId, emp.id, params.periodeMois) as any;

      const heuresNormales = Number(pointages?.tot_norm || 0);
      const heuresSup = Number(pointages?.tot_sup || 0);
      const salaireBase = Number(emp.salaire || 4000);
      const tauxHoraire = Number(emp.taux_horaire_base || (salaireBase / 191)); // 191 h/mois légal Maroc

      // Majoration heures sup 25%
      const montantHeuresSup = Math.round(heuresSup * tauxHoraire * 1.25 * 100) / 100;
      const primes = 0;
      const salaireBrut = Math.round((salaireBase + montantHeuresSup + primes) * 100) / 100;

      // Retenues sociales standard Maroc : CNSS (4.48% plafonné à 6000 DH = 268.80 max), AMO (2.26%)
      const baseCnss = Math.min(6000, salaireBrut);
      const retenueCnss = Math.round(baseCnss * 0.0448 * 100) / 100;
      const retenueAmo = Math.round(salaireBrut * 0.0226 * 100) / 100;
      const retenueIr = 0; // Barème simplifié ou net

      // 2. Retenue automatique des échéances de prêts du mois !
      const echeancesDues = db.prepare(`
        SELECT * FROM prets_echeancier
        WHERE employe_id = ? AND mois_prelevement = ? AND statut = 'a_prelever'
      `).all(emp.id, params.periodeMois) as any[];

      let totalPrelevementPrets = 0;
      for (const ech of echeancesDues) {
        totalPrelevementPrets += ech.montant_echeance;
      }

      const totalRetenues = Math.round((retenueCnss + retenueAmo + retenueIr + totalPrelevementPrets) * 100) / 100;
      const salaireNet = Math.max(0, Math.round((salaireBrut - totalRetenues) * 100) / 100);

      const numeroBulletin = `PAIE-${params.periodeMois.replace("-", "")}-${emp.id}`;

      // Insert or update bulletin
      const res = db.prepare(`
        INSERT INTO bulletins_paie (
          company_id, employe_id, numero_bulletin, periode_mois, date_emission,
          salaire_base, heures_normales, heures_sup, taux_horaire, montant_heures_sup,
          primes, retenue_cnss, retenue_amo, retenue_ir, retenue_prets_avances,
          autres_retenues, salaire_brut, total_retenues, salaire_net,
          statut, mode_paiement, created_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          0, ?, ?, ?,
          'brouillon', 'virement', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT(company_id, employe_id, periode_mois) DO UPDATE SET
          date_emission = excluded.date_emission,
          salaire_base = excluded.salaire_base,
          heures_normales = excluded.heures_normales,
          heures_sup = excluded.heures_sup,
          taux_horaire = excluded.taux_horaire,
          montant_heures_sup = excluded.montant_heures_sup,
          primes = excluded.primes,
          retenue_cnss = excluded.retenue_cnss,
          retenue_amo = excluded.retenue_amo,
          retenue_ir = excluded.retenue_ir,
          retenue_prets_avances = excluded.retenue_prets_avances,
          salaire_brut = excluded.salaire_brut,
          total_retenues = excluded.total_retenues,
          salaire_net = excluded.salaire_net,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        companyId, emp.id, numeroBulletin, params.periodeMois, dateEmission,
        salaireBase, heuresNormales, heuresSup, tauxHoraire, montantHeuresSup,
        primes, retenueCnss, retenueAmo, retenueIr, totalPrelevementPrets,
        salaireBrut, totalRetenues, salaireNet, params.userId || null
      );

      const bulletinId = Number(res.lastInsertRowid) || (db.prepare(`
        SELECT id FROM bulletins_paie WHERE company_id = ? AND employe_id = ? AND periode_mois = ?
      `).get(companyId, emp.id, params.periodeMois) as any)?.id;

      // Link echeances to bulletin
      for (const ech of echeancesDues) {
        db.prepare(`
          UPDATE prets_echeancier
          SET bulletin_id = ?
          WHERE id = ?
        `).run(bulletinId, ech.id);
      }
    }
  })();

  return getBulletinsPaie(companyId, { periodeMois: params.periodeMois });
}

export function getBulletinsPaie(
  companyId = 1,
  options?: { periodeMois?: string; employeId?: number }
): BulletinPaieRecord[] {
  const db = getDb();
  let query = `
    SELECT b.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero, e.cnss as employe_cnss
    FROM bulletins_paie b
    JOIN employes e ON b.employe_id = e.id
    WHERE b.company_id = ?
  `;
  const params: any[] = [companyId];

  if (options?.periodeMois) {
    query += " AND b.periode_mois = ?";
    params.push(options.periodeMois);
  }

  if (options?.employeId) {
    query += " AND b.employe_id = ?";
    params.push(options.employeId);
  }

  query += " ORDER BY b.periode_mois DESC, e.nom ASC";
  return db.prepare(query).all(...params) as BulletinPaieRecord[];
}

export function changerStatutBulletin(
  bulletinId: number,
  statut: BulletinPaieStatut,
  options?: { datePaiement?: string; modePaiement?: string }
): BulletinPaieRecord {
  const db = getDb();
  const bulletin = db.prepare("SELECT * FROM bulletins_paie WHERE id = ?").get(bulletinId) as any;
  if (!bulletin) throw new Error("Bulletin de paie introuvable");

  const datePmt = options?.datePaiement || (statut === "paye" ? new Date().toISOString().slice(0, 10) : "");
  const modePmt = options?.modePaiement || bulletin.mode_paiement;

  db.transaction(() => {
    db.prepare(`
      UPDATE bulletins_paie
      SET statut = ?,
          date_paiement = ?,
          mode_paiement = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(statut, datePmt, modePmt, bulletinId);

    // Si payé, marquer les échéances de prêts liées comme prélevées et décrémenter le solde
    if (statut === "paye") {
      const echeances = db.prepare(`
        SELECT * FROM prets_echeancier WHERE bulletin_id = ?
      `).all(bulletinId) as any[];

      for (const ech of echeances) {
        db.prepare(`
          UPDATE prets_echeancier
          SET statut = 'preleve',
              montant_preleve = montant_echeance,
              date_prelevement = ?
          WHERE id = ?
        `).run(datePmt, ech.id);

        // Mettre à jour le prêt parent
        db.prepare(`
          UPDATE prets_avances
          SET montant_rembourse = montant_rembourse + ?,
              solde_restant = MAX(0, solde_restant - ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(ech.montant_echeance, ech.montant_echeance, ech.pret_id);

        // Vérifier si le prêt est soldé
        const pretAct = db.prepare("SELECT solde_restant FROM prets_avances WHERE id = ?").get(ech.pret_id) as any;
        if (pretAct && pretAct.solde_restant <= 0) {
          db.prepare("UPDATE prets_avances SET statut = 'solde' WHERE id = ?").run(ech.pret_id);
        }
      }
    }
  })();

  return db.prepare(`
    SELECT b.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero, e.cnss as employe_cnss
    FROM bulletins_paie b
    JOIN employes e ON b.employe_id = e.id
    WHERE b.id = ?
  `).get(bulletinId) as BulletinPaieRecord;
}
