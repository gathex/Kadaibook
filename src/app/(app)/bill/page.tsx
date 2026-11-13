import { BillingScreen } from "@/components/BillingScreen";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopCustomersWithBalances } from "@/lib/udhaar";

export default async function BillPage() {
  const { shop } = await requireAuth();

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        stockQty: true,
        unit: true,
      },
    }),
    getShopCustomersWithBalances(shop.id),
  ]);

  return (
    <BillingScreen
      initialProducts={products}
      initialCustomers={customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        balance: c.balance,
      }))}
    />
  );
}
