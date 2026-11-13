"use client";

import {
  ChevronRight,
  IndianRupee,
  Loader2,
  MessageCircle,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { buildWhatsAppReminderUrl } from "@/lib/receipt";
import { roundMoney, type CustomerSummaryDTO } from "@/lib/udhaar";

interface UdhaarListProps {
  shopName: string;
  initialCustomers: CustomerSummaryDTO[];
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function UdhaarList({ shopName, initialCustomers }: UdhaarListProps) {
  const { locale, messages } = useLanguage();
  const [customers, setCustomers] = useState<CustomerSummaryDTO[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pending">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalPending = useMemo(
    () => roundMoney(customers.reduce((sum, c) => sum + c.balance, 0)),
    [customers]
  );

  const pendingCount = useMemo(
    () => customers.filter((c) => c.balance > 0).length,
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filterMode === "pending" && c.balance <= 0) {
        return false;
      }
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !(c.phone && c.phone.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [customers, search, filterMode]);

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(messages.udhaar.errors.nameRequired);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: phone.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        customer?: {
          id: string;
          name: string;
          phone: string | null;
          balance: number;
          createdAt: string;
        };
        error?: string;
      };

      if (!res.ok || !data.customer) {
        setFormError(data.error ?? messages.udhaar.errors.generic);
        return;
      }

      const created: CustomerSummaryDTO = {
        id: data.customer.id,
        name: data.customer.name,
        phone: data.customer.phone,
        totalUdhaarBills: 0,
        totalPayments: 0,
        balance: 0,
        createdAt: data.customer.createdAt,
      };

      setCustomers((prev) =>
        [created, ...prev].sort((a, b) => {
          if (b.balance !== a.balance) return b.balance - a.balance;
          return a.name.localeCompare(b.name);
        })
      );
      setModalOpen(false);
      setName("");
      setPhone("");
    } catch {
      setFormError(messages.udhaar.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {messages.udhaar.title}
          </h1>
          <p className="text-xs text-slate-500">
            {customers.length} {messages.udhaar.customersCount}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setName("");
            setPhone("");
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
        >
          <UserPlus className="h-4 w-4" />
          <span>{messages.udhaar.addCustomer}</span>
        </button>
      </div>

      {/* Total Pending Summary */}
      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          {messages.udhaar.totalPending}
        </p>
        <p className="mt-1 flex items-center text-3xl font-extrabold text-slate-900">
          <IndianRupee className="h-6 w-6 text-amber-700" />
          <span>{formatMoney(totalPending)}</span>
        </p>
      </section>

      {/* Search & Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={messages.udhaar.searchPlaceholder}
            aria-label={messages.udhaar.searchPlaceholder}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={messages.common.clearSearch}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`min-h-9 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
              filterMode === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {messages.udhaar.allFilter} ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("pending")}
            className={`min-h-9 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
              filterMode === "pending"
                ? "bg-amber-600 text-white"
                : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            {messages.udhaar.pendingFilter} ({pendingCount})
          </button>
        </div>
      </div>

      {/* Customer List */}
      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-slate-900">
            {messages.udhaar.emptyTitle}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {messages.udhaar.emptyDesc}
          </p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {messages.udhaar.noMatches}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filteredCustomers.map((customer) => {
            const hasBalance = customer.balance > 0;
            const remindUrl = hasBalance
              ? buildWhatsAppReminderUrl({
                  shopName,
                  customerName: customer.name,
                  customerPhone: customer.phone,
                  pendingAmount: customer.balance,
                  locale,
                })
              : null;

            return (
              <li
                key={customer.id}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
              >
                <Link
                  href={`/udhaar/${customer.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 transition hover:opacity-90"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-slate-900">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {customer.phone ?? "—"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      {hasBalance ? (
                        <p className="text-base font-extrabold text-amber-700">
                          ₹{formatMoney(customer.balance)}
                        </p>
                      ) : (
                        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {messages.udhaar.settled}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>

                {remindUrl && (
                  <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                    <a
                      href={remindUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{messages.udhaar.remindWhatsApp}</span>
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2
                id="add-customer-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {messages.udhaar.addCustomer}
              </h2>
              <button
                type="button"
                onClick={() => !saving && setModalOpen(false)}
                aria-label={messages.udhaar.cancel}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="udhaar-customer-name"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  {messages.udhaar.customerName}
                </label>
                <input
                  id="udhaar-customer-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={messages.udhaar.customerNamePlaceholder}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <label
                  htmlFor="udhaar-customer-phone"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  {messages.udhaar.customerPhone}
                </label>
                <input
                  id="udhaar-customer-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={messages.udhaar.customerPhonePlaceholder}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
                >
                  {formError}
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                    messages.udhaar.saveCustomer
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

