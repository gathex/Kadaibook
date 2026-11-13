# KadaiBook v0.1 Implementation Plan

Mobile-first billing, udhaar (credit ledger), and stock app for small Indian shops with Tamil and English UI, built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma + SQLite.

## Architecture & Multi-Tenancy
- **Database (`prisma/schema.prisma`)**: SQLite with `shop_id` on every tenant-owned table (`users`, `products`, `customers`, `bills`, `bill_items`, `udhaar_transactions`) plus `shops` as the tenant root.
- **Tenant Isolation**: Every server query and mutation derives `shopId` from the verified HTTP-only session cookie (`src/lib/auth.ts`) — never from client input.
- **Mobile-First Shell**: Max-width `448px` (`max-w-md`) container, large tap targets (`min-h-12`), sticky bottom navigation (`Home`, `New Bill`, `Stock`, `Udhaar`), and top header with instant `EN / தமிழ்` toggle.

## Step-by-Step Build Order
1. **i18n Foundation + Auth (Signup & Login)**
   - Implement `src/lib/i18n.ts` + complete `en.json` / `ta.json` + cookie/client language toggle (`EN / தமிழ்`).
   - Implement `src/lib/auth.ts` (scrypt password hashing, HMAC-SHA256 signed HTTP-only session cookie).
   - Build `/api/auth/signup` (creates `Shop` + `User` atomically), `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
   - Build `/login` and `/signup` mobile-first pages and route protection.
   - Verify: signup, login, session persistence, logout.

2. **Products & Stock Management**
   - Build `/api/products` (`GET`, `POST`) and `/api/products/[id]` (`PATCH`, `DELETE` soft-archive or safe delete).
   - Build `/products` page with quick search, add/edit bottom-sheet/modal, big `+` / `-` stock adjustment buttons, unit selector (`pcs`, `kg`, `g`, `L`, `ml`, `pack`), and low-stock badge.
   - Verify: CRUD operations scoped to `shop_id`.

3. **Fast Billing Screen (< 20s flow)**
   - Build `/api/bills` (`POST` inside `prisma.$transaction`: generate sequential `billNumber` per shop, verify/decrement product `stockQty`, create `Bill` + `BillItem[]`, and if `paymentMode === "UDHAAR"`, require `customerId`, increment `Customer.balance`, and create a `DEBIT` `UdhaarTransaction`).
   - Build `/bill` page: instant product search + 1-tap quick-add product tiles, big `−` / `+` quantity stepper (with decimal support for `kg`/`L`), live total bar, 3 big payment buttons (`Cash`, `UPI`, `Udhaar`), and quick inline customer picker/creator when `Udhaar` is chosen.
   - Verify: cash/UPI/udhaar bill creation, atomic stock deduction, and udhaar balance update.

4. **Customers + Udhaar Ledger**
   - Build `/api/customers` (`GET`, `POST`), `/api/customers/[id]` (`GET` details + ledger history), and `/api/customers/[id]/payments` (`POST` inside `prisma.$transaction`: record `CREDIT` `UdhaarTransaction`, decrement `Customer.balance`).
   - Build `/customers` list (sorted by highest pending balance, search by name/phone, quick add customer) and `/customers/[id]` ledger timeline with big "Record Payment" button (`Cash` / `UPI`).
   - Verify: adding customer, udhaar bill debit, partial/full payment credit, balance accuracy.

5. **Bill View & WhatsApp Share**
   - Build `/bills/[id]` (authenticated shop view) and `/b/[shareToken]` (public shareable receipt view using unguessable `shareToken`).
   - Generate pre-formatted Tamil/English receipt text and `https://wa.me/...` link (using customer phone if available, or generic `https://wa.me/?text=...` so the shopkeeper picks any WhatsApp contact).
   - Verify: receipt rendering and `wa.me` link formatting.

6. **Dashboard**
   - Build `/` (or `/dashboard`) showing today's sales total & bill count, total udhaar pending across all customers, low-stock item alerts with 1-tap jump to restock, and recent bills.
   - Verify: accurate aggregates scoped to `shop_id` and local day boundaries.

7. **Full i18n Pass & End-to-End Verification**
   - Audit every screen for missing translation keys in both `en.json` and `ta.json`.
   - Run TypeScript typecheck, production `next build`, and end-to-end API/UI flow checks across all features.

