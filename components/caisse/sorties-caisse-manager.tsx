"use client";

import * as React from "react";
import Image from "next/image";
import { deleteSortieCaisseAction, saveSortieCaisseAction } from "@/app/actions";
import { AppDateInput } from "@/components/ui/app-date-input";
import { UploadField } from "@/components/upload-field";
import { type BranchRecord, type SortieCaisseRecord } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate, todayIso } from "@/lib/utils";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ArrowDownRight,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  Receipt,
  Store,
  Trash2,
  TrendingDown,
} from "lucide-react";

const PRESET_MOTIFS = [
  "Achat fournitures de bureau",
  "Frais de transport / livraison",
  "Avance sur salaire",
  "Entretien & Réparation",
  "Paiement fournisseur comptant",
  "Produits de nettoyage",
  "Frais de carburant",
  "Autre dépense diverse",
];

export function SortiesCaisseManager({
  branches,
  sorties,
  currentMonth,
}: {
  branches: BranchRecord[];
  sorties: SortieCaisseRecord[];
  currentMonth: string;
}) {
  const { t, locale } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = React.useState<string>("all");
  const [isPending, startTransition] = React.useTransition();

  // Filtered sorties
  const filteredSorties = React.useMemo(() => {
    if (selectedBranchFilter === "all") return sorties;
    return sorties.filter((s) => String(s.branch_id) === selectedBranchFilter);
  }, [sorties, selectedBranchFilter]);

  const totalSorties = React.useMemo(() => {
    return filteredSorties.reduce((sum, s) => sum + Number(s.montant), 0);
  }, [filteredSorties]);

  return (
    <div className="grid gap-4">
      {/* Header with Stats & Add Button */}
      <Card
        withBorder
        radius="lg"
        p="md"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="red">
              <TrendingDown size={20} />
            </ThemeIcon>
            <div>
              <Group gap="xs">
                <Title order={3} size="h4" style={{ fontWeight: 800 }}>
                  {locale === "ar" ? "مصاريف وخرجات الصندوق (Sorties de Caisse)" : "Sorties de Caisse & Dépenses du Magasin"}
                </Title>
                <Badge variant="light" color="red" size="sm">
                  {filteredSorties.length} {locale === "ar" ? "مصاريف" : (filteredSorties.length > 1 ? "sorties" : "sortie")}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {locale === "ar"
                  ? "سجل مصاريف لاكيس اليومية مع الصور، التوصيلات، وأسباب الخروج."
                  : "Registre des dépenses de caisse quotidiennes avec reçus, justificatifs et motifs."}
              </Text>
            </div>
          </Group>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select
              size="xs"
              radius="md"
              className="w-full sm:w-[180px]"
              data={[
                { value: "all", label: locale === "ar" ? "جميع المحلات" : "Tous les magasins" },
                ...branches.map((b) => ({ value: String(b.id), label: b.name })),
              ]}
              value={selectedBranchFilter}
              onChange={(val) => setSelectedBranchFilter(val || "all")}
            />

            <Button
              size="sm"
              radius="md"
              color="red"
              leftSection={<Plus size={16} />}
              onClick={open}
              style={{ fontWeight: 700 }}
              className="w-full sm:w-auto"
            >
              {locale === "ar" ? "+ تسجيل مصاريف جديدة" : "+ Nouvelle Sortie de Caisse"}
            </Button>
          </div>
        </Group>

        <Divider my="sm" />

        {/* Total Banner */}
        <Group justify="space-between" wrap="wrap" px="xs">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            {locale === "ar" ? `مجموع المصاريف ديال الشهر (${currentMonth})` : `Total des sorties du mois (${currentMonth})`}
          </Text>
          <Text size="xl" fw={900} c="red">
            {formatCurrency(totalSorties)}
          </Text>
        </Group>
      </Card>

      {/* Sorties Table */}
      <Card
        withBorder
        radius="lg"
        p={0}
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          overflow: "hidden",
        }}
        className="min-w-0"
      >
        <div className="overflow-x-auto w-full min-w-0">
          <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 640 }}>
            <Table.Thead className="bg-[var(--surface-soft,rgba(0,0,0,0.02))]">
              <Table.Tr className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <Table.Th>{t.documents.date}</Table.Th>
                <Table.Th>{t.documents.magasin}</Table.Th>
                <Table.Th>{locale === "ar" ? "سبب الخروج" : "Motif de la sortie"}</Table.Th>
                <Table.Th>{locale === "ar" ? "المستفيد" : "Bénéficiaire"}</Table.Th>
                <Table.Th style={{ textAlign: locale === "ar" ? "left" : "right" }}>{t.common.total}</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>{locale === "ar" ? "التوصيل" : "Justificatif"}</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>{t.common.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredSorties.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: "center", padding: "32px 16px" }}>
                    <Text size="sm" c="dimmed">
                      {locale === "ar" ? "ما كاين حتى خروج أموال مسجل لهاد الشهر." : "Aucune sortie de caisse enregistrée pour ce mois."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredSorties.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td className="font-semibold">{formatDate(s.date)}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color="blue">
                        {s.branch_name || `Magasin #${s.branch_id}`}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div className="font-bold text-[13px]">{s.motif}</div>
                      {s.notes ? (
                        <div className="text-xs text-[var(--muted)]">{s.notes}</div>
                      ) : null}
                    </Table.Td>
                    <Table.Td className="text-xs text-[var(--muted)]">
                      {s.beneficiaire || "—"}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }} className="font-extrabold text-rose-600 text-[14px]">
                      - {formatCurrency(s.montant)}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      {s.preuve_path ? (
                        <Tooltip label="Voir le justificatif / reçu">
                          <ActionIcon
                            variant="light"
                            color="indigo"
                            size="sm"
                            radius="md"
                            onClick={() => setPreviewImage(s.preuve_path)}
                          >
                            <ImageIcon size={15} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <Badge size="xs" color="gray" variant="subtle">
                          Aucun
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <form
                        action={(formData) => {
                          if (window.confirm("Confirmer la suppression de cette sortie de caisse ?")) {
                            startTransition(async () => {
                              await deleteSortieCaisseAction(formData);
                            });
                          }
                        }}
                      >
                        <input type="hidden" name="id" value={s.id} />
                        <Tooltip label="Supprimer cette sortie">
                          <ActionIcon
                            type="submit"
                            variant="subtle"
                            color="red"
                            size="sm"
                            loading={isPending}
                          >
                            <Trash2 size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </form>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* Modal: New Sortie de Caisse */}
      <Modal
        opened={opened}
        onClose={close}
        title={
          <Title order={4}>
            {locale === "ar" ? "تسجيل خروج أموال من لاكيس" : "Enregistrer une Sortie de Caisse"}
          </Title>
        }
        size="lg"
        radius="lg"
      >
        <form
          action={(formData) => {
            startTransition(async () => {
              await saveSortieCaisseAction(formData);
              close();
            });
          }}
        >
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={t.documents.magasin}
                name="branch_id"
                data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                defaultValue={branches[0] ? String(branches[0].id) : ""}
                required
              />

              <AppDateInput
                label={locale === "ar" ? "تاريخ المصروف" : "Date de la dépense"}
                name="date"
                defaultValue={todayIso()}
                clearable={false}
              />
            </SimpleGrid>

            <div>
              <Text size="xs" fw={700} mb={4}>
                {locale === "ar" ? "المبلغ المخرج (درهم)" : "Montant de la sortie (MAD)"}
              </Text>
              <input
                type="number"
                step="0.01"
                min="0.1"
                name="montant"
                required
                placeholder="0.00"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[16px] font-black text-rose-600 focus:border-red-500 focus:outline-none"
              />
            </div>

            <Select
              label={locale === "ar" ? "سبب المصروف الرئيسي" : "Motif principal de la dépense"}
              name="motif"
              data={
                locale === "ar"
                  ? [
                      "تسبيق على الصالير (Avance)",
                      "سلعة وفورنيسور كاش",
                      "مصاريف النقل والتوصيل",
                      "إصلاح وصيانة",
                      "لوازم التنظيف والمكتب",
                      "مصاريف محروقات ومازوط",
                      "مصاريف أخرى متنوعة",
                    ]
                  : PRESET_MOTIFS
              }
              defaultValue={
                locale === "ar"
                  ? "تسبيق على الصالير (Avance)"
                  : PRESET_MOTIFS[0]
              }
              required
            />

            <div>
              <Text size="xs" fw={700} mb={4}>
                {locale === "ar" ? "المستفيد (اختياري)" : "Bénéficiaire (Optionnel)"}
              </Text>
              <input
                type="text"
                name="beneficiaire"
                placeholder={
                  locale === "ar"
                    ? "مثال: سمية الليفرور، صباغ، مستخدم..."
                    : "Ex : Nom du livreur, électricien, employé..."
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <UploadField
              name="preuve_path"
              folder="caisse"
              label={
                locale === "ar"
                  ? "صورة التوصيل أو وصل الأداء أو الفاتورة"
                  : "Photo du justificatif / Facturette / Ticket de caisse"
              }
            />

            <div>
              <Text size="xs" fw={700} mb={4}>
                {locale === "ar" ? "ملاحظات أو تفاصيل إضافية" : "Notes ou détails complémentaires"}
              </Text>
              <textarea
                name="notes"
                rows={2}
                placeholder={
                  locale === "ar"
                    ? "تفاصيل إضافية حول المصروف..."
                    : "Détails sur l'achat ou le motif..."
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 text-[13px] text-[var(--foreground)] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <Divider my="xs" />

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={close}>
                {t.common.cancel}
              </Button>
              <Button type="submit" color="red" loading={isPending} leftSection={<Plus size={16} />}>
                {locale === "ar" ? "تسجيل الخروج" : "Enregistrer la Sortie"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal: Receipt Preview */}
      <Modal
        opened={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Justificatif de dépense"
        size="md"
        radius="lg"
      >
        {previewImage ? (
          <div className="flex flex-col items-center justify-center p-2">
            <div className="relative h-[350px] w-full overflow-hidden rounded-xl bg-black/5">
              <Image
                src={previewImage}
                alt="Justificatif"
                fill
                className="object-contain"
              />
            </div>
            <Button
              component="a"
              href={previewImage}
              target="_blank"
              variant="subtle"
              size="xs"
              mt="sm"
              leftSection={<ExternalLink size={14} />}
            >
              Ouvrir dans un nouvel onglet
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
