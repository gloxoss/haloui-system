import { type DocumentLineInput } from "@/lib/types";

export type ComputedLine = DocumentLineInput & {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
};

export type DocumentTotals = {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  remise: number;
};

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeLine(line: Omit<DocumentLineInput, "total_ht">) {
  const quantity = Number(line.quantite) || 0;
  const unitPrice = Number(line.prix_unitaire_ht) || 0;
  const discount = Number(line.remise) || 0;
  const tvaRate = Number(line.tva_rate) || 0;

  const lineHt = roundAmount(Math.max(quantity * unitPrice - discount, 0));
  const lineTva = roundAmount((lineHt * tvaRate) / 100);
  const lineTtc = roundAmount(lineHt + lineTva);

  return {
    ...line,
    total_ht: lineHt,
    total_tva: lineTva,
    total_ttc: lineTtc,
  };
}

export function computeDocumentTotals(lines: Array<Omit<DocumentLineInput, "total_ht">>) {
  const computed = lines.map((line) => computeLine(line));
  return computed.reduce<{
    lines: ComputedLine[];
    totals: DocumentTotals;
  }>(
    (accumulator, current) => {
      accumulator.lines.push(current);
      accumulator.totals.total_ht = roundAmount(accumulator.totals.total_ht + current.total_ht);
      accumulator.totals.total_tva = roundAmount(accumulator.totals.total_tva + current.total_tva);
      accumulator.totals.total_ttc = roundAmount(accumulator.totals.total_ttc + current.total_ttc);
      accumulator.totals.remise = roundAmount(accumulator.totals.remise + (Number(current.remise) || 0));
      return accumulator;
    },
    {
      lines: [],
      totals: {
        total_ht: 0,
        total_tva: 0,
        total_ttc: 0,
        remise: 0,
      },
    },
  );
}
