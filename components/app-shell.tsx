"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  AppShell as MantineAppShell,
  Burger,
  Divider,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

import { CommandPalette } from "@/components/command-palette";
import { SidebarNav } from "@/components/sidebar-nav";
import { type FeatureFlags, type Role, type ThemeSettings } from "@/lib/types";

export function AppShell({
  children,
  companyName,
  userName,
  userRole,
  logoPath,
  featureFlags,
  themeSettings,
}: {
  children: React.ReactNode;
  companyName: string;
  userName: string;
  userRole: Role;
  logoPath: string;
  featureFlags: FeatureFlags;
  themeSettings: ThemeSettings;
}) {
  const [mobileOpened, { toggle, close }] = useDisclosure(false);
  const todayLabel = new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const roleLabel =
    userRole === "superadmin"
      ? "Superadmin"
      : userRole === "admin"
        ? "Administrateur"
        : "Utilisateur";

  return (
    <div
      data-ui-theme={themeSettings.preset}
      data-ui-density={themeSettings.density}
      className="min-h-screen bg-[var(--background)]"
    >
      <MantineAppShell
        header={{ height: 94 }}
        navbar={{ width: 290, breakpoint: "lg", collapsed: { mobile: !mobileOpened } }}
        padding={0}
        styles={{
          main: {
            background: "var(--background)",
            padding: "16px",
            minHeight: "100dvh",
          },
          header: {
            background: "transparent",
            borderBottom: "none",
            padding: "16px 16px 0",
          },
          navbar: {
            background: "transparent",
            borderInlineEnd: "none",
            padding: "16px 0 16px 16px",
          },
        }}
      >
        <MantineAppShell.Header>
          <Paper
            radius={24}
            shadow="sm"
            withBorder
            px="lg"
            py="md"
            style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Group gap="sm">
                <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="lg" size="sm" aria-label="Ouvrir le menu" />
                <Stack gap={2}>
                  <Text size="11px" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
                    {todayLabel}
                  </Text>
                  <Text fw={800} size="xl" style={{ letterSpacing: "-0.03em" }}>
                    {companyName}
                  </Text>
                </Stack>
              </Group>

              <Group gap="sm" wrap="wrap">
                <CommandPalette />

                <Menu position="bottom-end" shadow="md" width={220}>
                  <Menu.Target>
                    <UnstyledButton
                      style={{
                        border: "1px solid var(--border-strong)",
                        background: "var(--card)",
                        borderRadius: 16,
                        padding: "10px 14px",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Stack gap={0}>
                          <Text size="sm" fw={700}>
                            {userName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {roleLabel}
                          </Text>
                        </Stack>
                        <ChevronDown size={16} />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Mon compte</Menu.Label>
                    <Menu.Item leftSection={<User size={15} />}>Profil</Menu.Item>
                    <Menu.Item leftSection={<Settings size={15} />}>Preferences</Menu.Item>
                    <Divider my={6} />
                    <Menu.Item
                      color="red"
                      leftSection={<LogOut size={15} />}
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      Deconnexion
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
            p="md"
            h="calc(100dvh - 32px)"
            style={{ background: "var(--sidebar-bg)", borderColor: "var(--border-strong)", overflow: "auto" }}
          >
            <Stack gap="md" h="100%">
              <Paper
                radius="xl"
                withBorder
                p="sm"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <Group gap="sm" wrap="nowrap">
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "var(--surface-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={logoPath || "/assets/logo-placeholder.svg"}
                      alt={companyName}
                      width={56}
                      height={56}
                      className="h-auto w-10 object-contain"
                    />
                  </div>
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text fw={800} size="sm" truncate>
                      {companyName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Gestion quotidienne
                    </Text>
                  </Stack>
                </Group>
              </Paper>

              <SidebarNav userRole={userRole} featureFlags={featureFlags} onNavigate={close} />
            </Stack>
          </Paper>
        </MantineAppShell.Navbar>

        <MantineAppShell.Main>{children}</MantineAppShell.Main>
      </MantineAppShell>
    </div>
  );
}
