"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import {
  Clock,
  FileText,
  History,
  Mail,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";

import { getRelancesHistoryAction } from "@/app/actions";
import { RELANCE_PALIER_LABELS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { type FactureImpayeeItem, type RelanceLogRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function RelanceHistoryDrawer({
  invoice,
  opened,
  onClose,
}: {
  invoice: FactureImpayeeItem | null;
  opened: boolean;
  onClose: () => void;
}) {
  const { locale } = useTranslation();
  const [logs, setLogs] = React.useState<RelanceLogRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedLogId, setExpandedLogId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (invoice && opened) {
      setLoading(true);
      getRelancesHistoryAction(invoice.id)
        .then((data) => {
          setLogs(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [invoice, opened]);

  if (!invoice) return null;

  const getChannelIcon = (canal: string) => {
    switch (canal) {
      case "whatsapp":
        return <MessageCircle size={14} color="#25D366" />;
      case "email":
        return <Mail size={14} color="#0284c7" />;
      case "appel":
        return <Phone size={14} color="#ea580c" />;
      default:
        return <FileText size={14} />;
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position={locale === "ar" ? "left" : "right"}
      size="md"
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="indigo" variant="light">
            <History size={16} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              {locale === "ar" ? "سجل التذكيرات والإنذارات" : "Historique des Relances"}
            </Text>
            <Text size="xs" c="dimmed">
              Facture n° FAC-{invoice.numero} • {invoice.client_name}
            </Text>
          </div>
        </Group>
      }
      styles={{
        header: {
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
        },
        body: {
          paddingTop: "16px",
          display: "flex",
          flexDirection: "column",
          height: "calc(100% - 60px)",
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, overflow: "hidden" }}>
        {/* Invoice Summary Box */}
        <Paper
          p="sm"
          radius="md"
          withBorder
          style={{
            background: "var(--surface-soft)",
            borderColor: "var(--border)",
          }}
        >
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">
                {locale === "ar" ? "الباقي للاستخلاص" : "Reste à payer"}
              </Text>
              <Text fw={800} size="md" c="red.6">
                {formatCurrency(invoice.reste)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {locale === "ar" ? "عدد التذكيرات" : "Total relances"}
              </Text>
              <Badge variant="filled" color="indigo">
                {logs.length}
              </Badge>
            </div>
          </Group>
        </Paper>

        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                {locale === "ar" ? "جاري تحميل السجل..." : "Chargement de l'historique..."}
              </Text>
            </Group>
          ) : logs.length === 0 ? (
            <Paper p="xl" radius="md" withBorder style={{ textAlign: "center", borderColor: "var(--border)" }}>
              <Clock size={32} style={{ margin: "0 auto 12px", color: "var(--muted)" }} />
              <Text size="sm" fw={600}>
                {locale === "ar" ? "لا توجد أي تذكيرات مسجلة بعد" : "Aucune relance effectuée"}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {locale === "ar"
                  ? "يمكنك إرسال أول تذكير بالضغط على زر 'Relancer' في جدول الفواتير."
                  : "Utilisez le bouton 'Relancer' pour envoyer un rappel par WhatsApp ou Email."}
              </Text>
            </Paper>
          ) : (
            <Timeline active={0} bulletSize={26} lineWidth={2}>
              {logs.map((log) => {
                const palierMeta = RELANCE_PALIER_LABELS[log.palier] || RELANCE_PALIER_LABELS.prevenance;
                const isExpanded = expandedLogId === log.id;

                return (
                  <Timeline.Item
                    key={log.id}
                    bullet={getChannelIcon(log.canal)}
                    title={
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={6}>
                          <Badge size="sm" color={palierMeta.color} variant="light">
                            {palierMeta.badge}
                          </Badge>
                          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                            {log.canal}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatDate(log.date_envoi)}
                        </Text>
                      </Group>
                    }
                  >
                    <Paper
                      mt="xs"
                      p="xs"
                      radius="sm"
                      withBorder
                      style={{
                        background: "var(--surface-soft)",
                        borderColor: "var(--border)",
                        fontSize: "12px",
                      }}
                    >
                      <Group justify="space-between" mb={4}>
                        <Group gap={4}>
                          <User size={12} color="var(--muted)" />
                          <Text size="xs" c="dimmed">
                            {log.created_by_name || "Système"}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Destinataire : {log.destinataire}
                        </Text>
                      </Group>

                      {log.notes && (
                        <Paper p={6} radius="xs" mb={6} style={{ background: "rgba(234, 88, 12, 0.08)" }}>
                          <Text size="xs" c="orange.8" fw={500}>
                            Note : {log.notes}
                          </Text>
                        </Paper>
                      )}

                      <div>
                        <Text
                          size="xs"
                          lineClamp={isExpanded ? undefined : 2}
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {log.message_envoye}
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="gray"
                          mt={4}
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          {isExpanded
                            ? locale === "ar"
                              ? "إخفاء النص"
                              : "Réduire"
                            : locale === "ar"
                              ? "عرض كامل الرسالة"
                              : "Voir le message complet"}
                        </Button>
                      </div>
                    </Paper>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          )}
        </ScrollArea>
      </Stack>
    </Drawer>
  );
}
