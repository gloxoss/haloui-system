"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ActionIcon,
  AppShell as MantineAppShell,
  Burger,
  Divider,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from "lucide-react";

import { CommandPalette } from "@/components/command-palette";
import { CompanySwitcher } from "@/components/company-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTranslation } from "@/lib/i18n";
import { type CompanyRecord, type FeatureFlags, type Role, type ThemeSettings } from "@/lib/types";

export function AppShell({
  children,
  companyName,
  companies = [],
  activeCompanyId = 1,
  userName,
  userRole,
  logoPath,
  featureFlags,
  themeSettings,
}: {
  children: React.ReactNode;
  companyName: string;
  companies?: CompanyRecord[];
  activeCompanyId?: number;
  userName: string;
  userRole: Role;
  logoPath: string;
  featureFlags: FeatureFlags;
  themeSettings: ThemeSettings;
}) {
  const { t, locale, isRtl } = useTranslation();
  const [mobileOpened, { toggle, close }] = useDisclosure(false);
  const [desktopCollapsed, setDesktopCollapsed] = useLocalStorage<boolean>({
    key: "app-sidebar-collapsed",
    defaultValue: false,
    getInitialValueInEffect: true,
  });

  const todayLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const roleLabel =
    userRole === "superadmin"
      ? (locale === "ar" ? "المسؤول العام" : "Superadmin")
      : userRole === "admin"
        ? (locale === "ar" ? "مدير النظام" : "Administrateur")
        : (locale === "ar" ? "مستخدم" : "Utilisateur");

  const customStyles =
    themeSettings.preset === "custom" && themeSettings.customColors
      ? ({
          "--accent": themeSettings.customColors.accent,
          "--accent-soft": themeSettings.customColors.accentSoft,
          "--accent-foreground": "#ffffff",
          "--ring": `${themeSettings.customColors.accent}33`,
          "--sidebar-bg": themeSettings.customColors.sidebarBg,
          "--background": themeSettings.customColors.background,
        } as React.CSSProperties)
      : undefined;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <MantineAppShell
        header={{ height: { base: 64, sm: 74, lg: 84 } }}
        navbar={{
          width: desktopCollapsed ? 82 : 280,
          breakpoint: "lg",
          collapsed: { mobile: !mobileOpened },
        }}
        padding={0}
        styles={{
          main: {
            background: "var(--background)",
            paddingTop: "calc(var(--app-shell-header-offset) + clamp(8px, 1.8vw, 16px))",
            paddingLeft: isRtl ? "clamp(10px, 2.5vw, 20px)" : "calc(var(--app-shell-navbar-offset) + clamp(10px, 2.5vw, 20px))",
            paddingRight: isRtl ? "calc(var(--app-shell-navbar-offset) + clamp(10px, 2.5vw, 20px))" : "clamp(10px, 2.5vw, 20px)",
            paddingBottom: "32px",
            minHeight: "100dvh",
            transition: "padding 220ms cubic-bezier(0.2, 0, 0, 1)",
          },
          header: {
            background: "transparent",
            borderBottom: "none",
            padding: "clamp(6px, 1.5vw, 14px) clamp(10px, 2.5vw, 20px) 0 clamp(10px, 2.5vw, 20px)",
          },
          navbar: {
            background: "transparent",
            borderInlineEnd: "none",
            padding: isRtl ? "12px 12px 12px 0" : "12px 0 12px 12px",
            transition: "width 220ms cubic-bezier(0.2, 0, 0, 1)",
          },
        }}
      >
        <MantineAppShell.Header>
          <Paper
            radius="xl"
            shadow="sm"
            withBorder
            px={{ base: "xs", sm: "md", lg: "lg" }}
            py={4}
            h={{ base: 52, sm: 60, lg: 68 }}
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" style={{ width: "100%" }}>
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Burger
                  opened={mobileOpened}
                  onClick={toggle}
                  hiddenFrom="lg"
                  size="sm"
                  aria-label="Ouvrir le menu"
                />

                <Tooltip
                  label={desktopCollapsed ? "Agrandir le menu" : "Réduire le menu"}
                  position="bottom"
                  withArrow
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="md"
                    visibleFrom="lg"
                    onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                    aria-label={desktopCollapsed ? "Agrandir le menu" : "Réduire le menu"}
                  >
                    {desktopCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                  </ActionIcon>
                </Tooltip>

                <Stack gap={1} visibleFrom="sm" style={{ minWidth: 0 }}>
                  <Text size="11px" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.12em" }} truncate>
                    {todayLabel}
                  </Text>
                  <Text fw={800} size="lg" style={{ letterSpacing: "-0.03em", lineHeight: 1.2 }} truncate>
                    {companyName}
                  </Text>
                </Stack>
              </Group>

              <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                {featureFlags.multi_societes && (
                  <CompanySwitcher companies={companies} activeCompanyId={activeCompanyId} />
                )}
                <CommandPalette />
                {featureFlags.multi_langue && (
                  <LanguageSwitcher variant="button" size="xs" />
                )}

                <Menu position={isRtl ? "bottom-start" : "bottom-end"} shadow="md" width={220}>
                  <Menu.Target>
                    <UnstyledButton
                      className="transition hover:opacity-90"
                      style={{
                        border: "1px solid var(--border-strong)",
                        background: "var(--card)",
                        borderRadius: 16,
                        padding: "6px 8px",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <Group gap={6} wrap="nowrap">
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <Stack gap={0} visibleFrom="sm" style={{ paddingRight: 4 }}>
                          <Text size="xs" fw={700} style={{ lineHeight: 1.2 }} truncate>
                            {userName}
                          </Text>
                          <Text size="10px" c="dimmed" style={{ lineHeight: 1.1 }}>
                            {roleLabel}
                          </Text>
                        </Stack>
                        <ChevronDown size={14} className="text-gray-400" />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>{locale === "ar" ? "الحساب الشخصي" : "Mon compte"}</Menu.Label>
                    <Menu.Item component={Link} href="/profil" leftSection={<User size={15} />}>
                      {t.nav.profile}
                    </Menu.Item>
                    <Menu.Item component={Link} href="/parametres" leftSection={<Settings size={15} />}>
                      {t.nav.parametres}
                    </Menu.Item>
                    <Divider my={6} />
                    <Menu.Item
                      color="red"
                      leftSection={<LogOut size={15} />}
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      {t.nav.logout}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          </Paper>
        </MantineAppShell.Header>

        <MantineAppShell.Navbar>
          <Paper
            radius={24}
            shadow="sm"
            withBorder
            p={desktopCollapsed ? "xs" : "md"}
            h="calc(100dvh - var(--app-shell-header-offset) - 32px)"
            style={{
              background: "var(--sidebar-bg)",
              borderColor: "var(--sidebar-border, var(--border-strong))",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack gap="md" style={{ height: "100%" }}>
              {desktopCollapsed ? (
                <Tooltip label={companyName} position="right" withArrow>
                  <Paper
                    radius="xl"
                    withBorder
                    p={4}
                    style={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      width: 44,
                      height: 44,
                      margin: "0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      src={!logoPath || logoPath.startsWith("/assets/logo") ? "/assets/brand-icon.svg" : logoPath}
                      alt={companyName}
                      width={36}
                      height={36}
                      className="h-8 w-8 rounded-lg object-contain"
                    />
                  </Paper>
                </Tooltip>
              ) : (
                <Paper
                  radius="xl"
                  withBorder
                  p="sm"
                  style={{
                    background: "var(--sidebar-card-bg, var(--card))",
                    borderColor: "var(--sidebar-card-border, var(--border))",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  <Group gap="sm" wrap="nowrap" align="center">
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={!logoPath || logoPath.startsWith("/assets/logo") ? "/assets/brand-icon.svg" : logoPath}
                        alt={companyName}
                        width={42}
                        height={42}
                        className="h-10 w-10 rounded-xl object-contain shadow-xs"
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text
                        fw={800}
                        size="sm"
                        style={{
                          letterSpacing: "-0.02em",
                          lineHeight: 1.25,
                          color: "var(--sidebar-fg, var(--foreground))",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={companyName}
                      >
                        {companyName}
                      </Text>
                      <Text size="11px" fw={600} style={{ color: "var(--sidebar-muted, var(--muted))" }} mt={1}>
                        Gestion commerciale
                      </Text>
                    </div>
                  </Group>
                </Paper>
              )}

              <SidebarNav
                userRole={userRole}
                featureFlags={featureFlags}
                onNavigate={close}
                collapsed={desktopCollapsed}
                onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)}
              />
            </Stack>
          </Paper>
        </MantineAppShell.Navbar>

        <MantineAppShell.Main>{children}</MantineAppShell.Main>
      </MantineAppShell>
    </div>
  );
}
