import { redirect } from "next/navigation";
import { getEmployePortalSession, getEmployePortalData } from "@/lib/employe-portal-auth";
import { PortalEmployeDashboard } from "@/components/portal-employe/portal-employe-dashboard";

export const dynamic = "force-dynamic";

export default async function EspaceEmployePage() {
  const session = await getEmployePortalSession();

  if (!session) {
    redirect("/espace-employe/login");
  }

  const data = getEmployePortalData(session.employeId);

  if (!data) {
    redirect("/espace-employe/login");
  }

  return <PortalEmployeDashboard data={data} />;
}
