"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  IndianRupee,
  Package,
  ReceiptText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { formatPaymentMode } from "@/lib/i18n";

interface TopPendingCustomer {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
}

interface LowStockItem {
  id: string;
  name: string;
  stockQty: number;
  unit: string;
}

interface RecentBillItem {
  id: string;
  billNumber: number;
  totalAmount: number;
  paymentMode: string;
  customerName: string | null;
  createdAt: string;
}

interface DashboardViewProps {
  shopName: string;
  shopPhone: string;
  ownerName: string | null;
  todaySalesTotal: number;
  todayBillsCount: number;
  totalUdhaarPending: number;
  productsCount: number;
  topPendingCustomers: TopPendingCustomer[];
  lowStockProducts: LowStockItem[];
  recentBills: RecentBillItem[];
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function DashboardView({
  shopName,
  shopPhone,
  ownerName,
  todaySalesTotal,
  todayBillsCount,
  totalUdhaarPending,
  productsCount,
  topPendingCustomers,
  lowStockProducts,
  recentBills,
}: DashboardViewProps) {
  const { messages } = useLanguage();

  const quickActions = [
    {
      href: "/bill",
      title: messages.nav.bill,
      desc: messages.dashboard.newBillDesc,
      icon: ReceiptText,
      accent: "bg-emerald-600 text-white",
    },
    {
      href: "/products",
      title: messages.nav.products,
      desc: `${messages.dashboard.productsDesc} (${productsCount})`,
      icon: Package,
      accent: "bg-sky-50 text-sky-700",
    },
    {
      href: "/udhaar",
      title: messages.nav.udhaar,
      desc: messages.dashboard.udhaarDesc,
      icon: BookOpenCheck,
      accent: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {messages.dashboard.greeting}
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900">{shopName}</h1>
            <p className="mt-0.5 text-xs text-slate-600">
              {ownerName ? `${ownerName} · ` : ""}
              {shopPhone}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            {messages.dashboard.ownerBadge}
          </span>
        </div>
      </section>

      {/* Key KPIs: Today's Sales, Bills Today, Total Udhaar Pending */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              {messages.dashboard.todaySales}
            </p>
            <p className="mt-1.5 flex items-center text-2xl font-extrabold text-slate-900">
              <IndianRupee className="h-5 w-5 text-emerald-700" />
              <span>{formatMoney(todaySalesTotal)}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              {messages.dashboard.billsToday}
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {todayBillsCount}
            </p>
          </div>
        </div>

        <Link
          href="/udhaar"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-4 transition hover:bg-amber-50"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {messages.dashboard.pendingUdhaar}
            </p>
            <p className="mt-1 flex items-center text-2xl font-extrabold text-amber-700">
              <IndianRupee className="h-5 w-5" />
              <span>{formatMoney(totalUdhaarPending)}</span>
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-amber-700" />
        </Link>
      </section>

      {/* Top 5 Customers with Pending Balance */}
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-amber-700" />
            <span>{messages.dashboard.topPendingCustomers}</span>
          </h2>
          <Link
            href="/udhaar"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            {messages.dashboard.viewAll} →
          </Link>
        </div>

        {topPendingCustomers.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">
            {messages.dashboard.noPendingCustomers}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {topPendingCustomers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/udhaar/${customer.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 py-2 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {customer.name}
                    </p>
                    {customer.phone && (
                      <p className="text-xs text-slate-500">{customer.phone}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-sm font-extrabold text-amber-700">
                      ₹{formatMoney(customer.balance)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Low-Stock Items List */}
      <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>
              {messages.dashboard.lowStockAlerts} ({lowStockProducts.length})
            </span>
          </h2>
          <Link
            href="/products"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            {messages.dashboard.restock} →
          </Link>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">
            {messages.dashboard.noLowStock}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lowStockProducts.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="truncate font-semibold text-slate-900">
                  {item.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    item.stockQty === 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.stockQty} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick Actions */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-slate-800">
          {messages.dashboard.quickActions}
        </h2>
        <div className="space-y-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/30 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{action.title}</p>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Bills */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-slate-800">
          {messages.dashboard.recentBills}
        </h2>
        {recentBills.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
            {messages.dashboard.noBillsYet}
          </div>
        ) : (
          <ul className="space-y-2">
            {recentBills.map((bill) => (
              <li key={bill.id}>
                <Link
                  href={`/bills/${bill.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/20"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {messages.receipt.billNo}
                        {bill.billNumber}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {formatPaymentMode(messages, bill.paymentMode)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {bill.customerName ? `${bill.customerName} · ` : ""}
                      {new Date(bill.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-slate-900">
                    ₹{formatMoney(bill.totalAmount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
