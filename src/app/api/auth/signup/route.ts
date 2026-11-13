import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  hashPassword,
  isValidPhone,
  normalizePhone,
  setLocaleCookie,
} from "@/lib/auth";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

interface SignupBody {
  shopName?: unknown;
  ownerName?: unknown;
  phone?: unknown;
  password?: unknown;
  address?: unknown;
  locale?: unknown;
}

export async function POST(request: NextRequest) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";
  const ownerName =
    typeof body.ownerName === "string" && body.ownerName.trim().length > 0
      ? body.ownerName.trim()
      : null;
  const address =
    typeof body.address === "string" && body.address.trim().length > 0
      ? body.address.trim()
      : null;
  const rawPhone = typeof body.phone === "string" ? body.phone : "";
  const phone = normalizePhone(rawPhone);
  const password = typeof body.password === "string" ? body.password : "";
  const preferredLocale = normalizeLocale(
    typeof body.locale === "string"
      ? body.locale
      : request.cookies.get(LOCALE_COOKIE)?.value
  );

  if (shopName.length < 2) {
    return NextResponse.json(
      { error: "Shop name must be at least 2 characters." },
      { status: 400 }
    );
  }

  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid 10 to 15 digit phone number." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const created = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: shopName,
          phone,
          address,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
        },
      });

      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          name: ownerName,
          phone,
          passwordHash,
          role: "OWNER",
          preferredLocale,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          shopId: true,
          preferredLocale: true,
        },
      });

      return { shop, user };
    });

    const response = NextResponse.json(
      { user: created.user, shop: created.shop },
      { status: 201 }
    );

    await attachSessionCookie(response, {
      userId: created.user.id,
      shopId: created.shop.id,
      role: created.user.role,
    });
    setLocaleCookie(response, preferredLocale);

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Unable to create shop account. Please try again." },
      { status: 500 }
    );
  }
}

