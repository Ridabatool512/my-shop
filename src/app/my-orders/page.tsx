import { Suspense } from "react";
import Link from "next/link";

export const instant = false;
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINRAsUSD } from "@/lib/currency";
import { getInrToUsdRate } from "@/lib/exchange-rate";
import { redirect } from "next/navigation";

async function BuyerOrders() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "BUYER") {
    redirect("/");
  }

  const [orders, inrToUsdRate] = await Promise.all([prisma.order.findMany({
    where: { buyerId: session.user.id },
    select: {
      id: true,
      total: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  }), getInrToUsdRate()]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            My<span className="text-indigo-600">Shop</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            Continue shopping
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My Orders
        </h1>
        <p className="mt-2 text-slate-600">Orders placed with your account.</p>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            No orders found
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Order ID</th>
                    <th className="px-5 py-4 font-semibold">Total</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-slate-700">
                      <td className="break-all px-5 py-4 font-medium text-slate-900">
                        {order.id}
                      </td>
                      <td className="px-5 py-4">
                        {formatINRAsUSD(order.total, inrToUsdRate)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {order.createdAt.toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-8 text-slate-600">
          Loading your orders...
        </main>
      }
    >
      <BuyerOrders />
    </Suspense>
  );
}
