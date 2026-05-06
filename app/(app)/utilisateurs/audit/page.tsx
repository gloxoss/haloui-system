import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { formatDateLong } from "@/lib/utils";

export default async function AuditPage() {
  await requireAdmin();
  await requireFeature("utilisateurs");
  const logs = getAuditLogs(500);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Audit"
        title="Journal d'activité"
        description="Consultez les changements faits dans l'application."
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Utilisateur</TH>
              <TH>Action</TH>
              <TH>Entité</TH>
              <TH>Référence</TH>
            </tr>
          </THead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id}>
                <TD>{formatDateLong(log.timestamp)}</TD>
                <TD>{String(log.full_name ?? "Système")}</TD>
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
