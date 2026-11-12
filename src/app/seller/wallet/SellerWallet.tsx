"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/currency";

type WalletRequest = {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETE" | "REJECTED";
  createdAt: string;
};

export default function SellerWallet({
}: Record<string, never>) {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [bank, setBank] = useState({
    bankName: "",
    accountNumber: "",
    accountTitle: "",
    ifscCode: "",
  });
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWallet = useCallback(async () => {
    setLoadError("");
    const response = await fetch("/api/seller/wallet", { cache: "no-store" });
    const result: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "Unable to load wallet details."
      );
    }

    const wallet =
      typeof result === "object" && result !== null && "wallet" in result
        ? result.wallet
        : null;
    if (typeof wallet !== "object" || wallet === null) {
      throw new Error("Wallet data is missing from the response.");
    }
    const value = wallet as Record<string, unknown>;
    const nextBalance =
      typeof value.balance === "number" && Number.isFinite(value.balance)
        ? value.balance
        : 0;
    const nextBank = {
      bankName: typeof value.bankName === "string" ? value.bankName : "",
      accountNumber:
        typeof value.accountNumber === "string" ? value.accountNumber : "",
      accountTitle:
        typeof value.accountTitle === "string" ? value.accountTitle : "",
      ifscCode: typeof value.ifscCode === "string" ? value.ifscCode : "",
    };
    const nextRequests =
      typeof result === "object" &&
      result !== null &&
      "requests" in result &&
      Array.isArray(result.requests)
        ? result.requests.filter(isWalletRequest)
        : [];

    setBalance(nextBalance);
    setBank(nextBank);
    setRequests(nextRequests);
  }, []);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void loadWallet()
        .catch((loadError: unknown) => {
          if (active) {
            setLoadError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load wallet details."
            );
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [loadWallet]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    method: "PUT" | "POST",
    body: unknown,
    busy: (value: boolean) => void,
    successText: string
  ) {
    event.preventDefault();
    busy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result: unknown = await response.json();
      const message =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : successText;
      if (!response.ok) throw new Error(message);
      setSuccess(successText);
      if (endpoint.endsWith("/withdraw")) setAmount("");
      await loadWallet();
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Request failed. Please try again."
      );
    } finally {
      busy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          Loading...
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <section className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Wallet unavailable</h1>
          <p className="mt-3 text-sm text-red-700" role="alert">
            {loadError}
          </p>
          <button
            className={`${buttonClass} mt-5`}
            onClick={() => {
              setIsLoading(true);
              void loadWallet()
                .catch((retryError: unknown) => {
                  setLoadError(
                    retryError instanceof Error
                      ? retryError.message
                      : "Unable to load wallet details."
                  );
                })
                .finally(() => setIsLoading(false));
            }}
            type="button"
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Seller account
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Wallet</h1>
        </header>

        <section className="rounded-2xl bg-indigo-700 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-indigo-100">Current Balance</p>
          <p className="mt-2 text-4xl font-bold">{formatINR(balance)}</p>
        </section>

        {(error || success) && (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
            role={error ? "alert" : "status"}
          >
            {error || success}
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Bank Details</h2>
          <p className="mt-1 text-sm text-slate-500">
            Withdrawals will be sent to these saved account details.
          </p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) =>
              void submit(
                event,
                "/api/seller/wallet",
                "PUT",
                bank,
                setIsSavingBank,
                "Bank details saved."
              )
            }
          >
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Bank Name
              <input
                autoComplete="organization"
                className={inputClass}
                maxLength={100}
                onChange={(event) =>
                  setBank((current) => ({ ...current, bankName: event.target.value }))
                }
                required
                value={bank.bankName}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Account Title
              <input
                autoComplete="name"
                className={inputClass}
                maxLength={100}
                onChange={(event) =>
                  setBank((current) => ({ ...current, accountTitle: event.target.value }))
                }
                required
                value={bank.accountTitle}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
              Account Number
              <input
                autoComplete="off"
                className={inputClass}
                maxLength={50}
                onChange={(event) =>
                  setBank((current) => ({ ...current, accountNumber: event.target.value }))
                }
                required
                value={bank.accountNumber}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
              IFSC Code
              <input
                autoComplete="off"
                className={inputClass}
                maxLength={11}
                onChange={(event) =>
                  setBank((current) => ({
                    ...current,
                    ifscCode: event.target.value.toUpperCase(),
                  }))
                }
                pattern="[A-Z]{4}0[A-Z0-9]{6}"
                placeholder="e.g. HDFC0001234"
                required
                value={bank.ifscCode}
              />
            </label>
            <button
              className={buttonClass}
              disabled={isSavingBank}
              type="submit"
            >
              {isSavingBank ? "Saving..." : "Save Bank Details"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Withdraw Amount</h2>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(event) =>
              void submit(
                event,
                "/api/seller/wallet/withdraw",
                "POST",
                { amount: Number(amount) },
                setIsSubmittingRequest,
                "Withdrawal request submitted."
              )
            }
          >
            <label className="grid min-w-48 flex-1 gap-1.5 text-sm font-medium text-slate-700">
              Amount (INR)
              <input
                className={inputClass}
                min="0.01"
                onChange={(event) => setAmount(event.target.value)}
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </label>
            <button
              className={buttonClass}
              disabled={isSubmittingRequest}
              type="submit"
            >
              {isSubmittingRequest ? "Submitting..." : "Request Withdrawal"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Recent Requests</h2>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No withdrawal requests yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {requests.map((request) => (
                <li className="flex flex-wrap justify-between gap-2 py-3" key={request.id}>
                  <span className="font-semibold text-slate-800">
                    {formatINR(request.amount)}
                  </span>
                  <span className="text-sm text-slate-600">
                    {request.status} · {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function isWalletRequest(value: unknown): value is WalletRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request.id === "string" &&
    typeof request.amount === "number" &&
    (request.status === "PENDING" ||
      request.status === "COMPLETE" ||
      request.status === "REJECTED") &&
    typeof request.createdAt === "string"
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const buttonClass =
  "rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60";
