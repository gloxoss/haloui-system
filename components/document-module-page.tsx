import Link from "next/link";
import { ActionIcon, Button, Group, Menu, NativeSelect, Paper, Stack, Table, Text, TextInput } from "@mantine/core";
import { Eye, MoreHorizontal, Printer } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_COMPACT_LABELS,
} from "@/lib/constants";
import { listBranches, listDocuments, listEntities } from "@/lib/data";
import { requireDocumentFeature } from "@/lib/features";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type DocumentType } from "@/lib/types";

type DocumentListRow = {
  id: number;
  numero: number;
  date: string;
  total_ttc: number;
  status: keyof typeof DOCUMENT_STATUS_LABELS;
  branch_name?: string | null;
  source_branch_name?: string | null;
  party_name?: string | null;
};

export async function DocumentModulePage({
  slug,
  type,
  filters,
}: {
  slug: string;
  type: DocumentType;
  filters: { from?: string; to?: string; branchId?: string; status?: string; partyId?: string };
}) {
  await requireDocumentFeature(type);
  const branches = listBranches({ activeOnly: true });
  const parties = listEntities(type === "bc" ? "fournisseurs" : "clients");
  const documents = listDocuments(type, {
    from: filters.from,
    to: filters.to,
    branchId: filters.branchId ? Number(filters.branchId) : null,
    status: filters.status,
    partyId: filters.partyId ? Number(filters.partyId) : null,
  }) as DocumentListRow[];

  const printKind =
    type === "devis"
      ? "devis"
      : type === "facture"
        ? "factures"
        : type === "bl"
          ? "bons-livraison"
          : type === "bc"
            ? "bons-commande"
            : "bons-sortie";

  return (
    <Stack gap="md">
      <PageHeading
        eyebrow={type === "bl" || type === "bs" || type === "bc" ? "Bons" : "Documents"}
        title={DOCUMENT_TYPE_COMPACT_LABELS[type]}
        description="Retrouvez, filtrez et ouvrez vos documents."
        actions={
          <Button component={Link} href={`/${slug}/new`} radius="md">
            Nouveau
          </Button>
        }
      />

      <Paper
        radius={24}
        shadow="sm"
        withBorder
        p="lg"
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <form className="grid gap-3 md:grid-cols-5" action="">
          <TextInput name="from" type="date" defaultValue={filters.from} label="Du" radius="md" />
          <TextInput name="to" type="date" defaultValue={filters.to} label="Au" radius="md" />
          <NativeSelect
            name="branchId"
            label="Magasin"
            defaultValue={filters.branchId ?? "all"}
            radius="md"
            data={[
              { value: "all", label: "Tous les magasins" },
              ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
            ]}
          />
          <NativeSelect
            name="partyId"
            label={type === "bc" ? "Fournisseur" : "Client"}
            defaultValue={filters.partyId ?? "all"}
            radius="md"
            data={[
              { value: "all", label: type === "bc" ? "Tous les fournisseurs" : "Tous les clients" },
              ...parties.map((party) => ({ value: String(party.id), label: party.name })),
            ]}
          />
          <Group align="end" gap="sm" wrap="nowrap">
            <NativeSelect
              name="status"
              label="Etat"
              defaultValue={filters.status ?? "all"}
              radius="md"
              style={{ flex: 1 }}
              data={[
                { value: "all", label: "Tous" },
                { value: "brouillon", label: "A finaliser" },
                { value: "valide", label: "Pret a imprimer" },
                { value: "imprime", label: "Termine" },
              ]}
            />
            <Button type="submit" radius="md" variant="default">
              Filtrer
            </Button>
          </Group>
        </form>
      </Paper>

      <Paper
        radius={24}
        shadow="sm"
        withBorder
        p="lg"
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>No</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Magasin</Table.Th>
              <Table.Th>Client / fournisseur</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Etat</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {documents.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7} style={{ padding: "28px", textAlign: "center" }}>
                  <Text c="dimmed" span>
                    Aucun document pour l&apos;instant.{" "}
                  </Text>
                  <Link href={`/${slug}/new`} style={{ fontWeight: 700, color: "var(--accent)" }}>
                    Creer le premier
                  </Link>
                </Table.Td>
              </Table.Tr>
            ) : (
              documents.map((document) => (
                <Table.Tr key={document.id}>
                  <Table.Td fw={700}>
                    <Link href={`/${slug}/${document.id}/edit`}>{document.numero}</Link>
                  </Table.Td>
                  <Table.Td>{formatDate(document.date)}</Table.Td>
                  <Table.Td>{String(document.branch_name ?? document.source_branch_name ?? "-")}</Table.Td>
                  <Table.Td>{String(document.party_name ?? "-")}</Table.Td>
                  <Table.Td>{formatCurrency(document.total_ttc)}</Table.Td>
                  <Table.Td>{DOCUMENT_STATUS_LABELS[document.status]}</Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Menu position="bottom-end" shadow="md" width={210}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" radius="xl" size="lg">
                            <MoreHorizontal size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            component={Link}
                            href={`/${slug}/${document.id}/edit`}
                            leftSection={<Eye size={15} />}
                          >
                            {document.status === "brouillon" ? "Modifier" : "Consulter"}
                          </Menu.Item>
                          <Menu.Item
                            component={Link}
                            href={`/print/${printKind}/${document.id}`}
                            target="_blank"
                            leftSection={<Printer size={15} />}
                          >
                            Imprimer / PDF
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
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
