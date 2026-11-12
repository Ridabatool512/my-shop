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
  if (session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.amount !== "number" || !Number.isFinite(body.amount)) {
    return NextResponse.json({ error: "Enter a valid withdrawal amount." }, { status: 400 });
  }
  const amount = Math.round(body.amount * 100) / 100;
  if (amount <= 0) {
    return NextResponse.json({ error: "Withdrawal amount must be greater than zero." }, { status: 400 });
  }

  try {
    const seller = await prisma.user.findFirst({
      where: { id: session.user.id, role: "SELLER" },
      select: {
        balance: true,
        bankName: true,
        accountNumber: true,
        accountTitle: true,
      },
    });
    if (!seller) {
      return NextResponse.json({ error: "Seller account not found." }, { status: 404 });
    }
    if (!seller.bankName || !seller.accountNumber || !seller.accountTitle) {
      return NextResponse.json({ error: "Save your bank details before requesting a withdrawal." }, { status: 400 });
    }
    const pending = await prisma.withdrawalRequest.aggregate({
      where: { sellerId: session.user.id, status: "PENDING" },
      _sum: { amount: true },
    });
    const available = seller.balance - (pending._sum.amount ?? 0);
    if (amount > available) {
      return NextResponse.json(
        { error: "Withdrawal amount exceeds your available balance." },
        { status: 400 }
      );
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        sellerId: session.user.id,
        amount,
        bankName: seller.bankName,
        accountNumber: seller.accountNumber,
        accountTitle: seller.accountTitle,
      },
      select: { id: true, amount: true, status: true, createdAt: true },
    });
    return NextResponse.json(
      {
        message: "Withdrawal request submitted.",
        request: { ...withdrawal, createdAt: withdrawal.createdAt.toISOString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Seller withdrawal request API error:", error);
    return NextResponse.json(
      { error: "Unable to submit withdrawal request." },
      { status: 500 }
    );
  }
}
