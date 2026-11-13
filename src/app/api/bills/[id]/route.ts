import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getShopBillReceipt } from "@/lib/receipt";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Bill ID is required." }, { status: 400 });
  }

  const bill = await getShopBillReceipt(current.shop.id, id);
  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  return NextResponse.json({ bill }, { status: 200 });
}

