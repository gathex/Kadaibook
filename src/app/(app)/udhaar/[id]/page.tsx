import { notFound } from "next/navigation";
import { CustomerDetailView } from "@/components/CustomerDetailView";
import { requireAuth } from "@/lib/auth";
import { getCustomerDetailWithHistory } from "@/lib/udhaar";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { shop } = await requireAuth();
  const { id } = await params;

  const detail = await getCustomerDetailWithHistory(shop.id, id);
  if (!detail) {
    notFound();
  }

  return <CustomerDetailView shopName={shop.name} initialDetail={detail} />;
}

