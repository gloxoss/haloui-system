"use client";

import { saveRevenueCellAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type BranchRecord } from "@/lib/types";

export function RevenueGrid({
  month,
  branches,
  table,
}: {
  month: string;
  branches: BranchRecord[];
  table: Array<{ date: string; values: Record<number, number>; total: number }>;
}) {
  return (
    <Card>
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">Saisie mensuelle</p>
          <h3 className="mt-1 text-lg font-black">Recettes du mois - {month}</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[940px] text-[13px]">
          <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="pb-3 pr-3">Date</th>
              {branches.map((branch) => (
                <th key={branch.id} className="pb-3 pr-3">{branch.name}</th>
              ))}
              <th className="pb-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.date} className="border-t">
                <td className="py-2 pr-3 font-semibold">{formatDate(row.date)}</td>
                {branches.map((branch) => (
                  <td key={`${row.date}-${branch.id}`} className="py-2 pr-3">
                    <form action={saveRevenueCellAction}>
                      <input type="hidden" name="date" value={row.date} />
                      <input type="hidden" name="branch_id" value={branch.id} />
                      <Input
                        name="montant"
                        type="number"
                        step="0.01"
                        defaultValue={row.values[branch.id] || 0}
                        onBlur={(event) => event.currentTarget.form?.requestSubmit()}
                      />
                    </form>
                  </td>
                ))}
                <td className="py-2 font-semibold">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
