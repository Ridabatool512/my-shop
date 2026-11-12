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

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required." },
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
    typeof body.sellerId !== "string" ||
    !body.sellerId.trim()
  ) {
    return NextResponse.json(
      { error: "A valid sellerId is required." },
      { status: 400 }
    );
  }

  try {
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
        { error: "Only Super Admin-created accounts can approve sellers." },
        { status: 403 }
      );
    }

    const sellerId = body.sellerId.trim();
    const updated = await prisma.user.updateMany({
      where: { id: sellerId, role: "SELLER", isApproved: false },
      data: { isApproved: true },
    });

    if (updated.count !== 1) {
      const seller = await prisma.user.findUnique({
        where: { id: sellerId },
        select: { role: true, isApproved: true },
      });

      if (!seller || seller.role !== "SELLER") {
        return NextResponse.json(
          { error: "Seller not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: seller.isApproved
            ? "This seller has already been approved."
            : "Unable to approve this seller.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Seller approved successfully.",
      seller: { id: sellerId, isApproved: true },
    });
  } catch (error) {
    console.error("Admin approve-seller API error:", error);
    return NextResponse.json(
      { error: "Unable to approve this seller. Please try again." },
      { status: 500 }
    );
  }
}
