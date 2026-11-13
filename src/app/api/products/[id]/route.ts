import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
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

interface UpdateProductBody {
  name?: unknown;
  price?: unknown;
  stockQty?: unknown;
  unit?: unknown;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
  }

  let body: UpdateProductBody;
  try {
    body = (await request.json()) as UpdateProductBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const data: {
    name?: string;
    price?: number;
    stockQty?: number;
    unit?: string;
  } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Product name must be between 1 and 120 characters." },
        { status: 400 }
      );
    }
    data.name = name;
  }

  if (body.price !== undefined) {
    const price = parseNonNegativeNumber(body.price);
    if (price === null) {
      return NextResponse.json(
        { error: "Price must be a valid non-negative number." },
        { status: 400 }
      );
    }
    data.price = Math.round(price * 100) / 100;
  }

  if (body.stockQty !== undefined) {
    const stockQty = parseNonNegativeNumber(body.stockQty);
    if (stockQty === null) {
      return NextResponse.json(
        { error: "Stock quantity must be a valid non-negative number." },
        { status: 400 }
      );
    }
    data.stockQty = roundQty(stockQty);
  }

  if (body.unit !== undefined) {
    if (typeof body.unit !== "string" || !body.unit.trim()) {
      return NextResponse.json({ error: "Invalid unit." }, { status: 400 });
    }
    data.unit = normalizeUnit(body.unit);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided to update." },
      { status: 400 }
    );
  }

  const updated = await prisma.product.updateMany({
    where: {
      id,
      shopId: current.shop.id,
      isActive: true,
    },
    data,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const product = await prisma.product.findFirst({
    where: {
      id,
      shopId: current.shop.id,
      isActive: true,
    },
    select: productSelect,
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ product }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
  }

  const archived = await prisma.product.updateMany({
    where: {
      id,
      shopId: current.shop.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  if (archived.count === 0) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

