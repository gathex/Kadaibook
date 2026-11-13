import { UdhaarList } from "@/components/UdhaarList";
import { requireAuth } from "@/lib/auth";
import { getShopCustomersWithBalances } from "@/lib/udhaar";

export default async function UdhaarPage() {
  const { shop } = await requireAuth();
  const customers = await getShopCustomersWithBalances(shop.id);

  return <UdhaarList shopName={shop.name} initialCustomers={customers} />;
}
