import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LOW_STOCK_LIMIT,
  normalizeUnit,
  parseNonNegativeNumber,
  roundQty,
} from "@/lib/products";

const productSelect = {
  id: true,
  name: true,
  price: true,
  stockQty: true,
  unit: true,
  lowStockThreshold: true,
  updatedAt: true,
} as const;

export async function GET(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const products = await prisma.product.findMany({
    where: {
      shopId: current.shop.id,
      isActive: true,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { name: "asc" },
    select: productSelect,
  });

  return NextResponse.json({ products }, { status: 200 });
}

interface CreateProductBody {
  name?: unknown;
  price?: unknown;
  stockQty?: unknown;
  unit?: unknown;
}

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateProductBody;
  try {
    body = (await request.json()) as CreateProductBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = parseNonNegativeNumber(body.price);
  const stockQty =
    body.stockQty === undefined ? 0 : parseNonNegativeNumber(body.stockQty);
  const unit = normalizeUnit(body.unit);

  if (!name || name.length > 120) {
    return NextResponse.json(
      { error: "Product name is required (max 120 characters)." },
      { status: 400 }
    );
  }
  if (price === null) {
    return NextResponse.json(
      { error: "Price must be a valid non-negative number." },
      { status: 400 }
    );
  }
  if (stockQty === null) {
    return NextResponse.json(
      { error: "Stock quantity must be a valid non-negative number." },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      shopId: current.shop.id,
      name,
      price: Math.round(price * 100) / 100,
      stockQty: roundQty(stockQty),
      unit,
      lowStockThreshold: LOW_STOCK_LIMIT,
      isActive: true,
    },
    select: productSelect,
  });

  return NextResponse.json({ product }, { status: 201 });
}

