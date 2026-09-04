import { cn } from "@/lib/utils";

export function Table({
  className,
  tableClassName,
  children,
  minWidth = 520,
}: {
  className?: string;
  tableClassName?: string;
  children: React.ReactNode;
  minWidth?: number | string;
}) {
  return (
    <div className={cn("overflow-x-auto w-full min-w-0 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--card)]", className)}>
      <table
        className={cn("w-full border-collapse text-[13px]", tableClassName)}
        style={{ minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
return <thead className="bg-[var(--surface-soft)] text-left text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">{children}</thead>;
}

export function TH({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-3 py-2.5 font-semibold", className)} {...props}>{children}</th>;
}

export function TD({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-t border-[var(--border)] px-3 py-3 align-top", className)} {...props}>{children}</td>;
}
