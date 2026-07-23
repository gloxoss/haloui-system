"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  ClipboardList,
  FileText,
  Home,
  Package,
  Receipt,
  Settings2,
  ShoppingBag,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, Stack } from "@mantine/core";

import { BONS_NAV_ITEMS, MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "@/lib/constants";
import { type FeatureFlags, type Role } from "@/lib/types";

const navIcons = {
  "/dashboard": Home,
  "/devis": FileText,
  "/factures": Receipt,
  "/personnel": Users,
  "/chiffre-affaires": ChartColumn,
  "/bons-livraison": Package,
  "/bons-sortie": Truck,
  "/bons-commande": ClipboardList,
  "/produits": ShoppingBag,
  "/clients": UserRound,
  "/fournisseurs": Truck,
  "/utilisateurs": Users,
  "/parametres": Settings2,
} as const;

function hasFeature(
  featureFlags: FeatureFlags,
  feature?: keyof FeatureFlags,
  userRole?: Role,
  superadminOnly?: boolean,
) {
  if (superadminOnly) {
    return userRole === "superadmin";
  }

  if (!feature) {
    return true;
  }

  return Boolean(featureFlags[feature]);
}

function navStyles(active: boolean) {
  return {
    root: {
      borderRadius: "14px",
      minHeight: "42px",
      background: active ? "var(--accent)" : "transparent",
      color: active ? "var(--accent-foreground)" : "var(--foreground)",
      border: active ? "1px solid transparent" : "1px solid transparent",
      transition: "background-color 180ms ease, color 180ms ease, box-shadow 180ms ease",
      boxShadow: active ? "var(--shadow-sm)" : "none",
    },
    body: {
      gap: "10px",
    },
    label: {
      fontSize: "13px",
      fontWeight: 700,
    },
    description: {
      fontSize: "11px",
    },
    section: {
      color: active ? "var(--accent-foreground)" : "var(--muted-strong)",
    },
    children: {
      display: "grid",
      gap: "6px",
      paddingTop: "8px",
    },
  } as const;
}

export function SidebarNav({
  userRole,
  featureFlags,
  onNavigate,
}: {
  userRole: Role;
  featureFlags: FeatureFlags;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const primaryItems = PRIMARY_NAV_ITEMS.filter((item) =>
    hasFeature(featureFlags, "feature" in item ? item.feature : undefined, userRole),
  );
  const bonsItems = BONS_NAV_ITEMS.filter((item) =>
    hasFeature(featureFlags, item.feature, userRole),
  );
  const moreItems = MORE_NAV_ITEMS.filter((item) =>
    hasFeature(
      featureFlags,
      "feature" in item ? item.feature : undefined,
      userRole,
      "superadminOnly" in item ? item.superadminOnly : false,
    ),
  );

  const bonsActive = bonsItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const moreActive = moreItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <Stack gap="xs">
      {primaryItems.slice(0, 3).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = navIcons[item.href];

        return (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            onClick={onNavigate}
            active={active}
            label={item.label}
            leftSection={<Icon size={16} strokeWidth={2} />}
            styles={navStyles(active)}
          />
        );
      })}

      {bonsItems.length > 0 ? (
        <NavLink
          label="Bons"
          active={bonsActive}
          defaultOpened={bonsActive}
          leftSection={<Package size={16} strokeWidth={2} />}
          rightSection={<span style={{ fontSize: 11, fontWeight: 700 }}>{bonsItems.length}</span>}
          childrenOffset={10}
          styles={navStyles(bonsActive)}
        >
          {bonsItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = navIcons[item.href];

            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                onClick={onNavigate}
                active={active}
                label={item.label}
                leftSection={<Icon size={15} strokeWidth={2} />}
                styles={navStyles(active)}
              />
            );
          })}
        </NavLink>
      ) : null}

      {primaryItems.slice(3).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = navIcons[item.href];

        return (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            onClick={onNavigate}
            active={active}
            label={item.label}
            leftSection={<Icon size={16} strokeWidth={2} />}
            styles={navStyles(active)}
          />
        );
      })}

      {moreItems.length > 0 ? (
        <NavLink
          label="Plus"
          active={moreActive}
          defaultOpened={moreActive}
          leftSection={<Settings2 size={16} strokeWidth={2} />}
          rightSection={<span style={{ fontSize: 11, fontWeight: 700 }}>{moreItems.length}</span>}
          childrenOffset={10}
          mt="sm"
          styles={navStyles(moreActive)}
        >
          {moreItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = navIcons[item.href];

            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                onClick={onNavigate}
                active={active}
                label={item.label}
                leftSection={<Icon size={15} strokeWidth={2} />}
                styles={navStyles(active)}
              />
            );
          })}
        </NavLink>
      ) : null}
    </Stack>
  );
}
