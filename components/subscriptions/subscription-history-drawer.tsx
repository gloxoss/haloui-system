"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
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
import { ExternalLink, History, Printer, Receipt } from "lucide-react";

import { getSubscriptionInvoicesAction } from "@/app/actions";
import { useTranslation } from "@/lib/i18n";
import { type SubscriptionInvoiceRecord, type SubscriptionItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function SubscriptionHistoryDrawer({
  subscription,
  opened,
  onClose,
}: {
  subscription: SubscriptionItem | null;
  opened: boolean;
  onClose: () => void;
}) {
  const { locale } = useTranslation();
  const [invoices, setInvoices] = React.useState<SubscriptionInvoiceRecord[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (subscription && opened) {
      setLoading(true);
      getSubscriptionInvoicesAction(subscription.id)
        .then((res) => {
          setInvoices(res);
        })
        .catch((err) => {
          console.error("Erreur historique factures:", err);
          setInvoices([]);
        })
        .finally(() => setLoading(false));
    }
  }, [subscription, opened]);

  if (!subscription) return null;

  const totalFactureTtc = invoices.reduce((acc, curr) => acc + curr.montant_ttc, 0);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position={locale === "ar" ? "left" : "right"}
      size="lg"
      padding="lg"
      radius="md"
      title={
        <Group gap="xs">
          <History size={20} className="text-indigo-600" />
          <div>
            <Text fw={800} size="md">
              {locale === "ar" ? "سجل فواتير الاشتراك" : "Historique des factures émises"}
            </Text>
            <Text size="xs" c="dimmed">
              {subscription.titre} ({subscription.reference})
            </Text>
          </div>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Top Contract Summary Card */}
        <Paper radius="xl" withBorder p="md" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                {locale === "ar" ? "العميل" : "Client"}
              </Text>
              <Text fw={800} size="sm">
                {subscription.client_name}
              </Text>
              <Text size="11px" c="dimmed">
                {subscription.client_phone || "Sans téléphone"}
              </Text>
            </div>
            <div className="text-right">
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                {locale === "ar" ? "إجمالي المفوتر" : "Cumul facturé"}
              </Text>
              <Text fw={900} size="md" c="teal.7">
                {formatCurrency(totalFactureTtc)}
              </Text>
              <Text size="11px" c="dimmed">
                {invoices.length} {locale === "ar" ? "فاتورة" : "facture(s)"}
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Invoices List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader size="sm" color="indigo" />
            <Text size="xs" c="dimmed" mt="xs">
              {locale === "ar" ? "جاري تحميل الفواتير..." : "Chargement de l'historique..."}
            </Text>
          </div>
        ) : invoices.length === 0 ? (
          <Paper radius="xl" withBorder p="xl" style={{ textAlign: "center", background: "var(--surface-soft)" }}>
            <Receipt size={32} className="mx-auto text-[var(--muted)] opacity-60 mb-2" />
            <Text fw={700} size="sm">
              {locale === "ar" ? "لم يتم إصدار أي فاتورة بعد" : "Aucune facture émise"}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {locale === "ar"
                ? "سيتم تسجيل الفواتير هنا تلقائياً عند حلول الأجل أو الضغط على توليد الفاتورة."
                : "Les factures apparaîtront ici dès que les échéances périodiques seront générées."}
            </Text>
          </Paper>
        ) : (
          <Paper radius="xl" withBorder p="xs" style={{ background: "var(--card)", overflow: "hidden" }}>
            <div className="overflow-x-auto w-full">
              <Table highlightOnHover horizontalSpacing="sm" verticalSpacing="xs">
                <TableThead>
                  <TableTr>
                    <TableTh>{locale === "ar" ? "الفاتورة" : "Facture"}</TableTh>
                    <TableTh>{locale === "ar" ? "تاريخ الإصدار" : "Date émission"}</TableTh>
                    <TableTh>{locale === "ar" ? "المبلغ TTC" : "Montant TTC"}</TableTh>
                    <TableTh>{locale === "ar" ? "المتبقي" : "Reste"}</TableTh>
                    <TableTh style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                      {locale === "ar" ? "معاينة" : "Actions"}
                    </TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {invoices.map((inv) => (
                    <TableTr key={inv.id}>
                      <TableTd>
                        <Text fw={700} size="sm">
                          FAC-{inv.document_numero}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {inv.periode_label}
                        </Text>
                      </TableTd>
                      <TableTd>
                        <Text size="xs">{formatDate(inv.document_date)}</Text>
                        <Text size="10px" c="dimmed">
                          Échéance: {formatDate(inv.document_date_echeance)}
                        </Text>
                      </TableTd>
                      <TableTd>
                        <Text fw={800} size="sm">
                          {formatCurrency(inv.montant_ttc)}
                        </Text>
                      </TableTd>
                      <TableTd>
                        {inv.document_reste <= 0 ? (
                          <Badge size="xs" color="teal" variant="light">
                            {locale === "ar" ? "مسددة" : "Réglée"}
                          </Badge>
                        ) : (
                          <Badge size="xs" color="red" variant="light">
                            {formatCurrency(inv.document_reste)}
                          </Badge>
                        )}
                      </TableTd>
                      <TableTd style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                        <Group gap={6} justify={locale === "ar" ? "flex-start" : "flex-end"}>
                          <Button
                            component={Link}
                            href={`/print/facture/${inv.document_id}`}
                            target="_blank"
                            size="compact-xs"
                            variant="default"
                            radius="md"
                            leftSection={<Printer size={12} />}
                          >
                            PDF
                          </Button>
                          <Button
                            component={Link}
                            href={`/factures/${inv.document_id}/edit`}
                            size="compact-xs"
                            variant="light"
                            radius="md"
                            leftSection={<ExternalLink size={12} />}
                          >
                            {locale === "ar" ? "عرض" : "Ouvrir"}
                          </Button>
                        </Group>
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            </div>
          </Paper>
        )}

        <Button variant="default" radius="md" onClick={onClose} fullWidth mt="xs">
          {locale === "ar" ? "إغلاق" : "Fermer"}
        </Button>
      </Stack>
    </Drawer>
  );
}
