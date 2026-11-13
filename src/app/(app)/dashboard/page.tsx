import { DashboardView } from "@/components/DashboardView";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LOW_STOCK_LIMIT } from "@/lib/products";
import { getShopCustomersWithBalances, roundMoney } from "@/lib/udhaar";

export default async function DashboardPage() {
  const { user, shop } = await requireAuth();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayBillsAgg, customers, productsCount, lowStockProducts, recentBills] =
    await Promise.all([
      prisma.bill.aggregate({
        where: {
          shopId: shop.id,
          createdAt: { gte: startOfDay },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      getShopCustomersWithBalances(shop.id),
      prisma.product.count({
        where: {
          shopId: shop.id,
          isActive: true,
        },
      }),
      prisma.product.findMany({
        where: {
          shopId: shop.id,
          isActive: true,
          stockQty: { lte: LOW_STOCK_LIMIT },
        },
        orderBy: [{ stockQty: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          stockQty: true,
          unit: true,
        },
      }),
      prisma.bill.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          billNumber: true,
          totalAmount: true,
          paymentMode: true,
          createdAt: true,
          customer: {
            select: { name: true },
          },
        },
      }),
    ]);

  const totalUdhaarPending = roundMoney(
    customers.reduce((sum, c) => sum + c.balance, 0)
  );

  const topPendingCustomers = customers
    .filter((c) => c.balance > 0)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: c.balance,
    }));

  return (
    <DashboardView
      shopName={shop.name}
      shopPhone={shop.phone}
      ownerName={user.name}
      todaySalesTotal={roundMoney(todayBillsAgg._sum.totalAmount ?? 0)}
      todayBillsCount={todayBillsAgg._count.id}
      totalUdhaarPending={totalUdhaarPending}
      productsCount={productsCount}
      topPendingCustomers={topPendingCustomers}
      lowStockProducts={lowStockProducts}
      recentBills={recentBills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        totalAmount: b.totalAmount,
        paymentMode: b.paymentMode,
        customerName: b.customer?.name ?? null,
        createdAt: b.createdAt.toISOString(),
      }))}
    />
  );
}
