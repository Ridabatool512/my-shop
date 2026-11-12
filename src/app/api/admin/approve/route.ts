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

  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super Admin approval is required to release seller profit." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.orderId !== "string" || !body.orderId.trim()) {
    return NextResponse.json({ error: "A valid orderId is required." }, { status: 400 });
  }

  const orderId = body.orderId.trim();

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status === "APPROVED") {
      return NextResponse.json(
        { error: "This order has already been approved." },
        { status: 409 }
      );
    }
    if (order.status !== "ASSIGNED" && order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "This order is not in an approvable state." },
        { status: 409 }
      );
    }

    const completeAssignment = await prisma.orderAssignment.findFirst({
      where: { orderId, status: "COMPLETE" },
      select: { id: true },
    });

    if (!completeAssignment) {
      return NextResponse.json(
        { error: "Only orders completed by a seller can be approved." },
        { status: 409 }
      );
    }

    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "APPROVED" },
    });

    if (updated.count !== 1) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      return NextResponse.json(
        {
          error:
            order.status === "APPROVED"
              ? "This order has already been approved."
              : "This order is not in an approvable state.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Order approved successfully.",
      order: {
        id: orderId,
        status: "APPROVED",
      },
    });
  } catch (error) {
    console.error("Admin approve-order API error:", error);
    return NextResponse.json(
      { error: "Unable to approve this order. Please try again." },
      { status: 500 }
    );
  }
}
