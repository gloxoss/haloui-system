import Image from "next/image";
import { ChevronDown, Menu, User } from "lucide-react";

import { CommandPalette } from "@/components/command-palette";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { type FeatureFlags, type Role } from "@/lib/types";

export function AppShell({
  children,
  companyName,
  userName,
  userRole,
  logoPath,
  featureFlags,
}: {
  children: React.ReactNode;
  companyName: string;
  userName: string;
  userRole: Role;
  logoPath: string;
  featureFlags: FeatureFlags;
}) {
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
    <div className="min-h-screen bg-[var(--background)] p-3 lg:p-4">
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block rounded-[20px] border bg-[var(--card)] p-3.5 shadow-[var(--shadow-md)]">
          <div className="mb-4 flex items-center gap-3 rounded-[20px] border bg-[var(--background)] p-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--card)]">
              <Image
                src={logoPath || "/assets/logo-placeholder.svg"}
                alt={companyName}
                width={56}
                height={56}
                className="h-auto w-12 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{companyName}</p>
              <p className="text-xs text-[var(--muted)]">Gestion locale</p>
            </div>
          </div>
          <SidebarNav userRole={userRole} featureFlags={featureFlags} />
        </aside>

        <div className="flex flex-col gap-3">
          <header className="flex flex-col gap-4 h-auto lg:h-24 rounded-[20px] border bg-[var(--card)] p-4 shadow-[var(--shadow-md)] md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--background-alt)] transition-colors">
                    <Menu className="h-6 w-6 text-[var(--foreground)]" />
                    <span className="sr-only">Toggle menu</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-[20px] border bg-[var(--background)] p-3 mt-8">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--card)]">
                      <Image
                        src={logoPath || "/assets/logo-placeholder.svg"}
                        alt={companyName}
                        width={56}
                        height={56}
                        className="h-auto w-12 object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{companyName}</p>
                      <p className="text-xs text-[var(--muted)]">Gestion locale</p>
                    </div>
                  </div>
                  <SidebarNav userRole={userRole} featureFlags={featureFlags} />
                </SheetContent>
              </Sheet>

              <div className="grid gap-0.5">
                <p className="text-[11px] text-[var(--muted)]">{todayLabel}</p>
                <h1 className="text-base font-extrabold leading-tight">{companyName}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CommandPalette />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border bg-[var(--background)] px-3 py-1.5 leading-tight hover:bg-[var(--background-alt)] transition-colors text-left outline-none focus:border-[var(--accent)]">
                    <div>
                      <div className="text-[13px] font-semibold">{userName}</div>
                      <div className="text-xs text-[var(--muted)]">{roleLabel}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profil
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <LogoutButton />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
