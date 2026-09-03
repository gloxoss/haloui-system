"use client";

import * as React from "react";
import { syncSelectedSalesAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { type BranchRecord, type SalesDocumentSyncCandidate } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { Check, CheckSquare, FileText, Sparkles, Square, X } from "lucide-react";

export function SyncSalesModal({
  opened,
  onClose,
  month,
  documents,
  branches,
}: {
  opened: boolean;
  onClose: () => void;
  month: string;
  documents: SalesDocumentSyncCandidate[];
  branches: BranchRecord[];
}) {
  const { locale } = useTranslation();
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set(documents.map((d) => d.id)));
  const [branchFilter, setBranchFilter] = React.useState<string>("all");
  const [isPending, startTransition] = React.useTransition();
  const [success, setSuccess] = React.useState(false);

  // Sync selectedIds whenever documents prop updates
  React.useEffect(() => {
    setSelectedIds(new Set(documents.map((d) => d.id)));
  }, [documents]);

  const filteredDocs = React.useMemo(() => {
    if (branchFilter === "all") return documents;
    return documents.filter((d) => String(d.branch_id) === branchFilter);
  }, [documents, branchFilter]);

  const toggleSelectAll = (select: boolean) => {
    if (select) {
      const allIds = new Set(selectedIds);
      filteredDocs.forEach((d) => allIds.add(d.id));
      setSelectedIds(allIds);
    } else {
      const remaining = new Set(selectedIds);
      filteredDocs.forEach((d) => remaining.delete(d.id));
      setSelectedIds(remaining);
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Calculate total for selected documents
  const selectedTotal = React.useMemo(() => {
    return documents
      .filter((d) => selectedIds.has(d.id))
      .reduce((sum, d) => sum + Number(d.total_ttc), 0);
  }, [documents, selectedIds]);

  const selectedCount = documents.filter((d) => selectedIds.has(d.id)).length;

  const handleConfirm = () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      await syncSelectedSalesAction(Array.from(selectedIds), month);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(99, 102, 241, 0.12)",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <div>
            <Text fw={800} size="md">
              {locale === "ar" ? "مزامنة المبيعات في الصندوق" : "Synchronisation granulaire des ventes"}
            </Text>
            <Text size="xs" c="dimmed">
              {locale === "ar"
                ? "اختر الفواتير وبونات التوصيل التي تريد إدراجها في حساب المداخيل"
                : "Sélectionnez les factures et bons de livraison à intégrer dans le journal de caisse"}
            </Text>
          </div>
        </Group>
      }
      size="xl"
      radius="xl"
      padding="lg"
      styles={{
        header: {
          borderBottom: "1px solid var(--border)",
          paddingBottom: "14px",
        },
      }}
    >
      <Stack gap="md" mt="sm">
        {/* Filters & Actions Bar */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              color="indigo"
              leftSection={<CheckSquare size={14} />}
              onClick={() => toggleSelectAll(true)}
              disabled={filteredDocs.length === 0}
            >
              {locale === "ar" ? "تحديد الكل" : "Tout sélectionner"}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<Square size={14} />}
              onClick={() => toggleSelectAll(false)}
              disabled={filteredDocs.length === 0}
            >
              {locale === "ar" ? "إلغاء تحديد الكل" : "Tout désélectionner"}
            </Button>
          </Group>

          <Select
            placeholder={locale === "ar" ? "تصفية حسب المحل" : "Filtrer par magasin"}
            size="xs"
            radius="md"
            style={{ width: 220 }}
            value={branchFilter}
            onChange={(v) => setBranchFilter(v || "all")}
            data={[
              { value: "all", label: locale === "ar" ? "جميع المحلات" : "Tous les magasins" },
              ...branches.map((b) => ({ value: String(b.id), label: b.name })),
            ]}
          />
        </Group>

        {/* Documents Table */}
        {filteredDocs.length === 0 ? (
          <Paper
            withBorder
            p="xl"
            radius="lg"
            style={{
              textAlign: "center",
              background: "var(--surface-soft)",
              borderColor: "var(--border)",
            }}
          >
            <Stack align="center" gap="xs">
              <FileText size={32} className="text-gray-400" />
              <Text fw={700} size="sm">
                {locale === "ar"
                  ? "لا توجد فواتير أو بونات توصيل مسجلة لهذا الشهر"
                  : "Aucune facture ou bon de livraison éligible pour ce mois"}
              </Text>
              <Text size="xs" c="dimmed">
                {locale === "ar"
                  ? "تأكد من إنشاء فواتير أو بونات وتعيين المحل التابع لها."
                  : "Assurez-vous que les pièces commerciales sont bien rattachées à un magasin."}
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Paper
            withBorder
            radius="lg"
            style={{
              maxHeight: 380,
              overflowY: "auto",
              borderColor: "var(--border)",
            }}
          >
            <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
              <TableThead style={{ background: "var(--surface-soft)", position: "sticky", top: 0, zIndex: 1 }}>
                <TableTr>
                  <TableTh style={{ width: 44 }}>
                    <Checkbox
                      checked={
                        filteredDocs.length > 0 &&
                        filteredDocs.every((d) => selectedIds.has(d.id))
                      }
                      indeterminate={
                        filteredDocs.some((d) => selectedIds.has(d.id)) &&
                        !filteredDocs.every((d) => selectedIds.has(d.id))
                      }
                      onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
                      size="xs"
                    />
                  </TableTh>
                  <TableTh>{locale === "ar" ? "الوثيقة" : "Document"}</TableTh>
                  <TableTh>{locale === "ar" ? "التاريخ" : "Date"}</TableTh>
                  <TableTh>{locale === "ar" ? "المحل" : "Magasin"}</TableTh>
                  <TableTh>{locale === "ar" ? "الزبون" : "Client"}</TableTh>
                  <TableTh style={{ textAlign: "right" }}>{locale === "ar" ? "المبلغ TTC" : "Montant TTC"}</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {filteredDocs.map((doc) => {
                  const isChecked = selectedIds.has(doc.id);
                  return (
                    <TableTr
                      key={doc.id}
                      onClick={() => toggleOne(doc.id)}
                      style={{
                        cursor: "pointer",
                        background: isChecked ? "rgba(99, 102, 241, 0.03)" : undefined,
                      }}
                    >
                      <TableTd onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleOne(doc.id)}
                          size="xs"
                        />
                      </TableTd>
                      <TableTd>
                        <Group gap={6}>
                          <Badge
                            size="xs"
                            variant="light"
                            color={doc.type === "facture" ? "blue" : "teal"}
                          >
                            {doc.type === "facture" ? "FAC" : "BL"}
                          </Badge>
                          <Text size="xs" fw={700}>
                            #{doc.numero}
                          </Text>
                        </Group>
                      </TableTd>
                      <TableTd>
                        <Text size="xs" c="dimmed">
                          {formatDate(doc.date)}
                        </Text>
                      </TableTd>
                      <TableTd>
                        <Text size="xs" fw={600}>
                          {doc.branch_name}
                        </Text>
                      </TableTd>
                      <TableTd>
                        <Text size="xs" truncate style={{ maxWidth: 160 }}>
                          {doc.party_name}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text size="xs" fw={800} c="indigo">
                          {formatCurrency(doc.total_ttc)}
                        </Text>
                      </TableTd>
                    </TableTr>
                  );
                })}
              </TableTbody>
            </Table>
          </Paper>
        )}

        {/* Live Summary Footer */}
        <Paper
          withBorder
          p="md"
          radius="lg"
          style={{
            background: "var(--surface-soft)",
            borderColor: "var(--border)",
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <div>
              <Text size="xs" c="dimmed" fw={600}>
                {locale === "ar" ? "المجموع المحدد للتسجيل" : "Total sélectionné à synchroniser"}
              </Text>
              <Group gap="xs" align="baseline">
                <Text size="lg" fw={900} c="indigo">
                  {formatCurrency(selectedTotal)}
                </Text>
                <Text size="xs" c="dimmed">
                  ({selectedCount} {locale === "ar" ? "وثائق" : selectedCount > 1 ? "documents" : "document"})
                </Text>
              </Group>
            </div>

            <Group gap="xs">
              <Button variant="default" radius="xl" size="sm" onClick={onClose}>
                {locale === "ar" ? "إلغاء" : "Annuler"}
              </Button>
              <Button
                color="indigo"
                radius="xl"
                size="sm"
                loading={isPending}
                disabled={selectedCount === 0}
                onClick={handleConfirm}
                leftSection={success ? <Check size={16} /> : <Sparkles size={16} />}
                style={{ fontWeight: 700 }}
              >
                {success
                  ? (locale === "ar" ? "تمت المزامنة بنجاح !" : "Synchronisé avec succès !")
                  : (locale === "ar" ? "تأكيد المزامنة" : "Confirmer la synchronisation")}
              </Button>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Modal>
  );
}
