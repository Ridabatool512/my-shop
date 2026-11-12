import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    typeof body.orderId !== "string" ||
    !body.orderId.trim() ||
    typeof body.sellerId !== "string" ||
    !body.sellerId.trim() ||
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price <= 0
  ) {
    return NextResponse.json(
      { error: "A valid order, seller, and positive price are required." },
      { status: 400 }
    );
  }

  const orderId = body.orderId.trim();
  const sellerId = body.sellerId.trim();
  const price = body.price;
  const profitAmount =
    Math.round((price * 0.2 + Number.EPSILON) * 100) / 100;

  try {
    if (session.user.role === "ADMIN") {
      const managedAdmin = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          role: "ADMIN",
          createdBy: { is: { role: "SUPER_ADMIN" } },
        },
        select: { id: true },
      });

      if (!managedAdmin) {
        return NextResponse.json(
          { error: "Only Super Admin-created accounts can assign orders." },
          { status: 403 }
        );
      }
    }

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, role: true, isApproved: true, status: true },
    });

    if (
      !seller ||
      seller.role !== "SELLER" ||
      !seller.isApproved ||
      seller.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { error: "Selected seller account is not approved." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        assignments: {
          select: {
            id: true,
            status: true,
            isPaid: true,
            isApproved: true,
          },
          orderBy: { assignedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const canAssignPending = order.status === "PENDING";
    const canAssignUnassigned =
      session.user.role === "SUPER_ADMIN" &&
      order.status === "ASSIGNED" &&
      order.assignments.length === 0;
    if (!canAssignPending && !canAssignUnassigned) {
      const currentAssignment = order.assignments[0];
      if (
        session.user.role === "SUPER_ADMIN" &&
        order.status === "ASSIGNED" &&
        currentAssignment &&
        currentAssignment.status === "PENDING" &&
        !currentAssignment.isPaid &&
        !currentAssignment.isApproved
      ) {
        const reassigned = await prisma.orderAssignment.updateMany({
          where: {
            id: currentAssignment.id,
            status: "PENDING",
            isPaid: false,
            isApproved: false,
          },
          data: {
            sellerId: seller.id,
            assignedById: session.user.id,
            priceSetByAdmin: price,
            profitAmount,
          },
        });

        if (reassigned.count !== 1) {
          return NextResponse.json(
            { error: "This assignment changed and can no longer be reassigned." },
            { status: 409 }
          );
        }

        return NextResponse.json({
          message: "Order reassigned successfully.",
          assignment: {
            id: currentAssignment.id,
            orderId,
            sellerId: seller.id,
            assignedById: session.user.id,
            priceSetByAdmin: price,
            profitAmount,
          },
        });
      }

      return NextResponse.json(
        { error: "Only pending or unassigned orders can be assigned." },
        { status: 409 }
      );
    }

    const assignment = await prisma.orderAssignment.create({
      data: {
        orderId,
        sellerId: seller.id,
        assignedById: session.user.id,
        priceSetByAdmin: price,
        profitAmount,
      },
      select: {
        id: true,
        orderId: true,
        sellerId: true,
        assignedById: true,
        priceSetByAdmin: true,
        profitAmount: true,
        status: true,
        assignedAt: true,
      },
    });

    try {
      const updatedOrder = await prisma.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: "ASSIGNED" },
      });
      if (updatedOrder.count !== 1) {
        throw new Error("Order status changed while assigning the seller.");
      }
    } catch (updateError) {
      try {
        await prisma.orderAssignment.delete({
          where: { id: assignment.id },
        });
      } catch (cleanupError) {
        console.error(
          "Failed to remove order assignment after order status update failed:",
          cleanupError
        );
      }

      if (
        typeof updateError === "object" &&
        updateError !== null &&
        "code" in updateError &&
        updateError.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "This order has already been assigned." },
          { status: 409 }
        );
      }

      throw updateError;
    }

    return NextResponse.json(
      {
        message: "Order assigned successfully.",
        assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order assignment API error:", error);

    return NextResponse.json(
      { error: "Unable to assign this order. Please try again." },
      { status: 500 }
    );
  }
}
