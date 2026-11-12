"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SelectableProduct = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  stock: number;
  category: string;
  assignedToCurrentSeller: boolean;
};

export default function SelectProductsForm({
  products,
}: {
  products: SelectableProduct[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(
        products
          .filter((product) => product.assignedToCurrentSeller)
          .map((product) => product.id)
      )
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function toggleProduct(productId: string) {
    setError("");
    setSuccess("");

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  async function submitSelection() {
    setError("");
    setSuccess("");
    if (selectedIds.size === 0) {
      setError("Select at least one product.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/seller/assign-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedIds) }),
      });
      const payload: unknown = await response.json();
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "Unable to assign selected products.";

      if (!response.ok) {
        throw new Error(message);
      }

      setSuccess("Selected products were added to your seller dashboard.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to assign selected products. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-label="Available products">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm font-medium text-slate-700">
          {selectedIds.size} selected
        </p>
        <button
          type="button"
          onClick={() => void submitSelection()}
          disabled={isSubmitting || selectedIds.size === 0}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Selected Products"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No products are available yet.
        </div>
      ) : (
        <ul className="grid gap-3">
          {products.map((product) => {
            const isSelected = selectedIds.has(product.id);

            return (
              <li key={product.id}>
                <label
                  className="flex cursor-pointer gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isSubmitting}
                    onChange={() => toggleProduct(product.id)}
                    className="mt-1 size-4 shrink-0 accent-indigo-600"
                    aria-label={`Select ${product.name}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {product.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        $
                        {product.priceUsd.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-indigo-600">
                      {product.category} · Stock: {product.stock}
                    </span>
                    <span className="mt-2 block text-sm text-slate-600">
                      {product.description}
                    </span>
                    {product.assignedToCurrentSeller && (
                      <span className="mt-2 block text-xs font-medium text-emerald-700">
                        Already assigned to you
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
