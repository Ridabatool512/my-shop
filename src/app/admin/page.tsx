import { Suspense } from "react";
import { auth } from "@/auth";
import AdminOrdersTable from "@/app/admin/AdminOrdersTable";
import ManualOrderForm from "@/app/admin/ManualOrderForm";
import SellerApprovalRequests from "@/app/admin/SellerApprovalRequests";
import ShopifyImportButton from "@/app/admin/ShopifyImportButton";
import SignOutButton from "@/app/components/SignOutButton";
import { prisma } from "@/lib/prisma";
import { getInrToUsdRate } from "@/lib/exchange-rate";
import { redirect } from "next/navigation";

async function AdminDashboardContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-access");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const managedAdmin = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      role: "ADMIN",
      createdBy: { is: { role: "SUPER_ADMIN" } },
    },
    select: { id: true },
  });

  if (!managedAdmin) {
    redirect("/");
  }

  const [orders, sellers, pendingSellers, availableProducts, inrToUsdRate] =
    await Promise.all([
      prisma.order.findMany({
        select: {
          id: true,
          status: true,
          total: true,
          assignments: {
            where: { status: "COMPLETE" },
            select: { id: true },
            orderBy: { assignedAt: "desc" },
            take: 1,
          },
          items: {
            select: {
              id: true,
              quantity: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "SELLER", isApproved: true },
        select: {
          id: true,
          name: true,
          email: true,
          ordersAssigned: {
            select: { id: true, orderId: true, status: true },
            orderBy: { assignedAt: "desc" },
          },
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      prisma.user.findMany({
        where: { role: "SELLER", isApproved: false },
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.product.findMany({
        where: { stock: { gt: 0 } },
        select: { id: true, name: true, stock: true },
        orderBy: { name: "asc" },
      }),
      getInrToUsdRate(),
    ]);

  const tableOrders = orders.map((order) => ({
    id: order.id,
    total: order.total,
    status:
      order.status === "APPROVED"
        ? "APPROVED"
        : order.assignments.length > 0
          ? "ORDER PROCESSING"
          : order.status === "COMPLETED"
            ? "ORDER PROCESSING"
          : order.status,
    assignmentId: order.assignments[0]?.id ?? null,
    assignmentComplete: order.assignments.length > 0,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
    })),
  }));
  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const activeAssignments = sellers.reduce(
    (total, seller) => total + seller.ordersAssigned.length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <aside className="bg-slate-950 text-slate-100 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-500 font-bold text-white">
            MS
          </div>
          <div>
            <p className="font-semibold tracking-wide">MyShop</p>
            <p className="text-xs text-slate-400">Admin workspace</p>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-1 lg:flex-col">
          <p className="hidden px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:block">
            Workspace
          </p>
          <SidebarLink href="#orders" label="Orders" active />
          <SidebarLink href="/admin/sellers" label="Sellers" />
          <ShopifyImportButton />
        </nav>
        <div className="hidden border-t border-white/10 p-4 lg:block">
          <p className="truncate text-sm font-medium text-white">
            {session.user.name || session.user.email}
          </p>
          <p className="mt-1 text-xs text-slate-400">Admin</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Operations
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              Orders & seller management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
              ADMIN
            </span>
            <SignOutButton callbackUrl="/staff-access" />
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-8 p-5 sm:p-8">
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Orders" value={orders.length} detail="Customer orders" />
            <MetricCard label="Pending orders" value={pendingOrders} detail="Ready for seller assignment" />
            <MetricCard label="Assigned seller orders" value={activeAssignments} detail={`${sellers.length} seller accounts`} />
          </section>

          <section id="seller-approvals" className="scroll-mt-24">
            <SectionHeading
              title="Seller approval requests"
              description="Review new seller accounts before they can sign in or receive orders."
            />
            <SellerApprovalRequests
              sellers={pendingSellers.map((seller) => ({
                ...seller,
                isApproved: false,
                createdAt: seller.createdAt.toISOString(),
              }))}
            />
          </section>

          <section id="orders" className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                title="Orders"
                description="Assign pending orders to sellers and monitor order status."
              />
              <ManualOrderForm
                products={availableProducts}
                sellers={sellers.map(({ id, name, email }) => ({
                  id,
                  name,
                  email,
                }))}
              />
            </div>
            <AdminOrdersTable
              orders={tableOrders}
              sellers={sellers.map(({ id, name, email }) => ({ id, name, email }))}
              inrToUsdRate={inrToUsdRate}
            />
          </section>

          <section id="sellers" className="scroll-mt-24">
            <SectionHeading
              title="Seller team"
              description="Seller accounts and their currently assigned orders."
            />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Seller</th>
                      <th className="px-5 py-4 font-semibold">Email</th>
                      <th className="px-5 py-4 font-semibold">Assigned orders</th>
                      <th className="px-5 py-4 font-semibold">Order workload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sellers.map((seller) => (
                      <tr key={seller.id} className="text-slate-700">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {seller.name || "Unnamed seller"}
                        </td>
                        <td className="px-5 py-4">{seller.email}</td>
                        <td className="px-5 py-4">{seller.ordersAssigned.length}</td>
                        <td className="px-5 py-4">
                          {seller.ordersAssigned.length > 0
                            ? seller.ordersAssigned
                                .map(
                                  (assignment) =>
                                    `${assignment.orderId} (${assignment.status})`
                                )
                                .join(", ")
                            : "No active orders"}
                        </td>
                      </tr>
                    ))}
                    {sellers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                          No sellers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-indigo-500/15 text-indigo-200"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </a>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-600">
          Loading admin workspace...
        </main>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
