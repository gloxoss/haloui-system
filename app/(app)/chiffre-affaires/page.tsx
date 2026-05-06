import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { RevenueCharts } from "@/components/revenue-charts";
import { RevenueGrid } from "@/components/revenue-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { getRevenueGrid, getRevenueStats } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { formatCurrency, monthKey } from "@/lib/utils";

export default async function ChiffreAffairesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireFeature("chiffre_affaires");
  const params = await searchParams;
  const month = params.month || monthKey();
  const grid = getRevenueGrid(month);
  const stats = getRevenueStats(month);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Performance commerciale"
        title="Chiffre d'affaires"
        description="Entrez les recettes de chaque magasin."
        actions={
          <Link href={`/api/chiffre-affaires/export?month=${month}`}>
            <Button variant="secondary">Exporter</Button>
          </Link>
        }
      />

      <Card>
        <form className="flex flex-wrap items-center gap-3" action="">
          <input
            name="month"
            type="month"
            defaultValue={month}
            className="min-h-10 rounded-xl border bg-[var(--card)] px-3 py-2 text-[13px]"
          />
          <Button type="submit" variant="secondary">Changer de mois</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["CA du mois", formatCurrency(stats.monthTotal)],
          ["CA de l'année", formatCurrency(stats.yearTotal)],
          ["Meilleur magasin", stats.bestBranch?.name ?? "—"],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
            <p className="mt-1.5 text-xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <RevenueGrid month={grid.month} branches={grid.branches} table={grid.table} />
      <RevenueCharts daily={stats.daily} monthlyByBranch={stats.monthlyByBranch} />

      <Card>
        <p className="text-xs font-semibold text-[var(--muted)]">Vue tabulaire</p>
        <h3 className="mt-1 text-xl font-black">Recettes par magasin et par mois</h3>
        <div className="mt-4">
          <Table>
            <THead>
              <tr>
                <TH>Mois</TH>
                <TH>Magasin</TH>
                <TH>Total</TH>
              </tr>
            </THead>
            <tbody>
              {stats.pivot.map((row, index) => (
                <tr key={`${row.month}-${row.name}-${index}`}>
                  <TD>{row.month}</TD>
                  <TD>{row.name}</TD>
                  <TD>{formatCurrency(row.total)}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
