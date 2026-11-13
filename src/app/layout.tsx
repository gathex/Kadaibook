import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getCurrentUser } from "@/lib/auth";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "KadaiBook — Billing, Udhaar & Stock",
  description:
    "Fast mobile-first billing, udhaar credit ledger, and stock app for small Indian shops.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, cookieStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
  ]);

  const locale =
    currentUser?.user.preferredLocale ??
    normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-slate-50">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
          <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
        </div>
      </body>
    </html>
  );
}
