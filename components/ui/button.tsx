import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-md)] hover:brightness-105",
  secondary:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--background-alt)]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--background-alt)]",
  danger:
    "bg-[var(--danger)] text-white shadow-[var(--shadow-md)] hover:brightness-105",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
