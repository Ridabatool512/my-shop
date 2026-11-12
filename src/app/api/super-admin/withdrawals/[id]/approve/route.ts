import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  if (!id.trim()) {
    return NextResponse.json({ error: "A withdrawal request ID is required." }, { status: 400 });
  }

  try {
    let action: unknown = "approve";
    try {
      const body: unknown = await request.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "action" in body
      ) {
        action = body.action;
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be approve or reject." },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const rejected = await prisma.withdrawalRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "REJECTED" },
      });
      if (rejected.count !== 1) {
        return NextResponse.json(
          { error: "Withdrawal request is already processed or was not found." },
          { status: 409 }
        );
      }
      return NextResponse.json({ message: "Withdrawal request rejected." });
    }

    const updated = await prisma.$queryRaw<{ id: string; status: string }[]>`
      WITH candidate AS (
        SELECT request."id", request."sellerId", request."amount"
        FROM "WithdrawalRequest" AS request
        WHERE request."id" = ${id} AND request."status" = 'PENDING'
        FOR UPDATE
      ),
      debited AS (
        UPDATE "User" AS seller
        SET "balance" = seller."balance" - candidate."amount",
            "updatedAt" = NOW()
        FROM candidate
        WHERE seller."id" = candidate."sellerId"
          AND seller."balance" >= candidate."amount"
        RETURNING candidate."id" AS "requestId"
      )
      UPDATE "WithdrawalRequest" AS request
      SET "status" = 'COMPLETE', "updatedAt" = NOW()
      FROM debited
      WHERE request."id" = debited."requestId"
      RETURNING request."id", request."status"
    `;

    if (updated.length !== 1) {
      return NextResponse.json(
        { error: "Request is already processed or the seller balance is insufficient." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      message: "Withdrawal approved and balance debited.",
    });
  } catch (error) {
    console.error("Super Admin approve withdrawal API error:", error);
    return NextResponse.json({ error: "Unable to approve withdrawal." }, { status: 500 });
  }
}
