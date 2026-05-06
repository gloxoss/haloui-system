import { getDb } from "@/lib/db";
import { type DocumentType } from "@/lib/types";

export function nextNumber(type: DocumentType) {
  const db = getDb();

  const transaction = db.transaction((documentType: DocumentType) => {
    const row = db
      .prepare("SELECT last_number FROM numerotation WHERE type = ?")
      .get(documentType) as { last_number?: number } | undefined;

    const next = (row?.last_number ?? 0) + 1;

    db.prepare(
      `
        INSERT INTO numerotation (type, last_number)
        VALUES (?, ?)
        ON CONFLICT(type) DO UPDATE SET last_number = excluded.last_number
      `,
    ).run(documentType, next);

    return next;
  });

  return transaction(type);
}
