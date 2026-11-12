import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  try {
    const requests = await prisma.withdrawalRequest.findMany({
      select: {
        id: true,
        amount: true,
        bankName: true,
        accountNumber: true,
        accountTitle: true,
        status: true,
        createdAt: true,
        seller: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      requests: requests.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Super Admin withdrawal requests API error:", error);
    return NextResponse.json({ error: "Unable to load withdrawal requests." }, { status: 500 });
  }
}
