"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/currency";

type SellerWithBankDetails = {
  id: string;
  name: string | null;
  email: string;
  bankName: string;
  accountNumber: string;
  accountTitle: string;
  ifscCode: string | null;
  balance: number;
  withdrawalRequests: {
    id: string;
    amount: number;
    status: "PENDING";
  }[];
};

function isSeller(value: unknown): value is SellerWithBankDetails {
  if (typeof value !== "object" || value === null) return false;
  const seller = value as Record<string, unknown>;
  return (
    typeof seller.id === "string" &&
    (typeof seller.name === "string" || seller.name === null) &&
    typeof seller.email === "string" &&
    typeof seller.bankName === "string" &&
    typeof seller.accountNumber === "string" &&
    typeof seller.accountTitle === "string" &&
    (typeof seller.ifscCode === "string" || seller.ifscCode === null) &&
    typeof seller.balance === "number" &&
    Number.isFinite(seller.balance) &&
    Array.isArray(seller.withdrawalRequests) &&
    seller.withdrawalRequests.every(
      (request) =>
        typeof request === "object" &&
        request !== null &&
        "id" in request &&
        typeof request.id === "string" &&
        "amount" in request &&
        typeof request.amount === "number" &&
        "status" in request &&
        request.status === "PENDING"
    )
  );
}

function getErrorMessage(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

export default function WithdrawRequestsPanel() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerWithBankDetails[]>([]);
  const [selectedSeller, setSelectedSeller] =
    useState<SellerWithBankDetails | null>(null);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadSellers = useCallback(async () => {
    try {
      const response = await fetch("/api/super-admin/sellers/bank-details", {
        cache: "no-store",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to load sellers."));
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("sellers" in body) ||
        !Array.isArray(body.sellers) ||
        !body.sellers.every(isSeller)
      ) {
        throw new Error("The sellers response was invalid.");
      }
      setSellers(body.sellers);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load sellers."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSellers();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadSellers]);

  function openAddBalance(seller: SellerWithBankDetails) {
    setError("");
    setAmount("");
    setSelectedSeller(seller);
  }

  async function addBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeller) return;
    setIsAddingBalance(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin/add-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: selectedSeller.id,
          amount: Number(amount),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to add seller balance."));
      }
      setSelectedSeller(null);
      setAmount("");
      await loadSellers();
      router.refresh();
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Unable to add seller balance."
      );
    } finally {
      setIsAddingBalance(false);
    }
  }

  async function reviewWithdrawal(
    requestId: string,
    action: "approve" | "reject"
  ) {
    setProcessingWithdrawalId(requestId);
    setError("");
    try {
      const response = await fetch(
        `/api/super-admin/withdrawals/${encodeURIComponent(requestId)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body,
            action === "approve"
              ? "Unable to approve withdrawal."
              : "Unable to reject withdrawal."
          )
        );
      }
      await loadSellers();
      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review withdrawal."
      );
    } finally {
      setProcessingWithdrawalId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Withdraw Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sellers with saved bank details and their current wallet balance.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => void loadSellers()}
          type="button"
        >
          Refresh
        </button>
      </div>
      {error && (
        <p
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {[
                "Seller Name",
                "Email",
                "Bank Name",
                "Account Number",
                "IFSC Code",
                "Current Balance",
                "Action",
              ].map((heading) => (
                <th className="px-4 py-3 font-semibold" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sellers.map((seller) => (
              <tr key={seller.id}>
                <td className="px-4 py-4 align-top font-semibold text-slate-800">
                  {seller.name || seller.accountTitle}
                </td>
                <td className="px-4 py-4 align-top text-slate-600">
                  {seller.email}
                </td>
                <td className="px-4 py-4 align-top text-slate-700">
                  {seller.bankName}
                </td>
                <td className="px-4 py-4 align-top text-slate-700">
                  {seller.accountNumber}
                </td>
                <td className="px-4 py-4 align-top font-medium text-slate-700">
                  {seller.ifscCode || "—"}
                </td>
                <td className="px-4 py-4 align-top font-semibold text-slate-900">
                  {formatINR(seller.balance)}
                </td>
                <td className="px-4 py-4 align-top">
                  <button
                    className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    onClick={() => openAddBalance(seller)}
                    type="button"
                  >
                    Add Balance
                  </button>
                  {seller.withdrawalRequests.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {seller.withdrawalRequests.map((request) => (
                        <div
                          className="min-w-52 rounded-lg border border-slate-200 p-2"
                          key={request.id}
                        >
                          <p className="mb-2 text-xs font-semibold text-slate-700">
                            Withdraw: {formatINR(request.amount)}
                          </p>
                          <div className="flex gap-2">
                            <button
                              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                              disabled={processingWithdrawalId !== null}
                              onClick={() =>
                                void reviewWithdrawal(request.id, "approve")
                              }
                              type="button"
                            >
                              {processingWithdrawalId === request.id
                                ? "Processing..."
                                : "Approve"}
                            </button>
                            <button
                              className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                              disabled={processingWithdrawalId !== null}
                              onClick={() =>
                                void reviewWithdrawal(request.id, "reject")
                              }
                              type="button"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      No pending withdrawal
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && sellers.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No sellers have saved complete bank details.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  Loading sellers...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSeller && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          onClick={() => {
            if (!isAddingBalance) setSelectedSeller(null);
          }}
        >
          <section
            aria-labelledby="seller-add-balance-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2
              className="text-xl font-bold text-slate-900"
              id="seller-add-balance-title"
            >
              Add Balance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedSeller.name || selectedSeller.email}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Current balance: {formatINR(selectedSeller.balance)}
            </p>
            <form className="mt-5 space-y-4" onSubmit={(event) => void addBalance(event)}>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Amount (INR ₹)
                <input
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  min="0.01"
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  disabled={isAddingBalance}
                  onClick={() => setSelectedSeller(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={isAddingBalance}
                  type="submit"
                >
                  {isAddingBalance ? "Adding..." : "Confirm Add"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
