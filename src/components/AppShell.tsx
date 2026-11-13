"use client";

import {
  BookOpenCheck,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

interface AppShellProps {
  shopName: string;
  ownerName: string | null;
  children: React.ReactNode;
}

export function AppShell({ shopName, ownerName, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { messages } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: "/bill", label: messages.nav.bill, icon: ReceiptText },
    { href: "/products", label: messages.nav.products, icon: Package },
    { href: "/udhaar", label: messages.nav.udhaar, icon: BookOpenCheck },
    { href: "/dashboard", label: messages.nav.dashboard, icon: LayoutDashboard },
  ];

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{shopName}</p>
              <p className="truncate text-xs text-slate-500">
                {ownerName ? `${ownerName} · ` : ""}
                {messages.app.name}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label={messages.auth.logout}
              title={messages.auth.logout}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{messages.auth.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav
        aria-label={messages.common.bottomNav}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-slate-200 bg-white/95 backdrop-blur"
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold transition active:bg-slate-50 ${
                  isActive
                    ? "text-emerald-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                    isActive ? "bg-emerald-100 text-emerald-700" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
