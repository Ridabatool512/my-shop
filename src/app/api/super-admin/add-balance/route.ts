import { auth } from "@/auth";
import { Role } from "@prisma/client";
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
    typeof body.sellerId !== "string" ||
    !body.sellerId.trim() ||
    typeof body.amount !== "number" ||
    !Number.isFinite(body.amount)
  ) {
    return NextResponse.json(
      { error: "A seller and valid amount are required." },
      { status: 400 }
    );
  }

  const amount = Math.round(body.amount * 100) / 100;
  if (amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than zero." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.user.updateMany({
      where: { id: body.sellerId.trim(), role: Role.SELLER },
      data: { balance: { increment: amount } },
    });

    if (updated.count !== 1) {
      return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Seller balance updated." });
  } catch (error) {
    console.error("Super Admin add-balance API error:", error);
    return NextResponse.json(
      { error: "Unable to update seller balance." },
      { status: 500 }
    );
  }
}
