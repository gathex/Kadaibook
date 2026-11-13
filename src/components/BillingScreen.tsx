"use client";

import {
  Banknote,
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Smartphone,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatPaymentMode } from "@/lib/i18n";
import { roundQty } from "@/lib/products";

export interface BillingProduct {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  unit: string;
}

export interface BillingCustomer {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
}

type PaymentMode = "CASH" | "UPI" | "UDHAAR";

interface SavedBillSummary {
  id: string;
  billNumber: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
  } | null;
  itemsCount: number;
}

interface BillingScreenProps {
  initialProducts: BillingProduct[];
  initialCustomers: BillingCustomer[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function BillingScreen({
  initialProducts,
  initialCustomers,
}: BillingScreenProps) {
  const router = useRouter();
  const { messages } = useLanguage();

  const [products, setProducts] = useState<BillingProduct[]>(initialProducts);
  const [customers, setCustomers] = useState<BillingCustomer[]>(initialCustomers);

  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");

  // Udhaar customer selection & quick add
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const [savingBill, setSavingBill] = useState(false);
  const [billError, setBillError] = useState<string | null>(null);
  const [savedBill, setSavedBill] = useState<SavedBillSummary | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const cartEntries = useMemo(() => {
    const rows: Array<{ product: BillingProduct; qty: number; lineTotal: number }> = [];
    for (const [productId, qty] of Object.entries(cart)) {
      const product = productMap.get(productId);
      if (product && qty > 0) {
        rows.push({
          product,
          qty,
          lineTotal: roundMoney(product.price * qty),
        });
      }
    }
    return rows;
  }, [cart, productMap]);

  const totalAmount = useMemo(
    () =>
      roundMoney(cartEntries.reduce((sum, entry) => sum + entry.lineTotal, 0)),
    [cartEntries]
  );

  const totalItemsCount = useMemo(
    () => roundQty(cartEntries.reduce((sum, entry) => sum + entry.qty, 0)),
    [cartEntries]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  function addProductTap(product: BillingProduct) {
    setBillError(null);
    setCart((prev) => {
      const currentQty = prev[product.id] ?? 0;
      if (currentQty >= product.stockQty) {
        return prev;
      }
      const step = Math.min(1, roundQty(product.stockQty - currentQty));
      if (step <= 0) return prev;
      return {
        ...prev,
        [product.id]: roundQty(currentQty + step),
      };
    });
  }

  function updateCartQty(product: BillingProduct, delta: number) {
    setBillError(null);
    setCart((prev) => {
      const currentQty = prev[product.id] ?? 0;
      const nextQty = roundQty(currentQty + delta);
      if (nextQty <= 0) {
        const rest = { ...prev };
        delete rest[product.id];
        return rest;
      }
      const clamped = Math.min(nextQty, product.stockQty);
      return {
        ...prev,
        [product.id]: clamped,
      };
    });
  }

  function clearCart() {
    setCart({});
    setBillError(null);
  }

  async function handleQuickAddCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomerError(null);

    const trimmedName = newCustomerName.trim();
    if (!trimmedName) {
      setCustomerError(messages.bill.errors.customerNameRequired);
      return;
    }

    setAddingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: newCustomerPhone.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        customer?: BillingCustomer;
        existingCustomer?: BillingCustomer;
        error?: string;
      };

      if (res.status === 409 && data.existingCustomer) {
        const existing = data.existingCustomer;
        setCustomers((prev) =>
          prev.some((c) => c.id === existing.id) ? prev : [existing, ...prev]
        );
        setSelectedCustomerId(existing.id);
        setShowAddCustomer(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        return;
      }

      if (!res.ok || !data.customer) {
        setCustomerError(data.error ?? messages.bill.errors.saveFailed);
        return;
      }

      const created = data.customer;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      setShowAddCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setCustomerSearch("");
    } catch {
      setCustomerError(messages.bill.errors.saveFailed);
    } finally {
      setAddingCustomer(false);
    }
  }

  async function handleSaveBill() {
    setBillError(null);

    if (cartEntries.length === 0) {
      setBillError(messages.bill.errors.emptyCart);
      return;
    }

    if (paymentMode === "UDHAAR" && !selectedCustomerId) {
      setBillError(messages.bill.errors.customerRequired);
      return;
    }

    setSavingBill(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartEntries.map((entry) => ({
            productId: entry.product.id,
            quantity: entry.qty,
          })),
          paymentMode,
          customerId: paymentMode === "UDHAAR" ? selectedCustomerId : null,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        bill?: {
          id: string;
          billNumber: number;
          totalAmount: number;
          paymentMode: PaymentMode;
          customer: BillingCustomer | null;
          items: Array<{ id: string }>;
        };
        updatedStocks?: Array<{ id: string; stockQty: number }>;
        error?: string;
      };

      if (!res.ok || !data.bill) {
        setBillError(data.error ?? messages.bill.errors.saveFailed);
        return;
      }

      if (data.updatedStocks) {
        const stockMap = new Map(
          data.updatedStocks.map((s) => [s.id, s.stockQty])
        );
        setProducts((prev) =>
          prev.map((p) =>
            stockMap.has(p.id)
              ? { ...p, stockQty: stockMap.get(p.id)! }
              : p
          )
        );
      }

      const savedCustomer = data.bill.customer;
      if (savedCustomer) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === savedCustomer.id
              ? { ...c, balance: savedCustomer.balance }
              : c
          )
        );
      }

      setSavedBill({
        id: data.bill.id,
        billNumber: data.bill.billNumber,
        totalAmount: data.bill.totalAmount,
        paymentMode: data.bill.paymentMode,
        customer: savedCustomer,
        itemsCount: data.bill.items.length,
      });

      setCart({});
      setSelectedCustomerId(null);
      setPaymentMode("CASH");
      setProductSearch("");
      router.refresh();
    } catch {
      setBillError(messages.bill.errors.saveFailed);
    } finally {
      setSavingBill(false);
    }
  }

  if (savedBill) {
    return (
      <div className="space-y-4 pt-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            {messages.bill.savedTitle}
          </h1>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {messages.bill.billNumber}
            {savedBill.billNumber} · {formatPaymentMode(messages, savedBill.paymentMode)}
          </p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            ₹{savedBill.totalAmount.toFixed(2).replace(/\.00$/, "")}
          </p>
          {savedBill.customer && (
            <p className="mt-2 text-sm text-slate-700">
              {savedBill.customer.name} · {messages.bill.udhaar}: ₹
              {savedBill.customer.balance.toFixed(2).replace(/\.00$/, "")}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <Link
            href={`/bills/${savedBill.id}`}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600 bg-white px-5 py-3 text-base font-bold text-emerald-700 transition hover:bg-emerald-50 active:scale-[0.99]"
          >
            <ReceiptText className="h-5 w-5" />
            <span>{messages.bill.viewReceipt}</span>
          </Link>

          <button
            type="button"
            onClick={() => setSavedBill(null)}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            {messages.bill.newBill}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{messages.bill.title}</h1>
        <p className="text-xs text-slate-500">{messages.bill.subtitle}</p>
      </div>

      {/* Product Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder={messages.bill.searchProducts}
          aria-label={messages.bill.searchProducts}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        />
        {productSearch && (
          <button
            type="button"
            onClick={() => setProductSearch("")}
            aria-label={messages.common.clearSearch}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tap-to-add Product Grid */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          {messages.bill.noProducts}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          {messages.bill.noMatchingProducts}
        </div>
      ) : (
        <div className="grid max-h-64 grid-cols-2 gap-2.5 overflow-y-auto pr-0.5">
          {filteredProducts.map((product) => {
            const qtyInCart = cart[product.id] ?? 0;
            const outOfStock = product.stockQty <= 0;
            const maxedOut = qtyInCart >= product.stockQty;

            return (
              <button
                key={product.id}
                type="button"
                disabled={outOfStock || maxedOut}
                onClick={() => addProductTap(product)}
                className={`relative flex min-h-[78px] flex-col justify-between rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                  outOfStock
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                    : qtyInCart > 0
                      ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 text-sm font-bold text-slate-900">
                    {product.name}
                  </span>
                  {qtyInCart > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                      ×{qtyInCart}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <span className="text-sm font-bold text-emerald-700">
                    ₹{product.price}
                    <span className="text-[11px] font-normal text-slate-500">
                      /{product.unit}
                    </span>
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      outOfStock ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    {outOfStock
                      ? messages.bill.outOfStock
                      : `${product.stockQty} ${messages.bill.left}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bill Cart */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {messages.bill.cartTitle} ({cartEntries.length})
          </h2>
          {cartEntries.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{messages.bill.clearCart}</span>
            </button>
          )}
        </div>

        {cartEntries.length === 0 ? (
          <p className="py-5 text-center text-xs text-slate-500">
            {messages.bill.emptyCart}
          </p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {cartEntries.map(({ product, qty, lineTotal }) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    ₹{product.price} × {qty} {product.unit} ={" "}
                    <strong className="text-slate-900">
                      ₹{lineTotal.toFixed(2).replace(/\.00$/, "")}
                    </strong>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCartQty(product, -1)}
                    aria-label={`${messages.bill.decreaseQty}: ${product.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-800 transition hover:bg-slate-100 active:scale-95"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="min-w-[2.25rem] text-center text-base font-bold text-slate-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    disabled={qty >= product.stockQty}
                    onClick={() => updateCartQty(product, 1)}
                    aria-label={`${messages.bill.increaseQty}: ${product.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:opacity-40"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Running Total & Payment Mode */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {messages.bill.total}
            </p>
            <p className="text-xs text-slate-500">
              {totalItemsCount} {messages.bill.items}
            </p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            ₹{totalAmount.toFixed(2).replace(/\.00$/, "")}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            {messages.bill.paymentMode}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { mode: "CASH", label: messages.bill.cash, icon: Banknote },
                { mode: "UPI", label: messages.bill.upi, icon: Smartphone },
                { mode: "UDHAAR", label: messages.bill.udhaar, icon: BookOpenCheck },
              ] as const
            ).map(({ mode, label, icon: Icon }) => {
              const active = paymentMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPaymentMode(mode);
                    setBillError(null);
                  }}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold transition active:scale-95 ${
                    active
                      ? mode === "UDHAAR"
                        ? "border-amber-600 bg-amber-50 text-amber-800"
                        : "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Udhaar Customer Picker / Quick Add */}
        {paymentMode === "UDHAAR" && (
          <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-amber-900">
                {messages.bill.selectCustomer}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomer((prev) => !prev);
                  setCustomerError(null);
                }}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{messages.bill.quickAddCustomer}</span>
              </button>
            </div>

            {showAddCustomer && (
              <form
                onSubmit={handleQuickAddCustomer}
                className="space-y-2.5 rounded-xl border border-amber-200 bg-white p-3"
              >
                <div>
                  <label
                    htmlFor="quick-customer-name"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    {messages.bill.customerName}
                  </label>
                  <input
                    id="quick-customer-name"
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder={messages.bill.customerNamePlaceholder}
                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="quick-customer-phone"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    {messages.bill.customerPhone}
                  </label>
                  <input
                    id="quick-customer-phone"
                    type="tel"
                    inputMode="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder={messages.bill.customerPhonePlaceholder}
                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                {customerError && (
                  <p className="text-xs font-medium text-rose-700">
                    {customerError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    {messages.bill.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={addingCustomer}
                    className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {addingCustomer ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{messages.bill.addingCustomer}</span>
                      </>
                    ) : (
                      messages.bill.addCustomer
                    )}
                  </button>
                </div>
              </form>
            )}

            {customers.length > 0 && (
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={messages.bill.searchCustomer}
                aria-label={messages.bill.searchCustomer}
                className="min-h-10 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none"
              />
            )}

            {customers.length === 0 ? (
              <p className="py-2 text-center text-xs text-amber-800">
                {messages.bill.noCustomers}
              </p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {filteredCustomers.map((customer) => {
                  const selected = selectedCustomer?.id === customer.id;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setBillError(null);
                      }}
                      className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                        selected
                          ? "border-amber-600 bg-white ring-2 ring-amber-500/30"
                          : "border-amber-100 bg-white/80 hover:bg-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {customer.name}
                        </p>
                        {customer.phone && (
                          <p className="text-xs text-slate-500">{customer.phone}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-amber-700">
                        ₹{customer.balance.toFixed(0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {billError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
          >
            {billError}
          </div>
        )}

        <button
          type="button"
          disabled={savingBill || cartEntries.length === 0}
          onClick={handleSaveBill}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingBill ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{messages.bill.savingBill}</span>
            </>
          ) : (
            <span>
              {messages.bill.saveBill}
              {totalAmount > 0
                ? ` · ₹${totalAmount.toFixed(2).replace(/\.00$/, "")}`
                : ""}
            </span>
          )}
        </button>
      </section>
    </div>
  );
}

