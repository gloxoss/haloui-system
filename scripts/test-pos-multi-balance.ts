import { getDb } from "../lib/db";
import { parseScaleBarcode } from "../lib/scale-barcode";
import {
  enregistrerTicketCaisse,
  getSessionActive,
  genererRapportX,
  ouvrirSessionCaisse,
  cloturerSessionCaisse,
} from "../lib/pos";
import type { PaiementPartiel } from "../lib/types";

async function main() {
  console.log("=== TEST SUITE: MULTI-PAIEMENTS ET BALANCE CONNECTÉE POS ===");
  const db = getDb();

  // 1. Configurer ou vérifier un produit au poids avec code PLU
  console.log("\n[1] Configuration d'un produit au poids (Fruits/Légumes/Boucherie)...");
  let fruit = db
    .prepare("SELECT * FROM produits WHERE vendu_au_poids = 1 OR code_plu = '0142'")
    .get() as any;

  if (!fruit) {
    const existing = db.prepare("SELECT id FROM produits LIMIT 1").get() as any;
    if (existing) {
      db.prepare(
        "UPDATE produits SET vendu_au_poids = 1, code_plu = '0142', unite = 'kg', prix_ht = 16.67, tva_rate = 20 WHERE id = ?"
      ).run(existing.id);
      fruit = db.prepare("SELECT * FROM produits WHERE id = ?").get(existing.id) as any;
    }
  }

  const computedFruitTtc = Math.round(fruit.prix_ht * (1 + fruit.tva_rate / 100) * 100) / 100;
  console.log(`✓ Produit au poids prêt : ID=${fruit.id}, Réf=${fruit.ref}, Nom=${fruit.designation}, PLU=${fruit.code_plu}, Prix HT=${fruit.prix_ht} DH, Prix TTC=${computedFruitTtc} DH/kg`);

  // 2. Test de décodage des codes-barres balance GS1 Poids/Prix
  console.log("\n[2] Test Décodage Code-barres Balance...");
  const sampleProducts = [
    {
      id: fruit.id,
      ref: fruit.ref,
      designation: fruit.designation,
      code_barre: fruit.code_barre || "2100142000000",
      prix_ht: fruit.prix_ht || 16.67,
      prix_ttc: fruit.prix_ttc || 20.0,
      tva_rate: fruit.tva_rate || 20,
      unite: "kg",
      categorie: fruit.categorie || "Primeur",
      stock_actuel: 100,
      vendu_au_poids: 1,
      code_plu: "0142",
    },
  ];

  // A: Code-barres avec Poids (Préfixe 21, PLU 0142, Poids 1450g = 1.450 kg)
  const weightBarcode = "2100142014507";
  const weightParsed = parseScaleBarcode(weightBarcode, sampleProducts);
  console.log("A. Test EAN Poids (21...):", weightBarcode);
  if (!weightParsed || !weightParsed.isValidScaleBarcode || weightParsed.type !== "weight") {
    throw new Error(`Échec du parsing code-barres poids: ${JSON.stringify(weightParsed)}`);
  }
  console.log(`   ✓ Détecté: ${weightParsed.calculatedQuantity} kg (${weightParsed.rawWeightGrams} g), Total: ${weightParsed.calculatedTotalTtc} DH`);

  // B: Code-barres avec Prix (Préfixe 28, PLU 0142, Prix 2900 centimes = 29.00 DH)
  const priceBarcode = "2800142029003";
  const priceParsed = parseScaleBarcode(priceBarcode, sampleProducts);
  console.log("B. Test EAN Prix (28...):", priceBarcode);
  if (!priceParsed || !priceParsed.isValidScaleBarcode || priceParsed.type !== "price") {
    throw new Error(`Échec du parsing code-barres prix: ${JSON.stringify(priceParsed)}`);
  }
  console.log(`   ✓ Détecté: Prix Total=${priceParsed.calculatedTotalTtc} DH, Quantité déduite=${priceParsed.calculatedQuantity} kg`);

  // 3. Test Session de Caisse Active
  console.log("\n[3] Vérification / Création Session de Caisse...");
  const validUser = (db.prepare("SELECT id FROM users LIMIT 1").get() as any) || { id: 1 };
  const validBranch = (db.prepare("SELECT id FROM branches LIMIT 1").get() as any) || { id: 1 };
  const testUserId = validUser.id;
  const testBranchId = validBranch.id;

  let session = getSessionActive(1, testBranchId);
  if (!session) {
    session = ouvrirSessionCaisse({
      companyId: 1,
      branchId: testBranchId,
      userId: testUserId,
      fondInitial: 500,
    });
    console.log(`✓ Nouvelle session créée: ID=${session.id}, Fond=500 DH`);
  } else {
    console.log(`✓ Session active existante: ID=${session.id}, Session N°=${session.numero_session}`);
  }

  const sessionAvant = db
    .prepare("SELECT * FROM caisse_sessions WHERE id = ?")
    .get(session.id) as any;

  // 4. Test Vente avec Règlements Mixtes (Multi-Paiements)
  console.log("\n[4] Enregistrement d'une vente avec Multi-Paiements (Espèces + Carte + Bon d'achat)...");
  // Panier:
  // - 1.450 kg de produit au poids @ 20 DH = 29.00 DH
  // - 1 unité standard @ 100 DH = 100.00 DH
  // Total TTC = 129.00 DH
  const paiementsPartiels: PaiementPartiel[] = [
    { mode: "especes", montant: 29.0, reference: "Paiement monnaie" },
    { mode: "carte", montant: 50.0, reference: "TPE-AUTH-4412" },
    { mode: "bon_achat", montant: 50.0, reference: "BON-CADEAU-NOEL-2026" },
  ];
  const totalPaye = paiementsPartiels.reduce((acc, p) => acc + p.montant, 0);

  const ticket = enregistrerTicketCaisse({
    sessionId: session.id,
    companyId: 1,
    branchId: testBranchId,
    userId: testUserId,
    clientId: null,
    clientNom: "Client VIP Multi-Pay",
    lignes: [
      {
        produitId: fruit.id,
        ref: fruit.ref,
        designation: fruit.designation,
        prixUnitaireHt: 16.67,
        prixUnitaireTtc: 20.0,
        quantite: 1.45,
        tvaRate: 20,
      },
      {
        produitId: fruit.id,
        ref: "PROD-STD",
        designation: "Article Packagé Standard",
        prixUnitaireHt: 83.33,
        prixUnitaireTtc: 100.0,
        quantite: 1,
        tvaRate: 20,
      },
    ],
    modeReglement: "mixte",
    montantPaye: totalPaye,
    paiementsPartiels,
    detailsReglementJson: JSON.stringify(paiementsPartiels),
  });

  console.log(`✓ Ticket créé avec succès: ID=${ticket.id}, N°=${ticket.numero_ticket}, Total TTC=${ticket.total_ttc} DH`);

  // 5. Vérification des impacts en base de données
  console.log("\n[5] Vérification de la session et des cumuls financiers...");
  const sessionApres = db
    .prepare("SELECT * FROM caisse_sessions WHERE id = ?")
    .get(session.id) as any;

  const deltaEspeces = sessionApres.total_especes - sessionAvant.total_especes;
  const deltaCarte = sessionApres.total_carte - sessionAvant.total_carte;
  const deltaBonAchat = sessionApres.total_bon_achat - sessionAvant.total_bon_achat;
  const deltaTheoriqueEspeces =
    sessionApres.montant_especes_theorique - sessionAvant.montant_especes_theorique;

  console.log(`- Delta Espèces enregistré: ${deltaEspeces} DH (Attendu: 29 DH)`);
  console.log(`- Delta Carte enregistré: ${deltaCarte} DH (Attendu: 50 DH)`);
  console.log(`- Delta Bon d'Achat enregistré: ${deltaBonAchat} DH (Attendu: 50 DH)`);
  console.log(`- Delta Espèces Tiroir Théorique: ${deltaTheoriqueEspeces} DH (Attendu: 29 DH - Seul le cash entre en caisse !)`);

  if (deltaEspeces !== 29 || deltaCarte !== 50 || deltaBonAchat !== 50 || deltaTheoriqueEspeces !== 29) {
    throw new Error("Discordance dans la ventilation des cumuls de session !");
  }

  // 6. Vérification du Rapport X
  console.log("\n[6] Vérification du Rapport X...");
  const rapportX = genererRapportX(session.id);
  console.log("Rapport X par mode:", rapportX.par_mode_reglement);
  if (rapportX.par_mode_reglement.bon_achat < 50) {
    throw new Error("Le montant bon_achat n'apparaît pas correctement dans le Rapport X");
  }
  console.log("✓ Rapport X validé avec bon d'achat et ventilation exacte !");

  console.log("\n=======================================================");
  console.log("TOUS LES TESTS ONT RÉUSSI AVEC SUCCÈS ! ✨");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("ERREUR DE VALIDATION :", err);
  process.exit(1);
});
