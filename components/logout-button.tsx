"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutButton() {
  return (
    <DropdownMenuItem
      className="cursor-pointer text-[var(--danger)] focus:bg-[var(--danger)]/10 focus:text-[var(--danger)]"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Déconnexion
    </DropdownMenuItem>
  );
}
