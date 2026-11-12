import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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

  try {
    const assignments = await prisma.orderAssignment.findMany({
      where: {
        sellerId: session.user.id,
        status: "PENDING",
        isPaid: true,
        isApproved: true,
      },
      select: { id: true },
    });

    return NextResponse.json({
      approvedAssignmentIds: assignments.map(({ id }) => id),
    });
  } catch (error) {
    console.error("Seller assignment approval API error:", error);
    return NextResponse.json(
      { error: "Unable to load assignment approvals." },
      { status: 500 }
    );
  }
}
