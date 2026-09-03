"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { Award, Calendar, DollarSign, Percent, TrendingDown, TrendingUp } from "lucide-react";

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const PAYMENT_COLORS: Record<string, string> = {
  Espèces: "#10b981",
  Carte: "#3b82f6",
  Chèque: "#f59e0b",
  Virement: "#8b5cf6",
};

export function RevenueCharts({
  daily,
  monthlyByBranch,
  paymentMethods,
  sortiesTotal = 0,
  netCaisse = 0,
  bestDay,
  avgDaily = 0,
  bestBranch,
}: {
  daily: Array<{ date: string; total: number }>;
  monthlyByBranch: Array<{ month: string; name: string; total: number }>;
  paymentMethods?: {
    especes: number;
    carte: number;
    cheque: number;
    virement: number;
  };
  sortiesTotal?: number;
  netCaisse?: number;
  bestDay?: { date: string; total: number };
  avgDaily?: number;
  bestBranch?: { name?: string; total?: number };
}) {
  const { locale } = useTranslation();

  // 12 months branch mapping
  const monthlyMap = new Map<string, Record<string, string | number>>();
  for (const row of monthlyByBranch) {
    if (!monthlyMap.has(row.month)) {
      monthlyMap.set(row.month, { month: row.month });
    }
    monthlyMap.get(row.month)![row.name] = Number(row.total);
  }
  const monthlyData = Array.from(monthlyMap.values());
  const branches = [...new Set(monthlyByBranch.map((row) => row.name))];

  // Payment methods pie data
  const paymentPieData = React.useMemo(() => {
    if (!paymentMethods) return [];
    const items = [
      { name: locale === "ar" ? "كاش (نقداً)" : "Espèces", value: paymentMethods.especes, color: "#10b981" },
      { name: locale === "ar" ? "كارط (TPE)" : "Carte Bancaire", value: paymentMethods.carte, color: "#3b82f6" },
      { name: locale === "ar" ? "شيكات" : "Chèques", value: paymentMethods.cheque, color: "#f59e0b" },
      { name: locale === "ar" ? "تحويل بنكي" : "Virements", value: paymentMethods.virement, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);

    return items;
  }, [paymentMethods, locale]);

  // Cash flow comparison data (In vs Out vs Net)
  const monthRevenueTotal = daily.reduce((sum, d) => sum + Number(d.total), 0);
  const cashFlowData = [
    {
      category: locale === "ar" ? "التدفق المالي" : "Flux du mois",
      [locale === "ar" ? "المداخيل" : "Recettes"]: monthRevenueTotal,
      [locale === "ar" ? "المصاريف" : "Dépenses"]: sortiesTotal,
      [locale === "ar" ? "الصافي" : "Solde Net"]: netCaisse,
    },
  ];

  const expenseRatio = monthRevenueTotal > 0 ? (sortiesTotal / monthRevenueTotal) * 100 : 0;

  return (
    <Stack gap="lg">
      {/* Analytics KPI Cards Ribbon */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Paper
          withBorder
          p="md"
          radius="lg"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {locale === "ar" ? "المعدل اليومي" : "Moyenne / jour ouvré"}
              </Text>
              <Text size="lg" fw={900} c="blue">
                {formatCurrency(avgDaily)}
              </Text>
              <Text size="11px" c="dimmed">
                {locale === "ar" ? "معدل المداخيل لكل يوم" : "Sur les jours actifs"}
              </Text>
            </Stack>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.12)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DollarSign size={18} />
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="md"
          radius="lg"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {locale === "ar" ? "اليوم القياسي (الذروة)" : "Meilleur jour du mois"}
              </Text>
              <Text size="lg" fw={900} c="teal">
                {bestDay ? formatCurrency(bestDay.total) : "0,00 MAD"}
              </Text>
              <Text size="11px" c="dimmed">
                {bestDay ? formatDate(bestDay.date) : (locale === "ar" ? "لا توجد معطيات" : "Aucun record")}
              </Text>
            </Stack>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={18} />
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="md"
          radius="lg"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {locale === "ar" ? "نسبة المصاريف" : "Taux de dépenses"}
              </Text>
              <Text size="lg" fw={900} c={expenseRatio > 30 ? "red" : "indigo"}>
                {expenseRatio.toFixed(1)} %
              </Text>
              <Text size="11px" c="dimmed">
                {sortiesTotal > 0
                  ? `- ${formatCurrency(sortiesTotal)} décaissés`
                  : (locale === "ar" ? "لا مصاريف هذا الشهر" : "Aucune dépense")}
              </Text>
            </Stack>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Percent size={18} />
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="md"
          radius="lg"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {locale === "ar" ? "المحل المتصدر" : "Magasin leader"}
              </Text>
              <Text size="lg" fw={900} style={{ letterSpacing: "-0.01em" }} truncate>
                {bestBranch?.name || "-"}
              </Text>
              <Text size="11px" c="dimmed">
                {bestBranch?.total ? formatCurrency(bestBranch.total) : "0,00 MAD"}
              </Text>
            </Stack>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Award size={18} />
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Row 1 Charts: Daily Trend & Payment Breakdown */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {locale === "ar" ? "تطور المداخيل اليومية" : "Tendance quotidienne"}
          </p>
          <h3 className="mt-1 text-lg font-black">
            {locale === "ar" ? "المداخيل اليومية لهذا الشهر" : "CA journalier du mois"}
          </h3>
          <div className="mt-3.5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid stroke="rgba(0, 0, 0, 0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => value.slice(-2)} />
                <YAxis tickFormatter={(value) => `${value}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Methods Breakdown (Donut Chart) */}
        <Card>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {locale === "ar" ? "طرق الأداء" : "Modes de règlement"}
          </p>
          <h3 className="mt-1 text-lg font-black">
            {locale === "ar" ? "توزيع المداخيل حسب وسيلة الدفع" : "Répartition des encaissements"}
          </h3>
          <div className="mt-3.5 h-72">
            {paymentPieData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[var(--muted)]">
                <p>{locale === "ar" ? "لا توجد معطيات مسجلة لهذا الشهر" : "Aucun encaissement saisi pour ce mois"}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2 Charts: Cash Flow In vs Out & 12 Months Evolution */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {locale === "ar" ? "السيولة والمصاريف" : "Flux de trésorerie"}
          </p>
          <h3 className="mt-1 text-lg font-black">
            {locale === "ar" ? "مقارنة المداخيل مقابل المصاريف" : "Recettes vs Dépenses de caisse"}
          </h3>
          <div className="mt-3.5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid stroke="rgba(0, 0, 0, 0.06)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey={locale === "ar" ? "المداخيل" : "Recettes"} fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey={locale === "ar" ? "المصاريف" : "Dépenses"} fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey={locale === "ar" ? "الصافي" : "Solde Net"} fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {locale === "ar" ? "المقارنة السنوية" : "Comparatif annuel"}
          </p>
          <h3 className="mt-1 text-lg font-black">
            {locale === "ar" ? "مداخيل المحلات عبر 12 شهراً" : "12 derniers mois par magasin"}
          </h3>
          <div className="mt-3.5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid stroke="rgba(0, 0, 0, 0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                {branches.map((branch, index) => (
                  <Bar key={branch} dataKey={branch} fill={PALETTE[index % PALETTE.length]} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </Stack>
  );
}
