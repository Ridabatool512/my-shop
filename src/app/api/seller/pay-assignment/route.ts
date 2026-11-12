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
    return NextResponse.json(
      { error: "Seller access required." },
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

    const assignmentId = body.assignmentId.trim();
    const updated = await prisma.orderAssignment.updateMany({
      where: {
        id: assignmentId,
        sellerId: session.user.id,
        status: "PENDING",
        isPaid: false,
      },
      data: { isPaid: true },
    });

    if (updated.count === 1) {
      return NextResponse.json({
        message: "Payment recorded successfully.",
        assignment: { id: assignmentId, isPaid: true },
      });
    }

    const assignment = await prisma.orderAssignment.findFirst({
      where: { id: assignmentId, sellerId: session.user.id },
      select: { status: true, isPaid: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found." },
        { status: 404 }
      );
    }

    if (assignment.isPaid) {
      return NextResponse.json({
        message: "Payment has already been recorded.",
        assignment: { id: assignmentId, isPaid: true },
      });
    }

    return NextResponse.json(
      { error: "This assignment is no longer awaiting payment." },
      { status: 409 }
    );
  } catch (error) {
    console.error("Seller assignment payment API error:", error);
    return NextResponse.json(
      { error: "Unable to record payment. Please try again." },
      { status: 500 }
    );
  }
}
