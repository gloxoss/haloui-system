import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession, userNeedsPasswordReset } from "@/lib/auth";
import { getFeatureFlags, getThemeSettings } from "@/lib/data";
import { getActiveCompany, getActiveCompanyId, getAllCompanies } from "@/lib/company";

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

  const company = await getActiveCompany();
  const allCompanies = getAllCompanies();
  const activeCompanyId = await getActiveCompanyId();
  const featureFlags = getFeatureFlags();
  const cookieStore = await cookies();
  const themeSettings = getThemeSettings();
  const activePreset = (cookieStore.get("app_theme")?.value as typeof themeSettings.preset) || themeSettings.preset;
  const activeDensity = (cookieStore.get("app_density")?.value as typeof themeSettings.density) || themeSettings.density;
  const cookieCustomColors = cookieStore.get("app_custom_colors")?.value;
  let parsedCustomColors = themeSettings.customColors;
  if (cookieCustomColors) {
    try {
      parsedCustomColors = JSON.parse(cookieCustomColors);
    } catch {}
  }
  const activeThemeSettings = {
    preset: activePreset,
    density: activeDensity,
    customColors: parsedCustomColors,
  };

  return (
    <AppShell
      companyName={company.name}
      companies={allCompanies}
      activeCompanyId={activeCompanyId}
      userName={session.user.name ?? session.user.username}
      userRole={session.user.role}
      logoPath={company.logo_path}
      featureFlags={featureFlags}
      themeSettings={activeThemeSettings}
    >
      {children}
    </AppShell>
  );
}
