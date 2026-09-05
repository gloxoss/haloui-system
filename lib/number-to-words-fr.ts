const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];

const TENS = [
  "",
  "dix",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function underHundred(value: number): string {
  if (value < 17) {
    return UNITS[value];
  }

  if (value < 20) {
    return `dix-${UNITS[value - 10]}`;
  }

  const ten = Math.floor(value / 10);
  const unit = value % 10;

  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? 60 : 80;
    const remainder = value - base;
    if (remainder === 11) {
      return `${TENS[ten]} et onze`;
    }
    return `${TENS[ten]}-${underHundred(remainder)}`;
  }

  if (unit === 0) {
    return ten === 8 ? "quatre-vingts" : TENS[ten];
  }

  if (unit === 1 && ten !== 8) {
    return `${TENS[ten]} et un`;
  }

  return `${TENS[ten]}-${UNITS[unit]}`;
}

function underThousand(value: number): string {
  if (value < 100) {
    return underHundred(value);
  }

  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  const hundredPart = hundred === 1 ? "cent" : `${UNITS[hundred]} cent`;

  if (remainder === 0) {
    return hundred > 1 ? `${hundredPart}s` : hundredPart;
  }

  return `${hundredPart} ${underHundred(remainder)}`;
}

function integerToFrench(value: number): string {
  if (value === 0) {
    return UNITS[0];
  }

  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const remainder = value % 1_000;
  const parts: string[] = [];

  if (millions > 0) {
    parts.push(millions === 1 ? "un million" : `${integerToFrench(millions)} millions`);
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push("mille");
    } else {
      parts.push(`${underThousand(thousands)} mille`);
    }
  }

  if (remainder > 0) {
    parts.push(underThousand(remainder));
  }

  return parts.join(" ");
}

export function amountToFrenchWords(value: number, currencyCode = "MAD") {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  const major = Math.floor(rounded);
  const minor = Math.round((rounded - major) * 100);

  const cur = (currencyCode || "MAD").toUpperCase();

  let singularMajor = "dirham";
  let pluralMajor = "dirhams";
  let singularMinor = "centime";
  let pluralMinor = "centimes";

  switch (cur) {
    case "EUR":
      singularMajor = "euro";
      pluralMajor = "euros";
      singularMinor = "cent";
      pluralMinor = "cents";
      break;
    case "USD":
      singularMajor = "dollar américain";
      pluralMajor = "dollars américains";
      singularMinor = "cent";
      pluralMinor = "cents";
      break;
    case "GBP":
      singularMajor = "livre sterling";
      pluralMajor = "livres sterling";
      singularMinor = "penny";
      pluralMinor = "pence";
      break;
    case "CHF":
      singularMajor = "franc suisse";
      pluralMajor = "francs suisses";
      singularMinor = "centime";
      pluralMinor = "centimes";
      break;
    case "CAD":
      singularMajor = "dollar canadien";
      pluralMajor = "dollars canadiens";
      singularMinor = "cent";
      pluralMinor = "cents";
      break;
    case "AED":
      singularMajor = "dirham des émirats";
      pluralMajor = "dirhams des émirats";
      singularMinor = "fils";
      pluralMinor = "fils";
      break;
    case "SAR":
      singularMajor = "riyal saoudien";
      pluralMajor = "riyals saoudiens";
      singularMinor = "halala";
      pluralMinor = "halalas";
      break;
    case "CNY":
      singularMajor = "yuan";
      pluralMajor = "yuans";
      singularMinor = "fen";
      pluralMinor = "fens";
      break;
    default:
      singularMajor = "dirham";
      pluralMajor = "dirhams";
      singularMinor = "centime";
      pluralMinor = "centimes";
      break;
  }

  const majorPart =
    major === 1
      ? `un ${singularMajor}`
      : `${integerToFrench(major)} ${pluralMajor}`;

  if (minor === 0) {
    return majorPart;
  }

  const minorPart =
    minor === 1
      ? `un ${singularMinor}`
      : `${integerToFrench(minor)} ${pluralMinor}`;

  return `${majorPart} et ${minorPart}`;
}
