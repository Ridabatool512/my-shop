import { Suspense } from "react";
import { auth } from "@/auth";
import SuperAdminDashboard from "@/app/super-admin/SuperAdminDashboard";
import SellerMessagesInbox from "@/app/super-admin/SellerMessagesInbox";
import WithdrawRequestsPanel from "@/app/super-admin/WithdrawRequestsPanel";
import { prisma } from "@/lib/prisma";
import { getInrToUsdRate } from "@/lib/exchange-rate";
import { redirect } from "next/navigation";

export type SuperAdminSection =
  | "dashboard"
  | "seller-messages"
  | "orders"
  | "buyers"
  | "sellers"
  | "admins"
  | "withdraw-requests";

async function SuperAdminContent({ section }: { section: SuperAdminSection }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-access");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  if (section === "seller-messages") {
    return <SellerMessagesInbox />;
  }
  if (section === "withdraw-requests") {
    return <WithdrawRequestsPanel />;
  }

  const [buyers, sellers, admins, orders, availableProducts, inrToUsdRate] = await Promise.all([
    prisma.user.findMany({
      where: { role: "BUYER" },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "SELLER" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        isApproved: true,
        balance: true,
        createdAt: true,
        ordersAssigned: {
          select: {
            id: true,
            orderId: true,
            status: true,
            priceSetByAdmin: true,
            profitAmount: true,
            assignedAt: true,
            order: {
              select: {
                status: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN", createdById: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        ordersManaged: {
          select: {
            id: true,
            orderId: true,
            status: true,
            assignedAt: true,
            seller: { select: { name: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        customerName: true,
        total: true,
        status: true,
        items: {
          select: {
            id: true,
            quantity: true,
            product: { select: { name: true } },
          },
        },
        assignments: {
          select: {
            id: true,
            status: true,
            isApproved: true,
            assignedAt: true,
            seller: { select: { name: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: { id: true, name: true, stock: true },
      orderBy: { name: "asc" },
    }),
    getInrToUsdRate(),
  ]);

  const dashboardData = {
    buyers: buyers.map((buyer) => ({
      ...buyer,
      createdAt: buyer.createdAt.toISOString(),
    })),
    sellers: sellers.map((seller) => ({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      status: seller.status,
      isApproved: seller.isApproved,
      balance: seller.balance,
      createdAt: seller.createdAt.toISOString(),
      approvedOrderCount: seller.ordersAssigned.filter(
        (assignment) => assignment.order.status === "APPROVED"
      ).length,
      approvedTotal: seller.ordersAssigned
        .filter((assignment) => assignment.order.status === "APPROVED")
        .reduce(
          (total, assignment) =>
            total + assignment.priceSetByAdmin + assignment.profitAmount,
          0
        ),
      assignments: seller.ordersAssigned.map((assignment) => ({
        ...assignment,
        assignedAt: assignment.assignedAt.toISOString(),
      })),
    })),
    admins: admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      status: admin.status,
      createdAt: admin.createdAt.toISOString(),
      createdByName: admin.createdBy?.name ?? null,
      assignments: admin.ordersManaged.map((assignment) => ({
        id: assignment.id,
        orderId: assignment.orderId,
        sellerName: assignment.seller.name,
        status: assignment.status,
        assignedAt: assignment.assignedAt.toISOString(),
      })),
    })),
    orders: orders.map((order) => {
      const completedAssignment = order.assignments.find(
        (assignment) => assignment.status === "COMPLETE"
      );
      const latestAssignment = order.assignments[0];

      return {
        id: order.id,
        total: order.total,
        customerName: order.customerName,
        status:
          order.status === "APPROVED"
            ? "APPROVED"
            : order.status === "COMPLETED"
              ? "ORDER PROCESSING"
              : order.status,
        assignmentId: latestAssignment?.id ?? null,
        assignmentComplete: Boolean(completedAssignment),
        superAdminApproved: order.status === "APPROVED",
        sellerName: latestAssignment?.seller.name ?? null,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
        })),
      };
    }),
    availableProducts,
    inrToUsdRate,
  };

  return <SuperAdminDashboard {...dashboardData} section={section} />;
}

export default function SuperAdminRouteContent({
  section,
}: {
  section: SuperAdminSection;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-slate-300">
          Loading executive dashboard...
        </div>
      }
    >
      <SuperAdminContent section={section} />
    </Suspense>
  );
}
