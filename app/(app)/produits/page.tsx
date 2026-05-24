import { ProductManager } from "@/components/product-manager";

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; imported?: string; skipped?: string; import?: string }>;
}) {
  const params = await searchParams;
  return (
    <ProductManager
      search={params.q ?? ""}
      imported={params.imported}
      skipped={params.skipped}
      importState={params.import}
    />
  );
}
