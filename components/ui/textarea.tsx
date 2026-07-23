import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--control-bg)] px-3.5 py-2.5 text-[13px] text-[var(--foreground)] shadow-[var(--shadow-sm)] transition duration-200 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
