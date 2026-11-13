import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundQty } from "@/lib/products";
import { roundMoney, syncCustomerBalance } from "@/lib/udhaar";

const VALID_PAYMENT_MODES = new Set(["CASH", "UPI", "UDHAAR"]);

class BillValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bills = await prisma.bill.findMany({
    where: { shopId: current.shop.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      billNumber: true,
      totalAmount: true,
      paymentMode: true,
      shareToken: true,
      createdAt: true,
      customer: {
        select: { id: true, name: true, phone: true },
      },
      _count: {
        select: { items: true },
      },
    },
  });

  return NextResponse.json({ bills }, { status: 200 });
}

interface BillItemInput {
  productId?: unknown;
  quantity?: unknown;
}

interface CreateBillBody {
  items?: unknown;
  paymentMode?: unknown;
  customerId?: unknown;
  note?: unknown;
}

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBillBody;
  try {
    body = (await request.json()) as CreateBillBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const paymentMode =
    typeof body.paymentMode === "string" ? body.paymentMode.trim().toUpperCase() : "";
  if (!VALID_PAYMENT_MODES.has(paymentMode)) {
    return NextResponse.json(
      { error: "Payment mode must be CASH, UPI, or UDHAAR." },
      { status: 400 }
    );
  }

  const customerId =
    typeof body.customerId === "string" && body.customerId.trim().length > 0
      ? body.customerId.trim()
      : null;

  if (paymentMode === "UDHAAR" && !customerId) {
    return NextResponse.json(
      { error: "Please select or add a customer for Udhaar payment." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Add at least one product to save the bill." },
      { status: 400 }
    );
  }

  // Merge duplicate productIds and validate positive finite quantities
  const mergedQuantities = new Map<string, number>();
  for (const rawItem of body.items as BillItemInput[]) {
    const productId =
      typeof rawItem?.productId === "string" ? rawItem.productId.trim() : "";
    const quantity =
      typeof rawItem?.quantity === "number"
        ? rawItem.quantity
        : Number(rawItem?.quantity);

    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Each bill item must have a valid product and quantity > 0." },
        { status: 400 }
      );
    }

    const prevQty = mergedQuantities.get(productId) ?? 0;
    mergedQuantities.set(productId, roundQty(prevQty + quantity));
  }

  const note =
    typeof body.note === "string" && body.note.trim().length > 0
      ? body.note.trim().slice(0, 250)
      : null;

  const shopId = current.shop.id;
  const productIds = Array.from(mergedQuantities.keys());

  try {
    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          shopId,
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          stockQty: true,
          unit: true,
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      const billItemsData: Array<{
        shopId: string;
        productId: string;
        productName: string;
        unit: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }> = [];

      const updatedStocks: Array<{ id: string; stockQty: number }> = [];
      let totalAmount = 0;

      for (const [productId, requestedQty] of mergedQuantities.entries()) {
        const product = productMap.get(productId);
        if (!product) {
          throw new BillValidationError("One or more selected products were not found.", 404);
        }

        if (product.stockQty < requestedQty) {
          throw new BillValidationError(
            `${product.name} only has ${product.stockQty} ${product.unit} in stock.`,
            400
          );
        }

        const nextStock = roundQty(product.stockQty - requestedQty);
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: product.id,
            shopId,
            isActive: true,
            stockQty: { gte: requestedQty },
          },
          data: {
            stockQty: nextStock,
          },
        });

        if (stockUpdate.count === 0) {
          throw new BillValidationError(
            `Insufficient stock for ${product.name}.`,
            400
          );
        }

        updatedStocks.push({ id: product.id, stockQty: nextStock });

        const lineTotal = roundMoney(product.price * requestedQty);
        totalAmount = roundMoney(totalAmount + lineTotal);

        billItemsData.push({
          shopId,
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          unitPrice: product.price,
          quantity: requestedQty,
          lineTotal,
        });
      }

      let customerRecord: { id: string; name: string; phone: string | null; balance: number } | null =
        null;

      if (customerId) {
        customerRecord = await tx.customer.findFirst({
          where: {
            id: customerId,
            shopId,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            balance: true,
          },
        });

        if (!customerRecord) {
          throw new BillValidationError("Selected customer was not found.", 404);
        }
      }

      const lastBill = await tx.bill.findFirst({
        where: { shopId },
        orderBy: { billNumber: "desc" },
        select: { billNumber: true },
      });
      const billNumber = (lastBill?.billNumber ?? 0) + 1;
      const shareToken = crypto.randomBytes(12).toString("hex");

      const bill = await tx.bill.create({
        data: {
          shopId,
          billNumber,
          customerId: customerRecord?.id ?? null,
          totalAmount,
          paymentMode,
          shareToken,
          note,
          items: {
            create: billItemsData,
          },
        },
        select: {
          id: true,
          billNumber: true,
          customerId: true,
          totalAmount: true,
          paymentMode: true,
          shareToken: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              unit: true,
              unitPrice: true,
              quantity: true,
              lineTotal: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              balance: true,
            },
          },
        },
      });

      let updatedCustomerBalance: number | null = null;
      if (paymentMode === "UDHAAR" && customerRecord) {
        await tx.udhaarTransaction.create({
          data: {
            shopId,
            customerId: customerRecord.id,
            billId: bill.id,
            type: "DEBIT",
            amount: totalAmount,
            note: note ?? `Bill #${billNumber}`,
          },
        });

        const synced = await syncCustomerBalance(tx, shopId, customerRecord.id);
        updatedCustomerBalance = synced.balance;
      }

      return {
        bill: {
          ...bill,
          customer: bill.customer
            ? {
                ...bill.customer,
                balance: updatedCustomerBalance ?? bill.customer.balance,
              }
            : null,
        },
        updatedStocks,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof BillValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create bill error:", error);
    return NextResponse.json(
      { error: "Unable to save bill. Please try again." },
      { status: 500 }
    );
  }
}

