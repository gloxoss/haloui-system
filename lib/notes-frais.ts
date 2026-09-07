import { getDb } from "@/lib/db";
import {
  type NoteFraisCategorie,
  type NoteFraisModeRemboursement,
  type NoteFraisRecord,
  type NoteFraisStatut,
} from "@/lib/types";

export type CreerNoteFraisParams = {
  companyId?: number;
  employeId: number;
  dateDepense: string;
  categorie: NoteFraisCategorie;
  description: string;
  montantTtc?: number;
  tvaRate?: number;
  distanceKm?: number;
  baremeKmUnitaire?: number;
  vehiculeImmatriculation?: string;
  justificatifPath?: string;
  userId?: number | null;
};

export function getNotesFrais(
  companyId: number = 1,
  filters?: {
    employeId?: number;
    statut?: NoteFraisStatut;
    categorie?: NoteFraisCategorie;
    dateDebut?: string;
    dateFin?: string;
    search?: string;
  }
): NoteFraisRecord[] {
  const db = getDb();
  let sql = `
    SELECT 
      nf.*,
      e.nom AS employe_nom,
      e.prenom AS employe_prenom,
      CAST(e.numero AS TEXT) AS employe_numero,
      u.full_name AS valide_par_nom
    FROM notes_frais nf
    JOIN employes e ON e.id = nf.employe_id
    LEFT JOIN users u ON u.id = nf.valide_par
    WHERE nf.company_id = ?
  `;

  const params: any[] = [companyId];

  if (filters?.employeId) {
    sql += " AND nf.employe_id = ?";
    params.push(filters.employeId);
  }

  if (filters?.statut) {
    sql += " AND nf.statut = ?";
    params.push(filters.statut);
  }

  if (filters?.categorie) {
    sql += " AND nf.categorie = ?";
    params.push(filters.categorie);
  }

  if (filters?.dateDebut) {
    sql += " AND nf.date_depense >= ?";
    params.push(filters.dateDebut);
  }

  if (filters?.dateFin) {
    sql += " AND nf.date_depense <= ?";
    params.push(filters.dateFin);
  }

  if (filters?.search) {
    sql += " AND (nf.numero LIKE ? OR nf.description LIKE ? OR e.nom LIKE ? OR e.prenom LIKE ?)";
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  sql += " ORDER BY nf.date_depense DESC, nf.id DESC";

  return db.prepare(sql).all(...params) as NoteFraisRecord[];
}

export function getNoteFraisById(id: number): NoteFraisRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `
    SELECT 
      nf.*,
      e.nom AS employe_nom,
      e.prenom AS employe_prenom,
      CAST(e.numero AS TEXT) AS employe_numero,
      u.full_name AS valide_par_nom
    FROM notes_frais nf
    JOIN employes e ON e.id = nf.employe_id
    LEFT JOIN users u ON u.id = nf.valide_par
    WHERE nf.id = ?
  `
    )
    .get(id);

  return (row as NoteFraisRecord) || null;
}

export function creerNoteFrais(params: CreerNoteFraisParams): NoteFraisRecord {
  const db = getDb();
  const companyId = params.companyId ?? 1;

  // Generate unique number
  const prefix = `NDF-${params.dateDepense.slice(0, 7).replace("-", "")}-`;
  const countRow = db
    .prepare("SELECT COUNT(*) as c FROM notes_frais WHERE numero LIKE ?")
    .get(`${prefix}%`) as { c: number };
  const seq = String(countRow.c + 1).padStart(3, "0");
  const numero = `${prefix}${seq}`;

  let montantTtc = Number(params.montantTtc) || 0;
  const distanceKm = Number(params.distanceKm) || 0;
  const baremeKm = Number(params.baremeKmUnitaire) || 2.5;

  // For distance-based expenses, auto-calculate total
  if (params.categorie === "frais_km" && distanceKm > 0) {
    montantTtc = Math.round(distanceKm * baremeKm * 100) / 100;
  }

  const tvaRate = Number(params.tvaRate) || 0;
  let montantHt = montantTtc;
  let montantTva = 0;

  if (tvaRate > 0) {
    montantHt = Math.round((montantTtc / (1 + tvaRate / 100)) * 100) / 100;
    montantTva = Math.round((montantTtc - montantHt) * 100) / 100;
  }

  const result = db
    .prepare(
      `
    INSERT INTO notes_frais (
      company_id, employe_id, numero, date_depense, categorie,
      description, montant_ttc, tva_rate, montant_tva, montant_ht,
      distance_km, bareme_km_unitaire, vehicule_immatriculation,
      justificatif_path, statut, created_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, 'en_attente', ?
    )
  `
    )
    .run(
      companyId,
      params.employeId,
      numero,
      params.dateDepense,
      params.categorie,
      params.description,
      montantTtc,
      tvaRate,
      montantTva,
      montantHt,
      distanceKm,
      baremeKm,
      params.vehiculeImmatriculation || "",
      params.justificatifPath || "",
      params.userId || null
    );

  return getNoteFraisById(Number(result.lastInsertRowid))!;
}

export function validerNoteFrais(
  id: number,
  decision: "approuve" | "refuse",
  motifRefus?: string,
  userId?: number | null
): NoteFraisRecord {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(
    `
    UPDATE notes_frais
    SET statut = ?,
        valide_par = ?,
        date_decision = ?,
        motif_refus = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(decision, userId || null, today, motifRefus || "", id);

  return getNoteFraisById(id)!;
}

export function rembourserNoteFrais(
  id: number,
  modeRemboursement: NoteFraisModeRemboursement = "virement",
  dateRemboursement?: string,
  userId?: number | null
): NoteFraisRecord {
  const db = getDb();
  const today = dateRemboursement || new Date().toISOString().slice(0, 10);

  db.prepare(
    `
    UPDATE notes_frais
    SET statut = 'rembourse',
        mode_remboursement = ?,
        date_remboursement = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(modeRemboursement, today, id);

  return getNoteFraisById(id)!;
}

export function getNotesFraisStats(companyId: number = 1) {
  const db = getDb();

  const totalDepenses = (
    db
      .prepare(
        `SELECT SUM(montant_ttc) as total FROM notes_frais WHERE company_id = ? AND statut != 'refuse'`
      )
      .get(companyId) as any
  )?.total || 0;

  const enAttente = (
    db
      .prepare(
        `SELECT COUNT(*) as count, SUM(montant_ttc) as total FROM notes_frais WHERE company_id = ? AND statut = 'en_attente'`
      )
      .get(companyId) as any
  ) || { count: 0, total: 0 };

  const approuveNonRembourse = (
    db
      .prepare(
        `SELECT COUNT(*) as count, SUM(montant_ttc) as total FROM notes_frais WHERE company_id = ? AND statut = 'approuve'`
      )
      .get(companyId) as any
  ) || { count: 0, total: 0 };

  const rembourse = (
    db
      .prepare(
        `SELECT COUNT(*) as count, SUM(montant_ttc) as total FROM notes_frais WHERE company_id = ? AND statut = 'rembourse'`
      )
      .get(companyId) as any
  ) || { count: 0, total: 0 };

  return {
    totalDepenses,
    enAttenteCount: enAttente.count,
    enAttenteTotal: enAttente.total || 0,
    approuveCount: approuveNonRembourse.count,
    approuveTotal: approuveNonRembourse.total || 0,
    rembourseCount: rembourse.count,
    rembourseTotal: rembourse.total || 0,
  };
}
