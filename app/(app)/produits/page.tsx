import { ProductManager } from "@/components/product-manager";

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return <ProductManager search={params.q ?? ""} />;
}
