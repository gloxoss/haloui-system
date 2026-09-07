import { getDb } from "../lib/db";
import {
  enregistrerTicketCaisse,
  getSessionActive,
  ouvrirSessionCaisse,
  enregistrerRetourCaisse,
  getTicketPourRetour,
  validerBonAchat,
  consommerBonAchat,
  getBonAchatByCode,
  synchroniserTicketsHorsLigne,
} from "../lib/pos";
import { type OfflineTicketRecord } from "../lib/types";

async function runTests() {
  console.log("=== TEST SUITE : RETOURS CAISSE, BONS D'ACHAT & MODE HORS-LIGNE ===");
  const db = getDb();

  // 1. Utilisateur & Dépôt
  const user = (db.prepare("SELECT id FROM users LIMIT 1").get() as any) || { id: 1 };
  const branch = (db.prepare("SELECT id FROM branches LIMIT 1").get() as any) || { id: 1 };
  const product = (db.prepare("SELECT id, ref, designation, prix_ht, tva_rate FROM produits LIMIT 1").get() as any);

  if (!product) {
    throw new Error("Aucun produit trouvé dans la base pour les tests.");
  }

  const prixTtc = Math.round(product.prix_ht * (1 + (product.tva_rate || 20) / 100) * 100) / 100;
  console.log(`[OK] Produit de test : ${product.ref} - ${product.designation} (TTC: ${prixTtc} DH)`);

  // 2. Session de caisse active
  let session = getSessionActive(1, branch.id, user.id);
  if (!session) {
    session = ouvrirSessionCaisse({
      companyId: 1,
      branchId: branch.id,
      userId: user.id,
      fondInitial: 1000,
    });
    console.log(`[OK] Nouvelle session de caisse ouverte: ${session.numero_session} (ID: ${session.id})`);
  } else {
    console.log(`[OK] Session de caisse existante trouvée: ${session.numero_session} (ID: ${session.id})`);
  }

  // 3. Création d'une vente initiale (Ticket d'origine)
  console.log("\n--- TEST 1: Vente Initiale en Caisse ---");
  const ticketVente = enregistrerTicketCaisse({
    sessionId: session.id,
    companyId: 1,
    branchId: branch.id,
    userId: user.id,
    clientNom: "Client Particulier Test",
    lignes: [
      {
        produitId: product.id,
        ref: product.ref,
        designation: product.designation,
        prixUnitaireHt: product.prix_ht,
        prixUnitaireTtc: prixTtc,
        quantite: 3,
        tvaRate: product.tva_rate || 20,
      },
    ],
    modeReglement: "especes",
    montantPaye: prixTtc * 3,
  });
  console.log(`[OK] Ticket Vente créé: ${ticketVente.numero_ticket} (Total TTC: ${ticketVente.total_ttc} DH)`);

  // 4. Recherche du ticket pour retour
  console.log("\n--- TEST 2: Recherche Ticket pour Retour ---");
  const ticketTrouve = getTicketPourRetour(ticketVente.numero_ticket, 1);
  if (!ticketTrouve || ticketTrouve.id !== ticketVente.id) {
    throw new Error(`Échec recherche ticket par numéro ${ticketVente.numero_ticket}`);
  }
  console.log(`[OK] Ticket retrouvé avec succès avec ses ${ticketTrouve.lignes.length} ligne(s) d'articles.`);

  // 5. Enregistrement d'un Retour avec émission de Bon d'Achat
  console.log("\n--- TEST 3: Traitement Retour Article avec Bon d'Achat & Remise en Stock ---");
  const stockDepotAvant = (db.prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?").get(branch.id, product.id) as any)?.quantite || 0;

  const retourResult = enregistrerRetourCaisse({
    companyId: 1,
    branchId: branch.id,
    sessionId: session.id,
    userId: user.id,
    ticketOrigineId: ticketVente.id,
    ticketOrigineNumero: ticketVente.numero_ticket,
    clientNom: "Client Particulier Test",
    modeCompensation: "bon_achat",
    validiteMois: 6,
    motifGeneral: "Produit non utilisé",
    lignes: [
      {
        produitId: product.id,
        ref: product.ref,
        designation: product.designation,
        prixUnitaireHt: product.prix_ht,
        prixUnitaireTtc: prixTtc,
        quantite: 1,
        tvaRate: product.tva_rate || 20,
        restitueStock: true,
        motifLigne: "Taille non adaptée",
      },
    ],
  });

  console.log(`[OK] Bordereau de retour créé: ${retourResult.retour.numero_retour} (Total TTC: ${retourResult.retour.total_ttc} DH)`);
  if (!retourResult.bonAchat) {
    throw new Error("Le bon d'achat n'a pas été généré.");
  }
  console.log(`[OK] Bon d'achat émis: ${retourResult.bonAchat.code} pour une valeur de ${retourResult.bonAchat.montant_restant} DH (Expiration: ${retourResult.bonAchat.date_expiration})`);

  // Vérification de la remise en stock
  const stockDepotApres = (db.prepare("SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?").get(branch.id, product.id) as any)?.quantite || 0;
  console.log(`[OK] Remise en stock vérifiée: Avant=${stockDepotAvant}, Après=${stockDepotApres} (Diff: +${stockDepotApres - stockDepotAvant})`);
  if (stockDepotApres !== stockDepotAvant + 1) {
    throw new Error("La remise en stock n'a pas incrémenté le stock de 1 unité.");
  }

  // 6. Test Cycle de Vie et Consommation du Bon d'Achat
  console.log("\n--- TEST 4: Validation et Consommation du Bon d'Achat ---");
  const validation1 = validerBonAchat(retourResult.bonAchat.code, 1);
  if (!validation1.valide) {
    throw new Error(`Bon d'achat invalide: ${validation1.message}`);
  }
  console.log(`[OK] Bon d'achat validé avec succès (Solde disponible: ${validation1.bon?.montant_restant} DH)`);

  // Consommation partielle
  const montantConso = Math.min(10, validation1.bon!.montant_restant);
  const conso1 = consommerBonAchat(retourResult.bonAchat.code, montantConso, ticketVente.id, 1);
  console.log(`[OK] Consommation de ${montantConso} DH effectuée. Nouveau solde restant = ${conso1.nouveauSolde} DH`);

  const bonApresConso = getBonAchatByCode(retourResult.bonAchat.code, 1);
  if (bonApresConso?.montant_restant !== conso1.nouveauSolde) {
    throw new Error("Incohérence du solde restant du bon d'achat.");
  }

  // 7. Test Mode Hors-Ligne & Synchronisation (Offline First PWA)
  console.log("\n--- TEST 5: Simulation Mode Hors-Ligne (Offline First PWA) & Synchronisation ---");
  const offlineTicket1: OfflineTicketRecord = {
    offlineId: `offline_test_${Date.now()}_1`,
    timestamp: Date.now(),
    sessionId: session.id,
    branchId: branch.id,
    clientId: null,
    clientNom: "Client Hors-Ligne 1",
    lignes: [
      {
        produitId: product.id,
        ref: product.ref,
        designation: product.designation,
        prixUnitaireHt: product.prix_ht,
        prixUnitaireTtc: prixTtc,
        quantite: 2,
        tvaRate: product.tva_rate || 20,
      },
    ],
    modeReglement: "especes",
    montantPaye: prixTtc * 2,
    remiseGlobale: 0,
    totalTtc: prixTtc * 2,
    synced: false,
  };

  const offlineTicket2: OfflineTicketRecord = {
    offlineId: `offline_test_${Date.now()}_2`,
    timestamp: Date.now(),
    sessionId: session.id,
    branchId: branch.id,
    clientId: null,
    clientNom: "Client Hors-Ligne 2",
    lignes: [
      {
        produitId: product.id,
        ref: product.ref,
        designation: product.designation,
        prixUnitaireHt: product.prix_ht,
        prixUnitaireTtc: prixTtc,
        quantite: 1,
        tvaRate: product.tva_rate || 20,
      },
    ],
    modeReglement: "carte",
    montantPaye: prixTtc,
    remiseGlobale: 0,
    totalTtc: prixTtc,
    synced: false,
  };

  const syncResult = synchroniserTicketsHorsLigne(
    [offlineTicket1, offlineTicket2],
    branch.id,
    user.id,
    1
  );

  console.log(`[OK] Synchronisation exécutée: ${syncResult.successes.length} succès, ${syncResult.errors.length} erreurs`);
  if (syncResult.successes.length !== 2) {
    throw new Error(`Erreur lors de la synchronisation: ${JSON.stringify(syncResult.errors)}`);
  }

  syncResult.successes.forEach((s) => {
    console.log(`  -> Ticket local [${s.offlineId}] converti en Ticket Officiel [${s.numeroTicket}] (ID #${s.officialId})`);
  });

  console.log("\n=======================================================");
  console.log(" TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS (100%) !");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
