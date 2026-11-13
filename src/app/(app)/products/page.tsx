import { ProductsManager } from "@/components/ProductsManager";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const { shop } = await requireAuth();

  const products = await prisma.product.findMany({
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
      lowStockThreshold: true,
      updatedAt: true,
    },
  });

  const initialProducts = products.map((product) => ({
    ...product,
    updatedAt: product.updatedAt.toISOString(),
  }));

  return <ProductsManager initialProducts={initialProducts} />;
}
