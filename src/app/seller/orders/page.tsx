import { auth } from "@/auth";
import SellerAssignments from "@/app/seller/SellerAssignments";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function SellerOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const assignments = await prisma.orderAssignment.findMany({
    where: {
      sellerId: session.user.id,
      order: { status: { in: ["ASSIGNED", "COMPLETED"] } },
    },
    select: {
      id: true,
      status: true,
      isPaid: true,
      isApproved: true,
      priceSetByAdmin: true,
      profitAmount: true,
      order: {
        select: {
          id: true,
          status: true,
          customerName: true,
          items: {
            select: {
              id: true,
              quantity: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const sellerAssignments = assignments.map((assignment) => ({
    id: assignment.id,
    status: assignment.status,
    isPaid: assignment.isPaid,
    isApproved: assignment.isApproved,
    priceSetByAdmin: assignment.priceSetByAdmin,
    profitAmount: assignment.profitAmount,
    order: {
      id: assignment.order.id,
      status: assignment.order.status,
      customerName: assignment.order.customerName,
      items: assignment.order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
      })),
    },
  }));

  return (
    <div className="premium-mesh-background -mx-4 -my-6 min-h-[calc(100vh-64px)] px-4 py-8 text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
      <header className="mb-7 rounded-2xl border border-white/10 bg-slate-900/70 px-6 py-7 shadow-xl backdrop-blur-md sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-300">
          Seller Workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          My Orders
        </h1>
        <p className="mt-2 text-slate-300">
          Pay assigned orders and pick up orders approved for processing.
        </p>
      </header>
      <SellerAssignments assignments={sellerAssignments} />
      </div>
    </div>
  );
}
