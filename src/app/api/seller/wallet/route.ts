import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  const session = await auth();
  const sellerId = session?.user?.id;
  if (!session?.user || typeof sellerId !== "string" || !sellerId.trim()) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  try {
    const seller = await prisma.user.findFirst({
      where: { id: sellerId, role: "SELLER" },
      select: {
        balance: true,
        bankName: true,
        accountNumber: true,
        accountTitle: true,
        ifscCode: true,
        withdrawalRequests: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!seller) {
      return NextResponse.json({ error: "Seller account not found." }, { status: 404 });
    }
    return NextResponse.json({
      wallet: {
        balance: seller.balance,
        bankName: seller.bankName,
        accountNumber: seller.accountNumber,
        accountTitle: seller.accountTitle,
        ifscCode: seller.ifscCode,
      },
      requests: seller.withdrawalRequests.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Seller wallet GET API error:", error);
    return NextResponse.json(
      { error: "Unable to load wallet details." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const sellerId = session?.user?.id;
  if (!session?.user || typeof sellerId !== "string" || !sellerId.trim()) {
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
  if (
    !isRecord(body) ||
    typeof body.bankName !== "string" ||
    typeof body.accountNumber !== "string" ||
    typeof body.accountTitle !== "string" ||
    typeof body.ifscCode !== "string"
  ) {
    return NextResponse.json({ error: "All bank details are required." }, { status: 400 });
  }

  const bankName = body.bankName.trim();
  const accountNumber = body.accountNumber.trim();
  const accountTitle = body.accountTitle.trim();
  const ifscCode = body.ifscCode.trim().toUpperCase();
  if (
    bankName.length < 2 || bankName.length > 100 ||
    accountNumber.length < 4 || accountNumber.length > 50 ||
    accountTitle.length < 2 || accountTitle.length > 100 ||
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)
  ) {
    return NextResponse.json({ error: "Please enter valid bank details." }, { status: 400 });
  }

  try {
    const updated = await prisma.user.updateMany({
      where: { id: sellerId, role: "SELLER" },
      data: { bankName, accountNumber, accountTitle, ifscCode },
    });
    if (updated.count !== 1) {
      return NextResponse.json({ error: "Seller account not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Bank details saved." });
  } catch (error) {
    console.error("Seller bank details API error:", error);
    return NextResponse.json(
      { error: "Unable to save bank details." },
      { status: 500 }
    );
  }
}
