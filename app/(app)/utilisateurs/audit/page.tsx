import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { formatDateLong } from "@/lib/utils";

export default async function AuditPage() {
  await requireAdmin();
  await requireFeature("utilisateurs");
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);
  const logs = getAuditLogs(500);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={locale === "ar" ? "سجل العمليات" : "Audit"}
        title={locale === "ar" ? "سجل النشاط والعمليات" : "Journal d'activité"}
        description={
          locale === "ar"
            ? "الاطلاع على جميع التغييرات، الإضافات والتعديلات المسجلة في النظام."
            : "Consultez les changements faits dans l'application."
        }
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>{dict.users.date}</TH>
              <TH>{dict.users.user}</TH>
              <TH>{dict.users.action}</TH>
              <TH>{dict.users.entity}</TH>
              <TH>{dict.users.reference}</TH>
            </tr>
          </THead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id}>
                <TD>{formatDateLong(log.timestamp)}</TD>
                <TD>{String(log.full_name ?? dict.users.systemUser)}</TD>
                <TD>{String(log.action)}</TD>
                <TD>{String(log.entity_type)}</TD>
                <TD>#{String(log.entity_id ?? "—")}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
