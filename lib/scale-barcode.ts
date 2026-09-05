import { type PosProductItem } from "@/components/pos/pos-terminal";
import { type ParsedScaleBarcode } from "@/lib/types";

/**
 * Détecte et décode un code-barres balance EAN-13 (Standard GS1 Poids/Prix variable in-store).
 *
 * Formats reconnus :
 * - Poids variable (en grammes) : Préfixes 20, 21, 22, 23, 24
 *   Exemple : 2100123014508 -> Préfixe 21, PLU 00123, Poids 1450g (1.450 kg)
 * - Prix variable (en centimes) : Préfixes 28, 29
 *   Exemple : 2800123004507 -> Préfixe 28, PLU 00123, Prix 45.00 DH
 */
export function parseScaleBarcode(
  rawBarcode: string,
  products: PosProductItem[]
): ParsedScaleBarcode {
  const code = (rawBarcode || "").trim();

  // Doit être un code numérique de 13 chiffres
  if (!/^\d{13}$/.test(code)) {
    return { isValidScaleBarcode: false };
  }

  const prefix = code.slice(0, 2);
  const isWeightPrefix = ["20", "21", "22", "23", "24"].includes(prefix);
  const isPricePrefix = ["28", "29"].includes(prefix);

  if (!isWeightPrefix && !isPricePrefix) {
    return { isValidScaleBarcode: false };
  }

  const type: "weight" | "price" = isWeightPrefix ? "weight" : "price";

  // Tentative 1 : PLU sur 5 chiffres (positions 2 à 7) et valeur sur 5 chiffres (positions 7 à 12)
  const plu5 = code.slice(2, 7);
  const val5 = parseInt(code.slice(7, 12), 10);

  // Tentative 2 : PLU sur 4 chiffres (positions 2 à 6) et valeur sur 6 chiffres (positions 6 à 12) ou 5 chiffres (positions 7 à 12)
  const plu4 = code.slice(2, 6);

  // Recherche du produit correspondant parmi le catalogue
  const normalizedPlu5 = String(parseInt(plu5, 10));
  const normalizedPlu4 = String(parseInt(plu4, 10));

  const matchedProduct = products.find((p) => {
    // 1. Correspondance exacte sur code_plu si défini
    const pAny = p as any;
    if (pAny.code_plu) {
      const prodPlu = String(pAny.code_plu).trim();
      if (
        prodPlu === plu5 ||
        prodPlu === plu4 ||
        String(parseInt(prodPlu, 10)) === normalizedPlu5 ||
        String(parseInt(prodPlu, 10)) === normalizedPlu4
      ) {
        return true;
      }
    }

    // 2. Correspondance sur code_barre débutant par le préfixe + PLU
    if (p.code_barre) {
      const cb = p.code_barre.trim();
      if (cb === `${prefix}${plu5}` || cb === `${prefix}${plu4}` || cb === plu5 || cb === plu4) {
        return true;
      }
    }

    // 3. Correspondance sur la référence produit (ex: "PLU-123", "P-0123", ou "123")
    const refNum = p.ref.replace(/\D/g, "");
    if (refNum && (refNum === normalizedPlu5 || refNum === normalizedPlu4)) {
      return true;
    }

    return false;
  });

  if (type === "weight") {
    // Valeur en grammes -> conversion en kilogrammes (avec 3 décimales)
    const rawWeightGrams = isNaN(val5) ? 0 : val5;
    const weightKg = Math.round((rawWeightGrams / 1000) * 1000) / 1000;

    let calculatedTotalTtc = 0;
    if (matchedProduct) {
      calculatedTotalTtc = Math.round(weightKg * matchedProduct.prix_ttc * 100) / 100;
    }

    return {
      isValidScaleBarcode: true,
      type: "weight",
      prefix,
      plu: plu5,
      rawWeightGrams,
      weightKg,
      matchedProductId: matchedProduct?.id,
      calculatedQuantity: weightKg,
      calculatedTotalTtc,
    };
  } else {
    // Valeur en centimes -> conversion en Dirhams (DH)
    const rawPriceCents = isNaN(val5) ? 0 : val5;
    const priceDh = Math.round((rawPriceCents / 100) * 100) / 100;

    let calculatedQuantity = 1;
    if (matchedProduct && matchedProduct.prix_ttc > 0) {
      // Déduire le poids équivalent en fonction du prix au kilo : Q = Prix Total / Prix TTC
      calculatedQuantity = Math.round((priceDh / matchedProduct.prix_ttc) * 1000) / 1000;
    }

    return {
      isValidScaleBarcode: true,
      type: "price",
      prefix,
      plu: plu5,
      rawPriceCents,
      priceDh,
      matchedProductId: matchedProduct?.id,
      calculatedQuantity,
      calculatedTotalTtc: priceDh,
    };
  }
}
