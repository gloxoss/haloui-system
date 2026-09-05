"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Group,
  Modal,
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
import { CheckCircle2, Play, Printer, Zap } from "lucide-react";

import { generateBatchDueInvoicesAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { type SubscriptionItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function SubscriptionBatchModal({
  opened,
  onClose,
  dueSubscriptions,
  onSuccess,
}: {
  opened: boolean;
  onClose: () => void;
  dueSubscriptions: SubscriptionItem[];
  onSuccess: () => void;
}) {
  const { locale } = useTranslation();
  const [running, setRunning] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<{
    generatedCount: number;
    invoices: Array<{ id: number; numero: number; subscriptionId: number; clientName: string; totalTtc: number }>;
  } | null>(null);

  React.useEffect(() => {
    if (opened) {
      setResult(null);
    }
  }, [opened]);

  const totalDueAmount = dueSubscriptions.reduce((acc, curr) => acc + curr.total_ttc, 0);

  const handleRunBatch = async () => {
    try {
      setRunning(true);
      const res = await generateBatchDueInvoicesAction();
      setResult(res);
      onSuccess();
    } catch (err) {
      console.error("Erreur génération groupée:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Zap size={20} className="text-amber-500" />
          <Text fw={800} size="md">
            {locale === "ar"
              ? "التوليد الجماعي لفواتير الاشتراكات المستحقة"
              : "Facturation groupée des échéances échues"}
          </Text>
        </Group>
      }
      size="lg"
      radius="xl"
      padding="lg"
    >
      <Stack gap="md">
        {result ? (
          <Stack gap="md">
            <Paper radius="xl" withBorder p="md" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "#10b981" }}>
              <Group gap="sm">
                <CheckCircle2 size={28} className="text-emerald-600" />
                <div>
                  <Text fw={800} size="sm" c="emerald.8">
                    {locale === "ar"
                      ? `تم بنجاح إصدار ${result.generatedCount} فاتورة رسمية!`
                      : `Génération réussie : ${result.generatedCount} facture(s) officielle(s) créée(s) !`}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {locale === "ar"
                      ? "تم ترحيل تواريخ الفواتير القادمة تلقائياً في جميع العقود المعنية."
                      : "Les prochaines échéances de tous les contrats ont été automatiquement avancées."}
                  </Text>
                </div>
              </Group>
            </Paper>

            <Paper radius="xl" withBorder p="xs" style={{ background: "var(--card)" }}>
              <Table highlightOnHover horizontalSpacing="sm" verticalSpacing="xs">
                <TableThead>
                  <TableTr>
                    <TableTh>{locale === "ar" ? "الفاتورة" : "Facture"}</TableTh>
                    <TableTh>{locale === "ar" ? "العميل" : "Client"}</TableTh>
                    <TableTh>{locale === "ar" ? "المبلغ" : "Montant"}</TableTh>
                    <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                      {locale === "ar" ? "طباعة" : "Imprimer"}
                    </TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {result.invoices.map((inv) => (
                    <TableTr key={inv.id}>
                      <TableTd fw={700}>FAC-{inv.numero}</TableTd>
                      <TableTd>{inv.clientName}</TableTd>
                      <TableTd fw={800}>{formatCurrency(inv.totalTtc)}</TableTd>
                      <TableTd style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                        <Button
                          component={Link}
                          href={`/print/facture/${inv.id}`}
                          target="_blank"
                          size="compact-xs"
                          variant="light"
                          radius="md"
                          leftSection={<Printer size={12} />}
                        >
                          PDF
                        </Button>
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            </Paper>

            <Button variant="default" radius="md" onClick={onClose} fullWidth>
              {locale === "ar" ? "تم، إغلاق" : "Fermer"}
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            {dueSubscriptions.length === 0 ? (
              <Paper radius="xl" withBorder p="xl" style={{ textAlign: "center", background: "var(--surface-soft)" }}>
                <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
                <Text fw={700} size="sm">
                  {locale === "ar" ? "جميع الاشتراكات مفوترة في موعدها" : "Aucune échéance en attente"}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {locale === "ar"
                    ? "لا توجد أي عقود اشتراك وصلت تاريخ استحقاقها الحالي."
                    : "Tous les abonnements programmés sont à jour de facturation."}
                </Text>
              </Paper>
            ) : (
              <>
                <Paper radius="xl" withBorder p="md" style={{ background: "var(--card)" }}>
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        {locale === "ar" ? "العقود المستحقة" : "Contrats échus à facturer"}
                      </Text>
                      <Text size="xl" fw={900}>
                        {dueSubscriptions.length} {locale === "ar" ? "عقد" : "contrat(s)"}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        {locale === "ar" ? "المجموع الكلي" : "Volume total TTC"}
                      </Text>
                      <Text size="xl" fw={900} c="teal.7">
                        {formatCurrency(totalDueAmount)}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper radius="xl" withBorder p="xs" style={{ background: "var(--card)", maxHeight: 300, overflowY: "auto" }}>
                  <Table highlightOnHover horizontalSpacing="sm" verticalSpacing="xs">
                    <TableThead>
                      <TableTr>
                        <TableTh>{locale === "ar" ? "العقد" : "Contrat"}</TableTh>
                        <TableTh>{locale === "ar" ? "العميل" : "Client"}</TableTh>
                        <TableTh>{locale === "ar" ? "تاريخ الاستحقاق" : "Échéance"}</TableTh>
                        <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                          {locale === "ar" ? "المبلغ TTC" : "Montant TTC"}
                        </TableTh>
                      </TableTr>
                    </TableThead>
                    <TableTbody>
                      {dueSubscriptions.map((sub) => (
                        <TableTr key={sub.id}>
                          <TableTd>
                            <Text fw={700} size="xs">
                              {sub.titre}
                            </Text>
                            <Text size="10px" c="dimmed">
                              {sub.reference}
                            </Text>
                          </TableTd>
                          <TableTd>
                            <Text size="xs">{sub.client_name}</Text>
                          </TableTd>
                          <TableTd>
                            <Badge size="xs" color="red" variant="light">
                              {formatDate(sub.prochaine_echeance)}
                            </Badge>
                          </TableTd>
                          <TableTd style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                            <Text fw={800} size="xs">
                              {formatCurrency(sub.total_ttc)}
                            </Text>
                          </TableTd>
                        </TableTr>
                      ))}
                    </TableTbody>
                  </Table>
                </Paper>

                <Group justify="flex-end" gap="xs">
                  <Button variant="default" radius="md" onClick={onClose} disabled={running}>
                    {locale === "ar" ? "إلغاء" : "Annuler"}
                  </Button>
                  <Button
                    color="teal"
                    radius="md"
                    leftSection={<Play size={14} />}
                    loading={running}
                    onClick={handleRunBatch}
                  >
                    {locale === "ar"
                      ? `توليد ${dueSubscriptions.length} فاتورة دفعة واحدة`
                      : `Générer les ${dueSubscriptions.length} facture(s) en 1 clic`}
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
