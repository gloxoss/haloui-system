"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Award,
  BadgePercent,
  BellRing,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  Coins,
  FileSpreadsheet,
  FileText,
  FileCheck2,
  HandCoins,
  Kanban,
  Landmark,
  Layers,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  QrCode,
  Receipt,
  ReceiptText,
  ScanBarcode,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import {
  ActionIcon,
  Divider,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
  NavLink,
  Stack,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";

import { BONS_NAV_ITEMS, MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { type FeatureFlags, type Role } from "@/lib/types";

const navIcons = {
  "/dashboard": LayoutDashboard,
  "/devis": FileText,
  "/factures": Receipt,
  "/abonnements": CalendarClock,
  "/relances": BellRing,
  "/personnel": Users,
  "/chiffre-affaires": TrendingUp,
  "/pos": Store,
  "/rapprochement-bancaire": Landmark,
  "/devises": Coins,
  "/bons-livraison": Truck,
  "/bons-sortie": FileSpreadsheet,
  "/bons-commande": ClipboardList,
  "/transferts": ArrowLeftRight,
  "/inventaires": ScanBarcode,
  "/lots-series": Boxes,
  "/reapprovisionnement": ShoppingCart,
  "/emplacements": MapPin,
  "/nomenclatures": Layers,
  "/etiquettes": QrCode,
  "/opportunites": Kanban,
  "/grilles-tarifaires": BadgePercent,
  "/commissions": Award,
  "/messagerie": MessageSquare,
  "/pointeuse": Clock,
  "/conges": CalendarCheck,
  "/paie": HandCoins,
  "/notes-frais": ReceiptText,
  "/marge-rentabilite": PieChart,
  "/declaration-tva": FileCheck2,
  "/produits": Package,
  "/clients": UserRound,
  "/fournisseurs": Building2,
  "/utilisateurs": ShieldCheck,
  "/parametres": SlidersHorizontal,
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
      color: active ? "var(--accent-foreground)" : "var(--sidebar-fg, var(--foreground))",
      border: "1px solid transparent",
      transition: "background-color 180ms ease, color 180ms ease, box-shadow 180ms ease",
      boxShadow: active ? "var(--shadow-sm)" : "none",
    },
    body: {
      gap: "10px",
    },
    label: {
      fontSize: "13px",
      fontWeight: 700,
      color: active ? "var(--accent-foreground)" : "var(--sidebar-fg, var(--foreground))",
    },
    description: {
      fontSize: "11px",
      color: active ? "var(--accent-foreground)" : "var(--sidebar-muted, var(--muted))",
    },
    section: {
      color: active ? "var(--accent-foreground)" : "var(--sidebar-muted-strong, var(--muted-strong))",
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
  collapsed = false,
  onToggleCollapse,
}: {
  userRole: Role;
  featureFlags: FeatureFlags;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { t, locale } = useTranslation();

  const getItemLabel = (href: string, defaultLabel: string) => {
    switch (href) {
      case "/dashboard": return t.nav.dashboard;
      case "/devis": return t.nav.devis;
      case "/factures": return t.nav.factures;
      case "/abonnements": return locale === "ar" ? "الاشتراكات & MRR" : "Abonnements";
      case "/relances": return t.nav.relances;
      case "/personnel": return t.nav.personnel;
      case "/chiffre-affaires": return t.nav.caisse;
      case "/rapprochement-bancaire": return locale === "ar" ? "المطابقة البنكية" : "Rapprochement bancaire";
      case "/devises": return locale === "ar" ? "العملات والصرف" : "Devises & Changes";
      case "/bons-livraison": return t.nav.bl;
      case "/bons-sortie": return t.nav.bs;
      case "/bons-commande": return t.nav.bc;
      case "/transferts": return locale === "ar" ? "تحويلات المخزون" : "Transferts stock";
      case "/inventaires": return locale === "ar" ? "الجرد والتسوية" : "Inventaires & Comptage";
      case "/lots-series": return locale === "ar" ? "الدفعات وتواريخ الصلاحية" : "Lots, Séries & DLC";
      case "/reapprovisionnement": return locale === "ar" ? "إعادة التموين الذكية" : "Réapprovisionnement";
      case "/emplacements": return locale === "ar" ? "إدارة المواقع والالتقاط" : "Emplacements & WMS";
      case "/produits": return t.nav.produits;
      case "/opportunites": return locale === "ar" ? "فرص البيع (CRM)" : "Pipeline CRM";
      case "/grilles-tarifaires": return locale === "ar" ? "جداول الأسعار" : "Grilles & Tarifs";
      case "/commissions": return locale === "ar" ? "عمولات المبيعات" : "Commissions";
      case "/messagerie": return locale === "ar" ? "المراسلات والواتساب" : "Messagerie & WhatsApp";
      case "/pointeuse": return locale === "ar" ? "تسجيل الحضور الرقمي" : "Pointeuse";
      case "/conges": return locale === "ar" ? "الإجازات والغياب" : "Congés & Absences";
      case "/paie": return locale === "ar" ? "الأجور والقروض" : "Paie & Prêts";
      case "/notes-frais": return locale === "ar" ? "بيان المصاريف" : "Notes de Frais";
      case "/marge-rentabilite": return locale === "ar" ? "الهامش والربحية" : "Marge & Rentabilité";
      case "/declaration-tva": return locale === "ar" ? "إقرار الضريبة (TVA)" : "Déclaration TVA";
      case "/clients": return t.nav.clients;
      case "/fournisseurs": return t.nav.fournisseurs;
      case "/utilisateurs": return t.nav.utilisateurs;
      case "/parametres": return t.nav.parametres;
      default: return defaultLabel;
    }
  };

  const bonsLabel = locale === "ar" ? "البونات (Bons)" : "Bons";
  const moreLabel = locale === "ar" ? "المزيد (Plus)" : "Plus";
  const collapseLabel = locale === "ar" ? "تصغير القائمة" : "Réduire le menu";
  const expandLabel = locale === "ar" ? "تكبير القائمة" : "Agrandir le menu";

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

  if (collapsed) {
    return (
      <Stack gap="xs" align="center" style={{ width: "100%" }}>
        {primaryItems.slice(0, 3).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = navIcons[item.href];

          return (
            <Tooltip key={item.href} label={getItemLabel(item.href, item.label)} position="right" withArrow offset={12}>
              <UnstyledButton
                component={Link}
                href={item.href}
                onClick={onNavigate}
                style={{
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-foreground)" : "var(--sidebar-fg, var(--foreground))",
                  transition: "all 160ms ease",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
                className={active ? "" : "hover:bg-[var(--sidebar-hover,var(--surface-soft))]"}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
              </UnstyledButton>
            </Tooltip>
          );
        })}

        {bonsItems.length > 0 ? (
          <Menu position="right-start" withArrow shadow="md" offset={12}>
            <MenuTarget>
              <Tooltip label={bonsLabel} position="right" withArrow offset={12}>
                <UnstyledButton
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    position: "relative",
                    background: bonsActive ? "var(--accent)" : "transparent",
                    color: bonsActive ? "var(--accent-foreground)" : "var(--sidebar-fg, var(--foreground))",
                    transition: "all 160ms ease",
                    boxShadow: bonsActive ? "var(--shadow-sm)" : "none",
                  }}
                  className={bonsActive ? "" : "hover:bg-[var(--sidebar-hover,var(--surface-soft))]"}
                >
                  <Package size={18} strokeWidth={bonsActive ? 2.2 : 1.9} />
                  <span
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 7,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: bonsActive ? "var(--accent-foreground)" : "var(--accent)",
                    }}
                  />
                </UnstyledButton>
              </Tooltip>
            </MenuTarget>
            <MenuDropdown>
              <MenuLabel>Bons</MenuLabel>
              {bonsItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = navIcons[item.href];

                return (
                  <MenuItem
                    key={item.href}
                    component={Link}
                    href={item.href}
                    onClick={onNavigate}
                    leftSection={<Icon size={15} />}
                    style={{
                      fontWeight: active ? 700 : 500,
                      backgroundColor: active ? "var(--surface-soft)" : undefined,
                      color: active ? "var(--accent)" : undefined,
                    }}
                  >
                    {item.label}
                  </MenuItem>
                );
              })}
            </MenuDropdown>
          </Menu>
        ) : null}

        {primaryItems.slice(3).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = navIcons[item.href];

          return (
            <Tooltip key={item.href} label={getItemLabel(item.href, item.label)} position="right" withArrow offset={12}>
              <UnstyledButton
                component={Link}
                href={item.href}
                onClick={onNavigate}
                style={{
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-foreground)" : "var(--sidebar-fg, var(--foreground))",
                  transition: "all 160ms ease",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
                className={active ? "" : "hover:bg-[var(--sidebar-hover,var(--surface-soft))]"}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
              </UnstyledButton>
            </Tooltip>
          );
        })}

        {moreItems.length > 0 ? (
          <Menu position="right-start" withArrow shadow="md" offset={12}>
            <MenuTarget>
              <Tooltip label={moreLabel} position="right" withArrow offset={12}>
                <UnstyledButton
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    position: "relative",
                    background: moreActive ? "var(--accent)" : "transparent",
                    color: moreActive ? "var(--accent-foreground)" : "var(--sidebar-fg, var(--foreground))",
                    transition: "all 160ms ease",
                    boxShadow: moreActive ? "var(--shadow-sm)" : "none",
                  }}
                  className={moreActive ? "" : "hover:bg-[var(--sidebar-hover,var(--surface-soft))]"}
                >
                  <MoreHorizontal size={18} strokeWidth={moreActive ? 2.2 : 1.9} />
                  <span
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 7,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: moreActive ? "var(--accent-foreground)" : "var(--accent)",
                    }}
                  />
                </UnstyledButton>
              </Tooltip>
            </MenuTarget>
            <MenuDropdown>
              <MenuLabel>{moreLabel}</MenuLabel>
              {moreItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = navIcons[item.href];

                return (
                  <MenuItem
                    key={item.href}
                    component={Link}
                    href={item.href}
                    onClick={onNavigate}
                    leftSection={<Icon size={15} />}
                    style={{
                      fontWeight: active ? 700 : 500,
                      backgroundColor: active ? "var(--surface-soft)" : undefined,
                      color: active ? "var(--accent)" : undefined,
                    }}
                  >
                    {item.label}
                  </MenuItem>
                );
              })}
            </MenuDropdown>
          </Menu>
        ) : null}

        {onToggleCollapse ? (
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <Tooltip label={expandLabel} position="right" withArrow offset={12}>
              <ActionIcon
                onClick={onToggleCollapse}
                variant="subtle"
                color="gray"
                size="lg"
                radius="md"
                aria-label={expandLabel}
              >
                <PanelLeftOpen size={18} />
              </ActionIcon>
            </Tooltip>
          </div>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack gap="xs" style={{ height: "100%" }}>
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
            label={getItemLabel(item.href, item.label)}
            leftSection={<Icon size={16} strokeWidth={2} />}
            styles={navStyles(active)}
          />
        );
      })}

      {bonsItems.length > 0 ? (
        <NavLink
          label={bonsLabel}
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
                label={getItemLabel(item.href, item.label)}
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
            label={getItemLabel(item.href, item.label)}
            leftSection={<Icon size={16} strokeWidth={2} />}
            styles={navStyles(active)}
          />
        );
      })}

      {moreItems.length > 0 ? (
        <NavLink
          label={moreLabel}
          active={moreActive}
          defaultOpened={moreActive}
          leftSection={<MoreHorizontal size={16} strokeWidth={2} />}
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
                label={getItemLabel(item.href, item.label)}
                leftSection={<Icon size={15} strokeWidth={2} />}
                styles={navStyles(active)}
              />
            );
          })}
        </NavLink>
      ) : null}

      {onToggleCollapse ? (
        <div style={{ marginTop: "auto", paddingTop: 12 }}>
          <Divider my="xs" />
          <UnstyledButton
            onClick={onToggleCollapse}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 12px",
              borderRadius: 14,
              color: "var(--sidebar-muted, var(--muted-strong))",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 160ms ease",
            }}
            className="hover:bg-[var(--sidebar-hover,var(--surface-soft))] hover:text-[var(--sidebar-fg,var(--foreground))]"
          >
            <PanelLeftClose size={16} />
            <span>{collapseLabel}</span>
          </UnstyledButton>
        </div>
      ) : null}
    </Stack>
  );
}
