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

  if (session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
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
    typeof body.assignmentId !== "string" ||
    !body.assignmentId.trim()
  ) {
    return NextResponse.json(
      { error: "A valid assignmentId is required." },
      { status: 400 }
    );
  }

  try {
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isApproved: true },
    });

    if (seller?.role !== "SELLER" || !seller.isApproved) {
      return NextResponse.json(
        { error: "An approved seller account is required." },
        { status: 403 }
      );
    }

    const updated = await prisma.orderAssignment.updateMany({
      where: {
        id: body.assignmentId.trim(),
        sellerId: session.user.id,
        status: "PENDING",
        isPaid: true,
        isApproved: true,
      },
      data: { status: "COMPLETE" },
    });

    if (updated.count === 1) {
      return NextResponse.json({
        message: "Order picked successfully.",
        assignment: {
          id: body.assignmentId.trim(),
          status: "COMPLETE",
        },
      });
    }

    const assignment = await prisma.orderAssignment.findFirst({
      where: {
        id: body.assignmentId.trim(),
        sellerId: session.user.id,
      },
      select: { status: true, isPaid: true, isApproved: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: assignment.status !== "PENDING"
          ? "This assignment is no longer pending."
          : !assignment.isPaid
            ? "Payment is required before picking this order."
              : !assignment.isApproved
                ? "Customer Support approval is required before picking this order."
                : "Unable to pick this order.",
      },
      { status: 409 }
    );
  } catch (error) {
    console.error("Seller pick-order API error:", error);

    return NextResponse.json(
      { error: "Unable to pick this order. Please try again." },
      { status: 500 }
    );
  }
}
