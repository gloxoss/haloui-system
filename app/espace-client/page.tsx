import { redirect } from "next/navigation";
import { getClientByPortalToken, getClientPortalData } from "@/lib/data";
import { getPortalClientSession, setPortalClientSession } from "@/lib/portal-auth";
import { PortalDashboard } from "@/components/portal/portal-dashboard";

export const dynamic = "force-dynamic";

export default async function EspaceClientPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  // If magic token is supplied in URL, route through auth handler to set cookie and sanitize URL
  if (params.token) {
    redirect(`/api/portal/auth?token=${encodeURIComponent(params.token)}`);
  }

  const session = await getPortalClientSession();
  if (!session) {
    redirect("/espace-client/login");
  }

  const portalData = getClientPortalData(session.clientId);
  if (!portalData) {
    redirect("/espace-client/login");
  }

  return <PortalDashboard data={portalData} />;
}
