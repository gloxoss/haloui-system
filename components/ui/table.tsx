import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-[20px] border bg-[var(--card)]", className)}>
      <table className="min-w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
return <thead className="bg-[var(--background-alt)] text-left text-[11px] uppercase tracking-wide text-[var(--muted)]">{children}</thead>;
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
  return <td className={cn("border-t px-3 py-2.5 align-top", className)} {...props}>{children}</td>;
}
