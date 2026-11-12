"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProductOption = {
  id: string;
  name: string;
  stock: number;
};

type SellerOption = {
  id: string;
  name: string | null;
  email: string;
};

export default function ManualOrderForm({
  products,
  sellers,
}: {
  products: ProductOption[];
  sellers: SellerOption[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.get("customerName"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          productId: formData.get("productId"),
          sellerId: formData.get("sellerId"),
        }),
      });

      const body: unknown = await response.json();
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "Unable to create the order.";

      if (!response.ok) {
        throw new Error(message);
      }

      form.reset();
      setIsOpen(false);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={products.length === 0 || sellers.length === 0}
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        type="button"
      >
        Create Manual Order
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="manual-order-title"
            aria-modal="true"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <h2
              className="text-xl font-bold text-slate-900"
              id="manual-order-title"
            >
              Create Manual Order
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The selected product’s current price and stock will be used.
            </p>

            <form className="mt-6 grid gap-4" onSubmit={createOrder}>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Customer Name
                <input
                  autoComplete="name"
                  className={inputClass}
                  maxLength={100}
                  name="customerName"
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Phone
                <input
                  autoComplete="tel"
                  className={inputClass}
                  maxLength={40}
                  name="phone"
                  required
                  type="tel"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Address
                <textarea
                  autoComplete="street-address"
                  className={inputClass}
                  maxLength={500}
                  name="address"
                  required
                  rows={3}
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Product
                <select
                  className={inputClass}
                  defaultValue=""
                  name="productId"
                  required
                >
                  <option disabled value="">
                    Select a product
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · Stock: {product.stock}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Assign to Seller
                <select
                  className={inputClass}
                  defaultValue=""
                  name="sellerId"
                  required
                >
                  <option disabled value="">
                    Select a seller
                  </option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name || seller.email} ({seller.email})
                    </option>
                  ))}
                </select>
              </label>

              {error && (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Creating..." : "Create Order"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
