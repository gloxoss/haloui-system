import Link from "next/link";
import {
  ActionIcon,
  Button,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Paper,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { Eye, MoreHorizontal, Plus, Printer } from "lucide-react";

import { DocumentFilterBar } from "@/components/document-filter-bar";
import { PageHeading } from "@/components/page-heading";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_COMPACT_LABELS,
} from "@/lib/constants";
import { getActiveCompanyId } from "@/lib/company";
import { listBranches, listDocuments, listEntities } from "@/lib/data";
import { requireDocumentFeature } from "@/lib/features";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { type DocumentType } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

  const activeCompanyId = await getActiveCompanyId();
  const branches = listBranches({ activeOnly: true, companyId: activeCompanyId });
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

  const getDocTypeName = () => {
    switch (type) {
      case "devis": return dict.documents.devisTitle;
      case "facture": return dict.documents.factureTitle;
      case "bl": return dict.documents.blTitle;
      case "bs": return dict.documents.bsTitle;
      case "bc": return dict.documents.bcTitle;
      default: return DOCUMENT_TYPE_COMPACT_LABELS[type];
    }
  };

  const getStatusLabel = (st: keyof typeof DOCUMENT_STATUS_LABELS) => {
    switch (st) {
      case "brouillon": return dict.documents.statusBrouillon;
      case "valide": return dict.documents.statusValide;
      case "imprime": return dict.documents.statusImprime;
      default: return DOCUMENT_STATUS_LABELS[st];
    }
  };

  return (
    <Stack gap="md">
      <PageHeading
        eyebrow={
          type === "bl" || type === "bs" || type === "bc"
            ? (locale === "ar" ? "البونات" : "Bons")
            : (locale === "ar" ? "الوثائق التجارية" : "Documents")
        }
        title={getDocTypeName()}
        description={
          locale === "ar"
            ? "تصفية وبحث، مراجعة وطباعة الوثائق التجارية الرسمية."
            : "Retrouvez, filtrez et ouvrez vos documents."
        }
        actions={
          <Button
            component={Link}
            href={`/${slug}/new`}
            radius="md"
            leftSection={<Plus size={15} />}
          >
            {locale === "ar" ? `+ إضافة ${getDocTypeName()}` : `Nouveau ${DOCUMENT_TYPE_COMPACT_LABELS[type]}`}
          </Button>
        }
      />

      <DocumentFilterBar
        type={type}
        branches={branches}
        parties={parties}
        filters={filters}
      />

      <Paper
        radius={24}
        shadow="sm"
        withBorder
        p="lg"
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm" striped>
          <TableThead>
            <TableTr>
              <TableTh>{dict.documents.number}</TableTh>
              <TableTh>{dict.documents.date}</TableTh>
              <TableTh>{dict.documents.magasin}</TableTh>
              <TableTh>{type === "bc" ? dict.documents.fournisseur : dict.documents.client}</TableTh>
              <TableTh>{dict.common.total}</TableTh>
              <TableTh>{dict.common.status}</TableTh>
              <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>{dict.common.actions}</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {documents.length === 0 ? (
              <TableTr>
                <TableTd colSpan={7} style={{ padding: "28px", textAlign: "center" }}>
                  <Text c="dimmed" span>
                    {locale === "ar" ? "ما كاينا حتى وثيقة حالياً. " : "Aucun document pour l'instant. "}
                  </Text>
                  <Link href={`/${slug}/new`} style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {locale === "ar" ? "إنشاء أول وثيقة دابا" : "Créer le premier"}
                  </Link>
                </TableTd>
              </TableTr>
            ) : (
              documents.map((document) => (
                <TableTr key={document.id}>
                  <TableTd fw={700}>
                    <Link href={`/${slug}/${document.id}/edit`}>#{document.numero}</Link>
                  </TableTd>
                  <TableTd>{formatDate(document.date)}</TableTd>
                  <TableTd>{String(document.branch_name ?? document.source_branch_name ?? "-")}</TableTd>
                  <TableTd>{String(document.party_name ?? "-")}</TableTd>
                  <TableTd fw={800}>{formatCurrency(document.total_ttc)}</TableTd>
                  <TableTd>{getStatusLabel(document.status)}</TableTd>
                  <TableTd>
                    <Group justify={locale === "ar" ? "flex-start" : "flex-end"}>
                      <Menu position={locale === "ar" ? "bottom-start" : "bottom-end"} shadow="md" width={210}>
                        <MenuTarget>
                          <ActionIcon variant="subtle" color="gray" radius="xl" size="lg">
                            <MoreHorizontal size={16} />
                          </ActionIcon>
                        </MenuTarget>
                        <MenuDropdown>
                          <MenuItem
                            component={Link}
                            href={`/${slug}/${document.id}/edit`}
                            leftSection={<Eye size={15} />}
                          >
                            {document.status === "brouillon"
                              ? dict.common.edit
                              : (locale === "ar" ? "عرض التفاصيل" : "Consulter")}
                          </MenuItem>
                          <MenuItem
                            component={Link}
                            href={`/print/${printKind}/${document.id}`}
                            target="_blank"
                            leftSection={<Printer size={15} />}
                          >
                            {locale === "ar" ? "طباعة / PDF" : "Imprimer / PDF"}
                          </MenuItem>
                        </MenuDropdown>
                      </Menu>
                    </Group>
                  </TableTd>
                </TableTr>
              ))
            )}
          </TableTbody>
        </Table>
      </Paper>
    </Stack>
  );
}
