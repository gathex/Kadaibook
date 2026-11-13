"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  IndianRupee,
  Loader2,
  MessageCircle,
  Phone,
  ReceiptText,
  Smartphone,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatPaymentMode } from "@/lib/i18n";
import { buildWhatsAppReminderUrl } from "@/lib/receipt";
import type {
  CustomerDetailDTO,
  CustomerHistoryEntry,
} from "@/lib/udhaar";

interface CustomerDetailViewProps {
  shopName: string;
  initialDetail: CustomerDetailDTO;
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomerDetailView({
  shopName,
  initialDetail,
}: CustomerDetailViewProps) {
  const router = useRouter();
  const { locale, messages } = useLanguage();

  const [customer, setCustomer] = useState(initialDetail.customer);
  const [history, setHistory] = useState<CustomerHistoryEntry[]>(
    initialDetail.history
  );
  const [historyFilter, setHistoryFilter] = useState<"all" | "bills" | "payments">(
    "all"
  );

  // Payment received modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI">("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "bills") {
      return history.filter((entry) => entry.kind === "BILL");
    }
    if (historyFilter === "payments") {
      return history.filter((entry) => entry.kind === "PAYMENT");
    }
    return history;
  }, [history, historyFilter]);

  function openPaymentModal() {
    setAmount(customer.balance > 0 ? String(customer.balance) : "");
    setPaymentMode("CASH");
    setNote("");
    setPaymentError(null);
    setPaymentModalOpen(true);
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPaymentError(messages.udhaar.errors.invalidAmount);
      return;
    }
    if (parsedAmount > customer.balance) {
      setPaymentError(messages.udhaar.errors.exceedsBalance);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          paymentMode,
          note: note.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        payment?: CustomerHistoryEntry;
        summary?: {
          totalUdhaarBills: number;
          totalPayments: number;
          balance: number;
        };
        error?: string;
      };

      if (!res.ok || !data.payment || !data.summary) {
        setPaymentError(data.error ?? messages.udhaar.errors.generic);
        return;
      }

      const newPayment = data.payment;
      const summary = data.summary;
      setCustomer((prev) => ({
        ...prev,
        totalUdhaarBills: summary.totalUdhaarBills,
        totalPayments: summary.totalPayments,
        balance: summary.balance,
      }));
      setHistory((prev) => [newPayment, ...prev]);
      setPaymentModalOpen(false);
      router.refresh();
    } catch {
      setPaymentError(messages.udhaar.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/udhaar"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{messages.udhaar.backToList}</span>
      </Link>

      {/* Customer Balance Summary Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900">
              {customer.name}
            </h1>
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{customer.phone}</span>
              </a>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              customer.balance > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {customer.balance > 0
              ? messages.udhaar.pendingFilter
              : messages.udhaar.settled}
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {messages.udhaar.outstandingBalance}
          </p>
          <p
            className={`mt-1 flex items-center text-3xl font-extrabold ${
              customer.balance > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            <IndianRupee className="h-6 w-6" />
            <span>{formatMoney(customer.balance)}</span>
          </p>
          <div className="mt-2.5 flex items-center gap-4 border-t border-slate-200 pt-2.5 text-xs text-slate-600">
            <span>
              {messages.udhaar.totalBills}:{" "}
              <strong className="text-slate-900">
                ₹{formatMoney(customer.totalUdhaarBills)}
              </strong>
            </span>
            <span>
              {messages.udhaar.totalPaid}:{" "}
              <strong className="text-emerald-700">
                ₹{formatMoney(customer.totalPayments)}
              </strong>
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            disabled={customer.balance <= 0}
            onClick={openPaymentModal}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <IndianRupee className="h-5 w-5" />
            <span>{messages.udhaar.paymentReceivedBtn}</span>
          </button>

          {customer.balance > 0 && (
            <a
              href={buildWhatsAppReminderUrl({
                shopName,
                customerName: customer.name,
                customerPhone: customer.phone,
                pendingAmount: customer.balance,
                locale,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.99]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{messages.udhaar.remindWhatsApp}</span>
            </a>
          )}
        </div>
      </section>

      {/* Bills & Payments History */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {messages.udhaar.historyTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { key: "all", label: messages.udhaar.filterAll },
              { key: "bills", label: messages.udhaar.filterBills },
              { key: "payments", label: messages.udhaar.filterPayments },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setHistoryFilter(tab.key)}
              className={`min-h-9 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                historyFilter === tab.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            {messages.udhaar.noHistory}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filteredHistory.map((entry) => {
              if (entry.kind === "BILL") {
                const isUdhaar = entry.paymentMode === "UDHAAR";
                return (
                  <li
                    key={`bill-${entry.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isUdhaar
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isUdhaar ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ReceiptText className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/bills/${entry.id}`}
                              className="text-sm font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                            >
                              {messages.udhaar.billLabel}
                              {entry.billNumber}
                            </Link>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isUdhaar
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {formatPaymentMode(messages, entry.paymentMode)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatTimestamp(entry.createdAt)}
                          </p>
                        </div>
                      </div>

                      <p
                        className={`text-base font-extrabold ${
                          isUdhaar ? "text-amber-700" : "text-slate-700"
                        }`}
                      >
                        {isUdhaar ? "+" : ""}₹{formatMoney(entry.amount)}
                      </p>
                    </div>

                    {entry.items.length > 0 && (
                      <div className="mt-2.5 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        {entry.items
                          .map(
                            (it) =>
                              `${it.productName} × ${it.quantity} ${it.unit}`
                          )
                          .join(", ")}
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li
                  key={`payment-${entry.id}`}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <ArrowDownLeft className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {messages.udhaar.paymentLabel}
                          </p>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {formatPaymentMode(messages, entry.paymentMode)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatTimestamp(entry.createdAt)}
                        </p>
                        {entry.note && entry.note !== "Payment received" && (
                          <p className="mt-1 text-xs text-slate-600">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-base font-extrabold text-emerald-700">
                      −₹{formatMoney(entry.amount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2
                id="payment-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {messages.udhaar.paymentReceivedBtn}
              </h2>
              <button
                type="button"
                onClick={() => !saving && setPaymentModalOpen(false)}
                aria-label={messages.udhaar.cancel}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4" noValidate>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="payment-amount"
                    className="text-sm font-semibold text-slate-700"
                  >
                    {messages.udhaar.paymentAmount}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmount(String(customer.balance))}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    {messages.udhaar.fullBalance}: ₹{formatMoney(customer.balance)}
                  </button>
                </div>
                <input
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={customer.balance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-lg font-bold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">
                  {messages.udhaar.paymentMode}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("CASH")}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
                      paymentMode === "CASH"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>{messages.udhaar.cash}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("UPI")}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
                      paymentMode === "UPI"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>{messages.udhaar.upi}</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-note"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  {messages.udhaar.note}
                </label>
                <input
                  id="payment-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={messages.udhaar.notePlaceholder}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {paymentError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
                >
                  {paymentError}
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={saving}
                  className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {messages.udhaar.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{messages.udhaar.saving}</span>
                    </>
                  ) : (
                    messages.udhaar.confirmPayment
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

