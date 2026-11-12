"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SellerRecord = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  isApproved: boolean;
};

export default function SellerApprovalRequests({
  sellers,
}: {
  sellers: SellerRecord[];
}) {
  const router = useRouter();
  const [approvingSellerId, setApprovingSellerId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");

  async function approveSeller(sellerId: string) {
    setError("");
    setApprovingSellerId(sellerId);

    try {
      const response = await fetch("/api/admin/sellers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId }),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to approve this seller.";
        throw new Error(message);
      }

      router.refresh();
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Unable to approve this seller."
      );
    } finally {
      setApprovingSellerId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      {error && (
        <p
          className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-amber-50 text-xs uppercase tracking-wide text-amber-900">
            <tr>
              <th className="px-5 py-4 font-semibold">Seller</th>
              <th className="px-5 py-4 font-semibold">Email</th>
              <th className="px-5 py-4 font-semibold">Joined</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sellers.map((seller) => (
              <tr className="text-slate-700" key={seller.id}>
                <td className="px-5 py-4 font-medium text-slate-900">
                  {seller.name || "Unnamed seller"}
                </td>
                <td className="px-5 py-4">{seller.email}</td>
                <td className="px-5 py-4">
                  {new Date(seller.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  {seller.isApproved ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Approved
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {!seller.isApproved && (
                    <button
                      className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                      disabled={approvingSellerId !== null}
                      onClick={() => void approveSeller(seller.id)}
                      type="button"
                    >
                      {approvingSellerId === seller.id
                        ? "Approving..."
                        : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sellers.length === 0 && (
              <tr>
                <td
                  className="px-5 py-8 text-center text-slate-500"
                  colSpan={5}
                >
                  No sellers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
