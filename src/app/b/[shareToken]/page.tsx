import { notFound } from "next/navigation";
import { BillReceiptView } from "@/components/BillReceiptView";
import { getRequestOrigin } from "@/lib/origin";
import { getPublicBillReceipt } from "@/lib/receipt";

export default async function PublicBillPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const [bill, origin] = await Promise.all([
    getPublicBillReceipt(shareToken),
    getRequestOrigin(),
  ]);

  if (!bill) {
    notFound();
  }

  return <BillReceiptView bill={bill} initialOrigin={origin} isPublic />;
}

