import { type ParsedBankStatement } from "@/lib/types";

/**
 * Nettoie une chaîne de montant (ex: "1 250,50 MAD", "-450,00", "1,250.00")
 * et retourne un nombre flottant propre.
 */
export function cleanBankAmount(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;

  let cleaned = String(raw).trim();
  // Retirer les devises et caractères alphabétiques
  cleaned = cleaned.replace(/[^\d.,+\-]/g, "");
  if (!cleaned) return 0;

  // Si contient virgule et point (ex: 1,250.50 ou 1.250,50)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      // Format européen: 1.250,50
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // Format anglo-saxon: 1,250.50
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    // Uniquement des virgules (ex: 1250,50)
    cleaned = cleaned.replace(",", ".");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalise une date brute vers le format ISO standard YYYY-MM-DD
 */
export function parseBankDate(raw: string | undefined | null): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const clean = String(raw).trim();

  // Déjà format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Format compact OFX: YYYYMMDD ou YYYYMMDDHHMMSS
  const ofxMatch = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch && !clean.includes("/") && !clean.includes("-")) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }

  // Format JJ/MM/AAAA ou JJ-MM-AAAA
  const dmyMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, "0");
    let month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = (parseInt(year, 10) > 50 ? "19" : "20") + year;
    }
    return `${year}-${month}-${day}`;
  }

  // Fallback date
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Analyseur de relevés bancaires OFX (Open Financial Exchange)
 * Supporte les variantes OFX 1.x (SGML sans balises fermantes) et OFX 2.x (XML)
 */
export function parseOFX(content: string, fileName = "releve.ofx"): ParsedBankStatement {
  const operations: ParsedBankStatement["operations"] = [];
  let soldeFinal: number | undefined;
  let dateDebut: string | undefined;
  let dateFin: string | undefined;
  let devise = "MAD";

  // Extraction devise
  const curMatch = content.match(/<CURDEF>([^<\r\n]+)/i);
  if (curMatch) devise = curMatch[1].trim();

  // Extraction solde de clôture
  const balMatch = content.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i);
  if (balMatch) {
    soldeFinal = cleanBankAmount(balMatch[1]);
  }

  // Extraction dates de période
  const dtStartMatch = content.match(/<DTSTART>([^<\r\n]+)/i);
  if (dtStartMatch) dateDebut = parseBankDate(dtStartMatch[1]);

  const dtEndMatch = content.match(/<DTEND>([^<\r\n]+)/i);
  if (dtEndMatch) dateFin = parseBankDate(dtEndMatch[1]);

  // Extraction des transactions <STMTTRN>
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|$))/gi;
  let match;

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1];

    const typeMatch = block.match(/<TRNTYPE>([^<\r\n]+)/i);
    const dateMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    const amtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    const fitidMatch = block.match(/<FITID>([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const checkNumMatch = block.match(/<CHECKNUM>([^<\r\n]+)/i);

    const rawAmt = amtMatch ? cleanBankAmount(amtMatch[1]) : 0;
    const trnType = typeMatch ? typeMatch[1].trim().toUpperCase() : "";

    const isCredit = rawAmt > 0 || trnType === "CREDIT" || trnType === "DEP";
    const amount = Math.abs(rawAmt);

    const labelParts: string[] = [];
    if (nameMatch && nameMatch[1].trim()) labelParts.push(nameMatch[1].trim());
    if (memoMatch && memoMatch[1].trim() && memoMatch[1].trim() !== nameMatch?.[1]?.trim()) {
      labelParts.push(memoMatch[1].trim());
    }

    const libelle = labelParts.join(" - ") || (isCredit ? "Virement reçu" : "Prélèvement / Débit bancaire");
    const dateOp = parseBankDate(dateMatch ? dateMatch[1] : undefined);
    const ref = (fitidMatch ? fitidMatch[1].trim() : "") || (checkNumMatch ? checkNumMatch[1].trim() : "");

    if (amount > 0) {
      operations.push({
        date: dateOp,
        libelle,
        reference: ref,
        type: isCredit ? "credit" : "debit",
        montant: amount,
      });
    }
  }

  // Si dates de début / fin non trouvées, déduire des opérations
  if (operations.length > 0) {
    const dates = operations.map((op) => op.date).sort();
    if (!dateDebut) dateDebut = dates[0];
    if (!dateFin) dateFin = dates[dates.length - 1];
  }

  return {
    format: "OFX",
    nomFichier: fileName,
    dateDebut,
    dateFin,
    soldeFinal,
    devise,
    operations,
  };
}

/**
 * Analyseur de relevés bancaires QIF (Quicken Interchange Format)
 */
export function parseQIF(content: string, fileName = "releve.qif"): ParsedBankStatement {
  const lines = content.split(/\r?\n/);
  const operations: ParsedBankStatement["operations"] = [];

  let currentDate = "";
  let currentAmount = 0;
  let currentPayee = "";
  let currentMemo = "";
  let currentNum = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("!")) continue;

    const code = line.charAt(0);
    const value = line.substring(1).trim();

    switch (code) {
      case "D":
        currentDate = parseBankDate(value);
        break;
      case "T":
      case "U":
        currentAmount = cleanBankAmount(value);
        break;
      case "P":
        currentPayee = value;
        break;
      case "M":
        currentMemo = value;
        break;
      case "N":
        currentNum = value;
        break;
      case "^":
        // Fin de l'enregistrement
        if (currentAmount !== 0) {
          const isCredit = currentAmount > 0;
          const labelParts = [currentPayee, currentMemo].filter(Boolean);
          operations.push({
            date: currentDate || new Date().toISOString().slice(0, 10),
            libelle: labelParts.join(" - ") || (isCredit ? "Crédit bancaire" : "Débit bancaire"),
            reference: currentNum,
            type: isCredit ? "credit" : "debit",
            montant: Math.abs(currentAmount),
          });
        }
        currentDate = "";
        currentAmount = 0;
        currentPayee = "";
        currentMemo = "";
        currentNum = "";
        break;
    }
  }

  const dates = operations.map((op) => op.date).sort();

  return {
    format: "QIF",
    nomFichier: fileName,
    dateDebut: dates[0],
    dateFin: dates[dates.length - 1],
    devise: "MAD",
    operations,
  };
}

/**
 * Analyseur intelligent de relevés bancaires CSV (Standard Maroc & International)
 * Supporte : Attijariwafa, Banque Populaire, CIH, BMCE, SGMB, CSV génériques
 */
export function parseBankCSV(content: string, fileName = "releve.csv"): ParsedBankStatement {
  const rawLines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return { format: "CSV", nomFichier: fileName, operations: [] };
  }

  // 1. Détection automatique du délimiteur
  const sample = rawLines.slice(0, 10).join("\n");
  const countSemi = (sample.match(/;/g) || []).length;
  const countComma = (sample.match(/,/g) || []).length;
  const countTab = (sample.match(/\t/g) || []).length;

  let delimiter = ";";
  if (countTab > countSemi && countTab > countComma) delimiter = "\t";
  else if (countComma > countSemi && countComma > countTab) delimiter = ",";

  // Helper pour découper une ligne CSV en tenant compte des guillemets
  function splitCSVLine(text: string, sep: string): string[] {
    const res: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === sep && !inQuotes) {
        res.push(cur.trim().replace(/^"|"$/g, ""));
        cur = "";
      } else {
        cur += c;
      }
    }
    res.push(cur.trim().replace(/^"|"$/g, ""));
    return res;
  }

  // 2. Détection de la ligne d'en-tête
  let headerIndex = -1;
  let dateCol = -1;
  let dateValCol = -1;
  let libelleCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let montantCol = -1;
  let refCol = -1;

  for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
    const cols = splitCSVLine(rawLines[i], delimiter).map((c) => c.toLowerCase());

    const dIdx = cols.findIndex((c) =>
      c.includes("date") && !c.includes("valeur") && !c.includes("val") ||
      c.includes("تاريخ") && !c.includes("قيمة"),
    );
    const libIdx = cols.findIndex((c) =>
      c.includes("libelle") || c.includes("libellé") || c.includes("designation") ||
      c.includes("désignation") || c.includes("operation") || c.includes("opération") ||
      c.includes("motif") || c.includes("description") || c.includes("البيان"),
    );

    if (dIdx !== -1 && libIdx !== -1) {
      headerIndex = i;
      dateCol = dIdx;
      libelleCol = libIdx;

      dateValCol = cols.findIndex((c) => c.includes("valeur") || c.includes("val") || c.includes("قيمة"));
      debitCol = cols.findIndex((c) => c.includes("debit") || c.includes("débit") || c.includes("مدين"));
      creditCol = cols.findIndex((c) => c.includes("credit") || c.includes("crédit") || c.includes("دائن"));
      montantCol = cols.findIndex((c) => (c.includes("montant") || c.includes("amount") || c.includes("المبلغ")) && c !== cols[debitCol] && c !== cols[creditCol]);
      refCol = cols.findIndex((c) => c.includes("ref") || c.includes("réf") || c.includes("cheque") || c.includes("chèque") || c.includes("piece") || c.includes("pièce") || c.includes("مرجع"));
      break;
    }
  }

  const operations: ParsedBankStatement["operations"] = [];

  // Si aucun en-tête identifié, tenter un fallback par position (ex: col0=Date, col1=Libelle, col2=Debit, col3=Credit)
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;
  if (dateCol === -1) dateCol = 0;
  if (libelleCol === -1) libelleCol = 1;

  for (let i = startRow; i < rawLines.length; i++) {
    const row = splitCSVLine(rawLines[i], delimiter);
    if (row.length <= 1) continue;

    const rawDate = row[dateCol];
    const rawLibelle = row[libelleCol];
    if (!rawDate || !rawLibelle) continue;

    const opDate = parseBankDate(rawDate);
    const dateValeur = dateValCol !== -1 && row[dateValCol] ? parseBankDate(row[dateValCol]) : undefined;
    const ref = refCol !== -1 ? row[refCol] : "";

    let isCredit = false;
    let montant = 0;

    if (debitCol !== -1 && creditCol !== -1) {
      const debitVal = cleanBankAmount(row[debitCol]);
      const creditVal = cleanBankAmount(row[creditCol]);

      if (creditVal > 0) {
        isCredit = true;
        montant = creditVal;
      } else if (debitVal > 0) {
        isCredit = false;
        montant = debitVal;
      }
    } else if (montantCol !== -1 || (row[2] && !isNaN(cleanBankAmount(row[2])))) {
      const targetCol = montantCol !== -1 ? montantCol : 2;
      const rawNum = cleanBankAmount(row[targetCol]);
      isCredit = rawNum > 0;
      montant = Math.abs(rawNum);
    }

    if (montant > 0) {
      operations.push({
        date: opDate,
        dateValeur,
        libelle: rawLibelle,
        reference: ref,
        type: isCredit ? "credit" : "debit",
        montant,
      });
    }
  }

  const dates = operations.map((op) => op.date).sort();

  return {
    format: "CSV",
    nomFichier: fileName,
    dateDebut: dates[0],
    dateFin: dates[dates.length - 1],
    devise: "MAD",
    operations,
  };
}

/**
 * Détecte automatiquement le format (OFX, QIF, CSV) et analyse le contenu
 */
export function parseBankStatementFile(fileName: string, content: string): ParsedBankStatement {
  const lowerName = fileName.toLowerCase();
  const trimmed = content.trim();

  if (lowerName.endsWith(".ofx") || trimmed.includes("<OFX>") || trimmed.includes("OFXHEADER")) {
    return parseOFX(content, fileName);
  }

  if (lowerName.endsWith(".qif") || trimmed.startsWith("!Type:") || trimmed.includes("!Type:Bank")) {
    return parseQIF(content, fileName);
  }

  return parseBankCSV(content, fileName);
}
