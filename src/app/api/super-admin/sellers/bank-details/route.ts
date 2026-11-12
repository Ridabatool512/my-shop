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
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const sellers = await prisma.user.findMany({
      where: {
        role: "SELLER",
        bankName: { not: null },
        accountNumber: { not: null },
        accountTitle: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        bankName: true,
        accountNumber: true,
        accountTitle: true,
        ifscCode: true,
        balance: true,
        withdrawalRequests: {
          where: { status: "PENDING" },
          select: { id: true, amount: true, status: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      sellers: sellers.filter(
        (seller) =>
          seller.bankName?.trim() &&
          seller.accountNumber?.trim() &&
          seller.accountTitle?.trim()
      ),
    });
  } catch (error) {
    console.error("Super Admin seller bank-details API error:", error);
    return NextResponse.json(
      { error: "Unable to load sellers with bank details." },
      { status: 500 }
    );
  }
}
