"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveCashDayClosingAction } from "@/app/actions";
import { AppDateInput } from "@/components/ui/app-date-input";
import { UploadField } from "@/components/upload-field";
import { type BranchRecord, type CashDaySummary } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, todayIso } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  Banknote,
  Building2,
  Check,
  CreditCard,
  Receipt,
  Sparkles,
} from "lucide-react";

export function DailyClosingForm({
  branches,
  initialDate,
  initialBranchId,
  daySummary,
  systemSaleTotal = 0,
}: {
  branches: BranchRecord[];
  initialDate?: string;
  initialBranchId?: number;
  daySummary?: CashDaySummary;
  systemSaleTotal?: number;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>(() => {
    return String(initialBranchId || branches[0]?.id || "");
  });
  const [selectedDate, setSelectedDate] = React.useState<string>(() => initialDate || todayIso());
  const [especes, setEspeces] = React.useState<number>(() => daySummary?.especes ?? 0);
  const [carte, setCarte] = React.useState<number>(() => daySummary?.carte ?? 0);
  const [cheque, setCheque] = React.useState<number>(() => daySummary?.cheque ?? 0);
  const [virement, setVirement] = React.useState<number>(() => daySummary?.virement ?? 0);
  const [notes, setNotes] = React.useState<string>(() => daySummary?.notes ?? "");
  const [preuvePath, setPreuvePath] = React.useState<string>(() => daySummary?.preuve_path ?? "");
  const [showOptional, setShowOptional] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Sync state if daySummary changes
  React.useEffect(() => {
    if (daySummary) {
      setEspeces(daySummary.especes || 0);
      setCarte(daySummary.carte || 0);
      setCheque(daySummary.cheque || 0);
      setVirement(daySummary.virement || 0);
      setNotes(daySummary.notes || "");
      setPreuvePath(daySummary.preuve_path || "");
    }
  }, [daySummary]);

  const totalRecettes = Number(especes) + Number(carte) + Number(cheque) + Number(virement);
  const totalSorties = daySummary?.total_sorties || 0;
  const netCaisseEsp = Number(especes) - totalSorties;

  return (
    <Card
      withBorder
      radius="xl"
      p={{ base: "md", sm: "lg" }}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
      }}
    >
      <form
        action={(formData) => {
          formData.set("branch_id", selectedBranchId);
          formData.set("date", selectedDate);
          formData.set("especes", String(especes));
          formData.set("carte", String(carte));
          formData.set("cheque", String(cheque));
          formData.set("virement", String(virement));
          formData.set("preuve_path", preuvePath);
          formData.set("notes", notes);
          formData.set("statut_cloture", "cloture");

          startTransition(async () => {
            await saveCashDayClosingAction(formData);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
          });
        }}
      >
        <Stack gap="lg">
          {/* Quick Branch Switcher Pills */}
          {branches.length > 1 ? (
            <Group gap="xs" wrap="wrap">
              <Text size="xs" fw={700} c="dimmed">
                {locale === "ar" ? "المحل :" : "Point de vente :"}
              </Text>
              {branches.map((b) => (
                <Button
                  key={b.id}
                  size="compact-xs"
                  radius="xl"
                  variant={String(b.id) === selectedBranchId ? "filled" : "default"}
                  color={String(b.id) === selectedBranchId ? "blue" : "gray"}
                  onClick={() => {
                    setSelectedBranchId(String(b.id));
                    router.push(`/chiffre-affaires?tab=cloture&branch=${b.id}&date=${selectedDate}`);
                  }}
                  type="button"
                >
                  {b.name}
                </Button>
              ))}
            </Group>
          ) : null}

          {/* Top Bar: Store, Date, and System Info */}
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Group gap="md" wrap="wrap" style={{ flex: 1 }}>
              <div style={{ minWidth: 220 }}>
                <Text size="xs" fw={700} c="dimmed" mb={4}>
                  {t.documents.magasin}
                </Text>
                <Select
                  placeholder={locale === "ar" ? "اختر المحل" : "Sélectionnez un magasin"}
                  data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                  value={selectedBranchId}
                  onChange={(val) => {
                    if (val) {
                      setSelectedBranchId(val);
                      router.push(`/chiffre-affaires?tab=cloture&branch=${val}&date=${selectedDate}`);
                    }
                  }}
                  required
                  radius="md"
                />
              </div>

              <div style={{ minWidth: 170 }}>
                <Text size="xs" fw={700} c="dimmed" mb={4}>
                  {locale === "ar" ? "التاريخ" : "Date"}
                </Text>
                <AppDateInput
                  value={selectedDate}
                  onChange={(val) => {
                    if (val) {
                      setSelectedDate(val);
                      router.push(`/chiffre-affaires?tab=cloture&branch=${selectedBranchId}&date=${val}`);
                    }
                  }}
                  clearable={false}
                />
              </div>

              {systemSaleTotal > 0 ? (
                <div className="flex items-center gap-2 pt-6">
                  <Badge variant="light" color="indigo" size="md">
                    {t.caisse.systemSales} : {formatCurrency(systemSaleTotal)}
                  </Badge>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="indigo"
                    leftSection={<Sparkles size={13} />}
                    onClick={() => setEspeces(systemSaleTotal)}
                    type="button"
                  >
                    {t.caisse.copySystem}
                  </Button>
                </div>
              ) : null}
            </Group>

            {savedSuccess ? (
              <Badge color="teal" variant="light" size="lg" leftSection={<Check size={14} />}>
                {locale === "ar" ? "تم التسجيل بنجاح !" : "Enregistré avec succès !"}
              </Badge>
            ) : null}
          </Group>

          {/* 4 Simple, Clean Payment Inputs */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {/* Espèces */}
            <Paper
              withBorder
              p="md"
              radius="lg"
              style={{
                background: "var(--surface-soft, rgba(0,0,0,0.02))",
                borderColor: "var(--border)",
              }}
            >
              <Group gap="xs" mb="xs">
                <Banknote size={17} className="text-emerald-600" />
                <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                  {t.caisse.especes}
                </Text>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={especes === 0 ? "" : especes}
                  onChange={(e) => setEspeces(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[16px] font-black text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>

            {/* Carte Bancaire */}
            <Paper
              withBorder
              p="md"
              radius="lg"
              style={{
                background: "var(--surface-soft, rgba(0,0,0,0.02))",
                borderColor: "var(--border)",
              }}
            >
              <Group gap="xs" mb="xs">
                <CreditCard size={17} className="text-blue-600" />
                <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                  {t.caisse.carte}
                </Text>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={carte === 0 ? "" : carte}
                  onChange={(e) => setCarte(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[16px] font-black text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>

            {/* Chèque */}
            <Paper
              withBorder
              p="md"
              radius="lg"
              style={{
                background: "var(--surface-soft, rgba(0,0,0,0.02))",
                borderColor: "var(--border)",
              }}
            >
              <Group gap="xs" mb="xs">
                <Receipt size={17} className="text-amber-600" />
                <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                  {t.caisse.cheque}
                </Text>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cheque === 0 ? "" : cheque}
                  onChange={(e) => setCheque(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[16px] font-black text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>

            {/* Virement */}
            <Paper
              withBorder
              p="md"
              radius="lg"
              style={{
                background: "var(--surface-soft, rgba(0,0,0,0.02))",
                borderColor: "var(--border)",
              }}
            >
              <Group gap="xs" mb="xs">
                <Building2 size={17} className="text-purple-600" />
                <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                  {t.caisse.virement}
                </Text>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={virement === 0 ? "" : virement}
                  onChange={(e) => setVirement(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[16px] font-black text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>
          </SimpleGrid>

          {/* Optional Details Toggle: Justificatif & Notes */}
          <div>
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              type="button"
              onClick={() => setShowOptional(!showOptional)}
            >
              {showOptional
                ? (locale === "ar" ? "▲ إخفاء الملاحظات والوثيقة" : "▲ Masquer remarques et justificatif")
                : (locale === "ar" ? "▼ إضافة ملاحظات أو صورة تيكيت Z (اختياري)" : "▼ Ajouter remarques ou ticket Z (optionnel)")}
            </Button>

            {showOptional ? (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="sm">
                <div>
                  <UploadField
                    name="preuve_path_file"
                    folder="caisse"
                    initialValue={preuvePath}
                    label={t.caisse.proofTitle}
                  />
                  <input type="hidden" name="preuve_path" value={preuvePath} />
                </div>

                <div>
                  <Text size="xs" fw={700} c="dimmed" mb={4}>
                    {locale === "ar" ? "ملاحظات" : "Remarques"}
                  </Text>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={
                      locale === "ar"
                        ? "ملاحظات حول إغلاق اليوم..."
                        : "Remarques éventuelles sur la clôture du jour..."
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 text-[13px] text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </SimpleGrid>
            ) : null}
          </div>

          {/* Simple Bottom Summary & Save Button */}
          <Paper
            withBorder
            p="md"
            radius="xl"
            style={{
              background: "var(--surface-soft, rgba(0, 0, 0, 0.02))",
              borderColor: "var(--border)",
            }}
          >
            <Group justify="space-between" wrap="wrap" gap="md">
              <Group gap="xl" wrap="wrap">
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    {t.caisse.totalRecettes}
                  </Text>
                  <Text size="xl" fw={900} c="blue">
                    {formatCurrency(totalRecettes)}
                  </Text>
                </div>

                {totalSorties > 0 ? (
                  <div>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      {t.caisse.sortiesCaisse}
                    </Text>
                    <Text size="xl" fw={900} c="red">
                      - {formatCurrency(totalSorties)}
                    </Text>
                  </div>
                ) : null}

                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    {t.caisse.soldeNet}
                  </Text>
                  <Text
                    size="xl"
                    fw={900}
                    style={{
                      color: netCaisseEsp >= 0 ? "#059669" : "#dc2626",
                    }}
                  >
                    {formatCurrency(netCaisseEsp)}
                  </Text>
                </div>
              </Group>

              <Button
                type="submit"
                size="md"
                radius="xl"
                color="blue"
                loading={isPending}
                leftSection={<Check size={18} />}
                style={{ fontWeight: 700 }}
              >
                {locale === "ar" ? "حفظ الإغلاق" : "Enregistrer la clôture"}
              </Button>
            </Group>
          </Paper>
        </Stack>
      </form>
    </Card>
  );
}
