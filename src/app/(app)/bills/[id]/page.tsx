import { notFound } from "next/navigation";
import { BillReceiptView } from "@/components/BillReceiptView";
import { requireAuth } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/origin";
import { getShopBillReceipt } from "@/lib/receipt";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { shop } = await requireAuth();
  const { id } = await params;

  const [bill, origin] = await Promise.all([
    getShopBillReceipt(shop.id, id),
    getRequestOrigin(),
  ]);

  if (!bill) {
    notFound();
  }

  return <BillReceiptView bill={bill} initialOrigin={origin} isPublic={false} />;
}

