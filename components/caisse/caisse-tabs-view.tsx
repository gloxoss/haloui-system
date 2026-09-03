"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DailyClosingForm } from "@/components/caisse/daily-closing-form";
import { SortiesCaisseManager } from "@/components/caisse/sorties-caisse-manager";
import { RevenueGrid } from "@/components/revenue-grid";
import { RevenueCharts } from "@/components/revenue-charts";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import {
  type BranchRecord,
  type CashDaySummary,
  type RevenueDailyPoint,
  type RevenueGridRow,
  type RevenueMonthlyBranchPoint,
  type SortieCaisseRecord,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Badge, Tabs } from "@mantine/core";
import {
  BarChart3,
  FileSpreadsheet,
  TrendingDown,
  Wallet,
} from "lucide-react";

export function CaisseTabsView({
  month,
  branches,
  table,
  sorties,
  daySummary,
  systemSaleTotal = 0,
  initialTab = "cloture",
  initialBranchId,
  initialDate,
  chartsDaily,
  chartsMonthlyByBranch,
  pivot,
}: {
  month: string;
  branches: BranchRecord[];
  table: RevenueGridRow[];
  sorties: SortieCaisseRecord[];
  daySummary?: CashDaySummary;
  systemSaleTotal?: number;
  initialTab?: string;
  initialBranchId?: number;
  initialDate?: string;
  chartsDaily: RevenueDailyPoint[];
  chartsMonthlyByBranch: RevenueMonthlyBranchPoint[];
  pivot: RevenueMonthlyBranchPoint[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const activeTab = searchParams.get("tab") || initialTab || "cloture";

  const handleTabChange = (val: string | null) => {
    if (!val) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.push(`/chiffre-affaires?${params.toString()}`);
  };

  return (
    <Tabs
      value={activeTab}
      onChange={handleTabChange}
      variant="pills"
      radius="xl"
      className="w-full"
    >
      <Tabs.List className="mb-4 flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <Tabs.Tab
          value="cloture"
          leftSection={<Wallet size={16} />}
          style={{ fontWeight: 700 }}
        >
          {locale === "ar" ? "إغلاق الصندوق اليومي" : "Clôture du jour"}
        </Tabs.Tab>

        <Tabs.Tab
          value="grille"
          leftSection={<FileSpreadsheet size={16} />}
          style={{ fontWeight: 700 }}
        >
          {locale === "ar" ? "السجل الشهري" : "Journal mensuel"}
        </Tabs.Tab>

        <Tabs.Tab
          value="sorties"
          leftSection={<TrendingDown size={16} />}
          style={{ fontWeight: 700 }}
          rightSection={
            sorties.length > 0 ? (
              <Badge size="xs" color="red" variant="filled" radius="xl">
                {sorties.length}
              </Badge>
            ) : null
          }
        >
          {locale === "ar" ? "المصاريف" : "Dépenses"}
        </Tabs.Tab>

        <Tabs.Tab
          value="stats"
          leftSection={<BarChart3 size={16} />}
          style={{ fontWeight: 700 }}
        >
          {locale === "ar" ? "الإحصائيات" : "Statistiques"}
        </Tabs.Tab>
      </Tabs.List>

      {/* Tab 1: Clôture de caisse du jour */}
      <Tabs.Panel value="cloture">
        <DailyClosingForm
          branches={branches}
          initialDate={initialDate}
          initialBranchId={initialBranchId}
          daySummary={daySummary}
          systemSaleTotal={systemSaleTotal}
        />
      </Tabs.Panel>

      {/* Tab 2: Grille Mensuelle Consolidée */}
      <Tabs.Panel value="grille">
        <RevenueGrid month={month} branches={branches} table={table} />
      </Tabs.Panel>

      {/* Tab 3: Registre des Sorties de Caisse */}
      <Tabs.Panel value="sorties">
        <SortiesCaisseManager
          branches={branches}
          sorties={sorties}
          currentMonth={month}
        />
      </Tabs.Panel>

      {/* Tab 4: Statistiques et graphiques */}
      <Tabs.Panel value="stats" className="space-y-4">
        <RevenueCharts daily={chartsDaily} monthlyByBranch={chartsMonthlyByBranch} />

        <Card>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {locale === "ar" ? "سجل التتبع والمقارنة" : "Historique consolidé"}
          </p>
          <h3 className="mt-1 text-xl font-black">
            {locale === "ar" ? "المداخيل حسب كل فرع وكل شهر" : "Recettes par magasin et par mois"}
          </h3>
          <div className="mt-4">
            <Table>
              <THead>
                <tr>
                  <TH>{locale === "ar" ? "الشهر" : "Mois"}</TH>
                  <TH>{locale === "ar" ? "الفرع" : "Magasin"}</TH>
                  <TH>{locale === "ar" ? "المجموع" : "Total"}</TH>
                </tr>
              </THead>
              <tbody>
                {pivot.map((row, index) => (
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
      </Tabs.Panel>
    </Tabs>
  );
}
