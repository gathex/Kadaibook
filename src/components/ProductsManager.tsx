"use client";

import {
  AlertTriangle,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  isLowStock,
  PRODUCT_UNITS,
  roundQty,
  type ProductDTO,
} from "@/lib/products";

interface ProductsManagerProps {
  initialProducts: ProductDTO[];
}

export function ProductsManager({ initialProducts }: ProductsManagerProps) {
  const { messages } = useLanguage();
  const [products, setProducts] = useState<ProductDTO[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "low">("all");

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [unit, setUnit] = useState<string>("pcs");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deletingTarget, setDeletingTarget] = useState<ProductDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const lowStockCount = useMemo(
    () => products.filter((p) => isLowStock(p.stockQty)).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filterMode === "low" && !isLowStock(p.stockQty)) {
        return false;
      }
      if (query && !p.name.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [products, search, filterMode]);

  function openAddModal() {
    setEditingProduct(null);
    setName("");
    setPrice("");
    setStockQty("0");
    setUnit("pcs");
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(product: ProductDTO) {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setStockQty(String(product.stockQty));
    setUnit(product.unit);
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingProduct(null);
    setFormError(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stockQty);

    if (!trimmedName) {
      setFormError(messages.products.errors.nameRequired);
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError(messages.products.errors.invalidPrice);
      return;
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setFormError(messages.products.errors.invalidStock);
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingProduct);
      const url = isEditing
        ? `/api/products/${editingProduct!.id}`
        : "/api/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          price: parsedPrice,
          stockQty: parsedStock,
          unit,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        product?: ProductDTO;
        error?: string;
      };

      if (!res.ok || !data.product) {
        setFormError(data.error ?? messages.products.errors.saveFailed);
        return;
      }

      const savedProduct = data.product;
      setProducts((prev) => {
        const next = isEditing
          ? prev.map((p) => (p.id === savedProduct.id ? savedProduct : p))
          : [...prev, savedProduct];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setModalOpen(false);
      setEditingProduct(null);
    } catch {
      setFormError(messages.products.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStockChange(product: ProductDTO, delta: number) {
    if (adjustingId === product.id) return;
    const nextQty = roundQty(Math.max(0, product.stockQty + delta));
    if (nextQty === product.stockQty) return;

    setActionError(null);
    setAdjustingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQty: nextQty }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        product?: ProductDTO;
        error?: string;
      };

      if (!res.ok || !data.product) {
        setActionError(data.error ?? messages.products.errors.saveFailed);
        return;
      }

      const updated = data.product;
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch {
      setActionError(messages.products.errors.saveFailed);
    } finally {
      setAdjustingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTarget || deleting) return;
    setActionError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/products/${deletingTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setActionError(data.error ?? messages.products.errors.deleteFailed);
        return;
      }

      const deletedId = deletingTarget.id;
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));
      setDeletingTarget(null);
    } catch {
      setActionError(messages.products.errors.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {messages.products.title}
          </h1>
          <p className="text-xs text-slate-500">
            {products.length} {messages.nav.products.toLowerCase()}
            {lowStockCount > 0
              ? ` · ${lowStockCount} ${messages.products.lowStockBadge.toLowerCase()}`
              : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>{messages.products.addProduct}</span>
        </button>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={messages.products.searchPlaceholder}
            aria-label={messages.products.searchPlaceholder}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={messages.common.clearSearch}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`min-h-9 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
              filterMode === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {messages.products.allFilter} ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("low")}
            className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
              filterMode === "low"
                ? "bg-amber-600 text-white"
                : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              {messages.products.lowStockFilter} ({lowStockCount})
            </span>
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
        >
          {actionError}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-slate-900">
            {messages.products.emptyTitle}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {messages.products.emptyDesc}
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {messages.products.noMatches}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filteredProducts.map((product) => {
            const low = isLowStock(product.stockQty);
            const isOut = product.stockQty === 0;
            const busy = adjustingId === product.id;

            return (
              <li
                key={product.id}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold text-slate-900">
                        {product.name}
                      </h2>
                      {low && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isOut
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{messages.products.lowStockBadge}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                      ₹{product.price}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        / {product.unit}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      aria-label={`${messages.products.edit} ${product.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTarget(product)}
                      aria-label={`${messages.products.delete} ${product.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span
                    className={`text-xs font-semibold ${
                      low ? "text-amber-800" : "text-slate-600"
                    }`}
                  >
                    {messages.products.stockLabel}:{" "}
                    <strong className="text-sm text-slate-900">
                      {product.stockQty} {product.unit}
                    </strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy || product.stockQty <= 0}
                      onClick={() => handleQuickStockChange(product, -1)}
                      aria-label={`${messages.products.decreaseStock}: ${product.name}`}
                      className="flex h-9 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleQuickStockChange(product, 1)}
                      aria-label={`${messages.products.increaseStock}: ${product.name}`}
                      className="flex h-9 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2
                id="product-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {editingProduct
                  ? messages.products.editProduct
                  : messages.products.addProduct}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label={messages.products.cancel}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="product-name"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  {messages.products.nameLabel}
                </label>
                <input
                  id="product-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={messages.products.namePlaceholder}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="product-price"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    {messages.products.priceLabel}
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={messages.products.pricePlaceholder}
                    className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-stock"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    {messages.products.stockLabel}
                  </label>
                  <input
                    id="product-stock"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    required
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder={messages.products.stockPlaceholder}
                    className="min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {messages.products.unitLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCT_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`min-h-10 rounded-xl border text-sm font-semibold transition ${
                        unit === u
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
                >
                  {formError}
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {messages.products.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{messages.products.saving}</span>
                    </>
                  ) : (
                    messages.products.save
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="delete-modal-title"
              className="text-base font-bold text-slate-900"
            >
              {messages.products.confirmDelete}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              <strong className="text-slate-900">{deletingTarget.name}</strong>{" "}
              {messages.products.confirmDeleteDesc}
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                disabled={deleting}
                className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {messages.products.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{messages.products.deleting}</span>
                  </>
                ) : (
                  messages.products.delete
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
