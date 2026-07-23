import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession, userNeedsPasswordReset } from "@/lib/auth";
import { getCompany, getFeatureFlags, getThemeSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  if (userNeedsPasswordReset(session.user.id)) {
    redirect("/premier-mot-de-passe");
  }

  const company = getCompany();
  const featureFlags = getFeatureFlags();
  const themeSettings = getThemeSettings();

  return (
    <AppShell
      companyName={company.name}
      userName={session.user.name ?? session.user.username}
      userRole={session.user.role}
      logoPath={company.logo_path}
      featureFlags={featureFlags}
      themeSettings={themeSettings}
    >
      {children}
    </AppShell>
  );
}
