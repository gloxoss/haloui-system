"use client";

import * as React from "react";
import { saveCashDayClosingAction } from "@/app/actions";
import { AppDateInput } from "@/components/ui/app-date-input";
import { UploadField } from "@/components/upload-field";
import { type BranchRecord, type CashDaySummary, type SortieCaisseRecord } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, todayIso } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Check,
  CreditCard,
  FileCheck,
  Receipt,
  RotateCcw,
  Sparkles,
  Store,
  Wallet,
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
  const diffSystem = totalRecettes - systemSaleTotal;

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
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
        <Group justify="space-between" wrap="wrap" gap="sm" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <Wallet size={20} />
            </ThemeIcon>
            <div>
              <Group gap="xs">
                <Title order={3} size="h4" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {locale === "ar" ? "لاكيس وإغلاق الصندوق اليومي" : "Clôture journalière & Journal de Caisse"}
                </Title>
                <Badge variant="light" color="blue" radius="sm">
                  {locale === "ar" ? "إغلاق رسمي" : "Clôture officielle"}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {locale === "ar"
                  ? "سجل مداخيل اليوم مقسمة حسب طرق الخلاص، وثق التوصيل، وتأكد من الصافي فالصندوق."
                  : "Saisissez les encaissements par mode de règlement, justifiez la caisse et validez le solde net."}
              </Text>
            </div>
          </Group>

          {savedSuccess ? (
            <Badge color="teal" variant="light" size="lg" leftSection={<Check size={14} />}>
              {locale === "ar" ? "تم تسجيل إغلاق لاكيس بنجاح !" : "Clôture enregistrée avec succès !"}
            </Badge>
          ) : null}
        </Group>

        <Divider my="sm" />

        {/* Store & Date Selection */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="md">
          <Select
            label={t.documents.magasin}
            placeholder={locale === "ar" ? "اختر المحل / الماڭازا" : "Sélectionnez un magasin"}
            data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
            value={selectedBranchId}
            onChange={(val) => {
              if (val) {
                setSelectedBranchId(val);
                // Trigger client redirect to sync params
                window.location.href = `/chiffre-affaires?tab=cloture&branch=${val}&date=${selectedDate}`;
              }
            }}
            required
            radius="md"
          />

          <AppDateInput
            label={locale === "ar" ? "تاريخ إغلاق لاكيس" : "Date de clôture"}
            value={selectedDate}
            onChange={(val) => {
              if (val) {
                setSelectedDate(val);
                window.location.href = `/chiffre-affaires?tab=cloture&branch=${selectedBranchId}&date=${val}`;
              }
            }}
            clearable={false}
          />

          <Paper
            withBorder
            p="xs"
            radius="md"
            style={{
              background: "var(--surface-soft, rgba(0, 0, 0, 0.02))",
              borderColor: "var(--border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Text size="11px" c="dimmed" fw={700} tt="uppercase">
              {t.caisse.systemSales}
            </Text>
            <Group justify="space-between" align="center">
              <Text size="md" fw={900} c="indigo">
                {formatCurrency(systemSaleTotal)}
              </Text>
              {systemSaleTotal > 0 ? (
                <Button
                  size="compact-xs"
                  variant="light"
                  color="indigo"
                  radius="sm"
                  leftSection={<Sparkles size={12} />}
                  onClick={() => setEspeces(systemSaleTotal)}
                  type="button"
                >
                  {t.caisse.copySystem}
                </Button>
              ) : null}
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Breakdown by Payment Method */}
        <div className="mb-4">
          <Text size="xs" fw={800} tt="uppercase" c="dimmed" mb={8} style={{ letterSpacing: "0.08em" }}>
            {locale === "ar" ? "1. المداخيل حسب طريقة الأداء (كاش، كارط، شيك، فيرمون)" : "1. Encaissements & Recettes par Moyen de Paiement"}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
            {/* Espèces */}
            <Paper withBorder p="sm" radius="md" style={{ borderColor: "var(--border)" }}>
              <Group justify="space-between" mb={4}>
                <Group gap={6}>
                  <Banknote size={16} className="text-emerald-600" />
                  <Text size="xs" fw={700}>
                    {t.caisse.especes}
                  </Text>
                </Group>
                <Badge size="xs" color="teal" variant="light">
                  {locale === "ar" ? "فلاكيس" : "En caisse"}
                </Badge>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={especes === 0 ? "" : especes}
                  onChange={(e) => setEspeces(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[15px] font-bold text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>

            {/* Carte Bancaire (TPE) */}
            <Paper withBorder p="sm" radius="md" style={{ borderColor: "var(--border)" }}>
              <Group justify="space-between" mb={4}>
                <Group gap={6}>
                  <CreditCard size={16} className="text-blue-600" />
                  <Text size="xs" fw={700}>
                    {t.caisse.carte}
                  </Text>
                </Group>
                <Badge size="xs" color="blue" variant="light">
                  TPE
                </Badge>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={carte === 0 ? "" : carte}
                  onChange={(e) => setCarte(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[15px] font-bold text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>

            {/* Chèque */}
            <Paper withBorder p="sm" radius="md" style={{ borderColor: "var(--border)" }}>
              <Group justify="space-between" mb={4}>
                <Group gap={6}>
                  <Receipt size={16} className="text-amber-600" />
                  <Text size="xs" fw={700}>
                    {t.caisse.cheque}
                  </Text>
                </Group>
                <Badge size="xs" color="yellow" variant="light">
                  {locale === "ar" ? "للصرف" : "À encaisser"}
                </Badge>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cheque === 0 ? "" : cheque}
                  onChange={(e) => setCheque(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[15px] font-bold text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>

            {/* Virement */}
            <Paper withBorder p="sm" radius="md" style={{ borderColor: "var(--border)" }}>
              <Group justify="space-between" mb={4}>
                <Group gap={6}>
                  <Building2 size={16} className="text-purple-600" />
                  <Text size="xs" fw={700}>
                    {t.caisse.virement}
                  </Text>
                </Group>
                <Badge size="xs" color="grape" variant="light">
                  {locale === "ar" ? "البنكة" : "Banque"}
                </Badge>
              </Group>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={virement === 0 ? "" : virement}
                  onChange={(e) => setVirement(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[15px] font-bold text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-[var(--muted)]">{t.common.mad}</span>
              </div>
            </Paper>
          </SimpleGrid>
        </div>

        {/* Section 2: Proof & Notes */}
        <div className="mb-4">
          <Text size="xs" fw={800} tt="uppercase" c="dimmed" mb={8} style={{ letterSpacing: "0.08em" }}>
            {locale === "ar" ? "2. صورة التوصيل / تيكيت Z / وصل البنكة" : "2. Justificatif & Preuve de Versement / Ticket Z"}
          </Text>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
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
              <Text size="13px" fw={600} mb={6}>
                {locale === "ar" ? "ملاحظات إغلاق لاكيس" : "Notes & Remarques de Clôture"}
              </Text>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={
                  locale === "ar"
                    ? "مثال: تم إيداع الفلوس فالوكالة البنكية، تبرير أي فارق، رقم الشيك..."
                    : "Ex : Versement en banque effectué, écart de caisse justifié par..., chèque n°..."
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-[13px] text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </SimpleGrid>
        </div>

        {/* Section 3: Daily Cash Summary & Net Calculation */}
        <Paper
          withBorder
          p="md"
          radius="md"
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

              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  {t.caisse.sortiesCaisse}
                </Text>
                <Text size="xl" fw={900} c="red">
                  - {formatCurrency(totalSorties)}
                </Text>
              </div>

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

              {systemSaleTotal > 0 ? (
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    {t.caisse.diff}
                  </Text>
                  <Text
                    size="md"
                    fw={800}
                    style={{
                      color: diffSystem >= 0 ? "#10b981" : "#dc2626",
                    }}
                  >
                    {diffSystem >= 0 ? "+" : ""}
                    {formatCurrency(diffSystem)}
                  </Text>
                </div>
              ) : null}
            </Group>

            <Button
              type="submit"
              size="md"
              radius="md"
              color="blue"
              loading={isPending}
              leftSection={<Check size={18} />}
              style={{ fontWeight: 800 }}
            >
              {t.caisse.validateClosing}
            </Button>
          </Group>
        </Paper>
      </form>
    </Card>
  );
}
