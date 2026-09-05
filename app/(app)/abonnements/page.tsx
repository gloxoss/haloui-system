import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import {
  getSubscriptionsStats,
  listEntities,
  listProducts,
  listSubscriptions,
} from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { SubscriptionsManager } from "@/components/subscriptions/subscriptions-manager";

export default async function AbonnementsPage() {
  await requireFeature("abonnements");
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const subscriptions = listSubscriptions(companyId);
  const stats = getSubscriptionsStats(companyId);
  const clients = listEntities("clients");
  const products = listProducts("", companyId);

  return (
    <div className="space-y-6">
      <SubscriptionsManager
        initialSubscriptions={subscriptions}
        initialStats={stats}
        clients={clients}
        products={products}
        userRole={session.user.role}
      />
    </div>
  );
}
