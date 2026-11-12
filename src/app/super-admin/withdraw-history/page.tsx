import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/currency";
import { redirect } from "next/navigation";

export default async function SuperAdminWithdrawHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/staff-access");
  if (session.user.role !== "SUPER_ADMIN") redirect("/");

  const history = await prisma.withdrawalRequest.findMany({
    where: { status: { in: ["COMPLETE", "REJECTED"] } },
    select: {
      id: true,
      amount: true,
      bankName: true,
      accountNumber: true,
      accountTitle: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      seller: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <header className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Seller payouts
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Withdraw History
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Approved and rejected seller withdrawal requests.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Seller", "Amount", "Bank Details", "Status", "Date"].map(
                (heading) => (
                  <th className="px-4 py-3 font-semibold" key={heading}>
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4 align-top text-slate-700">
                  <p className="font-semibold">
                    {item.seller.name || item.accountTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.seller.email}
                  </p>
                </td>
                <td className="px-4 py-4 align-top font-semibold text-slate-900">
                  {formatINR(item.amount)}
                </td>
                <td className="px-4 py-4 align-top text-slate-700">
                  <p>{item.accountTitle}</p>
                  <p className="mt-1">{item.bankName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.accountNumber}
                  </p>
                </td>
                <td className="px-4 py-4 align-top">
                  <span
                    className={
                      item.status === "COMPLETE"
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800"
                    }
                  >
                    {item.status === "COMPLETE" ? "APPROVED" : "REJECTED"}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-slate-600">
                  {item.updatedAt.toLocaleString()}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td
                  className="px-4 py-10 text-center text-slate-500"
                  colSpan={5}
                >
                  No completed or rejected withdrawals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
