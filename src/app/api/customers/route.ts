import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isValidPhone, normalizePhone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopCustomersWithBalances } from "@/lib/udhaar";

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  balance: true,
  createdAt: true,
} as const;

export async function GET(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const customers = await getShopCustomersWithBalances(current.shop.id, q);

  return NextResponse.json({ customers }, { status: 200 });
}

interface CreateCustomerBody {
  name?: unknown;
  phone?: unknown;
}

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateCustomerBody;
  try {
    body = (await request.json()) as CreateCustomerBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = rawPhone ? normalizePhone(rawPhone) : null;

  if (!name || name.length > 120) {
    return NextResponse.json(
      { error: "Customer name is required (max 120 characters)." },
      { status: 400 }
    );
  }

  if (phone && !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid 10 to 15 digit phone number." },
      { status: 400 }
    );
  }

  if (phone) {
    const existing = await prisma.customer.findFirst({
      where: {
        shopId: current.shop.id,
        phone,
      },
      select: customerSelect,
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "A customer with this phone number already exists.",
          existingCustomer: existing,
        },
        { status: 409 }
      );
    }
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        shopId: current.shop.id,
        name,
        phone,
        balance: 0,
      },
      select: customerSelect,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A customer with this phone number already exists." },
        { status: 409 }
      );
    }
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Unable to create customer." },
      { status: 500 }
    );
  }
}

