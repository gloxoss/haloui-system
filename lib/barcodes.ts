import QRCode from "qrcode";
import { type BarcodeSymbology } from "./types";

// ============================================================
// 1. GÉNÉRATEUR EAN-13 VECTORIEL PUR (SVG)
// ============================================================

// Tables de parité EAN-13 pour les 6 chiffres de gauche
// L = Impaire, G = Paire
const EAN_PARITY_PATTERNS = [
  "LLLLLL", // 0
  "LLGLGG", // 1
  "LLGGLG", // 2
  "LLGGGL", // 3
  "LGLLGG", // 4
  "LGGLLG", // 5
  "LGGGLL", // 6
  "LGLGLG", // 7
  "LGLGGL", // 8
  "LGGLGL", // 9
];

// Encodage binaire des chiffres 0 à 9 selon la parité L, G, R
const EAN_L_CODES = [
  "0001101", // 0
  "0011001", // 1
  "0010011", // 2
  "0111101", // 3
  "0100011", // 4
  "0110001", // 5
  "0101111", // 6
  "0111011", // 7
  "0110111", // 8
  "0001011", // 9
];

const EAN_G_CODES = [
  "0100111", // 0
  "0110011", // 1
  "0011011", // 2
  "0100001", // 3
  "0011101", // 4
  "0111001", // 5
  "0000101", // 6
  "0010001", // 7
  "0001001", // 8
  "0010111", // 9
];

const EAN_R_CODES = [
  "1110010", // 0
  "1100110", // 1
  "1101100", // 2
  "1000010", // 3
  "1011100", // 4
  "1001110", // 5
  "1010000", // 6
  "1000100", // 7
  "1001000", // 8
  "1110100", // 9
];

/**
 * Calcule la clé de contrôle de Luhn (modulo 10) pour EAN-13.
 */
export function calculateEan13Checksum(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i], 10) || 0;
    sum += i % 2 === 0 ? d * 1 : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Valide et normalise une chaîne en code EAN-13 valide à 13 chiffres.
 */
export function normalizeToEan13(code: string): string {
  const clean = code.replace(/\D/g, "");
  if (clean.length === 12) {
    return clean + calculateEan13Checksum(clean);
  }
  if (clean.length === 13) {
    // Vérifier ou corriger le dernier chiffre
    const expected = calculateEan13Checksum(clean.slice(0, 12));
    return clean.slice(0, 12) + expected;
  }
  // Si trop court, compléter avec des zéros à gauche (format 200... pour usage interne magasin)
  const padded = clean.padStart(12, "0").slice(-12);
  return padded + calculateEan13Checksum(padded);
}

/**
 * Génère un SVG pur vectoriel net pour un code EAN-13.
 */
export function generateEan13Svg(
  rawCode: string,
  options: { width?: number; height?: number; includeText?: boolean } = {}
): string {
  const ean = normalizeToEan13(rawCode);
  const includeText = options.includeText ?? true;
  const barHeight = options.height ?? 50;
  const totalWidth = options.width ?? 120;

  const firstDigit = parseInt(ean[0], 10);
  const parityPattern = EAN_PARITY_PATTERNS[firstDigit];

  // 1. Déterminer la séquence des 95 modules (barres & espaces)
  let modules = "";

  // Guard de début : 101
  modules += "101";

  // 6 chiffres de gauche (indices 1 à 6)
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(ean[i], 10);
    const parity = parityPattern[i - 1];
    modules += parity === "L" ? EAN_L_CODES[digit] : EAN_G_CODES[digit];
  }

  // Guard central : 01010
  modules += "01010";

  // 6 chiffres de droite (indices 7 à 12)
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(ean[i], 10);
    modules += EAN_R_CODES[digit];
  }

  // Guard de fin : 101
  modules += "101";

  // Rendu SVG vectoriel
  const quietZoneModules = 7;
  const totalModules = 95 + quietZoneModules * 2;
  const moduleWidth = totalWidth / totalModules;

  let rects = "";
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === "1") {
      const x = (quietZoneModules + i) * moduleWidth;
      // Les guards sont légèrement plus longues si du texte est présent
      const isGuard =
        i < 3 || (i >= 45 && i < 50) || i >= 92;
      const h = includeText && !isGuard ? barHeight - 12 : barHeight;
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${moduleWidth.toFixed(2)}" height="${h}" fill="#000000" />\n`;
    }
  }

  const svgHeight = includeText ? barHeight + 12 : barHeight;
  let textElements = "";
  if (includeText) {
    const leftText = ean.slice(1, 7);
    const rightText = ean.slice(7, 13);
    const leftX = (quietZoneModules + 24) * moduleWidth;
    const rightX = (quietZoneModules + 70) * moduleWidth;
    const firstX = (quietZoneModules - 4) * moduleWidth;

    textElements = `
      <text x="${firstX.toFixed(2)}" y="${svgHeight - 1}" font-family="monospace" font-size="9" font-weight="bold" fill="#000000" text-anchor="middle">${ean[0]}</text>
      <text x="${leftX.toFixed(2)}" y="${svgHeight - 1}" font-family="monospace" font-size="9" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="1">${leftText}</text>
      <text x="${rightX.toFixed(2)}" y="${svgHeight - 1}" font-family="monospace" font-size="9" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="1">${rightText}</text>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}" shape-rendering="crispEdges">
      <rect width="${totalWidth}" height="${svgHeight}" fill="#ffffff" />
      ${rects}
      ${textElements}
    </svg>
  `.trim();
}

// ============================================================
// 2. GÉNÉRATEUR CODE 128 VECTORIEL PUR (SVG)
// ============================================================

// Patterns de largeurs de barres/espaces pour Code 128 (107 symboles)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 est Stop)
];

const CODE128_START_B = 104;
const CODE128_STOP = 106;

/**
 * Génère un SVG vectoriel net pour un code Code 128 (Set B).
 */
export function generateCode128Svg(
  text: string,
  options: { width?: number; height?: number; includeText?: boolean } = {}
): string {
  const safeText = text.trim() || "000000";
  const includeText = options.includeText ?? true;
  const barHeight = options.height ?? 50;

  // Calculer les codes ASCII pour le Set B (valeurs 0 à 95 correspondent aux codes 32 à 127)
  const charCodes: number[] = [CODE128_START_B];
  let checksum = CODE128_START_B;

  for (let i = 0; i < safeText.length; i++) {
    const ascii = safeText.charCodeAt(i);
    const codeVal = ascii >= 32 && ascii <= 126 ? ascii - 32 : 0;
    charCodes.push(codeVal);
    checksum += codeVal * (i + 1);
  }

  const checksumVal = checksum % 103;
  charCodes.push(checksumVal);
  charCodes.push(CODE128_STOP);

  // Convertir chaque code en modules de barres et d'espaces
  let binaryString = "";
  for (const code of charCodes) {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      binaryString += (isBar ? "1" : "0").repeat(width);
      isBar = !isBar;
    }
  }

  const quietModules = 10;
  const totalModules = binaryString.length + quietModules * 2;
  const totalWidth = options.width ?? Math.max(140, totalModules * 1.2);
  const moduleWidth = totalWidth / totalModules;

  let rects = "";
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === "1") {
      const x = (quietModules + i) * moduleWidth;
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${moduleWidth.toFixed(2)}" height="${barHeight}" fill="#000000" />\n`;
    }
  }

  const svgHeight = includeText ? barHeight + 14 : barHeight;
  let textElement = "";
  if (includeText) {
    const centerX = totalWidth / 2;
    textElement = `<text x="${centerX.toFixed(2)}" y="${svgHeight - 2}" font-family="monospace" font-size="10" font-weight="bold" fill="#000000" text-anchor="middle">${safeText}</text>`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}" shape-rendering="crispEdges">
      <rect width="${totalWidth}" height="${svgHeight}" fill="#ffffff" />
      ${rects}
      ${textElement}
    </svg>
  `.trim();
}

// ============================================================
// 3. GÉNÉRATEUR QR CODE VECTORIEL (SVG)
// ============================================================

/**
 * Génère un SVG pur pour un QR Code via la librairie qrcode.
 */
export async function generateQrCodeSvg(
  content: string,
  options: { size?: number } = {}
): Promise<string> {
  const size = options.size ?? 80;
  const safeContent = content.trim() || "HALOUI";

  try {
    const svgString = await QRCode.toString(safeContent, {
      type: "svg",
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    return svgString;
  } catch (err) {
    // Fallback simple si erreur
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#eee"/><text x="10" y="${size/2}" font-size="10">QR Error</text></svg>`;
  }
}

// ============================================================
// 4. API UNIFIÉE DE GÉNÉRATION DE CODE-BARRES / QR CODE
// ============================================================

export async function generateBarcodeSvg(
  symbology: BarcodeSymbology,
  code: string,
  options: { width?: number; height?: number; includeText?: boolean } = {}
): Promise<string> {
  if (symbology === "qrcode") {
    return generateQrCodeSvg(code, { size: options.width || options.height || 80 });
  }

  if (symbology === "ean13") {
    return generateEan13Svg(code, options);
  }

  // Code 128 par défaut
  return generateCode128Svg(code, options);
}
