"use client";

import * as React from "react";
import { saveDailyRevenueAction } from "@/app/actions";
import { AppDateInput } from "@/components/ui/app-date-input";
import { useTranslation } from "@/lib/i18n";
import { type BranchRecord, type RevenueGridRow } from "@/lib/types";
import { formatCurrency, todayIso } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Store,
  Zap,
} from "lucide-react";

export function QuickDailyEntry({
  branches,
  table,
}: {
  branches: BranchRecord[];
  table: RevenueGridRow[];
}) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(() => todayIso());
  const [amounts, setAmounts] = React.useState<Record<number, number>>({});
  const [isPending, startTransition] = React.useTransition();
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Find row data for the selected date
  const currentRow = React.useMemo(() => {
    return table.find((r) => r.date === selectedDate);
  }, [table, selectedDate]);

  // Sync inputs whenever selected date changes
  React.useEffect(() => {
    const initialAmounts: Record<number, number> = {};
    for (const b of branches) {
      initialAmounts[b.id] = currentRow?.values?.[b.id] ?? 0;
    }
    setAmounts(initialAmounts);
    setSavedSuccess(false);
  }, [selectedDate, currentRow, branches]);

  const handleAmountChange = (branchId: number, val: number) => {
    setAmounts((prev) => ({
      ...prev,
      [branchId]: val,
    }));
    setSavedSuccess(false);
  };

  const handleCopySystemSales = () => {
    if (!currentRow) return;
    const newAmounts: Record<number, number> = {};
    for (const b of branches) {
      newAmounts[b.id] = currentRow.systemValues?.[b.id] ?? 0;
    }
    setAmounts(newAmounts);
    setSavedSuccess(false);
  };

  const dayTotalManual = Object.values(amounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const dayTotalSystem = currentRow?.systemTotal ?? 0;

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <Coins size={20} />
          </ThemeIcon>
          <div>
            <Group gap="xs">
              <Title order={3} size="h4" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                {locale === "ar" ? "تسجيل سريع لمداخيل اليوم" : "Saisie express de la journée"}
              </Title>
              <Badge variant="light" color="blue" radius="sm">
                {locale === "ar" ? "طريقة سريعة" : "Mode Rapide"}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {locale === "ar"
                ? "سجل ولا زامن مداخيل جميع الفروع فتاريخ واحد وبضغطة واحدة."
                : "Saisissez ou synchronisez les recettes de tous les magasins pour une date en une seule fois."}
            </Text>
          </div>
        </Group>

        <Group gap="xs">
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            onClick={() => setIsOpen((prev) => !prev)}
            rightSection={isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          >
            {isOpen
              ? (locale === "ar" ? "تصغير" : "Réduire")
              : (locale === "ar" ? "عرض" : "Déplier")}
          </Button>
        </Group>
      </Group>

      {isOpen ? (
        <form
          action={(formData) => {
            startTransition(async () => {
              await saveDailyRevenueAction(formData);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 3000);
            });
          }}
        >
          <Divider my="sm" />

          {/* Date Selector & Auto-Fill Toolbar */}
          <Group justify="space-between" wrap="wrap" gap="md" mb="md">
            <Group gap="sm" wrap="wrap">
              <div style={{ width: 200 }}>
                <AppDateInput
                  label={locale === "ar" ? "تاريخ المداخيل" : "Date de la recette"}
                  value={selectedDate}
                  onChange={(val) => setSelectedDate(val || todayIso())}
                  name="date"
                  clearable={false}
                />
              </div>

              {selectedDate === todayIso() ? (
                <Badge variant="dot" color="teal" size="lg" mt={22}>
                  {t.revenueGrid.todayBadge}
                </Badge>
              ) : null}
            </Group>

            <Group gap="sm" wrap="wrap" mt={{ base: 0, sm: 22 }}>
              <Button
                variant="light"
                color="indigo"
                size="sm"
                radius="md"
                leftSection={<Zap size={15} />}
                onClick={handleCopySystemSales}
                type="button"
                title={
                  locale === "ar"
                    ? "تعبئة المبالغ بمجموع الفواتير وبونات التوصيل فهاد النهار"
                    : "Pré-remplir les montants avec le total des factures et bons de livraison du système pour cette date"
                }
              >
                {locale === "ar"
                  ? `نسخ مبيعات النظام (${formatCurrency(dayTotalSystem)})`
                  : `Copier les ventes système (${formatCurrency(dayTotalSystem)})`}
              </Button>
            </Group>
          </Group>

          {/* Branch Input Grid */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" mb="md">
            {branches.map((branch) => {
              const systemSale = currentRow?.systemValues?.[branch.id] ?? 0;
              const currentVal = amounts[branch.id] ?? 0;
              const diff = currentVal - systemSale;

              return (
                <Paper
                  key={branch.id}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{
                    background: "var(--surface-soft, rgba(0, 0, 0, 0.02))",
                    borderColor: "var(--border)",
                  }}
                >
                  <Group justify="space-between" mb={6}>
                    <Group gap={6}>
                      <Store size={14} className="text-gray-500" />
                      <Text size="xs" fw={700} lineClamp={1}>
                        {branch.name}
                      </Text>
                    </Group>
                    {systemSale > 0 ? (
                      <Badge
                        variant="subtle"
                        color="indigo"
                        size="xs"
                        title={
                          locale === "ar"
                            ? "مبيعات ناتجة عن الفواتير وبونات التوصيل المصادق عليها"
                            : "Ventes issues des factures et bons validés"
                        }
                      >
                        {locale === "ar" ? "مبيعات الوثائق: " : "Ventes doc : "}
                        {formatCurrency(systemSale)}
                      </Badge>
                    ) : (
                      <Text size="xs" c="dimmed">
                        {locale === "ar" ? "لا توجد مبيعات موثقة" : "Aucune vente doc"}
                      </Text>
                    )}
                  </Group>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name={`montant_${branch.id}`}
                      value={currentVal === 0 ? "" : currentVal}
                      onChange={(e) => handleAmountChange(branch.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[14px] font-bold text-[var(--foreground)] focus:border-blue-500 focus:outline-none text-right"
                    />
                    <span className="text-xs font-bold text-[var(--muted)] shrink-0">MAD</span>
                  </div>

                  {systemSale > 0 && currentVal > 0 ? (
                    <Group justify="space-between" mt={4} px={2}>
                      <Text size="10px" c="dimmed">
                        {locale === "ar" ? "الفرق :" : "Écart :"}
                      </Text>
                      <Text
                        size="10px"
                        fw={700}
                        style={{
                          color: diff === 0 ? "#10b981" : diff > 0 ? "#059669" : "#dc2626",
                        }}
                      >
                        {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                      </Text>
                    </Group>
                  ) : null}
                </Paper>
              );
            })}
          </SimpleGrid>

          {/* Bottom Summary & Save Button */}
          <Paper
            withBorder
            p="sm"
            radius="md"
            style={{
              background: "var(--surface, #fafafa)",
              borderColor: "var(--border)",
            }}
          >
            <Group justify="space-between" wrap="wrap" gap="md">
              <Group gap="xl" wrap="wrap">
                <div>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    {locale === "ar" ? "مجموع مداخيل الصندوق المصرح بها" : "Total Caisse Déclaré"}
                  </Text>
                  <Text size="lg" fw={900} c="blue">
                    {formatCurrency(dayTotalManual)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    {locale === "ar" ? "مجموع مبيعات النظام" : "Total Ventes Système"}
                  </Text>
                  <Text size="lg" fw={800} c="dimmed">
                    {formatCurrency(dayTotalSystem)}
                  </Text>
                </div>
                {dayTotalSystem > 0 ? (
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      {locale === "ar" ? "فرق اليوم" : "Écart Journée"}
                    </Text>
                    <Text
                      size="lg"
                      fw={800}
                      style={{
                        color:
                          dayTotalManual >= dayTotalSystem
                            ? "#10b981"
                            : "#dc2626",
                      }}
                    >
                      {dayTotalManual - dayTotalSystem >= 0 ? "+" : ""}
                      {formatCurrency(dayTotalManual - dayTotalSystem)}
                    </Text>
                  </div>
                ) : null}
              </Group>

              <Group gap="sm">
                {savedSuccess ? (
                  <Badge color="teal" variant="light" size="lg" leftSection={<Check size={14} />}>
                    {locale === "ar" ? "تم التسجيل بنجاح !" : "Enregistré avec succès !"}
                  </Badge>
                ) : null}

                <Button
                  type="submit"
                  size="sm"
                  radius="md"
                  color="blue"
                  loading={isPending}
                  leftSection={<Check size={16} />}
                  style={{ fontWeight: 700 }}
                >
                  {locale === "ar" ? "تسجيل مداخيل اليوم" : "Enregistrer la journée"}
                </Button>
              </Group>
            </Group>
          </Paper>
        </form>
      ) : null}
    </Card>
  );
}
