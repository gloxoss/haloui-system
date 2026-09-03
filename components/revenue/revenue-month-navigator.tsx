"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SyncSalesModal } from "@/components/revenue/sync-sales-modal";
import { useTranslation } from "@/lib/i18n";
import { type BranchRecord, type SalesDocumentSyncCandidate } from "@/lib/types";
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
  salesDocuments = [],
  branches = [],
}: {
  currentMonth: string; // Format: YYYY-MM
  totalSystemMonth?: number;
  salesDocuments?: SalesDocumentSyncCandidate[];
  branches?: BranchRecord[];
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [syncModalOpen, setSyncModalOpen] = React.useState(false);
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
    <>
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

          {/* Action Buttons: Granular Modal & Export */}
          <Group gap="xs" wrap="wrap">
            <Tooltip
              label={
                locale === "ar"
                  ? "فحص وتحديد الفواتير وبونات التوصيل قبل إضافتها لحساب المداخيل"
                  : "Prévisualiser, filtrer et sélectionner les ventes à intégrer dans la caisse"
              }
            >
              <Button
                type="button"
                variant="light"
                color="indigo"
                radius="md"
                size="sm"
                onClick={() => setSyncModalOpen(true)}
                leftSection={<Sparkles size={16} />}
                style={{ fontWeight: 700 }}
              >
                {locale === "ar" ? "مزامنة من المبيعات..." : "Synchroniser depuis les ventes..."}
              </Button>
            </Tooltip>

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

      <SyncSalesModal
        opened={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        month={currentMonth}
        documents={salesDocuments}
        branches={branches}
      />
    </>
  );
}
