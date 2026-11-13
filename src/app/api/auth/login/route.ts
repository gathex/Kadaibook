import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  isValidPhone,
  normalizePhone,
  setLocaleCookie,
  verifyPassword,
} from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

interface LoginBody {
  phone?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const rawPhone = typeof body.phone === "string" ? body.phone : "";
  const phone = normalizePhone(rawPhone);
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidPhone(phone) || !password) {
    return NextResponse.json(
      { error: "Phone number and password are required." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        shopId: true,
        preferredLocale: true,
        passwordHash: true,
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid phone number or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid phone number or password." },
        { status: 401 }
      );
    }

    const preferredLocale = normalizeLocale(user.preferredLocale);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          shopId: user.shopId,
          preferredLocale,
        },
        shop: user.shop,
      },
      { status: 200 }
    );

    await attachSessionCookie(response, {
      userId: user.id,
      shopId: user.shopId,
      role: user.role,
    });
    setLocaleCookie(response, preferredLocale);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }
}

