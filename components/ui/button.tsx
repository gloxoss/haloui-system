import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-sm)] hover:brightness-[1.03] active:translate-y-px",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--control-bg)] text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--background-alt)]",
  danger:
    "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:brightness-[1.03] active:translate-y-px",
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
        "inline-flex min-h-[var(--control-height)] items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2 text-[13px] font-semibold tracking-[0.01em] transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
