import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-[var(--control-height)] w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--control-bg)] px-3.5 py-2 text-[13px] text-[var(--foreground)] shadow-[var(--shadow-sm)] transition duration-200 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
