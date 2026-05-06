import { EntityManager } from "@/components/entity-manager";

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return (
    <EntityManager
      type="fournisseurs"
      title="Fournisseurs"
      description="Ajoutez les fournisseurs de vos commandes."
      search={params.q ?? ""}
    />
  );
}
