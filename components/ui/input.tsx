import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-10 w-full rounded-xl border bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] shadow-sm transition duration-200 placeholder:text-[var(--muted)] focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
