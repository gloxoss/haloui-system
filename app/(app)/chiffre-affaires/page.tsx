import Link from "next/link";

import { CaisseTabsView } from "@/components/caisse/caisse-tabs-view";
import { PageHeading } from "@/components/page-heading";
import { RevenueMonthNavigator } from "@/components/revenue/revenue-month-navigator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCashDaySummary,
  getRevenueGrid,
  getRevenueStats,
  getSystemSalesDocumentsForMonth,
  getSystemSalesForDate,
  listBranches,
  listSortiesCaisse,
} from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { formatCurrency, monthKey, todayIso } from "@/lib/utils";
import { Badge, Group, SimpleGrid, Text } from "@mantine/core";

export default async function ChiffreAffairesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    tab?: string;
    branch?: string;
    date?: string;
  }>;
}) {
  await requireFeature("chiffre_affaires");
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

  const params = await searchParams;
  const month = params.month || monthKey();
  const date = params.date || todayIso();
  const branches = listBranches({ activeOnly: true });
  const selectedBranchId = params.branch ? Number(params.branch) : branches[0]?.id || 1;

  const grid = getRevenueGrid(month);
  const stats = getRevenueStats(month);
  const sorties = listSortiesCaisse({ month });
  const daySummary = getCashDaySummary(date, selectedBranchId);
  const systemSalesToday = getSystemSalesForDate(date);
  const systemSaleTotal = systemSalesToday[selectedBranchId] || 0;

  // Month sorties sum
  const totalMonthSorties = sorties.reduce((sum, s) => sum + Number(s.montant), 0);
  const netMonthCaisse = stats.monthTotal - totalMonthSorties;
  const salesDocuments = getSystemSalesDocumentsForMonth(month);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={locale === "ar" ? "الصندوق" : "Caisse"}
        title={dict.caisse.title}
        description={dict.caisse.subtitle}
      />

      {/* Month Navigator Toolbar with Granular Sales Sync */}
      <RevenueMonthNavigator
        currentMonth={month}
        totalSystemMonth={stats.systemMonthTotal}
        salesDocuments={salesDocuments}
        branches={branches}
      />

      {/* Financial KPIs - Simple, Clean 3 Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card className="p-4">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
            {dict.caisse.totalRecettes}
          </Text>
          <Text size="xl" fw={900} className="mt-1" c="blue">
            {formatCurrency(stats.monthTotal)}
          </Text>
        </Card>

        <Card className="p-4">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
            {dict.caisse.sortiesCaisse}
          </Text>
          <Text size="xl" fw={900} className="mt-1" c="red">
            - {formatCurrency(totalMonthSorties)}
          </Text>
        </Card>

        <Card className="p-4">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
            {dict.caisse.soldeNet}
          </Text>
          <Text
            size="xl"
            fw={900}
            className="mt-1"
            style={{
              color: netMonthCaisse >= 0 ? "#059669" : "#dc2626",
            }}
          >
            {formatCurrency(netMonthCaisse)}
          </Text>
        </Card>
      </SimpleGrid>

      {/* Main Tabbed Workflow */}
      <CaisseTabsView
        month={month}
        branches={grid.branches}
        table={grid.table}
        sorties={sorties}
        daySummary={daySummary}
        systemSaleTotal={systemSaleTotal}
        initialTab={params.tab || "cloture"}
        initialBranchId={selectedBranchId}
        initialDate={date}
        chartsDaily={stats.daily}
        chartsMonthlyByBranch={stats.monthlyByBranch}
        pivot={stats.pivot}
        paymentMethods={stats.paymentMethods}
        sortiesTotal={stats.sortiesTotal}
        netCaisse={stats.netCaisse}
        bestDay={stats.bestDay}
        avgDaily={stats.avgDaily}
        bestBranch={stats.bestBranch}
      />
    </div>
  );
}
