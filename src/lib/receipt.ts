import { formatPaymentMode, getMessages, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export interface BillReceiptDTO {
  id: string;
  billNumber: number;
  totalAmount: number;
  paymentMode: string;
  shareToken: string;
  note: string | null;
  createdAt: string;
  shop: {
    name: string;
    phone: string;
    address: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}

const billReceiptSelect = {
  id: true,
  billNumber: true,
  totalAmount: true,
  paymentMode: true,
  shareToken: true,
  note: true,
  createdAt: true,
  shop: {
    select: {
      name: true,
      phone: true,
      address: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  items: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      productName: true,
      unit: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
  },
} as const;

export async function getShopBillReceipt(
  shopId: string,
  billId: string
): Promise<BillReceiptDTO | null> {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, shopId },
    select: billReceiptSelect,
  });

  if (!bill) return null;
  return {
    ...bill,
    createdAt: bill.createdAt.toISOString(),
  };
}

export async function getPublicBillReceipt(
  shareToken: string
): Promise<BillReceiptDTO | null> {
  const bill = await prisma.bill.findUnique({
    where: { shareToken },
    select: billReceiptSelect,
  });

  if (!bill) return null;
  return {
    ...bill,
    createdAt: bill.createdAt.toISOString(),
  };
}

export function formatAmount(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function buildWhatsAppReceiptText(
  bill: BillReceiptDTO,
  shareUrl: string,
  locale: Locale
): string {
  const dateStr = new Date(bill.createdAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const itemLines = bill.items.map(
    (item) =>
      `• ${item.productName} (${item.quantity} ${item.unit}) - ₹${formatAmount(item.lineTotal)}`
  );

  const localizedMode = formatPaymentMode(getMessages(locale), bill.paymentMode);

  if (locale === "ta") {
    return [
      `*${bill.shop.name}*`,
      `பில் #${bill.billNumber} · ${dateStr}`,
      bill.customer ? `கஸ்டமர்: ${bill.customer.name}` : null,
      "",
      ...itemLines,
      "",
      `*மொத்தம்: ₹${formatAmount(bill.totalAmount)}* (${localizedMode})`,
      shareUrl ? `பில் லிங்க்: ${shareUrl}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  return [
    `*${bill.shop.name}*`,
    `Bill #${bill.billNumber} · ${dateStr}`,
    bill.customer ? `Customer: ${bill.customer.name}` : null,
    "",
    ...itemLines,
    "",
    `*Total: ₹${formatAmount(bill.totalAmount)}* (${localizedMode})`,
    shareUrl ? `Receipt: ${shareUrl}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
  const encodedText = encodeURIComponent(text);
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `https://wa.me/91${digits}?text=${encodedText}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return `https://wa.me/${digits}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export function buildWhatsAppShareUrl(
  bill: BillReceiptDTO,
  shareUrl: string,
  locale: Locale
): string {
  const text = buildWhatsAppReceiptText(bill, shareUrl, locale);
  return buildWhatsAppUrl(bill.customer?.phone, text);
}

export function buildWhatsAppReminderUrl(params: {
  shopName: string;
  customerName: string;
  customerPhone?: string | null;
  pendingAmount: number;
  locale: Locale;
}): string {
  const amount = formatAmount(params.pendingAmount);
  const text =
    params.locale === "ta"
      ? `வணக்கம் ${params.customerName}, ${params.shopName} கடையில் உங்கள் உதார் பாக்கி ₹${amount} உள்ளது. நன்றி!`
      : `Hi ${params.customerName}, reminder from ${params.shopName}: your pending udhaar balance is ₹${amount}. Thank you!`;

  return buildWhatsAppUrl(params.customerPhone, text);
}
