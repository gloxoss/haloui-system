import { DEVISES_STANDARDS } from "@/lib/constants";
import { type CurrencyRecord } from "@/lib/types";

export type LiveRatesResult = {
  success: boolean;
  base: string;
  date: string;
  rates: Record<string, number>; // Currency code -> Rate against 1 unit (e.g. 1 EUR = X MAD)
  source: string;
};

/**
 * Récupère les cours de change en temps réel contre le Dirham Marocain (MAD).
 * Utilise l'API publique ouverte sans clé (open.er-api.com) avec repli automatique vers les cours de référence.
 */
export async function fetchLiveExchangeRates(base = "MAD"): Promise<LiveRatesResult> {
  const fallbackRates: Record<string, number> = {};
  for (const item of DEVISES_STANDARDS) {
    fallbackRates[item.code] = item.tauxDefaut;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // Cache Next.js 1h
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.rates && typeof data.rates === "object") {
      const liveRates: Record<string, number> = { MAD: 1.0 };

      // Dans l'API avec base = MAD, 1 MAD = rates[CODE] devises
      // Donc pour obtenir le cours direct 1 devise = X MAD : X = 1 / rates[CODE]
      for (const cur of DEVISES_STANDARDS) {
        if (cur.code === "MAD") {
          liveRates["MAD"] = 1.0;
        } else if (data.rates[cur.code] && Number(data.rates[cur.code]) > 0) {
          const directRate = 1 / Number(data.rates[cur.code]);
          liveRates[cur.code] = Math.round(directRate * 10000) / 10000;
        } else {
          liveRates[cur.code] = cur.tauxDefaut;
        }
      }

      return {
        success: true,
        base,
        date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        rates: liveRates,
        source: "open_er_api",
      };
    }
  } catch (error) {
    console.warn("Échec de la récupération des taux en direct, repli sur cours indicatifs:", error);
  }

  return {
    success: false,
    base,
    date: new Date().toISOString().slice(0, 10),
    rates: fallbackRates,
    source: "reference_indicative",
  };
}

/**
 * Retourne le symbole de la devise
 */
export function getCurrencySymbol(code: string): string {
  const normalized = (code || "MAD").toUpperCase();
  const standard = DEVISES_STANDARDS.find((c) => c.code === normalized);
  if (standard) return standard.symbole;

  const SYMBOLS: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF",
    CAD: "$ CA",
    AED: "AED",
    SAR: "SAR",
    CNY: "¥",
    TRY: "₺",
    MAD: "DH",
  };

  return SYMBOLS[normalized] || normalized;
}

/**
 * Convertit un montant d'une devise vers une autre
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string = "MAD",
  customRate?: number
): { convertedAmount: number; effectiveRate: number } {
  const normFrom = (fromCode || "MAD").toUpperCase();
  const normTo = (toCode || "MAD").toUpperCase();

  if (normFrom === normTo) {
    return { convertedAmount: amount, effectiveRate: 1.0 };
  }

  // Taux personnalisé fourni
  if (customRate && customRate > 0) {
    const converted = Math.round(amount * customRate * 100) / 100;
    return { convertedAmount: converted, effectiveRate: customRate };
  }

  // Taux par défaut
  const curFrom = DEVISES_STANDARDS.find((c) => c.code === normFrom);
  const rateFromInMad = curFrom ? curFrom.tauxDefaut : 1.0;

  const curTo = DEVISES_STANDARDS.find((c) => c.code === normTo);
  const rateToInMad = curTo ? curTo.tauxDefaut : 1.0;

  // Montant en MAD = amount * rateFromInMad
  // Montant dans toCode = (amount * rateFromInMad) / rateToInMad
  const effectiveRate = rateFromInMad / rateToInMad;
  const converted = Math.round(amount * effectiveRate * 100) / 100;

  return {
    convertedAmount: converted,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
  };
}

/**
 * Calcule l'écart de change (Gain ou Perte) sur un règlement
 * Conforme au Plan Comptable Marocain (CGNC) et normes internationales
 */
export function computeForexGainLoss(
  paramsOrType:
    | {
        typeOperation: "vente" | "achat";
        montantDevise: number;
        tauxInitial: number;
        tauxReglement: number;
      }
    | "vente"
    | "achat",
  argMontant?: number,
  argTauxInitial?: number,
  argTauxReglement?: number
): {
  montantInitialBase: number;
  montantRegleBase: number;
  ecartChange: number;
  typeResultat: "gain" | "perte" | "nul";
  compteComptable: string;
  description: string;
} {
  let typeOperation: "vente" | "achat";
  let montantDevise: number;
  let tauxInitial: number;
  let tauxReglement: number;

  if (typeof paramsOrType === "object") {
    typeOperation = paramsOrType.typeOperation;
    montantDevise = paramsOrType.montantDevise;
    tauxInitial = paramsOrType.tauxInitial;
    tauxReglement = paramsOrType.tauxReglement;
  } else {
    typeOperation = paramsOrType;
    montantDevise = argMontant || 0;
    tauxInitial = argTauxInitial || 1;
    tauxReglement = argTauxReglement || 1;
  }

  const montantInitialBase = Math.round(montantDevise * tauxInitial * 100) / 100;
  const montantRegleBase = Math.round(montantDevise * tauxReglement * 100) / 100;

  let ecartChange = 0;

  if (typeOperation === "vente") {
    // Vente (Créance client) : Si le taux monte au règlement, on encaisse plus de MAD -> Gain
    // Ex: 1000 EUR @ 10.80 = 10800 MAD. Reçu @ 10.95 = 10950 MAD. Écart = +150 MAD (Gain)
    ecartChange = Math.round((montantRegleBase - montantInitialBase) * 100) / 100;
  } else {
    // Achat (Dette fournisseur) : Si le taux monte au règlement, on paye plus de MAD -> Perte
    // Ex: 1000 USD @ 10.00 = 10000 MAD. Payé @ 10.20 = 10200 MAD. Écart = -200 MAD (Perte)
    ecartChange = Math.round((montantInitialBase - montantRegleBase) * 100) / 100;
  }

  let typeResultat: "gain" | "perte" | "nul" = "nul";
  let compteComptable = "7331"; // Compte 7331 : Gains de change (Produits financiers)
  let description = "Aucun écart de change (taux inchangé)";

  if (ecartChange > 0.009) {
    typeResultat = "gain";
    compteComptable = "7331"; // Gains de change réalisés
    description = `Gain de change réalisé : +${ecartChange.toFixed(2)} MAD (Crédit compte ${compteComptable})`;
  } else if (ecartChange < -0.009) {
    typeResultat = "perte";
    compteComptable = "6331"; // Pertes de change réalisées (Charges financières)
    description = `Perte de change réalisée : ${ecartChange.toFixed(2)} MAD (Débit compte ${compteComptable})`;
  }

  return {
    montantInitialBase,
    montantRegleBase,
    ecartChange,
    typeResultat,
    compteComptable,
    description,
  };
}

/**
 * Formatage d'un montant avec le symbole monétaire approprié
 */
export function formatCurrencyAmount(
  amount: number | null | undefined,
  currencyCode = "MAD",
  locale = "fr-MA"
): string {
  const val = Number(amount) || 0;
  const cur = (currencyCode || "MAD").toUpperCase();

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur === "MAD" ? "MAD" : cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    const symbol = getCurrencySymbol(cur);
    return `${val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  }
}
