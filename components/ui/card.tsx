import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
      "rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--card)] p-[var(--card-padding)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
