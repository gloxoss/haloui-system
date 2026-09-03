"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

const PALETTE = ["#C98C2D", "#6F8F4E", "#A85F3A", "#6B7D8F", "#B8A054", "#7D6759"];

export function RevenueCharts({
  daily,
  monthlyByBranch,
}: {
  daily: Array<{ date: string; total: number }>;
  monthlyByBranch: Array<{ month: string; name: string; total: number }>;
}) {
  const { locale } = useTranslation();
  const monthlyMap = new Map<string, Record<string, string | number>>();
  for (const row of monthlyByBranch) {
    if (!monthlyMap.has(row.month)) {
      monthlyMap.set(row.month, { month: row.month });
    }
    monthlyMap.get(row.month)![row.name] = Number(row.total);
  }
  const monthlyData = Array.from(monthlyMap.values());
  const branches = [...new Set(monthlyByBranch.map((row) => row.name))];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <p className="text-xs font-semibold text-[var(--muted)]">
          {locale === "ar" ? "تطور المداخيل اليومية" : "Tendance quotidienne"}
        </p>
        <h3 className="mt-1 text-lg font-black">
          {locale === "ar" ? "المداخيل اليومية لهاد الشهر" : "CA journalier du mois"}
        </h3>
        <div className="mt-3.5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily}>
              <CartesianGrid stroke="rgba(131, 97, 63, 0.12)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => value.slice(-2)} />
              <YAxis tickFormatter={(value) => `${value}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="total" stroke="#C98C2D" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-[var(--muted)]">
          {locale === "ar" ? "حسب كل فرع" : "Par magasin"}
        </p>
        <h3 className="mt-1 text-lg font-black">
          {locale === "ar" ? "آخر 12 شهر" : "12 derniers mois"}
        </h3>
        <div className="mt-3.5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid stroke="rgba(131, 97, 63, 0.12)" vertical={false} />
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
  );
}
