"use client";

import {
  Check,
  Copy,
  MessageCircle,
  PlusCircle,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { formatPaymentMode } from "@/lib/i18n";
import {
  buildWhatsAppShareUrl,
  formatAmount,
  type BillReceiptDTO,
} from "@/lib/receipt";

interface BillReceiptViewProps {
  bill: BillReceiptDTO;
  initialOrigin: string;
  isPublic?: boolean;
}

export function BillReceiptView({
  bill,
  initialOrigin,
  isPublic = false,
}: BillReceiptViewProps) {
  const { locale, messages } = useLanguage();
  const [origin, setOrigin] = useState(initialOrigin);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const sharePath = `/b/${bill.shareToken}`;
  const shareUrl = origin ? `${origin}${sharePath}` : sharePath;
  const whatsappUrl = buildWhatsAppShareUrl(bill, shareUrl, locale);

  const formattedDate = new Date(bill.createdAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors in restricted environments
    }
  }

  return (
    <div className={isPublic ? "min-h-screen bg-slate-50 px-4 py-6" : "space-y-4"}>
      {isPublic && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {messages.receipt.title}
          </span>
          <LanguageToggle />
        </div>
      )}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Shop Header */}
        <div className="border-b border-dashed border-slate-200 pb-4 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Store className="h-5 w-5" />
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            {bill.shop.name}
          </h1>
          <p className="text-xs text-slate-500">{bill.shop.phone}</p>
          {bill.shop.address && (
            <p className="mt-0.5 text-xs text-slate-500">{bill.shop.address}</p>
          )}
        </div>

        {/* Bill Metadata */}
        <div className="mt-4 space-y-1.5 border-b border-dashed border-slate-200 pb-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{messages.receipt.billNo}</span>
            <span className="font-bold text-slate-900">#{bill.billNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{messages.receipt.date}</span>
            <span className="font-medium text-slate-800">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{messages.receipt.payment}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
              {formatPaymentMode(messages, bill.paymentMode)}
            </span>
          </div>
          {bill.customer && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{messages.receipt.customer}</span>
              <span className="font-semibold text-slate-900">
                {bill.customer.name}
              </span>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="mt-4">
          <div className="grid grid-cols-12 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span className="col-span-6">{messages.receipt.item}</span>
            <span className="col-span-3 text-right">{messages.receipt.qty}</span>
            <span className="col-span-3 text-right">{messages.receipt.amount}</span>
          </div>

          <ul className="divide-y divide-slate-100">
            {bill.items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-12 items-center gap-2 py-2.5 text-sm"
              >
                <div className="col-span-6 min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {item.productName}
                  </p>
                  <p className="text-xs text-slate-500">
                    ₹{formatAmount(item.unitPrice)} / {item.unit}
                  </p>
                </div>
                <span className="col-span-3 text-right text-xs font-medium text-slate-700">
                  {item.quantity} {item.unit}
                </span>
                <span className="col-span-3 text-right font-bold text-slate-900">
                  ₹{formatAmount(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-4">
          <span className="text-base font-bold text-slate-900">
            {messages.receipt.total}
          </span>
          <span className="text-2xl font-extrabold text-emerald-700">
            ₹{formatAmount(bill.totalAmount)}
          </span>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          {messages.receipt.thankYou}
        </p>
      </article>

      {/* Actions */}
      <div className={isPublic ? "mt-4 space-y-2.5" : "space-y-2.5"}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{messages.receipt.shareWhatsApp}</span>
        </a>

        {!isPublic && (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{messages.receipt.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{messages.receipt.copyLink}</span>
                </>
              )}
            </button>

            <Link
              href="/bill"
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{messages.receipt.newBill}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

