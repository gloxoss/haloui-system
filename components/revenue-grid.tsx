"use client";

import * as React from "react";
import { saveBatchRevenueCellsAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { type BranchRecord, type RevenueGridRow } from "@/lib/types";
import { formatCurrency, formatDate, todayIso } from "@/lib/utils";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  SegmentedControl,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  Check,
  RefreshCw,
  Zap,
} from "lucide-react";

export function RevenueGrid({
  month,
  branches,
  table: initialTable,
}: {
  month: string;
  branches: BranchRecord[];
  table: RevenueGridRow[];
}) {
  const { t, locale } = useTranslation();

  // Local state for instant, lag-free UI updates
  const [rows, setRows] = React.useState<RevenueGridRow[]>(initialTable);
  const [viewMode, setViewMode] = React.useState<"manual" | "system" | "compare">("manual");
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const pendingUpdates = React.useRef<Map<string, { branchId: number; date: string; montant: number }>>(
    new Map()
  );
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync state if props change (e.g. month navigation or server revalidation)
  React.useEffect(() => {
    setRows(initialTable);
  }, [initialTable]);

  // Flush queued cell changes to server
  const flushSaves = React.useCallback(async () => {
    if (pendingUpdates.current.size === 0) return;

    const entries = Array.from(pendingUpdates.current.values());
    pendingUpdates.current.clear();

    setSaveStatus("saving");
    try {
      await saveBatchRevenueCellsAction(entries);
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2500);
    } catch {
      setSaveStatus("idle");
    }
  }, []);

  const handleCellChange = (date: string, branchId: number, rawVal: string) => {
    const num = parseFloat(rawVal) || 0;

    // Optimistically update local rows
    setRows((prev) =>
      prev.map((r) => {
        if (r.date !== date) return r;
        const newValues = { ...r.values, [branchId]: num };
        const newTotal = Object.values(newValues).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const newDiff = newTotal - (r.systemTotal || 0);
        return {
          ...r,
          values: newValues,
          total: newTotal,
          diff: newDiff,
        };
      })
    );

    // Queue for debounced save
    const key = `${date}:${branchId}`;
    pendingUpdates.current.set(key, { branchId, date, montant: num });

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      flushSaves();
    }, 800);
  };

  const handleCopyDaySystemSales = (date: string) => {
    const targetRow = rows.find((r) => r.date === date);
    if (!targetRow) return;

    const updates: Array<{ branchId: number; date: string; montant: number }> = [];
    setRows((prev) =>
      prev.map((r) => {
        if (r.date !== date) return r;
        const newValues = { ...r.systemValues };
        const newTotal = Object.values(newValues).reduce((sum, v) => sum + (Number(v) || 0), 0);
        for (const b of branches) {
          updates.push({
            branchId: b.id,
            date,
            montant: newValues[b.id] ?? 0,
          });
        }
        return {
          ...r,
          values: newValues,
          total: newTotal,
          diff: 0,
        };
      })
    );

    for (const u of updates) {
      pendingUpdates.current.set(`${u.date}:${u.branchId}`, u);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      flushSaves();
    }, 200);
  };

  // Compute column totals dynamically from local state
  const columnTotals = React.useMemo(() => {
    const totals: Record<number, number> = {};
    const systemTotals: Record<number, number> = {};
    let grandTotal = 0;
    let grandSystemTotal = 0;

    for (const b of branches) {
      totals[b.id] = 0;
      systemTotals[b.id] = 0;
    }

    for (const r of rows) {
      grandTotal += r.total || 0;
      grandSystemTotal += r.systemTotal || 0;
      for (const b of branches) {
        totals[b.id] += r.values?.[b.id] || 0;
        systemTotals[b.id] += r.systemValues?.[b.id] || 0;
      }
    }

    return {
      totals,
      systemTotals,
      grandTotal,
      grandSystemTotal,
      grandDiff: grandTotal - grandSystemTotal,
    };
  }, [rows, branches]);

  const today = todayIso();

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      className="min-w-0 overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header with Title, Mode Toggle & Save Indicator */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div>
          <Group gap="xs">
            <h3 className="text-lg font-black tracking-tight">{t.revenueGrid.title}</h3>
            {saveStatus === "saving" ? (
              <Badge color="blue" variant="light" size="sm" leftSection={<RefreshCw size={12} className="animate-spin" />}>
                {t.revenueGrid.saving}
              </Badge>
            ) : saveStatus === "saved" ? (
              <Badge color="teal" variant="light" size="sm" leftSection={<Check size={12} />}>
                {t.revenueGrid.saved}
              </Badge>
            ) : null}
          </Group>
          <Text size="xs" c="dimmed">
            {t.revenueGrid.subtitle}
          </Text>
        </div>

        {/* View Mode Switcher */}
        <div className="w-full sm:w-auto overflow-x-auto">
          <SegmentedControl
            value={viewMode}
            onChange={(val) => setViewMode(val as "manual" | "system" | "compare")}
            size="xs"
            radius="md"
            fullWidth
            data={[
              { label: t.revenueGrid.manualTab, value: "manual" },
              { label: t.revenueGrid.systemTab, value: "system" },
              { label: t.revenueGrid.compareTab, value: "compare" },
            ]}
          />
        </div>
      </div>

      {/* Responsive Spreadsheet Grid */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] w-full min-w-0">
        <table className="w-full min-w-[960px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-soft,rgba(0,0,0,0.02))] text-left text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <th className="py-3 px-3 w-[150px]">{t.revenueGrid.dateCol}</th>
              {branches.map((b) => (
                <th key={b.id} className="py-3 px-3 text-right">
                  <div className="flex flex-col items-end">
                    <span>{b.name}</span>
                    {viewMode === "compare" ? (
                      <span className="text-[10px] font-normal text-gray-400">{t.revenueGrid.compareSubheader}</span>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-right w-[140px]">{t.revenueGrid.dayTotalCol}</th>
              <th className="py-3 px-2 text-center w-[60px]">{t.revenueGrid.actionCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isToday = row.date === today;

              return (
                <tr
                  key={row.date}
                  className={`border-b border-[var(--border)]/70 transition-colors hover:bg-[var(--surface-soft,rgba(0,0,0,0.015))] ${
                    isToday ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium" : ""
                  }`}
                >
                  {/* Date Column */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className={isToday ? "font-bold text-blue-600" : "font-semibold"}>
                        {formatDate(row.date)}
                      </span>
                      {isToday ? (
                        <Badge size="xs" color="blue" variant="filled">
                          {t.revenueGrid.todayBadge}
                        </Badge>
                      ) : null}
                    </div>
                  </td>

                  {/* Branch Cells */}
                  {branches.map((branch) => {
                    const manualVal = row.values?.[branch.id] ?? 0;
                    const systemVal = row.systemValues?.[branch.id] ?? 0;
                    const diff = manualVal - systemVal;

                    if (viewMode === "system") {
                      return (
                        <td key={branch.id} className="py-2 px-3 text-right">
                          <span
                            className={`font-semibold ${
                              systemVal > 0 ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                            }`}
                          >
                            {formatCurrency(systemVal)}
                          </span>
                        </td>
                      );
                    }

                    if (viewMode === "compare") {
                      return (
                        <td key={branch.id} className="py-2 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-[var(--foreground)]">
                              {formatCurrency(manualVal)}
                            </span>
                            <span className="text-[11px] text-[var(--muted)]">
                              {t.revenueGrid.docLabel} {formatCurrency(systemVal)}
                            </span>
                            {systemVal > 0 && manualVal > 0 ? (
                              <span
                                className={`text-[10px] font-bold ${
                                  diff >= 0 ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    }

                    // Standard "manual" editable view
                    return (
                      <td key={branch.id} className="py-1.5 px-2 text-right">
                        <div className="relative flex items-center justify-end">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={manualVal === 0 ? "" : manualVal}
                            onChange={(e) => handleCellChange(row.date, branch.id, e.target.value)}
                            onBlur={flushSaves}
                            placeholder="0.00"
                            className="w-full max-w-[130px] rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-right text-[13px] font-bold text-[var(--foreground)] transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </td>
                    );
                  })}

                  {/* Day Total */}
                  <td className="py-2 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-extrabold text-[13.5px] text-[var(--foreground)]">
                        {formatCurrency(viewMode === "system" ? row.systemTotal : row.total)}
                      </span>
                      {viewMode === "compare" && row.systemTotal > 0 ? (
                        <span
                          className={`text-[11px] font-bold ${
                            row.diff >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {t.revenueGrid.diffLabel} {row.diff >= 0 ? "+" : ""}
                          {formatCurrency(row.diff)}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Quick Action Button */}
                  <td className="py-2 px-2 text-center">
                    {row.systemTotal > 0 ? (
                      <Tooltip label={t.revenueGrid.copySystemTooltip}>
                        <ActionIcon
                          variant="light"
                          color="indigo"
                          size="sm"
                          radius="md"
                          onClick={() => handleCopyDaySystemSales(row.date)}
                        >
                          <Zap size={14} />
                        </ActionIcon>
                      </Tooltip>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer with Totals */}
          <tfoot>
            <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-soft,rgba(0,0,0,0.03))] font-black">
              <td className="py-3 px-3 uppercase text-xs tracking-wider">
                {t.revenueGrid.monthTotal}
              </td>
              {branches.map((b) => (
                <td key={b.id} className="py-3 px-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-[13.5px] text-[var(--foreground)]">
                      {formatCurrency(
                        viewMode === "system"
                          ? columnTotals.systemTotals[b.id]
                          : columnTotals.totals[b.id]
                      )}
                    </span>
                    {viewMode === "compare" ? (
                      <span className="text-[10.5px] font-semibold text-[var(--muted)]">
                        {t.revenueGrid.docLabel} {formatCurrency(columnTotals.systemTotals[b.id])}
                      </span>
                    ) : null}
                  </div>
                </td>
              ))}
              <td className="py-3 px-4 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-[15px] font-black text-blue-600">
                    {formatCurrency(
                      viewMode === "system"
                        ? columnTotals.grandSystemTotal
                        : columnTotals.grandTotal
                    )}
                  </span>
                  {viewMode === "compare" ? (
                    <span
                      className={`text-[11px] font-bold ${
                        columnTotals.grandDiff >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {t.revenueGrid.diffLabel} {columnTotals.grandDiff >= 0 ? "+" : ""}
                      {formatCurrency(columnTotals.grandDiff)}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="py-3 px-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
