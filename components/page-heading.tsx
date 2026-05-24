import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-[16px] border bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-md)] lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div>
        <p className="text-xs font-semibold text-[var(--muted)]">{eyebrow}</p>
        <h2 className="mt-0.5 text-[1.25rem] font-black leading-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-[70ch] text-[13px] leading-5 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}
