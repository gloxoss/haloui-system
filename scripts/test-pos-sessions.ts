import { getDb } from "../lib/db";
import {
  cloturerSessionCaisse,
  enregistrerMouvementCaisse,
  enregistrerTicketCaisse,
  genererRapportX,
  getSessionActive,
  getSessionById,
  ouvrirSessionCaisse,
} from "../lib/pos";

async function runTests() {
  console.log("==================================================");
  console.log("TEST AUTOMATISÉ : CAISSE TACTILE POS & SESSIONS X/Z");
  console.log("==================================================\n");

  const db = getDb();
  const companyId = 1;
  const branchRow = db.prepare("SELECT id FROM branches WHERE active = 1 LIMIT 1").get() as {
    id: number;
  };
  const branchId = branchRow ? branchRow.id : 18;
  const userId = 1;

  // S'assurer qu'aucune session n'est ouverte pour ce test
  db.prepare(
    `UPDATE caisse_sessions SET statut = 'fermee' WHERE company_id = ? AND branch_id = ? AND statut = 'ouverte'`
  ).run(companyId, branchId);

  // 1. Initialiser un produit de test avec stock
  const testRef = `POS-ITEM-${Date.now()}`;
  const prodRes = db
    .prepare(
      `INSERT INTO produits (company_id, ref, designation, prix_ht, tva_rate, unite, active)
       VALUES (?, ?, 'Café Nespresso Grand Cru', 10, 20, 'U', 1)`
    )
    .run(companyId, testRef);
  const prodId = Number(prodRes.lastInsertRowid);

  // Mettre 50 unités en stock dans le dépôt
  db.prepare(
    `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, seuil_alerte)
     VALUES (?, ?, ?, 50, 10)
     ON CONFLICT(company_id, branch_id, produit_id) DO UPDATE SET quantite = 50`
  ).run(companyId, branchId, prodId);

  console.log(`[+] Produit de test créé : ${testRef} (#${prodId}) avec 50 unités en stock.`);

  // 2. Test 1 : Ouverture de session avec fond de caisse initial
  console.log("\n--- TEST 1 : Ouverture de Session de Caisse ---");
  const session = ouvrirSessionCaisse({
    companyId,
    branchId,
    userId,
    fondInitial: 500, // 500 DH de fond de caisse
    detailsFondJson: JSON.stringify({ billets200: 2, billets100: 1 }),
  });

  console.log(`[✓] Session de caisse ouverte avec succès :`);
  console.log(`    N° Session : ${session.numero_session}`);
  console.log(`    Fond initial : ${session.fond_caisse_ouverture} DH`);
  console.log(`    Statut : ${session.statut}`);

  if (session.fond_caisse_ouverture !== 500 || session.statut !== "ouverte") {
    throw new Error("Erreur d'initialisation de la session");
  }

  // 3. Test 2 : Enregistrement de Ventes POS (Tickets)
  console.log("\n--- TEST 2 : Enregistrement de Ventes au Comptoir ---");

  // Vente 1 : 2 cafés payés en Espèces (Total TTC = 2 * 12 DH = 24 DH, Reçu = 50 DH, Rendu = 26 DH)
  const ticket1 = enregistrerTicketCaisse({
    sessionId: session.id,
    companyId,
    branchId,
    clientNom: "Client Comptoir 1",
    lignes: [
      {
        produitId: prodId,
        ref: testRef,
        designation: "Café Nespresso Grand Cru",
        prixUnitaireHt: 10,
        prixUnitaireTtc: 12,
        quantite: 2,
        tvaRate: 20,
      },
    ],
    modeReglement: "especes",
    montantPaye: 50,
    userId,
  });

  console.log(`[✓] Ticket 1 enregistré : N° ${ticket1.numero_ticket}`);
  console.log(`    Total TTC : ${ticket1.total_ttc} DH, Reçu : ${ticket1.montant_paye} DH, Rendu : ${ticket1.montant_rendu} DH`);

  if (ticket1.total_ttc !== 24 || ticket1.montant_rendu !== 26) {
    throw new Error(`Calcul ticket 1 erroné : TTC=${ticket1.total_ttc}, Rendu=${ticket1.montant_rendu}`);
  }

  // Vente 2 : 3 cafés payés par Carte Bancaire TPE (Total TTC = 36 DH)
  const ticket2 = enregistrerTicketCaisse({
    sessionId: session.id,
    companyId,
    branchId,
    clientNom: "Client Comptoir 2",
    lignes: [
      {
        produitId: prodId,
        ref: testRef,
        designation: "Café Nespresso Grand Cru",
        prixUnitaireHt: 10,
        prixUnitaireTtc: 12,
        quantite: 3,
        tvaRate: 20,
      },
    ],
    modeReglement: "carte",
    montantPaye: 36,
    userId,
  });

  console.log(`[✓] Ticket 2 enregistré : N° ${ticket2.numero_ticket} (Carte TPE : ${ticket2.total_ttc} DH)`);

  // Vérification déstockage : 50 - 2 - 3 = 45 en stock
  const stockRow = db
    .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
    .get(branchId, prodId) as { quantite: number };

  console.log(`    Stock en dépôt vérifié : ${stockRow.quantite} unités (attendu 45)`);
  if (stockRow.quantite !== 45) {
    throw new Error(`Déstockage POS incorrect : obtenu ${stockRow.quantite}, attendu 45`);
  }

  // 4. Test 3 : Sortie de caisse directe (Dépense d'appoint)
  console.log("\n--- TEST 3 : Enregistrement d'une Sortie de Caisse ---");
  const mvt = enregistrerMouvementCaisse({
    sessionId: session.id,
    companyId,
    branchId,
    type: "sortie",
    montant: 30, // 30 DH de petite dépense
    motif: "Achat dosettes de lait d'urgence",
    beneficiaire: "Épicerie du coin",
    userId,
  });

  console.log(`[✓] Mouvement enregistré : ${mvt.type.toUpperCase()} de ${mvt.montant} DH`);

  // 5. Test 4 : Génération du Rapport X intermédiaire
  console.log("\n--- TEST 4 : Rapport X Intermédiaire ---");
  const rapportX = genererRapportX(session.id);
  console.log(`[✓] Rapport X généré :`);
  console.log(`    Total Ventes TTC : ${rapportX.total_ventes_ttc} DH (${rapportX.nb_tickets} tickets)`);
  console.log(`    Espèces encaissées : ${rapportX.par_mode_reglement.especes} DH`);
  console.log(`    Cartes TPE : ${rapportX.par_mode_reglement.carte} DH`);
  console.log(`    Sorties de caisse : ${rapportX.total_sorties} DH`);
  console.log(`    Théorique espèces attendu : ${rapportX.theorique_especes_en_caisse} DH`);

  // Théorique = 500 (fond) + 24 (espèces) - 30 (sortie) = 494 DH
  if (rapportX.theorique_especes_en_caisse !== 494) {
    throw new Error(`Théorique espèces erroné : attendu 494, obtenu ${rapportX.theorique_especes_en_caisse}`);
  }

  // 6. Test 5 : Clôture Définitive et Rapport Z
  console.log("\n--- TEST 5 : Clôture Définitive (Rapport Z) & Calcul Écart ---");
  // Supposons un comptage réel physique de 494 DH (caisse pile poil équilibrée)
  const rapportZ = cloturerSessionCaisse({
    sessionId: session.id,
    comptageReelEspeces: 494,
    notes: "Clôture conforme sans écart",
    userId,
  });

  console.log(`[✓] Session clôturée avec succès :`);
  console.log(`    Numéro Z : ${rapportZ.numero_z}`);
  console.log(`    Comptage réel : ${rapportZ.comptage_reel_especes} DH`);
  console.log(`    Théorique attendu : ${rapportZ.theorique_especes_en_caisse} DH`);
  console.log(`    Écart de caisse : ${rapportZ.ecart_caisse} DH (0.00 = PARFAIT)`);

  if (rapportZ.ecart_caisse !== 0) {
    throw new Error(`Écart calculé erroné : obtenu ${rapportZ.ecart_caisse}, attendu 0`);
  }

  const sessionVerif = getSessionById(session.id);
  if (sessionVerif?.statut !== "fermee" || !sessionVerif.rapport_z_numero) {
    throw new Error("La session n'a pas été marquée comme fermée ou manque le numéro Z");
  }

  // 7. Nettoyage des données de test
  db.prepare(`DELETE FROM caisse_ticket_lignes WHERE ticket_id IN (?, ?)`).run(ticket1.id, ticket2.id);
  db.prepare(`DELETE FROM caisse_tickets WHERE id IN (?, ?)`).run(ticket1.id, ticket2.id);
  db.prepare(`DELETE FROM caisse_mouvements WHERE id = ?`).run(mvt.id);
  db.prepare(`DELETE FROM caisse_sessions WHERE id = ?`).run(session.id);
  db.prepare(`DELETE FROM stock_depots WHERE produit_id = ?`).run(prodId);
  db.prepare(`DELETE FROM mouvements_stock WHERE produit_id = ?`).run(prodId);
  db.prepare(`DELETE FROM produits WHERE id = ?`).run(prodId);

  console.log("\n==================================================");
  console.log("TOUS LES TESTS POS & SESSIONS SONT PASSÉS AVEC SUCCÈS !");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("\n❌ ERREUR LORS DU TEST POS :", err);
  process.exit(1);
});
