import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeCustomerBalanceFromLedger,
  roundMoney,
  syncCustomerBalance,
} from "@/lib/udhaar";

const VALID_PAYMENT_MODES = new Set(["CASH", "UPI"]);

class PaymentValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface RecordPaymentBody {
  amount?: unknown;
  paymentMode?: unknown;
  note?: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
  }

  let body: RecordPaymentBody;
  try {
    body = (await request.json()) as RecordPaymentBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const rawAmount =
    typeof body.amount === "number" ? body.amount : Number(body.amount);
  const amount = roundMoney(rawAmount);

  if (!Number.isFinite(rawAmount) || amount <= 0) {
    return NextResponse.json(
      { error: "Payment amount must be greater than 0." },
      { status: 400 }
    );
  }

  const paymentMode =
    typeof body.paymentMode === "string" && body.paymentMode.trim()
      ? body.paymentMode.trim().toUpperCase()
      : "CASH";

  if (!VALID_PAYMENT_MODES.has(paymentMode)) {
    return NextResponse.json(
      { error: "Payment mode must be CASH or UPI." },
      { status: 400 }
    );
  }

  const note =
    typeof body.note === "string" && body.note.trim().length > 0
      ? body.note.trim().slice(0, 200)
      : null;

  const shopId = current.shop.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id, shopId },
        select: { id: true, name: true, phone: true },
      });

      if (!customer) {
        throw new PaymentValidationError("Customer not found.", 404);
      }

      const ledger = await computeCustomerBalanceFromLedger(tx, shopId, id);
      if (ledger.balance <= 0) {
        throw new PaymentValidationError(
          "This customer has no outstanding udhaar balance.",
          400
        );
      }

      if (amount > ledger.balance) {
        throw new PaymentValidationError(
          `Payment cannot exceed outstanding balance of ₹${ledger.balance}.`,
          400
        );
      }

      const txRecord = await tx.udhaarTransaction.create({
        data: {
          shopId,
          customerId: id,
          type: "CREDIT",
          amount,
          paymentMode,
          note: note ?? "Payment received",
        },
        select: {
          id: true,
          amount: true,
          paymentMode: true,
          note: true,
          createdAt: true,
        },
      });

      const updated = await syncCustomerBalance(tx, shopId, id);

      return {
        payment: {
          kind: "PAYMENT" as const,
          id: txRecord.id,
          amount: txRecord.amount,
          paymentMode: txRecord.paymentMode ?? paymentMode,
          note: txRecord.note,
          createdAt: txRecord.createdAt.toISOString(),
        },
        summary: updated,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Unable to record payment. Please try again." },
      { status: 500 }
    );
  }
}

