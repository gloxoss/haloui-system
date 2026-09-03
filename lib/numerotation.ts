import { getDb } from "@/lib/db";
import { type DocumentType } from "@/lib/types";

export function nextNumber(type: DocumentType, companyId = 1) {
  const db = getDb();
  const key = `${companyId}:${type}`;

  const transaction = db.transaction(() => {
    let row = db
      .prepare("SELECT last_number FROM numerotation WHERE type = ?")
      .get(key) as { last_number?: number } | undefined;

    if (!row && companyId === 1) {
      row = db
        .prepare("SELECT last_number FROM numerotation WHERE type = ?")
        .get(type) as { last_number?: number } | undefined;
    }

    const next = (row?.last_number ?? 0) + 1;

    db.prepare(
      `
        INSERT INTO numerotation (type, last_number)
        VALUES (?, ?)
        ON CONFLICT(type) DO UPDATE SET last_number = excluded.last_number
      `,
    ).run(key, next);

    return next;
  });

  return transaction();
}
