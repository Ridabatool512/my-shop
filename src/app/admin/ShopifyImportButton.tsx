"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ImportResponse = {
  imported?: number;
  skipped?: number;
  exchangeRateToINR?: number;
  error?: string;
};

export default function ShopifyImportButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("USD");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function closeModal() {
    if (isImporting) return;
    setIsOpen(false);
    setError("");
    setSuccess("");
  }

  async function importProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsImporting(true);

    try {
      const response = await fetch("/api/fetch-shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeUrl,
          sourceCurrency: sourceCurrency.trim().toUpperCase(),
        }),
      });

      const result: unknown = await response.json();
      const data =
        typeof result === "object" && result !== null
          ? (result as ImportResponse)
          : {};

      if (!response.ok) {
        throw new Error(data.error || "Unable to import Shopify products.");
      }

      const imported = data.imported ?? 0;
      const skipped = data.skipped ?? 0;
      setSuccess(
        `Imported ${imported} product${imported === 1 ? "" : "s"}; skipped ${skipped}.`
      );
      router.refresh();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Unable to import Shopify products. Please try again."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        Import Shopify Products
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopify-import-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="shopify-import-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Import Shopify Products
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter the store URL and the currency used for its product prices.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isImporting}
                aria-label="Close import dialog"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={importProducts} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Shopify store URL
                <input
                  type="url"
                  required
                  value={storeUrl}
                  onChange={(event) => setStoreUrl(event.target.value)}
                  placeholder="https://allbirds.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Store price currency
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  value={sourceCurrency}
                  onChange={(event) => setSourceCurrency(event.target.value)}
                  placeholder="USD"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 uppercase text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {success}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isImporting}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {success ? "Done" : "Cancel"}
                </button>
                {!success && (
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isImporting ? "Importing..." : "Import"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
