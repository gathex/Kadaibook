import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Authoritatively computes a customer's outstanding udhaar balance directly
 * from UDHAAR bills minus CREDIT payments in the database.
 */
export async function computeCustomerBalanceFromLedger(
  db: DbClient,
  shopId: string,
  customerId: string
): Promise<{
  totalUdhaarBills: number;
  totalPayments: number;
  balance: number;
}> {
  const [billsAgg, paymentsAgg] = await Promise.all([
    db.bill.aggregate({
      where: {
        shopId,
        customerId,
        paymentMode: "UDHAAR",
      },
      _sum: { totalAmount: true },
    }),
    db.udhaarTransaction.aggregate({
      where: {
        shopId,
        customerId,
        type: "CREDIT",
      },
      _sum: { amount: true },
    }),
  ]);

  const totalUdhaarBills = roundMoney(billsAgg._sum.totalAmount ?? 0);
  const totalPayments = roundMoney(paymentsAgg._sum.amount ?? 0);
  const balance = roundMoney(Math.max(0, totalUdhaarBills - totalPayments));

  return { totalUdhaarBills, totalPayments, balance };
}

/**
 * Recomputes a customer's balance from bills & payments and persists it on Customer.balance.
 */
export async function syncCustomerBalance(
  db: DbClient,
  shopId: string,
  customerId: string
): Promise<{
  totalUdhaarBills: number;
  totalPayments: number;
  balance: number;
}> {
  const computed = await computeCustomerBalanceFromLedger(db, shopId, customerId);
  await db.customer.updateMany({
    where: { id: customerId, shopId },
    data: { balance: computed.balance },
  });
  return computed;
}

export interface CustomerSummaryDTO {
  id: string;
  name: string;
  phone: string | null;
  totalUdhaarBills: number;
  totalPayments: number;
  balance: number;
  createdAt: string;
}

/**
 * Lists shop customers with balances computed directly from bills and payments.
 */
export async function getShopCustomersWithBalances(
  shopId: string,
  q?: string
): Promise<CustomerSummaryDTO[]> {
  const trimmedQ = q?.trim() ?? "";

  const [customers, billSums, paymentSums] = await Promise.all([
    prisma.customer.findMany({
      where: {
        shopId,
        ...(trimmedQ
          ? {
              OR: [
                { name: { contains: trimmedQ } },
                { phone: { contains: trimmedQ } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    }),
    prisma.bill.groupBy({
      by: ["customerId"],
      where: {
        shopId,
        customerId: { not: null },
        paymentMode: "UDHAAR",
      },
      _sum: { totalAmount: true },
    }),
    prisma.udhaarTransaction.groupBy({
      by: ["customerId"],
      where: {
        shopId,
        type: "CREDIT",
      },
      _sum: { amount: true },
    }),
  ]);

  const billMap = new Map<string, number>();
  for (const row of billSums) {
    if (row.customerId) {
      billMap.set(row.customerId, roundMoney(row._sum.totalAmount ?? 0));
    }
  }

  const paymentMap = new Map<string, number>();
  for (const row of paymentSums) {
    paymentMap.set(row.customerId, roundMoney(row._sum.amount ?? 0));
  }

  return customers
    .map((c) => {
      const totalUdhaarBills = billMap.get(c.id) ?? 0;
      const totalPayments = paymentMap.get(c.id) ?? 0;
      const balance = roundMoney(Math.max(0, totalUdhaarBills - totalPayments));
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalUdhaarBills,
        totalPayments,
        balance,
        createdAt: c.createdAt.toISOString(),
      };
    })
    .sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return a.name.localeCompare(b.name);
    });
}

export type CustomerHistoryEntry =
  | {
      kind: "BILL";
      id: string;
      billNumber: number;
      amount: number;
      paymentMode: string;
      createdAt: string;
      items: Array<{
        id: string;
        productName: string;
        quantity: number;
        unit: string;
        lineTotal: number;
      }>;
    }
  | {
      kind: "PAYMENT";
      id: string;
      amount: number;
      paymentMode: string;
      note: string | null;
      createdAt: string;
    };

export interface CustomerDetailDTO {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    totalUdhaarBills: number;
    totalPayments: number;
    balance: number;
  };
  history: CustomerHistoryEntry[];
}

export async function getCustomerDetailWithHistory(
  shopId: string,
  customerId: string
): Promise<CustomerDetailDTO | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  if (!customer) return null;

  const [bills, payments, computed] = await Promise.all([
    prisma.bill.findMany({
      where: { shopId, customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        billNumber: true,
        totalAmount: true,
        paymentMode: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unit: true,
            lineTotal: true,
          },
        },
      },
    }),
    prisma.udhaarTransaction.findMany({
      where: { shopId, customerId, type: "CREDIT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        paymentMode: true,
        note: true,
        createdAt: true,
      },
    }),
    computeCustomerBalanceFromLedger(prisma, shopId, customerId),
  ]);

  const history: CustomerHistoryEntry[] = [
    ...bills.map((b) => ({
      kind: "BILL" as const,
      id: b.id,
      billNumber: b.billNumber,
      amount: b.totalAmount,
      paymentMode: b.paymentMode,
      createdAt: b.createdAt.toISOString(),
      items: b.items,
    })),
    ...payments.map((p) => ({
      kind: "PAYMENT" as const,
      id: p.id,
      amount: p.amount,
      paymentMode: p.paymentMode ?? "CASH",
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalUdhaarBills: computed.totalUdhaarBills,
      totalPayments: computed.totalPayments,
      balance: computed.balance,
    },
    history,
  };
}

