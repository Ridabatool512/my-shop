import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
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
    typeof body.userId !== "string" ||
    !body.userId.trim() ||
    (body.status !== "ACTIVE" &&
      body.status !== "FROZEN" &&
      body.status !== "INACTIVE")
  ) {
    return NextResponse.json(
      { error: "A valid userId and account status are required." },
      { status: 400 }
    );
  }

  try {
    const userId = body.userId.trim();
    const status = body.status;
    const updated = await prisma.user.updateMany({
      where: {
        id: userId,
        role: { in: [Role.ADMIN, Role.SELLER, Role.BUYER] },
      },
      data: { status },
    });

    if (updated.count !== 1) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, status: true },
      });

      if (!user || user.role === Role.SUPER_ADMIN) {
        return NextResponse.json(
          { error: "User not found or cannot be frozen." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Unable to update account status." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Account status updated successfully.",
      user: { id: userId, status },
    });
  } catch (error) {
    console.error("Super Admin freeze-account API error:", error);
    return NextResponse.json(
      { error: "Unable to freeze this account. Please try again." },
      { status: 500 }
    );
  }
}
