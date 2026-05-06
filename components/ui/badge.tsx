import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-[var(--background-alt)] text-[var(--foreground)]",
    accent: "bg-[var(--accent)] text-[var(--accent-foreground)]",
    success: "bg-[#e6f2e9] text-[var(--foreground)]",
    warning: "bg-[#faecd9] text-[var(--foreground)]",
  };

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
