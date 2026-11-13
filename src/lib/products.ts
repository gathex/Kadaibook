export const PRODUCT_UNITS = ["pcs", "kg", "g", "L", "ml", "pack"] as const;
export const LOW_STOCK_LIMIT = 5;

export interface ProductDTO {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  unit: string;
  lowStockThreshold: number;
  updatedAt: string;
}

export function isLowStock(stockQty: number): boolean {
  return stockQty <= LOW_STOCK_LIMIT;
}

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

export function normalizeUnit(raw: unknown): string {
  if (typeof raw !== "string") return "pcs";
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 20) return "pcs";
  return trimmed;
}

