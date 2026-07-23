import Link from "next/link";
import { Badge, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";

import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  getModuleSlugByType,
} from "@/lib/constants";
import { getCompany, getDashboardStats, getFeatureFlags, getRevenueGrid } from "@/lib/data";
import { DOCUMENT_FEATURE_MAP } from "@/lib/features";
import { formatCurrency, formatDate, formatDateLong, monthKey, todayIso } from "@/lib/utils";

function statusColor(status: "brouillon" | "valide" | "imprime") {
  if (status === "imprime") {
    return "green";
  }

  if (status === "valide") {
    return "blue";
  }

  return "yellow";
}

export default function DashboardPage() {
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

  return (
    <Stack gap="md">
      <Paper
        radius={24}
        shadow="sm"
        withBorder
        p="lg"
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Group justify="space-between" align="center" gap="md">
          <Stack gap={2}>
            <Text size="11px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
              Tableau de bord
            </Text>
            <Title order={2} style={{ letterSpacing: "-0.04em" }}>
              {company.name} - {formatDateLong(new Date())}
            </Title>
          </Stack>

          <Group gap="sm">
            {featureFlags.devis ? (
              <Button component={Link} href="/devis/new" radius="md">
                Nouveau devis
              </Button>
            ) : null}
            {featureFlags.chiffre_affaires ? (
              <Button component={Link} href="/chiffre-affaires" radius="md" variant="default">
                Entrer les recettes du jour
              </Button>
            ) : null}
          </Group>
        </Group>
      </Paper>

      {featureFlags.chiffre_affaires && revenue ? (
        <Paper
          radius={24}
          shadow="sm"
          withBorder
          p="lg"
          style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
        >
          <Group justify="space-between" align="center" mb="md">
            <Stack gap={2}>
              <Text size="11px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
                Aujourd&apos;hui
              </Text>
              <Title order={3} style={{ letterSpacing: "-0.03em" }}>
                Recettes par magasin
              </Title>
            </Stack>
            <Text fw={800} size="lg">
              {formatCurrency(todayRow?.total ?? 0)}
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
            {revenue.branches.map((branch) => (
              <Paper
                key={branch.id}
                radius="xl"
                withBorder
                p="md"
                style={{ background: "var(--surface-soft)", borderColor: "var(--border)" }}
              >
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    {branch.name}
                  </Text>
                  <Text fw={800} size="xl" style={{ letterSpacing: "-0.03em" }}>
                    {formatCurrency(todayRow?.values[branch.id] ?? 0)}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>
      ) : null}

      <Paper
        radius={24}
        shadow="sm"
        withBorder
        p="lg"
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Group justify="space-between" align="center" mb="md">
          <Stack gap={2}>
            <Text size="11px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
              A suivre
            </Text>
            <Title order={3} style={{ letterSpacing: "-0.03em" }}>
              5 derniers documents
            </Title>
          </Stack>
          <Button component={Link} href={featureFlags.factures ? "/factures" : "/devis"} variant="default" radius="md">
            Voir plus
          </Button>
        </Group>

        <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Document</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Magasin</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Etat</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {latestDocuments.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ padding: "28px", textAlign: "center", color: "var(--muted)" }}>
                  Aucun document pour l&apos;instant.{" "}
                  <Link
                    href={featureFlags.devis ? "/devis/new" : featureFlags.factures ? "/factures/new" : "/dashboard"}
                    style={{ fontWeight: 700, color: "var(--accent)" }}
                  >
                    Creer le premier
                  </Link>
                </Table.Td>
              </Table.Tr>
            ) : (
              latestDocuments.map((document) => (
                <Table.Tr key={document.id}>
                  <Table.Td>
                    <Link
                      href={`/${getModuleSlugByType(document.type)}/${document.id}/edit`}
                      style={{ fontWeight: 700 }}
                    >
                      {DOCUMENT_TYPE_LABELS[document.type]} #{document.numero}
                    </Link>
                  </Table.Td>
                  <Table.Td>{String(document.party_name ?? "-")}</Table.Td>
                  <Table.Td>{String(document.branch_name ?? "-")}</Table.Td>
                  <Table.Td>{formatDate(document.date)}</Table.Td>
                  <Table.Td>{formatCurrency(document.total_ttc)}</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor(document.status)} variant="light" radius="xl">
                      {DOCUMENT_STATUS_LABELS[document.status]}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
