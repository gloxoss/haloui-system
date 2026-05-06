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
      "rounded-[20px] border bg-[var(--card)] p-4 shadow-[var(--shadow-md)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
