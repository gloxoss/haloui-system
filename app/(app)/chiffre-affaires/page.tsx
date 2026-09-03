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

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={locale === "ar" ? "المتابعة المالية ومراقبة الصندوق" : "Pilotage & Performance"}
        title={dict.caisse.title}
        description={dict.caisse.subtitle}
        actions={
          <Link href={`/api/chiffre-affaires/export?month=${month}`}>
            <Button variant="secondary">{dict.common.exportExcel}</Button>
          </Link>
        }
      />

      {/* Month Navigator Toolbar */}
      <RevenueMonthNavigator
        currentMonth={month}
        totalSystemMonth={stats.systemMonthTotal}
      />

      {/* Financial KPIs Banner */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
        <Card>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            {dict.caisse.totalRecettes}
          </Text>
          <Text size="xl" fw={900} className="mt-1" c="blue">
            {formatCurrency(stats.monthTotal)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {locale === "ar" ? "مجموع مداخيل هاد الشهر" : "Total recettes de caisse"}
          </Text>
        </Card>

        <Card>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            {dict.caisse.sortiesCaisse}
          </Text>
          <Text size="xl" fw={900} className="mt-1" c="red">
            - {formatCurrency(totalMonthSorties)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {sorties.length} {locale === "ar" ? "مصاريف موثقة" : (sorties.length > 1 ? "sorties justifiées" : "sortie justifiée")}
          </Text>
        </Card>

        <Card>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
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
          <Text size="xs" c="dimmed" mt={4}>
            {locale === "ar" ? "الفلوس الصافية اللي بقات فالصندوق" : "Recettes nettes décaissées"}
          </Text>
        </Card>

        <Card>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            {dict.caisse.systemSales}
          </Text>
          <Group gap={6} align="baseline" className="mt-1">
            <Text size="xl" fw={900} c="indigo">
              {formatCurrency(stats.systemMonthTotal)}
            </Text>
            {stats.diffMonthTotal !== 0 ? (
              <Badge
                size="xs"
                variant="light"
                color={stats.diffMonthTotal > 0 ? "teal" : "red"}
              >
                {stats.diffMonthTotal > 0 ? `+ ${dict.caisse.excess}` : `- ${dict.caisse.shortage}`}
              </Badge>
            ) : null}
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            {locale === "ar" ? "الفواتير وبونات التوصيل" : "Factures & BL validés"}
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
      />
    </div>
  );
}
