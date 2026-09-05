import { getDb } from "../lib/db";
import {
  calculerBesoinsApprovisionnement,
  getReapproKPIs,
  genererBonsCommandeFournisseur,
  mettreAJourSeuilsProduit,
} from "../lib/reapprovisionnement";
import {
  listEmplacements,
  creerEmplacement,
  genererMatriceEmplacements,
  listProduitsEmplacements,
  assignerProduitEmplacement,
  retirerProduitEmplacement,
  getWmsKPIs,
  genererPickingList,
} from "../lib/wms";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("=========================================");
  console.log("TESTING REAPPROVISIONNEMENT INTELLIGENT");
  console.log("=========================================");

  const db = getDb();

  // 1. Check KPIs
  const kpis = getReapproKPIs({ companyId: 1, horizonJours: 30 });
  console.log("Reappro KPIs:", kpis);
  assert(typeof kpis.articlesEnRupture === "number", "KPIs returns articlesEnRupture");
  assert(typeof kpis.articlesACommander === "number", "KPIs returns articlesACommander");

  // 2. Check Suggestions
  const suggestions = calculerBesoinsApprovisionnement({ companyId: 1, horizonJours: 30 });
  console.log(`Calculated ${suggestions.length} reappro suggestions`);
  assert(suggestions.length > 0, "Suggestions list is not empty");

  const firstSug = suggestions[0];
  console.log("Top suggestion:", {
    ref: firstSug.reference,
    designation: firstSug.designation,
    stockActuel: firstSug.stock_actuel,
    stockMin: firstSug.stock_minimum,
    rop: firstSug.rop,
    vmj: firstSug.vmj,
    qteSuggeree: firstSug.quantite_suggeree,
    urgence: firstSug.urgence,
  });

  // 3. Test threshold update
  mettreAJourSeuilsProduit(firstSug.produit_id, {
    stock_minimum: 15,
    stock_maximum: 100,
    delai_livraison_jours: 7,
    conditionnement_achat: 12,
  });

  const updatedProd = db.prepare("SELECT stock_minimum, stock_maximum, delai_livraison_jours, conditionnement_achat FROM produits WHERE id = ?").get(firstSug.produit_id) as any;
  assert(updatedProd.stock_minimum === 15, "Product stock_minimum updated to 15");
  assert(updatedProd.stock_maximum === 100, "Product stock_maximum updated to 100");
  assert(updatedProd.conditionnement_achat === 12, "Product conditionnement_achat updated to 12");

  // 4. Test Generating a Purchase Order (BC)
  const branchRow = db.prepare("SELECT id FROM branches LIMIT 1").get() as { id: number } | undefined;
  const testBranchId = branchRow ? branchRow.id : 1;

  const orderResult = genererBonsCommandeFournisseur(
    [{ produitId: firstSug.produit_id, quantite: 24, prixUnitaireHT: firstSug.prix_achat_ht || 50 }],
    { companyId: 1, branchId: testBranchId, userId: 1, notes: "Test auto reappro" }
  );
  console.log("Generated BC result:", orderResult);
  assert(orderResult.length > 0, "At least 1 BC generated");
  assert(orderResult[0].bcId > 0, "BC document ID created in DB");

  const createdBcDoc = db.prepare("SELECT * FROM documents WHERE id = ?").get(orderResult[0].bcId) as any;
  assert(createdBcDoc.type === "bc", "Created document is of type 'bc'");
  assert(createdBcDoc.status === "brouillon", "Created BC is in 'brouillon' status");

  console.log("\n=========================================");
  console.log("TESTING WMS EMPLACEMENTS & S-SHAPE ROUTING");
  console.log("=========================================");

  // 1. Clean TEST zone if any
  db.prepare("DELETE FROM emplacements WHERE zone = 'TEST'").run();

  // 2. Test Matrix Generator
  const matrixRes = genererMatriceEmplacements({
    companyId: 1,
    branchId: testBranchId,
    zone: "TEST",
    allees: ["01", "02"],
    nbTravees: 2,
    nbNiveaux: 2,
    bacsParNiveau: ["A", "B"],
    type_emplacement: "picking",
  });
  console.log(`Matrix generated ${matrixRes.totalCrees} test emplacements`);
  // 2 aisles * 2 bays * 2 levels * 2 bins = 16 locations
  assert(matrixRes.totalCrees === 16, "Matrix generator created exactly 16 emplacements");

  // 3. List emplacements in WMS
  const emplacements = listEmplacements({ companyId: 1, branchId: testBranchId });
  console.log(`Found ${emplacements.length} emplacements in WMS for branch ${testBranchId}`);
  assert(emplacements.length >= 16, "Emplacements list has at least 16 items");

  // 4. Test Assigning Product to Bin
  const empToAssign = emplacements.find((e) => e.zone === "TEST") || emplacements[0];
  assignerProduitEmplacement({
    companyId: 1,
    branchId: empToAssign.branch_id,
    produitId: firstSug.produit_id,
    emplacementId: empToAssign.id,
    quantite: 18,
    capaciteMax: 50,
    estPrincipal: true,
  });

  const assignedRows = listProduitsEmplacements({
    companyId: 1,
    produitId: firstSug.produit_id,
  });
  console.log("empToAssign.id:", empToAssign.id, "assignedRows:", assignedRows.map(r => ({ empId: r.emplacement_id, code: r.emplacement_code })));
  const matching = assignedRows.find((r) => Number(r.emplacement_id) === Number(empToAssign.id));
  console.log("Matching row:", matching?.emplacement_code, "Expected empToAssign:", empToAssign?.code_emplacement);
  assert(Boolean(matching && matching.emplacement_code === empToAssign.code_emplacement), "Assigned emplacement code matches");

  // Verify fast lookup on produits table
  const prodAfterAssign = db.prepare("SELECT emplacement_code FROM produits WHERE id = ?").get(firstSug.produit_id) as any;
  assert(prodAfterAssign.emplacement_code === empToAssign.code_emplacement, "Produits.emplacement_code updated with primary bin");

  // 4. Test WMS KPIs
  const wmsKpis = getWmsKPIs({ companyId: 1 });
  console.log("WMS KPIs:", wmsKpis);
  assert(wmsKpis.totalEmplacements > 0, "WMS totalEmplacements > 0");
  assert(wmsKpis.totalProduitsCartographies > 0, "WMS totalProduitsCartographies > 0");

  // 5. Test S-Shape Picking List Generation
  // Pick an existing document with lines
  const existingDoc = db.prepare("SELECT d.id FROM documents d JOIN document_lignes dl ON d.id = dl.document_id WHERE d.type IN ('bl', 'bs', 'bc') LIMIT 1").get() as any;
  if (existingDoc) {
    const pickingList = genererPickingList(existingDoc.id);
    console.log(`Generated picking list for document ${pickingList.document_numero} with ${pickingList.total_lignes} items`);
    assert(pickingList.items.length > 0, "Picking list items generated");
    assert(pickingList.items[0].ordre_picking === 1, "First item has ordre_picking === 1");
  } else {
    console.log("No existing document with lines found to test picking list.");
  }

  // Cleanup test matrix emplacements
  db.prepare("DELETE FROM emplacements WHERE zone = 'TEST'").run();
  console.log("🧹 Test matrix emplacements cleaned up.");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
