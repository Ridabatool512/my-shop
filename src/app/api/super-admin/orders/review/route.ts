import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super Admin access required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (
    !isRecord(body) ||
    typeof body.orderId !== "string" ||
    !body.orderId.trim() ||
    (body.action !== "approve" && body.action !== "reject")
  ) {
    return NextResponse.json(
      { error: "A valid orderId and review action are required." },
      { status: 400 }
    );
  }

  try {
    const orderId = body.orderId.trim();
    const order = await prisma.order.findFirst({
      where: { id: orderId, status: "ASSIGNED" },
      select: {
        id: true,
        assignments: {
          select: {
            id: true,
            sellerId: true,
            status: true,
            isApproved: true,
          },
          orderBy: { assignedAt: "desc" },
          take: 1,
        },
      },
    });

    const assignment = order?.assignments[0];
    if (!order) {
      return NextResponse.json(
        { error: "Only assigned orders can be processed." },
        { status: 409 }
      );
    }

    if (body.action === "approve") {
      let updatedAssignment = false;
      if (assignment?.status === "PENDING" && !assignment.isApproved) {
        const approved = await prisma.orderAssignment.updateMany({
          where: {
            id: assignment.id,
            status: "PENDING",
            isApproved: false,
          },
          data: { isApproved: true },
        });

        if (approved.count !== 1) {
          return NextResponse.json(
            { error: "This assignment has already been reviewed." },
            { status: 409 }
          );
        }
        updatedAssignment = true;
      }

      const completedOrder = await prisma.order.updateMany({
        where: { id: order.id, status: "ASSIGNED" },
        data: { status: "COMPLETED" },
      });

      if (completedOrder.count !== 1) {
        if (updatedAssignment && assignment) {
          const reverted = await prisma.orderAssignment.updateMany({
            where: { id: assignment.id, isApproved: true },
            data: { isApproved: false },
          });
          if (reverted.count !== 1) {
            console.error("Failed to revert seller assignment approval.", {
              assignmentId: assignment.id,
            });
          }
        }
        return NextResponse.json(
          { error: "This order has already changed and cannot be approved." },
          { status: 409 }
        );
      }

      if (assignment?.status === "PENDING" && updatedAssignment) {
        try {
          await prisma.chatMessage.create({
            data: {
              senderId: session.user.id,
              receiverId: assignment.sellerId,
              message: "Approved - you may now pick this order.",
            },
          });
        } catch (error) {
          const reverted = await prisma.orderAssignment.updateMany({
            where: { id: assignment.id, isApproved: true },
            data: { isApproved: false },
          });
          if (reverted.count !== 1) {
            console.error("Failed to revert seller order approval.", {
              assignmentId: assignment.id,
            });
          }
          const orderReverted = await prisma.order.updateMany({
            where: { id: order.id, status: "COMPLETED" },
            data: { status: "ASSIGNED" },
          });
          if (orderReverted.count !== 1) {
            console.error("Failed to restore order status after approval failed.", {
              orderId: order.id,
            });
          }
          throw error;
        }
      }

      return NextResponse.json({
        message: assignment
          ? "Order marked as processing."
          : "Order marked as processing without a seller assignment.",
        order: { id: order.id, status: "COMPLETED" },
        assignment: assignment
          ? { id: assignment.id, isApproved: assignment.isApproved || updatedAssignment }
          : null,
      });
    }

    if (!assignment || assignment.status !== "PENDING") {
      return NextResponse.json(
        { error: "No pending seller assignment was found to reject." },
        { status: 409 }
      );
    }

    const returnedToQueue = await prisma.order.updateMany({
      where: { id: order.id, status: "ASSIGNED" },
      data: { status: "PENDING" },
    });

    if (returnedToQueue.count !== 1) {
      return NextResponse.json(
        { error: "This order has already changed and cannot be rejected." },
        { status: 409 }
      );
    }

    try {
      await prisma.orderAssignment.delete({ where: { id: assignment.id } });
    } catch (error) {
      const restored = await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "ASSIGNED" },
      });
      if (restored.count !== 1) {
        console.error("Failed to restore order status after assignment deletion failed.", {
          orderId: order.id,
        });
      }
      throw error;
    }

    return NextResponse.json({
      message: "Order rejected and returned to the pending queue.",
      order: { id: order.id, status: "PENDING" },
    });
  } catch (error) {
    console.error("Super Admin order review API error:", error);
    return NextResponse.json(
      { error: "Unable to review this order. Please try again." },
      { status: 500 }
    );
  }
}
