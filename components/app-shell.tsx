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
    <div
      data-ui-theme={themeSettings.preset}
      data-ui-density={themeSettings.density}
      style={customStyles}
      className="min-h-screen bg-[var(--background)]"
    >
      <MantineAppShell
        header={{ height: 86 }}
        navbar={{
          width: desktopCollapsed ? 82 : 280,
          breakpoint: "lg",
          collapsed: { mobile: !mobileOpened },
        }}
        padding={0}
        styles={{
          main: {
            background: "var(--background)",
            paddingTop: "calc(var(--app-shell-header-offset) + 16px)",
            paddingLeft: isRtl ? "20px" : "calc(var(--app-shell-navbar-offset) + 16px)",
            paddingRight: isRtl ? "calc(var(--app-shell-navbar-offset) + 16px)" : "20px",
            paddingBottom: "32px",
            minHeight: "100dvh",
            transition: "padding 220ms cubic-bezier(0.2, 0, 0, 1)",
          },
          header: {
            background: "transparent",
            borderBottom: "none",
            padding: "16px 20px 0 20px",
          },
          navbar: {
            background: "transparent",
            borderInlineEnd: "none",
            padding: isRtl ? "16px 16px 16px 0" : "16px 0 16px 16px",
            transition: "width 220ms cubic-bezier(0.2, 0, 0, 1)",
          },
        }}
      >
        <MantineAppShell.Header>
          <Paper
            radius={24}
            shadow="sm"
            withBorder
            px="lg"
            py="sm"
            h={70}
            style={{
              background: "var(--card)",
              borderColor: "var(--border-strong)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" style={{ width: "100%" }}>
              <Group gap="sm" wrap="nowrap">
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

                <Stack gap={1}>
                  <Text size="11px" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.12em" }}>
                    {todayLabel}
                  </Text>
                  <Text fw={800} size="lg" style={{ letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                    {companyName}
                  </Text>
                </Stack>
              </Group>

              <Group gap="sm" wrap="nowrap">
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
                      style={{
                        border: "1px solid var(--border-strong)",
                        background: "var(--card)",
                        borderRadius: 16,
                        padding: "8px 14px",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <Stack gap={0} visibleFrom="sm">
                          <Text size="sm" fw={700} style={{ lineHeight: 1.2 }}>
                            {userName}
                          </Text>
                          <Text size="xs" c="dimmed" style={{ lineHeight: 1.1 }}>
                            {roleLabel}
                          </Text>
                        </Stack>
                        <ChevronDown size={15} className="text-gray-400" />
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
              borderColor: "var(--border-strong)",
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
                    background: "var(--card)",
                    borderColor: "var(--border)",
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
                          color: "var(--foreground)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={companyName}
                      >
                        {companyName}
                      </Text>
                      <Text size="11px" fw={600} c="dimmed" mt={1}>
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
