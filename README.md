# KadaiBook (கடைபுக்) 📦🧾

A fast, mobile-friendly shop billing, inventory, and udhaar (credit ledger) management web application built for local Indian retail and kirana shops.

## Features

- **⚡ Fast Mobile Billing:** Tap-to-add product grid, quick quantity steppers (`+` / `-`), running totals, and payment modes (**Cash**, **UPI**, **Udhaar**).
- **📦 Products & Inventory:** Full CRUD for shop products, unit configuration, stock tracking, and automated low-stock warnings (≤ 5 units).
- **📒 Customers & Udhaar Ledger:** Real-time customer balance calculations, payment recording with receipt notes, and transaction history.
- **📲 WhatsApp Integration:** One-click instant sharing of bill receipts (`wa.me`) and gentle udhaar payment reminders to customers.
- **🌐 Bilingual UI (English & தமிழ்):** Full bilingual support with persistent language preferences per user, written in natural everyday shopkeeper Tamil (e.g., `பில்`, `உதார்`, `பாக்கி`, `ஸ்டாக்`, `கேஷ்`).
- **📊 Shop Dashboard:** Daily sales metrics, bill counts, total outstanding udhaar, top pending customers, and low-stock alerts.
- **🔒 Multi-Tenant Auth:** Isolated shop data per shop owner with phone number and bcrypt password authentication.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions & Route Handlers)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Lucide Icons
- **Database & ORM:** SQLite via Prisma ORM
- **Security:** bcryptjs, HMAC-SHA256 HttpOnly session cookies, multi-tenant scoped queries

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database:**
   ```bash
   npx prisma db push
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

