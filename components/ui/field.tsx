import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("grid gap-1.5 text-[13px]", className)}>
      <span className="text-[12px] font-semibold tracking-[0.01em] text-[var(--muted-strong)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}
