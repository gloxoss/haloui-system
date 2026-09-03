"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { syncRevenueAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { monthKey } from "@/lib/utils";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
} from "lucide-react";

export function RevenueMonthNavigator({
  currentMonth,
  totalSystemMonth,
}: {
  currentMonth: string; // Format: YYYY-MM
  totalSystemMonth?: number;
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [isPending, startTransition] = React.useTransition();
  const thisMonth = monthKey();

  // Helper to compute prev/next month
  const getRelativeMonth = (offset: number) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 + offset, 1));
    const newY = date.getUTCFullYear();
    const newM = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${newY}-${newM}`;
  };

  const prevMonth = getRelativeMonth(-1);
  const nextMonth = getRelativeMonth(1);

  // Format month for display
  const formattedMonth = React.useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-FR", {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [currentMonth, locale]);

  const capitalizedMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

  return (
    <Card
      withBorder
      radius="lg"
      p="sm"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        {/* Navigation & Month Title */}
        <Group gap="xs" wrap="wrap">
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            component={Link}
            href={`/chiffre-affaires?month=${prevMonth}`}
            title={locale === "ar" ? "الشهر السابق" : "Mois précédent"}
          >
            <ChevronLeft size={18} />
          </ActionIcon>

          <Group gap="xs">
            <Calendar size={18} className="text-blue-600" />
            <Title order={3} size="h4" style={{ fontWeight: 800, textTransform: "capitalize" }}>
              {capitalizedMonth}
            </Title>
            {currentMonth === thisMonth ? (
              <Badge variant="light" color="teal" size="sm">
                {locale === "ar" ? "الشهر الجاري" : "En cours"}
              </Badge>
            ) : null}
          </Group>

          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            component={Link}
            href={`/chiffre-affaires?month=${nextMonth}`}
            title={locale === "ar" ? "الشهر الموالي" : "Mois suivant"}
          >
            <ChevronRight size={18} />
          </ActionIcon>

          {currentMonth !== thisMonth ? (
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              component={Link}
              href={`/chiffre-affaires?month=${thisMonth}`}
              radius="md"
            >
              {locale === "ar" ? "الرجوع لهاد الشهر" : "Revenir à ce mois"}
            </Button>
          ) : null}
        </Group>

        {/* Action Buttons: Auto-Sync & Export */}
        <Group gap="xs" wrap="wrap">
          <form
            action={(formData) => {
              const confirmMsg =
                locale === "ar"
                  ? `واش باغي تعمر المداخيل ديال شهر ${capitalizedMonth} أوتوماتيكياً من الفواتير وبونات التوصيل فهاد السيستيم؟`
                  : `Voulez-vous synchroniser automatiquement toutes les recettes de ${capitalizedMonth} depuis les factures et bons de livraison du système ?\n\nLes montants correspondants seront mis à jour.`;

              if (window.confirm(confirmMsg)) {
                startTransition(async () => {
                  await syncRevenueAction(formData);
                });
              }
            }}
          >
            <input type="hidden" name="month" value={currentMonth} />
            <Tooltip
              label={
                locale === "ar"
                  ? "حساب وتعبئة مداخيل الفروع أوتوماتيك من الفواتير وبونات التوصيل المسجلة"
                  : "Calcule et remplit automatiquement les recettes de chaque magasin pour tout le mois depuis les factures et BL validés"
              }
            >
              <Button
                type="submit"
                variant="light"
                color="indigo"
                radius="md"
                size="sm"
                loading={isPending}
                leftSection={<Sparkles size={16} />}
                style={{ fontWeight: 700 }}
              >
                {locale === "ar" ? "مزامنة أوتوماتيكية من المبيعات" : "Synchroniser depuis les ventes"}
              </Button>
            </Tooltip>
          </form>

          <Button
            component={Link}
            href={`/api/chiffre-affaires/export?month=${currentMonth}`}
            variant="default"
            radius="md"
            size="sm"
            leftSection={<Download size={15} />}
          >
            {t.common.exportExcel}
          </Button>
        </Group>
      </Group>
    </Card>
  );
}
