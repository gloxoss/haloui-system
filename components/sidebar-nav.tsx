"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BONS_NAV_ITEMS, MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "@/lib/constants";
import { type FeatureFlags, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

function navItemClass(active: boolean) {
  return cn(
    "flex min-h-11 items-center rounded-xl px-3 py-2 text-[13px] font-medium transition duration-200",
    active
      ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-md)]"
      : "text-[var(--foreground)] hover:bg-[var(--background-alt)]",
  );
}

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

export function SidebarNav({
  userRole,
  featureFlags,
}: {
  userRole: Role;
  featureFlags: FeatureFlags;
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
    <nav className="grid gap-2">
      {primaryItems.slice(0, 3).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={navItemClass(active)}>
            {item.label}
          </Link>
        );
      })}

      {bonsItems.length > 0 ? (
        <details open={bonsActive} className="group">
          <summary className={cn(navItemClass(bonsActive), "cursor-pointer list-none justify-between")}>
            <span>Bons</span>
            <span className="text-xs text-current/70">{bonsItems.length}</span>
          </summary>
          <div className="mt-2 grid gap-1.5 pl-2">
            {bonsItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={navItemClass(active)}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </details>
      ) : null}

      {primaryItems.slice(3).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={navItemClass(active)}>
            {item.label}
          </Link>
        );
      })}

      {moreItems.length > 0 ? (
        <div className="mt-2 border-t pt-2">
          <details className="group" open={moreActive}>
            <summary className={cn(navItemClass(moreActive), "cursor-pointer list-none justify-between")}>
              <span>Plus...</span>
              <span className="text-xs text-current/70">{moreItems.length}</span>
            </summary>
            <div className="mt-2 grid gap-1.5 pl-2">
              {moreItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={navItemClass(active)}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      ) : null}
    </nav>
  );
}
