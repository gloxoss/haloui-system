import Link from "next/link";
import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  MapPin,
  Plus,
  Receipt,
  Store,
  TrendingUp,
} from "lucide-react";

import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  getModuleSlugByType,
} from "@/lib/constants";
import { getCompany, getDashboardStats, getFeatureFlags, getRevenueGrid } from "@/lib/data";
import { DOCUMENT_FEATURE_MAP } from "@/lib/features";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { type TranslationDictionary } from "@/lib/i18n/types";
import { formatCurrency, formatDate, formatDateLong, monthKey, todayIso } from "@/lib/utils";

function statusBadgeProps(status: "brouillon" | "valide" | "imprime", dict: TranslationDictionary) {
  if (status === "imprime") {
    return { color: "green", variant: "light" as const, label: dict.documents.statusImprime };
  }

  if (status === "valide") {
    return { color: "blue", variant: "light" as const, label: dict.documents.statusValide };
  }

  return { color: "orange", variant: "light" as const, label: dict.documents.statusBrouillon };
}

function getDocTypeLabel(type: "devis" | "facture" | "bl" | "bs" | "bc", dict: TranslationDictionary) {
  switch (type) {
    case "devis": return dict.documents.devisTitle;
    case "facture": return dict.documents.factureTitle;
    case "bl": return dict.documents.blTitle;
    case "bs": return dict.documents.bsTitle;
    case "bc": return dict.documents.bcTitle;
    default: return type;
  }
}

export default async function DashboardPage() {
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

  const company = getCompany();
  const featureFlags = getFeatureFlags();
  const stats = getDashboardStats();
  const latestDocuments = (stats.latestDocuments as Array<{
    id: number;
    type: "devis" | "facture" | "bl" | "bs" | "bc";
    numero: number;
    date: string;
    total_ttc: number;
    status: "brouillon" | "valide" | "imprime";
    party_name?: string | null;
    branch_name?: string | null;
  }>)
    .filter((document) => featureFlags[DOCUMENT_FEATURE_MAP[document.type]])
    .slice(0, 5);

  const today = todayIso();
  const revenue = featureFlags.chiffre_affaires ? getRevenueGrid(monthKey()) : null;
  const todayRow = revenue?.table.find((row) => row.date === today);
  const totalDayRevenue = todayRow?.total ?? 0;
  const branchesCount = revenue?.branches.length ?? 0;

  return (
    <Stack gap="xl">
      {/* Hero Welcome Banner */}
      <Paper
        radius={24}
        withBorder
        p={{ base: "lg", md: "xl" }}
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
            <Stack gap={4}>
              <Group gap="xs" align="center">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.1em" }}>
                  {locale === "ar" ? "النظام نشط • مباشر" : "Système actif • En direct"}
                </Text>
              </Group>

              <Title order={1} style={{ letterSpacing: "-0.03em", fontSize: "1.85rem", fontWeight: 800 }}>
                {locale === "ar" && company.arabic_name ? company.arabic_name : company.name}
              </Title>

              <Group gap="xs" c="dimmed" style={{ fontSize: "13px" }}>
                <Calendar size={14} strokeWidth={1.6} />
                <Text size="sm">
                  {new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date())}
                </Text>
              </Group>
            </Stack>

            <Group gap="sm" wrap="wrap">
              {featureFlags.devis ? (
                <Button
                  component={Link}
                  href="/devis/new"
                  radius="xl"
                  size="sm"
                  leftSection={<Plus size={15} strokeWidth={2} />}
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-foreground)",
                    fontWeight: 600,
                  }}
                >
                  {dict.dashboard.newDevis}
                </Button>
              ) : null}
              {featureFlags.factures ? (
                <Button
                  component={Link}
                  href="/factures/new"
                  radius="xl"
                  size="sm"
                  variant="default"
                  leftSection={<Receipt size={15} strokeWidth={1.8} />}
                  style={{ fontWeight: 600 }}
                >
                  {dict.dashboard.newFacture}
                </Button>
              ) : null}
            </Group>
          </Group>

          {/* Quick Metrics Strip */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Paper
              radius="xl"
              withBorder
              p="md"
              style={{
                background: "var(--surface-soft)",
                borderColor: "var(--border)",
              }}
            >
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                    {locale === "ar" ? "مداخيل اليوم" : "Recettes du jour"}
                  </Text>
                  <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "var(--foreground)" }}>
                    {formatCurrency(totalDayRevenue)}
                  </Text>
                </Stack>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--foreground)",
                  }}
                >
                  <CircleDollarSign size={20} strokeWidth={1.6} />
                </div>
              </Group>
            </Paper>

            <Paper
              radius="xl"
              withBorder
              p="md"
              style={{
                background: "var(--surface-soft)",
                borderColor: "var(--border)",
              }}
            >
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                    {locale === "ar" ? "المحلات والماڭازات النشطة" : "Magasins actifs"}
                  </Text>
                  <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "var(--foreground)" }}>
                    {branchesCount} {locale === "ar" ? "محل" : (branchesCount > 1 ? "emplacements" : "emplacement")}
                  </Text>
                </Stack>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--foreground)",
                  }}
                >
                  <Store size={19} strokeWidth={1.6} />
                </div>
              </Group>
            </Paper>

            <Paper
              radius="xl"
              withBorder
              p="md"
              style={{
                background: "var(--surface-soft)",
                borderColor: "var(--border)",
              }}
            >
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.08em" }}>
                    {dict.dashboard.recentDocuments}
                  </Text>
                  <Text size="xl" fw={900} style={{ letterSpacing: "-0.03em", color: "var(--foreground)" }}>
                    {latestDocuments.length} {locale === "ar" ? "وثائق" : "documents"}
                  </Text>
                </Stack>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--foreground)",
                  }}
                >
                  <FileText size={19} strokeWidth={1.6} />
                </div>
              </Group>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Revenue Grid by Branch */}
      {featureFlags.chiffre_affaires && revenue ? (
        <Paper
          radius={24}
          withBorder
          p={{ base: "lg", md: "xl" }}
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Group justify="space-between" align="center" mb="lg" wrap="wrap" gap="md">
            <Group gap="sm">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--foreground)",
                }}
              >
                <TrendingUp size={18} strokeWidth={1.8} />
              </div>
              <Stack gap={1}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.1em" }}>
                  {locale === "ar" ? "متابعة مداخيل الصندوق يومياً" : "Suivi financier quotidien"}
                </Text>
                <Title order={2} style={{ letterSpacing: "-0.03em", fontWeight: 800, fontSize: "1.35rem" }}>
                  {dict.dashboard.storeRevenues}
                </Title>
              </Stack>
            </Group>

            <Group gap="sm" wrap="wrap">
              <Paper
                radius="xl"
                withBorder
                px="md"
                py="xs"
                style={{
                  background: totalDayRevenue > 0 ? "rgba(16, 185, 129, 0.08)" : "var(--surface-soft)",
                  borderColor: totalDayRevenue > 0 ? "rgba(16, 185, 129, 0.3)" : "var(--border)",
                }}
              >
                <Group gap="xs">
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                    {dict.dashboard.totalDay}
                  </Text>
                  <Text
                    fw={900}
                    size="md"
                    style={{
                      letterSpacing: "-0.02em",
                      color: totalDayRevenue > 0 ? "#059669" : "var(--foreground)",
                    }}
                  >
                    {formatCurrency(totalDayRevenue)}
                  </Text>
                </Group>
              </Paper>

              <Button
                component={Link}
                href="/chiffre-affaires"
                radius="xl"
                variant="light"
                size="sm"
                rightSection={<ArrowRight size={14} strokeWidth={1.8} />}
                style={{ fontWeight: 600 }}
              >
                {dict.dashboard.enterRevenues}
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {revenue.branches.map((branch) => {
              const amount = todayRow?.values[branch.id] ?? 0;
              const hasSales = amount > 0;

              return (
                <Paper
                  key={branch.id}
                  radius={18}
                  withBorder
                  p="lg"
                  style={{
                    background: hasSales ? "var(--card)" : "var(--surface-soft)",
                    borderColor: hasSales ? "var(--border-strong)" : "var(--border)",
                    boxShadow: hasSales ? "0 2px 8px rgba(0,0,0,0.02)" : "none",
                    transition: "all 200ms ease",
                  }}
                  className="group hover:-translate-y-0.5 hover:border-[var(--accent)]"
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--foreground)",
                          }}
                        >
                          <MapPin size={15} strokeWidth={1.8} />
                        </div>
                        <Stack gap={1}>
                          <Text size="sm" fw={800} style={{ letterSpacing: "-0.01em" }}>
                            {branch.name}
                          </Text>
                          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 170 }}>
                            {branch.address || (locale === "ar" ? "محل نشط" : "Emplacement actif")}
                          </Text>
                        </Stack>
                      </Group>

                      {hasSales ? (
                        <Badge
                          color="green"
                          variant="light"
                          radius="xl"
                          size="xs"
                          leftSection={<CheckCircle2 size={11} strokeWidth={2} />}
                          style={{ fontWeight: 700 }}
                        >
                          {locale === "ar" ? "مسجل" : "Enregistré"}
                        </Badge>
                      ) : (
                        <Badge
                          color="gray"
                          variant="light"
                          radius="xl"
                          size="xs"
                          leftSection={<Clock size={11} strokeWidth={2} />}
                          style={{ fontWeight: 600 }}
                        >
                          {locale === "ar" ? "في الانتظار" : "En attente"}
                        </Badge>
                      )}
                    </Group>

                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Group justify="space-between" align="baseline">
                        <Text size="xs" c="dimmed" fw={600}>
                          {locale === "ar" ? "مداخيل اليوم" : "Chiffre d'affaires"}
                        </Text>
                        <Text
                          fw={900}
                          size="lg"
                          style={{
                            letterSpacing: "-0.02em",
                            color: hasSales ? "var(--foreground)" : "var(--muted)",
                          }}
                        >
                          {formatCurrency(amount)}
                        </Text>
                      </Group>
                    </div>

                    <Button
                      component={Link}
                      href="/chiffre-affaires"
                      variant="subtle"
                      color="gray"
                      size="xs"
                      radius="md"
                      fullWidth
                      rightSection={<ArrowRight size={13} strokeWidth={1.8} />}
                      style={{ fontWeight: 600 }}
                    >
                      {hasSales
                        ? (locale === "ar" ? "عرض التفاصيل" : "Consulter la fiche")
                        : (locale === "ar" ? "تسجيل مداخيل هاد المحل" : "Saisir pour ce magasin")}
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Paper>
      ) : null}

      {/* Latest Documents */}
      <Paper
        radius={24}
        withBorder
        p={{ base: "lg", md: "xl" }}
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Group justify="space-between" align="center" mb="lg" wrap="wrap" gap="md">
          <Group gap="sm">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--foreground)",
              }}
            >
              <Receipt size={18} strokeWidth={1.8} />
            </div>
            <Stack gap={1}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.1em" }}>
                {locale === "ar" ? "المعاملات التجارية الأخيرة" : "Transactions récentes"}
              </Text>
              <Title order={2} style={{ letterSpacing: "-0.03em", fontWeight: 800, fontSize: "1.35rem" }}>
                {dict.dashboard.recentDocuments}
              </Title>
            </Stack>
          </Group>

          <Button
            component={Link}
            href={featureFlags.factures ? "/factures" : "/devis"}
            variant="subtle"
            color="gray"
            radius="xl"
            rightSection={<ArrowRight size={14} strokeWidth={1.8} />}
            size="sm"
            style={{ fontWeight: 600 }}
          >
            {locale === "ar" ? "عرض جميع الوثائق" : "Voir tous les documents"}
          </Button>
        </Group>

        {latestDocuments.length === 0 ? (
          <Paper
            radius={18}
            withBorder
            p="xl"
            style={{
              background: "var(--surface-soft)",
              borderColor: "var(--border)",
              textAlign: "center",
            }}
          >
            <Stack align="center" gap="sm" py="md">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <FileText size={22} strokeWidth={1.6} />
              </div>

              <Stack gap={2}>
                <Text fw={800} size="md">
                  {locale === "ar" ? "ما كاينا حتى وثيقة حالياً" : "Aucun document pour l'instant"}
                </Text>
                <Text size="sm" c="dimmed" style={{ maxWidth: 440 }}>
                  {locale === "ar"
                    ? "ابدا بإنشاء أول دوڤي أو فاتورة باش تسجل وتتبع المعاملات التجارية ديالك."
                    : "Commencez par créer votre premier devis ou facture pour enregistrer et suivre vos transactions commerciales."}
                </Text>
              </Stack>

              <Group gap="sm" mt="sm">
                {featureFlags.devis ? (
                  <Button
                    component={Link}
                    href="/devis/new"
                    radius="xl"
                    size="sm"
                    leftSection={<Plus size={15} strokeWidth={2} />}
                    style={{ fontWeight: 600 }}
                  >
                    {dict.dashboard.newDevis}
                  </Button>
                ) : null}
                {featureFlags.factures ? (
                  <Button
                    component={Link}
                    href="/factures/new"
                    variant="default"
                    radius="xl"
                    size="sm"
                    leftSection={<Plus size={15} strokeWidth={2} />}
                    style={{ fontWeight: 600 }}
                  >
                    {dict.dashboard.newFacture}
                  </Button>
                ) : null}
              </Group>
            </Stack>
          </Paper>
        ) : (
          <Table highlightOnHover horizontalSpacing="md" verticalSpacing="md" striped>
            <TableThead>
              <TableTr>
                <TableTh>{dict.documents.number}</TableTh>
                <TableTh>{dict.documents.client}</TableTh>
                <TableTh>{dict.documents.magasin}</TableTh>
                <TableTh>{dict.documents.date}</TableTh>
                <TableTh>{dict.documents.totalTtc}</TableTh>
                <TableTh>{dict.common.status}</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {latestDocuments.map((document) => {
                const badge = statusBadgeProps(document.status, dict);

                return (
                  <TableTr key={document.id}>
                    <TableTd>
                      <Link
                        href={`/${getModuleSlugByType(document.type)}/${document.id}/edit`}
                        style={{ fontWeight: 700, color: "var(--accent)" }}
                      >
                        {getDocTypeLabel(document.type, dict)} #{document.numero}
                      </Link>
                    </TableTd>
                    <TableTd>{String(document.party_name ?? "-")}</TableTd>
                    <TableTd>{String(document.branch_name ?? "-")}</TableTd>
                    <TableTd>{formatDate(document.date)}</TableTd>
                    <TableTd fw={800}>{formatCurrency(document.total_ttc)}</TableTd>
                    <TableTd>
                      <Badge color={badge.color} variant={badge.variant} radius="xl" size="sm">
                        {badge.label}
                      </Badge>
                    </TableTd>
                  </TableTr>
                );
              })}
            </TableTbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
