import { getDb } from "@/lib/db";
import { getNomenclature } from "@/lib/nomenclatures";
import {
  type CaisseModeReglement,
  type CaisseMouvementRecord,
  type CaisseMouvementType,
  type CaisseSessionRecord,
  type CaisseSessionStatut,
  type CaisseTicketLigneRecord,
  type CaisseTicketRecord,
  type CaisseTicketStatut,
  type DenominationsComptage,
  type RapportXData,
  type RapportZData,
} from "@/lib/types";
import { formatNumber, todayIso } from "@/lib/utils";

/**
 * Récupère la session de caisse active ('ouverte') pour une société et un dépôt/magasin.
 */
export function getSessionActive(
  companyId: number = 1,
  branchId: number,
  userId?: number
): CaisseSessionRecord | null {
  const db = getDb();
  let query = `
    SELECT
      cs.*,
      b.name AS branch_name,
      u.full_name AS user_name
    FROM caisse_sessions cs
    JOIN branches b ON b.id = cs.branch_id
    JOIN users u ON u.id = cs.user_id
    WHERE cs.company_id = ? AND cs.branch_id = ? AND cs.statut = 'ouverte'
  `;
  const params: any[] = [companyId, branchId];

  if (userId) {
    query += ` AND cs.user_id = ?`;
    params.push(userId);
  }

  query += ` ORDER BY cs.id DESC LIMIT 1`;

  const row = db.prepare(query).get(...params) as any;
  if (!row) return null;

  return row as CaisseSessionRecord;
}

/**
 * Récupère une session de caisse par son ID.
 */
export function getSessionById(sessionId: number): CaisseSessionRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         cs.*,
         b.name AS branch_name,
         u.full_name AS user_name
       FROM caisse_sessions cs
       JOIN branches b ON b.id = cs.branch_id
       JOIN users u ON u.id = cs.user_id
       WHERE cs.id = ?`
    )
    .get(sessionId) as any;

  return row ? (row as CaisseSessionRecord) : null;
}

/**
 * Ouvre une nouvelle session de caisse avec déclaration obligatoire du fond de caisse initial.
 */
export function ouvrirSessionCaisse(input: {
  companyId?: number;
  branchId: number;
  userId: number;
  fondInitial: number;
  detailsFondJson?: string;
}): CaisseSessionRecord {
  const db = getDb();
  const companyId = input.companyId || 1;

  // Vérifier s'il existe déjà une session ouverte pour cet utilisateur et ce magasin
  const sessionExistante = getSessionActive(companyId, input.branchId, input.userId);
  if (sessionExistante) {
    return sessionExistante;
  }

  // Générer le numéro séquentiel de session SESS-YYYY-XXXX
  const currentYear = new Date().getFullYear();
  const lastSession = db
    .prepare(
      `SELECT numero_session
       FROM caisse_sessions
       WHERE company_id = ? AND numero_session LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(companyId, `SESS-${currentYear}-%`) as { numero_session: string } | undefined;

  let nextSeq = 1;
  if (lastSession?.numero_session) {
    const parts = lastSession.numero_session.split("-");
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }
  const numeroSession = `SESS-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

  const fondInitial = Math.max(0, Number(input.fondInitial) || 0);

  const res = db
    .prepare(
      `INSERT INTO caisse_sessions (
         company_id, branch_id, user_id, numero_session, statut,
         date_ouverture, fond_caisse_ouverture, details_fond_ouverture_json,
         montant_especes_theorique, montant_especes_reel, ecart_caisse,
         total_ventes_ht, total_ventes_ttc, total_especes, total_carte,
         total_cheque, total_virement, total_sorties, total_entrees, nb_tickets
       ) VALUES (
         ?, ?, ?, ?, 'ouverte',
         CURRENT_TIMESTAMP, ?, ?,
         ?, 0, 0,
         0, 0, 0, 0,
         0, 0, 0, 0, 0
       )`
    )
    .run(
      companyId,
      input.branchId,
      input.userId,
      numeroSession,
      fondInitial,
      input.detailsFondJson || "",
      fondInitial // Le théorique espèces initial démarre au montant du fond de caisse
    );

  const createdId = Number(res.lastInsertRowid);
  const session = getSessionById(createdId);
  if (!session) throw new Error("Erreur lors de la création de la session de caisse");
  return session;
}

/**
 * Enregistre un ticket de vente en caisse :
 * - Insertion du ticket et de ses lignes
 * - Déstockage automatique des produits et kits (BOM)
 * - Traçabilité dans mouvements_stock
 * - Mise à jour des cumuls financiers de la session de caisse
 */
export function enregistrerTicketCaisse(input: {
  sessionId: number;
  companyId?: number;
  branchId: number;
  clientId?: number | null;
  clientNom?: string;
  lignes: Array<{
    produitId?: number | null;
    ref: string;
    designation: string;
    prixUnitaireHt: number;
    prixUnitaireTtc: number;
    quantite: number;
    tvaRate: number;
    remisePourcent?: number;
  }>;
  remiseGlobale?: number;
  modeReglement: CaisseModeReglement;
  montantPaye: number;
  detailsReglementJson?: string;
  notes?: string;
  userId: number;
}): CaisseTicketRecord {
  const db = getDb();
  const companyId = input.companyId || 1;

  if (input.lignes.length === 0) {
    throw new Error("Le panier de vente est vide.");
  }

  const session = getSessionById(input.sessionId);
  if (!session || session.statut !== "ouverte") {
    throw new Error("La session de caisse est fermée ou invalide. Veuillez ouvrir une session.");
  }

  // Calculs des totaux
  let totalHtBrut = 0;
  let totalTtcBrut = 0;

  const processedLignes = input.lignes.map((l) => {
    const qte = Math.max(0.001, Number(l.quantite) || 1);
    const puHt = Math.max(0, Number(l.prixUnitaireHt) || 0);
    const puTtc = Math.max(0, Number(l.prixUnitaireTtc) || 0);
    const remise = Math.min(100, Math.max(0, Number(l.remisePourcent) || 0));

    const ligneHt = Math.round(qte * puHt * (1 - remise / 100) * 100) / 100;
    const ligneTtc = Math.round(qte * puTtc * (1 - remise / 100) * 100) / 100;

    totalHtBrut += ligneHt;
    totalTtcBrut += ligneTtc;

    return {
      produitId: l.produitId || null,
      ref: l.ref || "REF",
      designation: l.designation,
      prixUnitaireHt: puHt,
      prixUnitaireTtc: puTtc,
      quantite: qte,
      tvaRate: Number(l.tvaRate) || 20,
      remisePourcent: remise,
      totalHt: ligneHt,
      totalTtc: ligneTtc,
    };
  });

  const remiseGlobale = Math.max(0, Number(input.remiseGlobale) || 0);
  const totalHt = Math.max(0, Math.round((totalHtBrut - remiseGlobale) * 100) / 100);
  const totalTtc = Math.max(0, Math.round((totalTtcBrut - remiseGlobale) * 100) / 100);
  const totalTva = Math.max(0, Math.round((totalTtc - totalHt) * 100) / 100);

  const montantPaye = Math.max(0, Number(input.montantPaye) || totalTtc);
  const montantRendu =
    input.modeReglement === "especes"
      ? Math.max(0, Math.round((montantPaye - totalTtc) * 100) / 100)
      : 0;

  // Numéro de ticket séquentiel TK-YYYY-XXXX
  const currentYear = new Date().getFullYear();
  const lastTicket = db
    .prepare(
      `SELECT numero_ticket
       FROM caisse_tickets
       WHERE company_id = ? AND numero_ticket LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(companyId, `TK-${currentYear}-%`) as { numero_ticket: string } | undefined;

  let nextSeq = 1;
  if (lastTicket?.numero_ticket) {
    const parts = lastTicket.numero_ticket.split("-");
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }
  const numeroTicket = `TK-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

  // Transaction SQLite atomique
  const executeTransaction = db.transaction(() => {
    // 1. Insertion du ticket
    const ticketRes = db
      .prepare(
        `INSERT INTO caisse_tickets (
           session_id, company_id, branch_id, numero_ticket,
           client_id, client_nom, total_ht, total_tva, total_ttc,
           remise_globale, montant_paye, montant_rendu, mode_reglement,
           details_reglement_json, statut, notes, created_by, created_at
         ) VALUES (
           ?, ?, ?, ?,
           ?, ?, ?, ?, ?,
           ?, ?, ?, ?,
           ?, 'valide', ?, ?, CURRENT_TIMESTAMP
         )`
      )
      .run(
        input.sessionId,
        companyId,
        input.branchId,
        numeroTicket,
        input.clientId || null,
        input.clientNom || "Client Comptoir",
        totalHt,
        totalTva,
        totalTtc,
        remiseGlobale,
        montantPaye,
        montantRendu,
        input.modeReglement,
        input.detailsReglementJson || "",
        input.notes || "",
        input.userId
      );

    const ticketId = Number(ticketRes.lastInsertRowid);

    // 2. Insertion des lignes & Déstockage physique
    const insertLigneStmt = db.prepare(`
      INSERT INTO caisse_ticket_lignes (
        ticket_id, produit_id, ref, designation, prix_unitaire_ht,
        prix_unitaire_ttc, quantite, tva_rate, remise_pourcent, total_ht, total_ttc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ligne of processedLignes) {
      insertLigneStmt.run(
        ticketId,
        ligne.produitId,
        ligne.ref,
        ligne.designation,
        ligne.prixUnitaireHt,
        ligne.prixUnitaireTtc,
        ligne.quantite,
        ligne.tvaRate,
        ligne.remisePourcent,
        ligne.totalHt,
        ligne.totalTtc
      );

      // Gestion du stock si un produit ID est renseigné
      if (ligne.produitId) {
        const prod = db
          .prepare(`SELECT id, nature_produit, mode_destockage_kit FROM produits WHERE id = ?`)
          .get(ligne.produitId) as any;

        if (prod && prod.nature_produit === "kit" && prod.mode_destockage_kit === "composants") {
          // Déstockage des composants individuels du kit selon la BOM
          const nom = getNomenclature(ligne.produitId, companyId, input.branchId);
          if (nom && nom.composants.length > 0) {
            for (const comp of nom.composants) {
              const qteAEnlever =
                ligne.quantite * comp.quantite * (1 + (comp.taux_perte_pourcent || 0) / 100);

              const curStockRow = db
                .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
                .get(input.branchId, comp.composant_id) as { quantite: number } | undefined;
              const stockAvant = curStockRow ? Number(curStockRow.quantite) : 0;
              const stockApres = stockAvant - qteAEnlever;

              if (curStockRow) {
                db.prepare(
                  `UPDATE stock_depots
                   SET quantite = quantite - ?, updated_at = CURRENT_TIMESTAMP
                   WHERE branch_id = ? AND produit_id = ?`
                ).run(qteAEnlever, input.branchId, comp.composant_id);
              } else {
                db.prepare(
                  `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
                   VALUES (?, ?, ?, ?, 0)`
                ).run(companyId, input.branchId, comp.composant_id, -qteAEnlever);
              }

              db.prepare(
                `INSERT INTO mouvements_stock (
                   company_id, branch_id, produit_id, type_mouvement,
                   quantite, stock_avant, stock_apres, reference_document,
                   motif, user_id
                 ) VALUES (?, ?, ?, 'ajustement', ?, ?, ?, ?, ?, ?)`
              ).run(
                companyId,
                input.branchId,
                comp.composant_id,
                -qteAEnlever,
                stockAvant,
                stockApres,
                numeroTicket,
                `Vente POS Ticket ${numeroTicket} - Composant pack ${ligne.ref}`,
                input.userId
              );
            }
          }
        } else {
          // Déstockage direct du produit
          const curStockRow = db
            .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
            .get(input.branchId, ligne.produitId) as { quantite: number } | undefined;
          const stockAvant = curStockRow ? Number(curStockRow.quantite) : 0;
          const stockApres = stockAvant - ligne.quantite;

          if (curStockRow) {
            db.prepare(
              `UPDATE stock_depots
               SET quantite = quantite - ?, updated_at = CURRENT_TIMESTAMP
               WHERE branch_id = ? AND produit_id = ?`
            ).run(ligne.quantite, input.branchId, ligne.produitId);
          } else {
            db.prepare(
              `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit)
               VALUES (?, ?, ?, ?, 0)`
            ).run(companyId, input.branchId, ligne.produitId, -ligne.quantite);
          }

          db.prepare(
            `INSERT INTO mouvements_stock (
               company_id, branch_id, produit_id, type_mouvement,
               quantite, stock_avant, stock_apres, reference_document,
               motif, user_id
             ) VALUES (?, ?, ?, 'ajustement', ?, ?, ?, ?, ?, ?)`
          ).run(
            companyId,
            input.branchId,
            ligne.produitId,
            -ligne.quantite,
            stockAvant,
            stockApres,
            numeroTicket,
            `Vente POS Ticket ${numeroTicket}`,
            input.userId
          );
        }
      }
    }

    // 3. Mise à jour des cumuls de la session
    let incEspeces = 0;
    let incCarte = 0;
    let incCheque = 0;
    let incVirement = 0;

    if (input.modeReglement === "especes") {
      incEspeces = totalTtc;
    } else if (input.modeReglement === "carte") {
      incCarte = totalTtc;
    } else if (input.modeReglement === "cheque") {
      incCheque = totalTtc;
    } else if (input.modeReglement === "virement") {
      incVirement = totalTtc;
    } else if (input.modeReglement === "mixte" && input.detailsReglementJson) {
      try {
        const details = JSON.parse(input.detailsReglementJson);
        incEspeces = Number(details.especes) || 0;
        incCarte = Number(details.carte) || 0;
        incCheque = Number(details.cheque) || 0;
        incVirement = Number(details.virement) || 0;
      } catch {
        incEspeces = totalTtc;
      }
    }

    db.prepare(
      `UPDATE caisse_sessions
       SET total_ventes_ht = total_ventes_ht + ?,
           total_ventes_ttc = total_ventes_ttc + ?,
           total_especes = total_especes + ?,
           total_carte = total_carte + ?,
           total_cheque = total_cheque + ?,
           total_virement = total_virement + ?,
           nb_tickets = nb_tickets + 1,
           montant_especes_theorique = fond_caisse_ouverture + (total_especes + ?) + total_entrees - total_sorties,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      totalHt,
      totalTtc,
      incEspeces,
      incCarte,
      incCheque,
      incVirement,
      incEspeces,
      input.sessionId
    );

    return ticketId;
  });

  const createdTicketId = executeTransaction();
  const createdTicket = getTicketById(createdTicketId);
  if (!createdTicket) throw new Error("Erreur lors de la récupération du ticket enregistré");
  return createdTicket;
}

/**
 * Récupère un ticket par son ID avec ses lignes.
 */
export function getTicketById(ticketId: number): CaisseTicketRecord | null {
  const db = getDb();
  const ticket = db
    .prepare(
      `SELECT
         ct.*,
         b.name AS branch_name,
         u.full_name AS created_by_name
       FROM caisse_tickets ct
       JOIN branches b ON b.id = ct.branch_id
       LEFT JOIN users u ON u.id = ct.created_by
       WHERE ct.id = ?`
    )
    .get(ticketId) as any;

  if (!ticket) return null;

  const lignes = db
    .prepare(`SELECT * FROM caisse_ticket_lignes WHERE ticket_id = ? ORDER BY id ASC`)
    .all(ticketId) as CaisseTicketLigneRecord[];

  return {
    ...ticket,
    lignes,
  };
}

/**
 * Enregistre une entrée ou sortie d'espèces en cours de session (dépenses d'urgence, apports de monnaie).
 */
export function enregistrerMouvementCaisse(input: {
  sessionId: number;
  companyId?: number;
  branchId: number;
  type: CaisseMouvementType;
  montant: number;
  motif: string;
  beneficiaire?: string;
  userId: number;
}): CaisseMouvementRecord {
  const db = getDb();
  const companyId = input.companyId || 1;
  const montant = Math.max(0.01, Number(input.montant) || 0);

  const session = getSessionById(input.sessionId);
  if (!session || session.statut !== "ouverte") {
    throw new Error("Impossible d'enregistrer un mouvement : session de caisse non ouverte.");
  }

  const res = db
    .prepare(
      `INSERT INTO caisse_mouvements (
         session_id, company_id, branch_id, type, montant, motif, beneficiaire, created_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .run(
      input.sessionId,
      companyId,
      input.branchId,
      input.type,
      montant,
      input.motif.trim() || (input.type === "entree" ? "Apport de monnaie" : "Dépense caisse"),
      input.beneficiaire || "",
      input.userId
    );

  const mvtId = Number(res.lastInsertRowid);

  // Mise à jour de la session
  if (input.type === "sortie") {
    db.prepare(
      `UPDATE caisse_sessions
       SET total_sorties = total_sorties + ?,
           montant_especes_theorique = montant_especes_theorique - ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(montant, montant, input.sessionId);

    // Optionnel : insérer également dans sorties_caisse pour comptabilité globale
    db.prepare(
      `INSERT INTO sorties_caisse (
         branch_id, date, montant, motif, beneficiaire, created_by, updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.branchId,
      todayIso(),
      montant,
      input.motif,
      input.beneficiaire || "",
      input.userId,
      input.userId
    );
  } else {
    db.prepare(
      `UPDATE caisse_sessions
       SET total_entrees = total_entrees + ?,
           montant_especes_theorique = montant_especes_theorique + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(montant, montant, input.sessionId);
  }

  const createdMvt = db.prepare(`SELECT * FROM caisse_mouvements WHERE id = ?`).get(mvtId) as any;
  return createdMvt as CaisseMouvementRecord;
}

/**
 * Génère le Rapport X (Lecture instantanée intermédiaire de la caisse, sans la clôturer).
 */
export function genererRapportX(sessionId: number): RapportXData {
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session) throw new Error("Session de caisse introuvable");

  const derniersTickets = db
    .prepare(
      `SELECT ct.*, b.name AS branch_name, u.full_name AS created_by_name
       FROM caisse_tickets ct
       JOIN branches b ON b.id = ct.branch_id
       LEFT JOIN users u ON u.id = ct.created_by
       WHERE ct.session_id = ? AND ct.statut = 'valide'
       ORDER BY ct.id DESC LIMIT 15`
    )
    .all(sessionId) as any[];

  const formattedTickets: CaisseTicketRecord[] = derniersTickets.map((t) => ({
    ...t,
    lignes: [],
  }));

  const mouvements = db
    .prepare(
      `SELECT cm.*, u.full_name AS created_by_name
       FROM caisse_mouvements cm
       LEFT JOIN users u ON u.id = cm.created_by
       WHERE cm.session_id = ?
       ORDER BY cm.id DESC`
    )
    .all(sessionId) as CaisseMouvementRecord[];

  const theorique =
    Number(session.fond_caisse_ouverture) +
    Number(session.total_especes) +
    Number(session.total_entrees) -
    Number(session.total_sorties);

  return {
    session,
    fond_initial: Number(session.fond_caisse_ouverture),
    total_ventes_ht: Number(session.total_ventes_ht),
    total_ventes_ttc: Number(session.total_ventes_ttc),
    nb_tickets: Number(session.nb_tickets),
    par_mode_reglement: {
      especes: Number(session.total_especes),
      carte: Number(session.total_carte),
      cheque: Number(session.total_cheque),
      virement: Number(session.total_virement),
      mixte: 0,
    },
    total_entrees: Number(session.total_entrees),
    total_sorties: Number(session.total_sorties),
    theorique_especes_en_caisse: Math.round(theorique * 100) / 100,
    derniers_tickets: formattedTickets,
    mouvements,
    date_generation: new Date().toISOString(),
  };
}

/**
 * Clôture définitivement la session de caisse et génère le Rapport Z officiel :
 * - Comptage réel des espèces déclarées
 * - Calcul automatique de l'écart de caisse (Surplus / Juste / Déficit)
 * - Verrouillage de la session
 * - Génération du numéro séquentiel Z-YYYY-XXXX
 */
export function cloturerSessionCaisse(input: {
  sessionId: number;
  comptageReelEspeces: number;
  detailsComptageJson?: string;
  notes?: string;
  userId: number;
}): RapportZData {
  const db = getDb();
  const session = getSessionById(input.sessionId);
  if (!session) throw new Error("Session de caisse introuvable");
  if (session.statut === "fermee") {
    throw new Error("Cette session de caisse est déjà clôturée.");
  }

  const rapportX = genererRapportX(input.sessionId);
  const theorique = rapportX.theorique_especes_en_caisse;
  const reel = Math.max(0, Number(input.comptageReelEspeces) || 0);
  const ecart = Math.round((reel - theorique) * 100) / 100;

  // Numéro séquentiel Z-YYYY-XXXX
  const currentYear = new Date().getFullYear();
  const lastZ = db
    .prepare(
      `SELECT rapport_z_numero
       FROM caisse_sessions
       WHERE company_id = ? AND rapport_z_numero LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(session.company_id, `Z-${currentYear}-%`) as { rapport_z_numero: string } | undefined;

  let nextSeq = 1;
  if (lastZ?.rapport_z_numero) {
    const parts = lastZ.rapport_z_numero.split("-");
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }
  const numeroZ = `Z-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

  const user = db.prepare(`SELECT full_name FROM users WHERE id = ?`).get(input.userId) as { full_name: string } | undefined;
  const signataire = user?.full_name || "Responsable Caisse";

  let detailsComptage: DenominationsComptage = {};
  if (input.detailsComptageJson) {
    try {
      detailsComptage = JSON.parse(input.detailsComptageJson);
    } catch {
      // Ignorer
    }
  }

  const rapportZ: RapportZData = {
    ...rapportX,
    numero_z: numeroZ,
    date_cloture: new Date().toISOString(),
    comptage_reel_especes: reel,
    ecart_caisse: ecart,
    details_comptage: detailsComptage,
    notes: input.notes || "",
    signataire,
  };

  // Clôture atomique
  db.prepare(
    `UPDATE caisse_sessions
     SET statut = 'fermee',
         date_fermeture = CURRENT_TIMESTAMP,
         montant_especes_theorique = ?,
         montant_especes_reel = ?,
         details_fond_fermeture_json = ?,
         ecart_caisse = ?,
         notes_fermeture = ?,
         rapport_z_numero = ?,
         rapport_z_json = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    theorique,
    reel,
    input.detailsComptageJson || "",
    ecart,
    input.notes || "",
    numeroZ,
    JSON.stringify(rapportZ),
    input.sessionId
  );

  return rapportZ;
}

/**
 * Liste l'historique des sessions de caisse (ouvertes et clôturées) pour un dépôt/magasin.
 */
export function listSessionsCaisse(
  companyId: number = 1,
  branchId?: number,
  limit = 50
): CaisseSessionRecord[] {
  const db = getDb();
  let query = `
    SELECT
      cs.*,
      b.name AS branch_name,
      u.full_name AS user_name
    FROM caisse_sessions cs
    JOIN branches b ON b.id = cs.branch_id
    JOIN users u ON u.id = cs.user_id
    WHERE cs.company_id = ?
  `;
  const params: any[] = [companyId];

  if (branchId) {
    query += ` AND cs.branch_id = ?`;
    params.push(branchId);
  }

  query += ` ORDER BY cs.id DESC LIMIT ?`;
  params.push(limit);

  return db.prepare(query).all(...params) as CaisseSessionRecord[];
}
